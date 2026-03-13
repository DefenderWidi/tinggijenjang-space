import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { verifyPassword } from "../_lib/password.js"
import { setAuthCookie } from "../_lib/adminAuth.js"

type OperationalAccess = "NONE" | "FIELD" | "PJA"

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
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
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

function normalizeOperationalAccess(value: unknown): OperationalAccess {
  const v = String(value ?? "NONE").trim().toUpperCase()
  if (v === "FIELD" || v === "PJA") return v
  return "NONE"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const body = parseBody(req)

    if (body === null) {
      return res.status(400).json({ error: "Invalid JSON body" })
    }

    const username = String(body.username ?? "").trim()
    const password = String(body.password ?? "").trim()

    if (!username || !password) {
      return res.status(400).json({
        error: "Username dan password wajib diisi",
      })
    }

    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, password_hash, role, operational_access, is_active")
      .eq("username", username)
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!user) {
      return res.status(401).json({ error: "Username atau password salah" })
    }

    if (!user.is_active) {
      return res.status(403).json({ error: "Akun dinonaktifkan" })
    }

    const passwordOk = verifyPassword(password, user.password_hash)

    if (!passwordOk) {
      return res.status(401).json({ error: "Username atau password salah" })
    }

    const operationalAccess = normalizeOperationalAccess(user.operational_access)

    setAuthCookie(res, {
      id: user.id,
      username: user.username,
      role: user.role,
    })

    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        operational_access: operationalAccess,
      },
    })
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Internal error",
    })
  }
}