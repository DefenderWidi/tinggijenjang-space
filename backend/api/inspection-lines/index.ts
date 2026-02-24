import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../lib/supabaseAdmin"

// =====================
// CORS
// =====================
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// =====================
// Utils
// =====================
function parseBody(req: VercelRequest): Record<string, unknown> | null {
  if (req.body == null || req.body === "") return {}
  if (typeof req.body === "object") return req.body as Record<string, unknown>
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return {}
}

type LinePayload = {
  inspection_id: string
  label: string
  height_m: number | null
  ok: boolean | null
}

type RawLine = {
  label?: unknown
  height_m?: unknown
  ok?: unknown
  // fallback keys from FE:
  heightM?: unknown
  height?: unknown
}

function toBoolOrNull(v: unknown): boolean | null {
  if (v === true) return true
  if (v === false) return false
  return null
}

function toPositiveNumberOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return null
  if (n <= 0) return null
  return n
}

function toLinePayload(inspection_id: string, x: RawLine): LinePayload {
  const label = String(x?.label ?? "").trim()

  // accept multiple possible keys
  const rawH =
    (x as any)?.height_m ??
    (x as any)?.heightM ??
    (x as any)?.height ??
    null

  const height_m = toPositiveNumberOrNull(rawH)
  const ok = toBoolOrNull((x as any)?.ok)

  return { inspection_id, label, height_m, ok }
}

// =====================
// Handler
// =====================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === "OPTIONS") return res.status(200).end()

  // ---------- GET /api/inspection-lines?inspection_id=... ----------
  if (req.method === "GET") {
    const inspection_id = String(req.query?.inspection_id ?? "").trim()
    if (!inspection_id) {
      return res.status(400).json({ error: "inspection_id is required" })
    }

    const { data, error } = await supabaseAdmin
      .from("inspection_lines")
      .select("*")
      .eq("inspection_id", inspection_id)
      .order("label", { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  }

  // ---------- POST /api/inspection-lines ----------
  // Body:
  // { inspection_id: string, lines: [{ label, height_m|heightM|height, ok }] }
  if (req.method === "POST") {
    const body = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const inspection_id = String((body as any).inspection_id ?? "").trim()
    const rawLinesUnknown = (body as any).lines
    const rawLines: RawLine[] = Array.isArray(rawLinesUnknown)
      ? (rawLinesUnknown as RawLine[])
      : []

    if (!inspection_id) return res.status(400).json({ error: "Required: inspection_id" })
    if (!rawLines.length) return res.status(400).json({ error: "Required: lines[] (non-empty)" })

    const payload: LinePayload[] = rawLines
      .map((x) => toLinePayload(inspection_id, x))
      .filter((item) => item.label.length > 0)

    if (!payload.length) {
      return res.status(400).json({ error: "lines[] is empty after validation" })
    }

    // delete old
    const del = await supabaseAdmin
      .from("inspection_lines")
      .delete()
      .eq("inspection_id", inspection_id)

    if (del.error) return res.status(500).json({ error: del.error.message })

    // insert new
    const ins = await supabaseAdmin
      .from("inspection_lines")
      .insert(payload)
      .select("*")

    if (ins.error) return res.status(500).json({ error: ins.error.message })

    return res.status(200).json({ data: ins.data })
  }

  return res.status(405).json({ error: "Method not allowed" })
}