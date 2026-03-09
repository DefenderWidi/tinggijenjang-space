import type { VercelRequest, VercelResponse } from "@vercel/node"
import { requireAdmin } from "../_lib/adminAuth.js"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || ""

  const allowedOrigins = [
    "http://localhost:5173",
    "https://tinggijenjang.vercel.app",
  ]

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  }

  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Max-Age", "86400")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  if (!requireAdmin(req, res)) return

  try {
    const bucketName = process.env.PHOTO_BUCKET || "measure-photos"

    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list("", { limit: 1000, offset: 0 })

    if (listError) throw listError

    const filePaths = (files || []).map((f) => f.name).filter(Boolean)

    if (filePaths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(bucketName)
        .remove(filePaths)

      if (removeError) throw removeError
    }

  const delMeasures = await supabaseAdmin
  .from("inspection_measures")
  .delete()
  .not("inspection_id", "is", null)
    if (delMeasures.error) throw delMeasures.error

const delLines = await supabaseAdmin
  .from("inspection_lines")
  .delete()
  .not("inspection_id", "is", null)
    if (delLines.error) throw delLines.error
    
const delInspections = await supabaseAdmin
  .from("inspections")
  .delete()
  .not("id", "is", null)
    if (delInspections.error) throw delInspections.error

    return res.status(200).json({
      ok: true,
      message: "Reset operasional berhasil",
      deletedPhotos: filePaths.length,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Reset gagal" })
  }
}