import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../lib/supabaseAdmin.js"

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "*"
  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Vary", "Origin")
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

function getId(req: VercelRequest) {
  const q = req.query.id
  const raw = Array.isArray(q) ? q[0] : q
  return String(raw ?? "").trim()
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
    const body = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    // review_status hanya di-set kalau memang dikirim dan valid
    const incomingStatus = body?.review_status
    const review_status: ReviewStatus | undefined =
      incomingStatus === "VALID" || incomingStatus === "REJECT" || incomingStatus === "PENDING"
        ? incomingStatus
        : undefined

    const payload: Record<string, any> = {}

    if (review_status !== undefined) payload.review_status = review_status
    if (body?.reviewed_by != null) payload.reviewed_by = body.reviewed_by ? String(body.reviewed_by) : null
    if (body?.lines_ok_count != null) payload.lines_ok_count = Number(body.lines_ok_count)
    if (body?.review_notes != null) payload.review_notes = String(body.review_notes)

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

  return res.status(405).json({ error: "Method not allowed" })
}