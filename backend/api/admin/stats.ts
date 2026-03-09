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
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  )
  res.setHeader("Access-Control-Max-Age", "86400")
}

async function countFilesRecursive(
  bucketName: string,
  path = ""
): Promise<number> {
  let total = 0
  let offset = 0
  const limit = 100

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(path, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      })

    if (error) throw error
    if (!data || data.length === 0) break

    for (const item of data) {
      const name = item.name || ""

      // Folder di Supabase Storage biasanya punya id === null
      // File biasanya punya id terisi
      const isFolder = !("id" in item) || item.id == null

      if (isFolder) {
        const childPath = path ? `${path}/${name}` : name
        total += await countFilesRecursive(bucketName, childPath)
      } else {
        total += 1
      }
    }

    if (data.length < limit) break
    offset += limit
  }

  return total
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  if (!requireAdmin(req, res)) return

  try {
    const [
      { count: inspectionsCount },
      { count: linesCount },
      { count: measuresCount },
    ] = await Promise.all([
      supabaseAdmin.from("inspections").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("inspection_lines").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("inspection_measures").select("*", { count: "exact", head: true }),
    ])

    const bucketName = process.env.PHOTO_BUCKET || "inspection-photos"
    const photoCount = await countFilesRecursive(bucketName)

    return res.status(200).json({
      inspectionsCount: inspectionsCount || 0,
      linesCount: linesCount || 0,
      measuresCount: measuresCount || 0,
      photoCount,
      bucket: bucketName,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Gagal ambil stats" })
  }
}