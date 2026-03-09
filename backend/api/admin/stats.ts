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
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" })
  if (!requireAdmin(req, res)) return

  try {
    const [{ count: inspectionsCount }, { count: linesCount }, { count: measuresCount }] =
      await Promise.all([
        supabaseAdmin.from("inspections").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("inspection_lines").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("inspection_measures").select("*", { count: "exact", head: true }),
      ])

    const bucketName = process.env.PHOTO_BUCKET || "measure-photos"

    const { data: files, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list("", { limit: 1000, offset: 0 })

    if (error) throw error

    return res.status(200).json({
      inspectionsCount: inspectionsCount || 0,
      linesCount: linesCount || 0,
      measuresCount: measuresCount || 0,
      photoCount: files?.length || 0,
      bucket: bucketName,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Gagal ambil stats" })
  }
}