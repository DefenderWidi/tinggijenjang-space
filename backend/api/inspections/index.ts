import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

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
    // =========================
    // GET /api/inspections
    // =========================
    if (req.method === "GET") {
      // 1) ambil inspections
      const { data: inspections, error: e1 } = await supabaseAdmin
        .from("inspections")
        .select("*")
        .order("inspected_at", { ascending: false })
        .limit(200)

      if (e1) return res.status(500).json({ error: e1.message })

      const rows = inspections ?? []
      if (!rows.length) return res.status(200).json({ data: [] })

      // 2) ambil measures utk semua inspection_id (urut desc, lalu ambil pertama per id)
      const ids = rows.map((r: any) => r.id).filter(Boolean)

      const { data: measures, error: e2 } = await supabaseAdmin
        .from("inspection_measures") // ✅ FIX: sesuai schema
        .select("inspection_id, ref_unit, ref_meter, created_at")
        .in("inspection_id", ids)
        .order("created_at", { ascending: false })
        .limit(2000) // ✅ guard: biar nggak kebablasan kalau measure banyak

      if (e2) {
        // kalau measures error, tetep balikin inspections (dashboard tetap jalan)
        console.error("api/inspections measures lookup error:", e2)
        return res.status(200).json({ data: rows })
      }

      // 3) map latest measure per inspection_id
      const latestByInspection = new Map<string, any>()
      for (const m of measures ?? []) {
        const k = String((m as any).inspection_id ?? "")
        if (!k) continue
        if (!latestByInspection.has(k)) latestByInspection.set(k, m) // karena sudah order desc
      }

      // 4) merge: tambahin ref_unit/ref_meter ke setiap inspection row
      const merged = rows.map((r: any) => {
        const m = latestByInspection.get(String(r.id))
        return {
          ...r,
          ref_unit: m?.ref_unit ?? null,
          ref_meter: m?.ref_meter ?? null,
        }
      })

      return res.status(200).json({ data: merged })
    }

    // =========================
    // POST /api/inspections
    // =========================
    if (req.method === "POST") {
      const body = parseBody(req)
      if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

      const shift: Shift | null = body?.shift === "DAY" || body?.shift === "NIGHT" ? body.shift : null

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

      const { data, error } = await supabaseAdmin.from("inspections").insert(payload).select("*").single()
      if (error) return res.status(500).json({ error: error.message })

      return res.status(201).json({ data })
    }

    return res.status(405).json({ error: "Method not allowed" })
  } catch (e: any) {
    console.error("api/inspections crash:", e)
    return res.status(500).json({ error: e?.message ?? "Internal error" })
  }
}