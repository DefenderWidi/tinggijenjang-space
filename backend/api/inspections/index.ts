import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../lib/supabaseAdmin"

// sementara: izinkan semua origin saat local/dev.
// nanti saat deploy, ganti ke domain FE Anda.
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

type Shift = "DAY" | "NIGHT"
type ReviewStatus = "PENDING" | "VALID" | "REJECT"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

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

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("inspections")
      .select("*")
      .order("inspected_at", { ascending: false })
      .limit(200)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  if (req.method === "POST") {
    const body = parseBody()
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const shift: Shift | null = body?.shift === "DAY" || body?.shift === "NIGHT" ? body.shift : null
    const review_status: ReviewStatus =
      body?.review_status === "VALID" || body?.review_status === "REJECT" || body?.review_status === "PENDING"
        ? body.review_status
        : "PENDING"

    const payload = {
      inspector: String(body?.inspector ?? ""),
      shift,
      pelaksanaan: String(body?.pelaksanaan ?? ""),
      front: String(body?.front ?? ""),
      lines_count: Number(body?.lines_count ?? 0),
      lines_ok_count: Number(body?.lines_ok_count ?? 0),
      max_height_m: Number(body?.max_height_m ?? 0),
      reviewed_by: body?.reviewed_by ? String(body.reviewed_by) : null,
      review_status,
      // inspected_at optional, kalau tidak dikirim pakai default now()
      ...(body?.inspected_at ? { inspected_at: String(body.inspected_at) } : {}),
    }

    if (!payload.inspector || !payload.shift || !payload.pelaksanaan || !payload.front) {
      return res.status(400).json({ error: "Required: inspector, shift(DAY|NIGHT), pelaksanaan, front" })
    }

    const { data, error } = await supabaseAdmin.from("inspections").insert(payload).select("*").single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  }

  return res.status(405).json({ error: "Method not allowed" })
}