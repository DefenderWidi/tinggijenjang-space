import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

function parseBody(req: VercelRequest): Record<string, unknown> | null {
  if (req.body == null || req.body === "") return {}
  if (typeof req.body === "object") return req.body as Record<string, unknown>
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return {}
}

type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

type LinePayload = {
  inspection_id: string
  site: SiteCode
  label: string
  height_m: number
  ok: boolean | null
}

type RawLine = {
  label?: unknown
  height_m?: unknown
  ok?: unknown
  heightM?: unknown
  height?: unknown
}

function normalizeSite(value: any): SiteCode {
  const site = String(value || "LAT").trim().toUpperCase()

  if (site === "LAT" || site === "IPR" || site === "SDJ" || site === "ADT") {
    return site
  }

  return "LAT"
}

function getSiteFromBody(body: Record<string, any>): SiteCode {
  return normalizeSite(
    body?.site ??
      body?.siteCode ??
      body?.activeSite ??
      body?.selectedSite ??
      body?.workspaceSite
  )
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

function toBoolOrNull(v: unknown): boolean | null {
  if (v === true) return true
  if (v === false) return false
  return null
}

function toPositiveNumberOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return null
  if (n <= 0.01) return null
  return n
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  if (req.method === "GET") {
    const inspection_id = String(req.query?.inspection_id ?? "").trim()
    const siteFilter = getSiteFromQuery(req)

    if (!inspection_id) {
      return res.status(400).json({ error: "inspection_id is required" })
    }

    let query = supabaseAdmin
      .from("inspection_lines")
      .select("*")
      .eq("inspection_id", inspection_id)
      .order("label", { ascending: true })

    if (siteFilter) {
      query = query.eq("site", siteFilter)
    }

    const { data, error } = await query

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({
      data: (data ?? []).map((row: any) => {
        const site = normalizeSite(row?.site)
        return {
          ...row,
          site,
          siteCode: site,
          activeSite: site,
          selectedSite: site,
          workspaceSite: site,
        }
      }),
    })
  }

  if (req.method === "POST") {
    const body = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const site = getSiteFromBody(body as Record<string, any>)
    const inspection_id = String((body as any).inspection_id ?? "").trim()
    const rawLinesUnknown = (body as any).lines
    const rawLines: RawLine[] = Array.isArray(rawLinesUnknown) ? rawLinesUnknown : []

    if (!inspection_id) return res.status(400).json({ error: "Required: inspection_id" })

    if (!rawLines.length) {
      return res.status(400).json({ error: "Required: lines[] (non-empty)" })
    }

    const normalized = rawLines.map((x) => {
      const label = String(x?.label ?? "").trim()
      const rawH =
        (x as any)?.height_m ?? (x as any)?.heightM ?? (x as any)?.height ?? null
      const height_m = toPositiveNumberOrNull(rawH)
      const ok = toBoolOrNull((x as any)?.ok)

      return { inspection_id, site, label, height_m, ok }
    })

    const noLabel = normalized.filter((x) => !x.label)
    if (noLabel.length) {
      return res.status(400).json({ error: "Ada line tanpa label" })
    }

    const invalidHeight = normalized.filter((x) => x.height_m == null)
    if (invalidHeight.length) {
      return res.status(400).json({
        error: `Ada tinggi line tidak valid pada label: ${invalidHeight
          .map((x) => x.label)
          .join(", ")}`,
      })
    }

    const payload: LinePayload[] = normalized.map((x) => ({
      inspection_id: x.inspection_id,
      site,
      label: x.label,
      height_m: x.height_m as number,
      ok: x.ok,
    }))

    const del = await supabaseAdmin
      .from("inspection_lines")
      .delete()
      .eq("inspection_id", inspection_id)
      .eq("site", site)

    if (del.error) return res.status(500).json({ error: del.error.message })

    const ins = await supabaseAdmin
      .from("inspection_lines")
      .insert(payload)
      .select("*")

    if (ins.error) return res.status(500).json({ error: ins.error.message })

    return res.status(200).json({
      data: (ins.data ?? []).map((row: any) => ({
        ...row,
        site,
        siteCode: site,
        activeSite: site,
        selectedSite: site,
        workspaceSite: site,
      })),
    })
  }

  return res.status(405).json({ error: "Method not allowed" })
}