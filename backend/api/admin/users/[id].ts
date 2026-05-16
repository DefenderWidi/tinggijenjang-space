import type { VercelRequest, VercelResponse } from "@vercel/node"
import { requireAdmin } from "../../_lib/adminAuth.js"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { hashPassword } from "../../_lib/password.js"

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || ""
  const allowedOrigins = [
    "http://localhost:5173",
    "https://tinggijenjang.vercel.app",
    "https://tinggijenjang-space.vercel.app",
  ]

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  }

  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "PATCH,OPTIONS")
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

const ALLOWED_ROLES = ["USER", "ADMIN"] as const
const ALLOWED_OPERATIONAL_ACCESS = ["NONE", "FIELD", "PJA", "ALL"] as const
const ALLOWED_SITES = ["LAT", "IPR", "SDJ", "ADT"] as const

function normalizeSite(value: any) {
  const site = String(value || "LAT").trim().toUpperCase()

  if (ALLOWED_SITES.includes(site as (typeof ALLOWED_SITES)[number])) {
    return site
  }

  return "LAT"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res)

  if (req.method === "OPTIONS") return res.status(200).end()
  if (!requireAdmin(req, res)) return

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const id = String(req.query.id ?? "").trim()
    if (!id) return res.status(400).json({ error: "User id is required" })

    const body = parseBody(req)
    if (body === null) {
      return res.status(400).json({ error: "Invalid JSON body" })
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("app_users")
      .select("id, username, role, operational_access, site")
      .eq("id", id)
      .single()

    if (existingUserError || !existingUser) {
      return res.status(404).json({ error: "User tidak ditemukan" })
    }

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    let nextRole = String(existingUser.role || "USER").toUpperCase()
    let nextOperationalAccess = String(
      existingUser.operational_access || "NONE"
    ).toUpperCase()

    if (body.role != null) {
      const role = String(body.role).trim().toUpperCase()

      if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
        return res.status(400).json({ error: "Role tidak valid" })
      }

      nextRole = role
      patch.role = role
    }

    if (body.operational_access != null || body.operationalAccess != null) {
      const operationalAccess = String(
        body.operational_access ?? body.operationalAccess
      )
        .trim()
        .toUpperCase()

      if (
        !ALLOWED_OPERATIONAL_ACCESS.includes(
          operationalAccess as (typeof ALLOWED_OPERATIONAL_ACCESS)[number]
        )
      ) {
        return res.status(400).json({ error: "Operational access tidak valid" })
      }

      nextOperationalAccess = operationalAccess
      patch.operational_access = operationalAccess
    }

    if (
      body.site != null ||
      body.siteCode != null ||
      body.activeSite != null ||
      body.selectedSite != null ||
      body.workspaceSite != null
    ) {
      patch.site = normalizeSite(
        body.site ??
          body.siteCode ??
          body.activeSite ??
          body.selectedSite ??
          body.workspaceSite
      )
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

    if (nextRole === "ADMIN") {
      patch.operational_access = "ALL"
    } else if (body.operational_access == null && body.operationalAccess == null) {
      patch.operational_access = nextOperationalAccess
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .update(patch)
      .eq("id", id)
      .select(
        "id, username, role, operational_access, site, is_active, created_at, updated_at"
      )
      .single()

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({
      data: {
        ...data,
        site: normalizeSite(data.site),
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Internal error" })
  }
}