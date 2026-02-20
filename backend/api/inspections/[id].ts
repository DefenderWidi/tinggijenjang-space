import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../lib/supabaseAdmin"

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "PATCH,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

type ReviewStatus = "PENDING" | "VALID" | "REJECT"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" })

  const parseBody = () => {
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

  const id = String(req.query.id || "")
  if (!id) return res.status(400).json({ error: "Missing id" })

  const body = parseBody()
  if (body === null) return res.status(400).json({ error: "Invalid JSON body" })
  const review_status: ReviewStatus | null =
    body?.review_status === "PENDING" || body?.review_status === "VALID" || body?.review_status === "REJECT"
      ? body.review_status
      : null

  if (!review_status) return res.status(400).json({ error: "Invalid review_status" })

  const reviewed_by = body?.reviewed_by ? String(body.reviewed_by) : null

  const { data, error } = await supabaseAdmin
    .from("inspections")
    .update({ review_status, reviewed_by })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ data })
}