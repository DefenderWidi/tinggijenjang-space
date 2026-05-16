import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Methods", "GET,PATCH,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Max-Age", "86400")
}

type ReviewStatus = "PENDING" | "VALID" | "REJECT"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

function parseBody(req: VercelRequest) {
  if (req.body == null || req.body === "") return {}
  if (typeof req.body === "object") return req.body
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return {}
}

function getId(req: VercelRequest) {
  const q = (req.query as any)?.id
  const raw = Array.isArray(q) ? q[0] : q
  return String(raw ?? "").trim()
}

function normalizeSite(value: any): SiteCode {
  const site = String(value || "LAT").trim().toUpperCase()

  if (site === "LAT" || site === "IPR" || site === "SDJ" || site === "ADT") {
    return site
  }

  return "LAT"
}

function getSiteFromQuery(req: VercelRequest): SiteCode | null {
  const raw =
    req.query.site ??
    req.query.siteCode ??
    req.query.activeSite ??
    req.query.selectedSite ??
    req.query.workspaceSite

  if (raw == null) return null

  return normalizeSite(Array.isArray(raw) ? raw[0] : raw)
}

function getSiteFromBody(body: any): SiteCode | null {
  const raw =
    body?.site ??
    body?.siteCode ??
    body?.activeSite ??
    body?.selectedSite ??
    body?.workspaceSite

  if (raw == null || String(raw).trim() === "") return null

  return normalizeSite(raw)
}

function toIntNonNeg(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const i = Math.floor(n)
  if (i < 0) return 0
  return i
}

function toBoolOrNull(v: any): boolean | null {
  if (typeof v === "boolean") return v

  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    if (s === "true" || s === "1" || s === "yes" || s === "ya") return true
    if (s === "false" || s === "0" || s === "no" || s === "tidak") return false
  }

  if (typeof v === "number") {
    if (v === 1) return true
    if (v === 0) return false
  }

  return null
}

function withSiteFields(row: any) {
  const site = normalizeSite(row?.site)

  return {
    ...row,
    site,
    siteCode: site,
    activeSite: site,
    selectedSite: site,
    workspaceSite: site,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const id = getId(req)
  if (!id) return res.status(400).json({ error: "Missing id" })

  if (req.method === "GET") {
    const siteFilter = getSiteFromQuery(req)

    let query = supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("id", id)

    if (siteFilter) {
      query = query.eq("site", siteFilter)
    }

    const { data, error } = await query.maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: "Inspection not found" })

    return res.status(200).json({ data: withSiteFields(data) })
  }

  if (req.method === "PATCH") {
    const body: any = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const siteFilter = getSiteFromBody(body) || getSiteFromQuery(req)

    const incomingStatus = body?.review_status
    const review_status: ReviewStatus | undefined =
      incomingStatus === "VALID" ||
      incomingStatus === "REJECT" ||
      incomingStatus === "PENDING"
        ? incomingStatus
        : undefined

    const payload: Record<string, any> = {}

    if (review_status !== undefined) payload.review_status = review_status

    if ("reviewed_by" in body) {
      payload.reviewed_by = body.reviewed_by ? String(body.reviewed_by) : null
    }

    if ("review_notes" in body) {
      const s = body.review_notes == null ? null : String(body.review_notes)
      payload.review_notes = s && s.length > 1000 ? s.slice(0, 1000) : s
    }

    if ("lines_ok_count" in body) {
      const v = toIntNonNeg(body.lines_ok_count)
      if (v === null) {
        return res.status(400).json({ error: "lines_ok_count must be a number" })
      }
      payload.lines_ok_count = v
    }

    if ("lines_count" in body) {
      const v = toIntNonNeg(body.lines_count)
      if (v === null) {
        return res.status(400).json({ error: "lines_count must be a number" })
      }
      payload.lines_count = v
    }

    if ("max_height_m" in body) {
      const n =
        typeof body.max_height_m === "number"
          ? body.max_height_m
          : Number(body.max_height_m)

      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: "max_height_m must be a number" })
      }

      payload.max_height_m = n
    }

    if ("loading_45_ok" in body) {
      if (body.loading_45_ok === null) {
        payload.loading_45_ok = null
        payload.loading_45_checked_at = null
      } else {
        const v = toBoolOrNull(body.loading_45_ok)

        if (v === null) {
          return res.status(400).json({
            error: "loading_45_ok must be boolean",
          })
        }

        payload.loading_45_ok = v
        payload.loading_45_checked_at = new Date().toISOString()
      }
    }

    // Jangan izinkan PATCH kosong.
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" })
    }

    // Kalau frontend mengirim site, kita pakai sebagai guard.
    // Tujuannya agar PJA LAT tidak salah update data site lain.
    let query = supabaseAdmin
      .from("inspections")
      .update(payload)
      .eq("id", id)

    if (siteFilter) {
      query = query.eq("site", siteFilter)
    }

    const { data, error } = await query.select("*").maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: "Inspection not found" })

    return res.status(200).json({ data: withSiteFields(data) })
  }

  if (req.method === "DELETE") {
    const siteFilter = getSiteFromQuery(req)

    // Ambil inspection dulu untuk tahu site aslinya.
    let findQuery = supabaseAdmin
      .from("inspections")
      .select("id, site")
      .eq("id", id)

    if (siteFilter) {
      findQuery = findQuery.eq("site", siteFilter)
    }

    const { data: existing, error: findError } = await findQuery.maybeSingle()

    if (findError) {
      return res.status(500).json({ error: findError.message })
    }

    if (!existing) {
      return res.status(404).json({ error: "Inspection not found" })
    }

    const site = normalizeSite(existing.site)

    // 1) hapus detail lines sesuai inspection + site
    const delLines = await supabaseAdmin
      .from("inspection_lines")
      .delete()
      .eq("inspection_id", id)
      .eq("site", site)

    if (delLines.error) {
      return res.status(500).json({ error: delLines.error.message })
    }

    // 2) hapus semua measures sesuai inspection + site
    const delMeasures = await supabaseAdmin
      .from("inspection_measures")
      .delete()
      .eq("inspection_id", id)
      .eq("site", site)

    if (delMeasures.error) {
      return res.status(500).json({ error: delMeasures.error.message })
    }

    // 3) hapus inspection utama sesuai id + site
    const delInspection = await supabaseAdmin
      .from("inspections")
      .delete()
      .eq("id", id)
      .eq("site", site)
      .select("id, site")
      .maybeSingle()

    if (delInspection.error) {
      return res.status(500).json({ error: delInspection.error.message })
    }

    if (!delInspection.data) {
      return res.status(404).json({ error: "Inspection not found" })
    }

    return res.status(200).json({
      success: true,
      deleted_id: id,
      site,
      siteCode: site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,
    })
  }

  return res.status(405).json({ error: "Method not allowed" })
}