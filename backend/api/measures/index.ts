// api/measures/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node"
import formidable from "formidable"
import type { Files, Fields, File as FormidableFile } from "formidable"
import fs from "fs"
import { supabaseAdmin } from "../../lib/supabaseAdmin"

export const config = {
  api: { bodyParser: false }, // wajib untuk multipart
}

// CORS
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS") // ✅ add GET
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

type ParsedForm = {
  fields: Fields
  files: Files
}

function parseForm(req: VercelRequest): Promise<ParsedForm> {
  const form = formidable({
    multiples: false,
    maxFileSize: 8 * 1024 * 1024, // 8MB
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
  const s = firstFieldValue(v)
  const n = Number(s)
  return n
}

function pickSingleFile(v: Files[string] | undefined): FormidableFile | null {
  if (!v) return null
  if (Array.isArray(v)) return (v[0] as FormidableFile) ?? null
  return v as FormidableFile
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)

  if (req.method === "OPTIONS") return res.status(200).end()

  // =========================
  // ✅ GET /api/measures?inspection_id=...
  // =========================
  if (req.method === "GET") {
    try {
      const inspection_id = String(req.query.inspection_id ?? "").trim()
      if (!inspection_id) {
        return res.status(400).json({ error: "inspection_id required" })
      }

      // Ambil data measure terbaru dulu
      const { data, error } = await supabaseAdmin
        .from("inspection_measures")
        .select("*")
        .eq("inspection_id", inspection_id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ data: data ?? [] })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Fetch failed"
      return res.status(500).json({ error: msg })
    }
  }

  // =========================
  // POST (upload)
  // =========================
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { fields, files } = await parseForm(req)

    const inspection_id = firstFieldValue(fields.inspection_id)
    const max_height_m = firstNumberField(fields.max_height_m)
    const lines_count = Number(firstFieldValue(fields.lines_count) || 0)
    const lines_ok_count = Number(firstFieldValue(fields.lines_ok_count) || 0)

    const orientation = firstFieldValue(fields.orientation) || null
    const ref_unit = firstFieldValue(fields.ref_unit) || null

    const ref_meter_raw = firstFieldValue(fields.ref_meter)
    const pixel_per_meter_raw = firstFieldValue(fields.pixel_per_meter)

    const ref_meter = ref_meter_raw ? Number(ref_meter_raw) : null
    const pixel_per_meter = pixel_per_meter_raw ? Number(pixel_per_meter_raw) : null

    if (!inspection_id) {
      return res.status(400).json({ error: "inspection_id required" })
    }
    if (!Number.isFinite(max_height_m)) {
      return res.status(400).json({ error: "max_height_m must be number" })
    }

    const img = pickSingleFile(files.image)
    if (!img) {
      return res
        .status(400)
        .json({ error: "image file required (field name: image)" })
    }

    // formidable v2/v3 compat
    const filePath =
      (img as any).filepath || (img as any).path || (img as any).filePath
    const mime = (img as any).mimetype || "image/png"
    const originalName =
      (img as any).originalFilename || (img as any).name || "measure.png"

    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "Invalid uploaded file path" })
    }

    const buf = fs.readFileSync(filePath)

    // Upload to Supabase Storage
    const bucket = "measure-photos"
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "png"

    const storagePath = `inspections/${inspection_id}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`

    const up = await supabaseAdmin.storage.from(bucket).upload(storagePath, buf, {
      contentType: mime,
      upsert: false,
    })
    if (up.error) return res.status(500).json({ error: up.error.message })

    const publicUrl =
      supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl

    // Insert to DB
    const { data, error } = await supabaseAdmin
      .from("inspection_measures")
      .insert({
        inspection_id,
        image_url: publicUrl,
        max_height_m,
        lines_count,
        lines_ok_count,
        orientation,
        ref_unit,
        ref_meter: Number.isFinite(ref_meter as any) ? ref_meter : null,
        pixel_per_meter: Number.isFinite(pixel_per_meter as any) ? pixel_per_meter : null,
      })
      .select("*")
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // optional update summary di inspections
    await supabaseAdmin
      .from("inspections")
      .update({ max_height_m, lines_count, lines_ok_count })
      .eq("id", inspection_id)

    return res.status(201).json({ data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed"
    return res.status(500).json({ error: msg })
  }
}