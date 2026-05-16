import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { verifyPassword } from "../_lib/password.js"
import { setAuthCookie } from "../_lib/adminAuth.js"

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || ""

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://tinggijenjang-space.vercel.app",
    "https://tinggijenjang-space-be.vercel.app",
  ]

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://tinggijenjang-space.vercel.app")
  }

  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
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

function normalizeSite(value: any) {
  const site = String(value || "LAT").trim().toUpperCase()
  if (site === "LAT" || site === "IPR" || site === "SDJ" || site === "ADT") {
    return site
  }
  return "LAT"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)

  if (req.method === "OPTIONS") return res.status(200).end()
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
      return res.status(400).json({ error: "Username dan password wajib diisi" })
    }

    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select(
        "id, username, password_hash, role, operational_access, site, is_active"
      )
      .eq("username", username)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!user) return res.status(401).json({ error: "Username atau password salah" })
    if (!user.is_active) return res.status(403).json({ error: "Akun dinonaktifkan" })

    const ok = verifyPassword(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: "Username atau password salah" })

    const site = normalizeSite(user.site)

    setAuthCookie(res, {
      id: user.id,
      username: user.username,
      role: user.role,
    })

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        operationalAccess: user.operational_access ?? "NONE",
        site,
        siteCode: site,
        activeSite: site,
        selectedSite: site,
        workspaceSite: site,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Internal error" })
  }
}