import type { VercelRequest, VercelResponse } from "@vercel/node"
import { requireAdmin } from "../../_lib/adminAuth.js"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { hashPassword } from "../../_lib/password.js"

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
  res.setHeader("Access-Control-Allow-Methods", "PATCH,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
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

const ALLOWED_ROLES = ["USER", "ADMIN"] as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)

  if (req.method === "OPTIONS") return res.status(200).end()
  if (!requireAdmin(req, res)) return
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" })

  try {
    const id = String(req.query.id ?? "").trim()
    if (!id) return res.status(400).json({ error: "User id is required" })

    const body = parseBody(req)
    if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.role != null) {
      const role = String(body.role).trim().toUpperCase()
      if (!ALLOWED_ROLES.includes(role as any)) {
        return res.status(400).json({ error: "Role tidak valid" })
      }
      patch.role = role
    }

    if (body.is_active != null) {
      patch.is_active = !!body.is_active
    }

    if (body.password != null) {
      const password = String(body.password).trim()
      if (password.length < 4) {
        return res.status(400).json({ error: "Password minimal 4 karakter" })
      }
      patch.password_hash = hashPassword(password)
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .update(patch)
      .eq("id", id)
      .select("id, username, role, is_active, created_at, updated_at")
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Internal error" })
  }
}