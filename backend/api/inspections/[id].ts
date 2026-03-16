import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Methods", "GET,PATCH,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

type ReviewStatus = "PENDING" | "VALID" | "REJECT"

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

function toIntNonNeg(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const i = Math.floor(n)
  if (i < 0) return 0
  return i
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const id = getId(req)
  if (!id) return res.status(400).json({ error: "Missing id" })

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: "Inspection not found" })

    return res.status(200).json({ data })
  }

  if (req.method === "PATCH") {
    const body: any = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const incomingStatus = body?.review_status
    const review_status: ReviewStatus | undefined =
      incomingStatus === "VALID" || incomingStatus === "REJECT" || incomingStatus === "PENDING"
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
      if (v === null) return res.status(400).json({ error: "lines_ok_count must be a number" })
      payload.lines_ok_count = v
    }

    if ("lines_count" in body) {
      const v = toIntNonNeg(body.lines_count)
      if (v === null) return res.status(400).json({ error: "lines_count must be a number" })
      payload.lines_count = v
    }

    if ("max_height_m" in body) {
      const n = typeof body.max_height_m === "number" ? body.max_height_m : Number(body.max_height_m)
      if (!Number.isFinite(n)) return res.status(400).json({ error: "max_height_m must be a number" })
      payload.max_height_m = n
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" })
    }

    const { data, error } = await supabaseAdmin
      .from("inspections")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: "Inspection not found" })

    return res.status(200).json({ data })
  }

  if (req.method === "DELETE") {
    // 1) hapus detail lines
    const delLines = await supabaseAdmin
      .from("inspection_lines")
      .delete()
      .eq("inspection_id", id)

    if (delLines.error) {
      return res.status(500).json({ error: delLines.error.message })
    }

    // 2) hapus semua measures
    const delMeasures = await supabaseAdmin
      .from("inspection_measures")
      .delete()
      .eq("inspection_id", id)

    if (delMeasures.error) {
      return res.status(500).json({ error: delMeasures.error.message })
    }

    // 3) hapus inspection utama
    const delInspection = await supabaseAdmin
      .from("inspections")
      .delete()
      .eq("id", id)
      .select("id")
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
    })
  }

  return res.status(405).json({ error: "Method not allowed" })
}