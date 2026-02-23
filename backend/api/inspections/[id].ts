import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../lib/supabaseAdmin"

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,PATCH,OPTIONS")
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  const id = String(req.query.id ?? "").trim()
  if (!id) return res.status(400).json({ error: "Missing id" })

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  if (req.method === "PATCH") {
    const body = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const review_status: ReviewStatus =
      body?.review_status === "VALID" || body?.review_status === "REJECT" || body?.review_status === "PENDING"
        ? body.review_status
        : "PENDING"

    const payload: any = {
      review_status,
      reviewed_by: body?.reviewed_by ? String(body.reviewed_by) : null,
      lines_ok_count: body?.lines_ok_count != null ? Number(body.lines_ok_count) : undefined,
      review_notes: body?.review_notes != null ? String(body.review_notes) : undefined,
      // reviewed_at: new Date().toISOString(), // opsional kalau ada kolomnya
    }

    // buang undefined biar tidak overwrite
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

    const { data, error } = await supabaseAdmin
      .from("inspections")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  return res.status(405).json({ error: "Method not allowed" })
}