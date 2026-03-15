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

function normalizeStoragePath(input?: string | null, bucketName?: string) {
  if (!input) return ""

  let value = String(input).trim()
  if (!value) return ""

  try {
    const url = new URL(value)
    value = url.pathname
  } catch {
    // bukan full URL, biarkan apa adanya
  }

  value = value.replace(/^\/+/, "")

  if (bucketName) {
    const publicPrefix = `storage/v1/object/public/${bucketName}/`
    const signPrefix = `storage/v1/object/sign/${bucketName}/`
    const objectPrefix = `storage/v1/object/${bucketName}/`

    if (value.includes(publicPrefix)) {
      value = value.split(publicPrefix)[1] || ""
    } else if (value.includes(signPrefix)) {
      value = value.split(signPrefix)[1] || ""
      value = value.split("?")[0] || ""
    } else if (value.includes(objectPrefix)) {
      value = value.split(objectPrefix)[1] || ""
    }
  }

  value = value.replace(/^\/+/, "")
  return value
}

async function listAllFilesRecursive(
  bucketName: string,
  folder = ""
): Promise<string[]> {
  const results: string[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(folder, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      })

    if (error) throw error

    const items = data || []
    if (items.length === 0) break

    for (const item of items) {
      const itemName = item.name
      if (!itemName) continue

      const fullPath = folder ? `${folder}/${itemName}` : itemName

      const maybeFolder =
        !("id" in item) ||
        (!("metadata" in item) &&
          !("updated_at" in item) &&
          !("created_at" in item))

      if (maybeFolder) {
        const nested = await listAllFilesRecursive(bucketName, fullPath)
        results.push(...nested)
      } else {
        results.push(fullPath)
      }
    }

    if (items.length < limit) break
    offset += limit
  }

  return results
}

async function removeFilesInChunks(bucketName: string, paths: string[]) {
  const chunkSize = 100

  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize)
    const { error } = await supabaseAdmin.storage.from(bucketName).remove(chunk)
    if (error) throw error
  }
}

type InspectionRow = {
  id: string
  inspected_at: string
}

type MeasureRow = {
  id: string
  inspection_id: string
  image_url: string
}

type DeletedIdRow = {
  id: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  if (!requireAdmin(req, res)) return

  try {
    const body = parseBody(req)
    if (body === null) {
      return res.status(400).json({ error: "Invalid JSON body" })
    }

    const rawStartDate = body.startDate ? String(body.startDate).trim() : ""
    const rawEndDate = body.endDate ? String(body.endDate).trim() : ""

    const hasStart = !!rawStartDate
    const hasEnd = !!rawEndDate

    if (hasStart && Number.isNaN(new Date(rawStartDate).getTime())) {
      return res.status(400).json({ error: "startDate tidak valid" })
    }

    if (hasEnd && Number.isNaN(new Date(rawEndDate).getTime())) {
      return res.status(400).json({ error: "endDate tidak valid" })
    }

    if (hasStart && hasEnd && rawStartDate > rawEndDate) {
      return res.status(400).json({
        error: "Tanggal mulai tidak boleh lebih besar dari tanggal akhir",
      })
    }

    const bucketName = process.env.PHOTO_BUCKET || "measure-photos"

    let inspectionQuery = supabaseAdmin
      .from("inspections")
      .select("id, inspected_at")

    if (hasStart) {
      inspectionQuery = inspectionQuery.gte(
        "inspected_at",
        `${rawStartDate}T00:00:00.000Z`
      )
    }

    if (hasEnd) {
      inspectionQuery = inspectionQuery.lte(
        "inspected_at",
        `${rawEndDate}T23:59:59.999Z`
      )
    }

    const {
      data: inspections,
      error: inspectionsError,
    } = await inspectionQuery

    if (inspectionsError) throw inspectionsError

    const inspectionRows = (inspections || []) as InspectionRow[]
    const inspectionIds = inspectionRows.map((row) => row.id).filter(Boolean)

    if (inspectionIds.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "Tidak ada data operasional dalam range tanggal tersebut",
        deletedInspections: 0,
        deletedMeasures: 0,
        deletedLines: 0,
        deletedPhotos: 0,
        range: {
          startDate: rawStartDate || null,
          endDate: rawEndDate || null,
        },
      })
    }

    const { data: measureRows, error: measureRowsError } = await supabaseAdmin
      .from("inspection_measures")
      .select("id, inspection_id, image_url")
      .in("inspection_id", inspectionIds)

    if (measureRowsError) throw measureRowsError

    const measures = (measureRows || []) as MeasureRow[]

    const normalizedPaths = Array.from(
      new Set(
        measures
          .map((row) => normalizeStoragePath(row.image_url, bucketName))
          .filter(Boolean)
      )
    )

    const existingBucketFiles = await listAllFilesRecursive(bucketName)
    const existingFileSet = new Set(existingBucketFiles)

    const filePathsToDelete = normalizedPaths.filter((path) =>
      existingFileSet.has(path)
    )

    if (filePathsToDelete.length > 0) {
      await removeFilesInChunks(bucketName, filePathsToDelete)
    }

    const delMeasures = await supabaseAdmin
      .from("inspection_measures")
      .delete()
      .in("inspection_id", inspectionIds)
      .select("id")

    if (delMeasures.error) throw delMeasures.error

    const delLines = await supabaseAdmin
      .from("inspection_lines")
      .delete()
      .in("inspection_id", inspectionIds)
      .select("id")

    if (delLines.error) throw delLines.error

    const delInspections = await supabaseAdmin
      .from("inspections")
      .delete()
      .in("id", inspectionIds)
      .select("id")

    if (delInspections.error) throw delInspections.error

    const deletedMeasuresRows = (delMeasures.data || []) as DeletedIdRow[]
    const deletedLinesRows = (delLines.data || []) as DeletedIdRow[]
    const deletedInspectionRows = (delInspections.data || []) as DeletedIdRow[]

    const isFullReset = !hasStart && !hasEnd

    return res.status(200).json({
      ok: true,
      message: isFullReset
        ? "Reset operasional berhasil"
        : "Reset operasional berdasarkan range tanggal berhasil",
      deletedInspections: deletedInspectionRows.length || inspectionIds.length,
      deletedMeasures: deletedMeasuresRows.length,
      deletedLines: deletedLinesRows.length,
      deletedPhotos: filePathsToDelete.length,
      range: {
        startDate: rawStartDate || null,
        endDate: rawEndDate || null,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Reset gagal" })
  }
}