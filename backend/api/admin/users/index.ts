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
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
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

  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("app_users")
        .select("id, username, role, is_active, created_at, updated_at")
        .order("created_at", { ascending: false })

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ data: data || [] })
    }

    if (req.method === "POST") {
      const body = parseBody(req)
      if (body === null) return res.status(400).json({ error: "Invalid JSON body" })

      const username = String(body.username ?? "").trim()
      const password = String(body.password ?? "").trim()
      const role = String(body.role ?? "").trim().toUpperCase()

      if (!username || !password || !role) {
        return res.status(400).json({ error: "Required: username, password, role" })
      }

      if (!ALLOWED_ROLES.includes(role as any)) {
        return res.status(400).json({ error: "Role tidak valid" })
      }

      if (password.length < 4) {
        return res.status(400).json({ error: "Password minimal 4 karakter" })
      }

      const { data: existing, error: checkError } = await supabaseAdmin
        .from("app_users")
        .select("id")
        .eq("username", username)
        .maybeSingle()

      if (checkError) return res.status(500).json({ error: checkError.message })
      if (existing) return res.status(409).json({ error: "Username sudah digunakan" })

      const payload = {
        username,
        password_hash: hashPassword(password),
        role,
        is_active: true,
      }

      const { data, error } = await supabaseAdmin
        .from("app_users")
        .insert(payload)
        .select("id, username, role, is_active, created_at, updated_at")
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json({ data })
    }

    return res.status(405).json({ error: "Method not allowed" })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Internal error" })
  }
}