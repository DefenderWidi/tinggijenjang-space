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

function toUpperOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim()
  return s ? s.toUpperCase() : null
}

function pickFirstNonEmpty(...values: unknown[]) {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== "") return v
  }
  return null
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
      const { data: inspections, error: e1 } = await supabaseAdmin
        .from("inspections")
        .select("*")
        .order("inspected_at", { ascending: false })
        .limit(200)

      if (e1) return res.status(500).json({ error: e1.message })

      const rows = inspections ?? []
      if (!rows.length) return res.status(200).json({ data: [] })

      const ids = rows.map((r: any) => r.id).filter(Boolean)

      // AMAN: ambil semua kolom, jangan sebut nama kolom mode satu-satu
      const { data: measures, error: e2 } = await supabaseAdmin
        .from("inspection_measures")
        .select("*")
        .in("inspection_id", ids)
        .order("created_at", { ascending: false })
        .limit(2000)

      if (e2) {
        console.error("api/inspections measures lookup error:", e2)
        return res.status(200).json({ data: rows })
      }

      // latest measure per inspection_id
      const latestByInspection = new Map<string, any>()
      for (const m of measures ?? []) {
        const k = String((m as any).inspection_id ?? "")
        if (!k) continue
        if (!latestByInspection.has(k)) {
          latestByInspection.set(k, m)
        }
      }

      const merged = rows.map((r: any) => {
        const m = latestByInspection.get(String(r.id)) ?? {}

        // baca mode secara fleksibel dari berbagai kemungkinan nama kolom
        const mergedInspectionMode = pickFirstNonEmpty(
          r?.inspection_mode,
          r?.inspectionMode,
          m?.inspection_mode,
          m?.inspectionMode,
          m?.mode,
          m?.inspection_type,
          m?.inspectionType,
          m?.category,
          m?.type
        )

        const mergedMeasureMode = pickFirstNonEmpty(
          r?.measure_mode,
          r?.measureMode,
          m?.measure_mode,
          m?.measureMode,
          m?.mode,
          m?.measure_type,
          m?.measureType,
          m?.category,
          m?.type
        )

        const mergedDashboardView = pickFirstNonEmpty(
          r?.dashboard_view,
          r?.dashboardView,
          m?.dashboard_view,
          m?.dashboardView,
          mergedInspectionMode,
          mergedMeasureMode
        )

        return {
          ...r,
          ref_unit: pickFirstNonEmpty(r?.ref_unit, r?.refUnit, m?.ref_unit, m?.refUnit),
          ref_meter: pickFirstNonEmpty(r?.ref_meter, r?.refMeter, m?.ref_meter, m?.refMeter),
          dashboard_view: mergedDashboardView,
          measure_mode: mergedMeasureMode,
          inspection_mode: mergedInspectionMode,
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

      const shift: Shift | null =
        body?.shift === "DAY" || body?.shift === "NIGHT" ? body.shift : null

      const review_status: ReviewStatus =
        body?.review_status === "VALID" ||
        body?.review_status === "REJECT" ||
        body?.review_status === "PENDING"
          ? body.review_status
          : "PENDING"

      // tetap pakai payload aman sesuai schema inspections yang sudah pasti ada
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

      return res.status(201).json({
        data: {
          ...data,
          dashboard_view: toUpperOrNull(body?.dashboard_view),
          measure_mode: toUpperOrNull(body?.measure_mode),
          inspection_mode: toUpperOrNull(body?.inspection_mode),
        },
      })
    }

    return res.status(405).json({ error: "Method not allowed" })
  } catch (e: any) {
    console.error("api/inspections crash:", e)
    return res.status(500).json({ error: e?.message ?? "Internal error" })
  }
}