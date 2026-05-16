// backend/api/measures/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node"
import formidable from "formidable"
import type { Files, Fields, File as FormidableFile } from "formidable"
import fs from "fs"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

export const config = {
  api: { bodyParser: false },
}

// =====================
// CORS
// =====================
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  )
  res.setHeader("Access-Control-Max-Age", "86400")
}

type ParsedForm = {
  fields: Fields
  files: Files
}

type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

function normalizeSite(value: any): SiteCode {
  const site = String(value || "LAT").trim().toUpperCase()

  if (site === "LAT" || site === "IPR" || site === "SDJ" || site === "ADT") {
    return site
  }

  return "LAT"
}

function parseForm(req: VercelRequest): Promise<ParsedForm> {
  const form = formidable({
    multiples: false,
    maxFileSize: 8 * 1024 * 1024,
    keepExtensions: true,
  })

  return new Promise((resolve, reject) => {
    form.parse(req as any, (err: unknown, fields: Fields, files: Files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
  })
}

function firstFieldValue(v: Fields[string] | undefined): string {
  if (v == null) return ""
  if (Array.isArray(v)) return String(v[0] ?? "")
  return String(v)
}

function firstNumberField(v: Fields[string] | undefined): number {
  const s = firstFieldValue(v).trim()
  if (!s) return NaN
  return Number(s)
}

function pickSingleFile(v: Files[string] | undefined): FormidableFile | null {
  if (!v) return null
  if (Array.isArray(v)) return (v[0] as FormidableFile) ?? null
  return v as FormidableFile
}

function getSiteFromFields(fields: Fields): SiteCode {
  return normalizeSite(
    firstFieldValue(fields.site) ||
      firstFieldValue(fields.siteCode) ||
      firstFieldValue(fields.activeSite) ||
      firstFieldValue(fields.selectedSite) ||
      firstFieldValue(fields.workspaceSite)
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  // =========================
  // GET /api/measures?inspection_id=...
  // =========================
  if (req.method === "GET") {
    try {
      const inspection_id = String(req.query.inspection_id ?? "").trim()
      const siteFilter = getSiteFromQuery(req)

      if (!inspection_id) {
        return res.status(400).json({ error: "inspection_id required" })
      }

      let query = supabaseAdmin
        .from("inspection_measures")
        .select("*")
        .eq("inspection_id", inspection_id)
        .order("created_at", { ascending: false })
        .limit(1)

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
    } catch (e: unknown) {
      console.error("api/measures GET crash:", e)
      const msg = e instanceof Error ? e.message : "Fetch failed"
      return res.status(500).json({ error: msg })
    }
  }

  // =========================
  // POST /api/measures
  // =========================
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  let filePathToCleanup: string | null = null

  try {
    const { fields, files } = await parseForm(req)

    const site = getSiteFromFields(fields)

    const inspection_id = firstFieldValue(fields.inspection_id).trim()
    const max_height_m = firstNumberField(fields.max_height_m)
    const lines_count = Number(firstFieldValue(fields.lines_count) || 0)
    const lines_ok_count = Number(firstFieldValue(fields.lines_ok_count) || 0)

    const orientation = firstFieldValue(fields.orientation).trim() || null
    const ref_unit = firstFieldValue(fields.ref_unit).trim() || null

    const ref_meter_raw = firstFieldValue(fields.ref_meter).trim()
    const pixel_per_meter_raw = firstFieldValue(fields.pixel_per_meter).trim()

    const ref_meter = ref_meter_raw ? Number(ref_meter_raw) : null
    const pixel_per_meter = pixel_per_meter_raw ? Number(pixel_per_meter_raw) : null

    if (!inspection_id) return res.status(400).json({ error: "inspection_id required" })

    if (!Number.isFinite(max_height_m)) {
      return res.status(400).json({ error: "max_height_m must be number" })
    }

    const img = pickSingleFile(files.image)
    if (!img) {
      return res.status(400).json({ error: "image file required (field name: image)" })
    }

    const filePath = (img as any).filepath || (img as any).path || (img as any).filePath
    const mime = (img as any).mimetype || "image/png"
    const originalName = (img as any).originalFilename || (img as any).name || "measure.png"

    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "Invalid uploaded file path" })
    }

    filePathToCleanup = filePath

    const buf = fs.readFileSync(filePath)

    const bucket = "measure-photos"
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "png"

    const storagePath = `inspections/${site}/${inspection_id}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`

    const up = await supabaseAdmin.storage.from(bucket).upload(storagePath, buf, {
      contentType: mime,
      upsert: false,
    })

    if (up.error) return res.status(500).json({ error: up.error.message })

    const publicUrl = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath).data.publicUrl

    const { data, error } = await supabaseAdmin
      .from("inspection_measures")
      .insert({
        site,
        inspection_id,
        image_url: publicUrl,
        max_height_m,
        lines_count,
        lines_ok_count,
        orientation,
        ref_unit,
        ref_meter: Number.isFinite(ref_meter as any) ? ref_meter : null,
        pixel_per_meter: Number.isFinite(pixel_per_meter as any)
          ? pixel_per_meter
          : null,
      })
      .select("*")
      .single()

    if (error) return res.status(500).json({ error: error.message })

    const upd = await supabaseAdmin
      .from("inspections")
      .update({
        site,
        max_height_m,
        lines_count,
        lines_ok_count,
      })
      .eq("id", inspection_id)

    if (upd.error) {
      console.warn("api/measures: failed update inspections summary:", upd.error.message)
    }

    return res.status(201).json({
      data: {
        ...data,
        site,
        siteCode: site,
        activeSite: site,
        selectedSite: site,
        workspaceSite: site,
      },
    })
  } catch (e: unknown) {
    console.error("api/measures POST crash:", e)
    const msg = e instanceof Error ? e.message : "Upload failed"
    return res.status(500).json({ error: msg })
  } finally {
    try {
      if (filePathToCleanup && fs.existsSync(filePathToCleanup)) {
        fs.unlinkSync(filePathToCleanup)
      }
    } catch {
      // ignore
    }
  }
}