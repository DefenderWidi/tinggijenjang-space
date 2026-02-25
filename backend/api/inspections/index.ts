import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin"

// =====================
// CORS
// =====================
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Max-Age", "86400")
}

// =====================
// Utils
// =====================
function parseBody(req: VercelRequest): Record<string, any> | null {
  if (req.body == null || req.body === "") return {}
  if (typeof req.body === "object") return req.body as Record<string, any>
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, any>
    } catch {
      return null
    }
  }
  return {}
}

type Shift = "DAY" | "NIGHT"
type ReviewStatus = "PENDING" | "VALID" | "REJECT"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)

  if (req.method === "OPTIONS") return res.status(200).end()

  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("inspections")
        .select("*")
        .order("inspected_at", { ascending: false })
        .limit(200)

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ data: data ?? [] })
    }

    if (req.method === "POST") {
      const body = parseBody(req)
      if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

      const shift: Shift | null =
        body?.shift === "DAY" || body?.shift === "NIGHT" ? body.shift : null

      const review_status: ReviewStatus =
        body?.review_status === "VALID" || body?.review_status === "REJECT" || body?.review_status === "PENDING"
          ? body.review_status
          : "PENDING"

      const payload = {
        inspector: String(body?.inspector ?? "").trim(),
        shift,
        pelaksanaan: String(body?.pelaksanaan ?? "").trim(),
        front: String(body?.front ?? "").trim(),
        lines_count: Number(body?.lines_count ?? 0),
        lines_ok_count: Number(body?.lines_ok_count ?? 0),
        max_height_m: Number(body?.max_height_m ?? 0),
        reviewed_by: body?.reviewed_by ? String(body.reviewed_by) : null,
        review_status,
        ...(body?.inspected_at ? { inspected_at: String(body.inspected_at) } : {}),
      }

      if (!payload.inspector || !payload.shift || !payload.pelaksanaan || !payload.front) {
        return res.status(400).json({
          error: "Required: inspector, shift(DAY|NIGHT), pelaksanaan, front",
        })
      }

      const { data, error } = await supabaseAdmin
        .from("inspections")
        .insert(payload)
        .select("*")
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json({ data })
    }

    return res.status(405).json({ error: "Method not allowed" })
  } catch (e: any) {
    // ini penting: biar crash jadi kebaca di logs + ada response jelas
    console.error("api/inspections crash:", e)
    return res.status(500).json({ error: e?.message ?? "Internal error" })
  }
}