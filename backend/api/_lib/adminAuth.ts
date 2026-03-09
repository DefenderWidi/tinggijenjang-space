import type { VercelRequest, VercelResponse } from "@vercel/node"
import crypto from "crypto"

const COOKIE_NAME = "mt_auth"

function getSecret() {
  return process.env.AUTH_COOKIE_SECRET || process.env.ADMIN_SESSION_SECRET || "dev-secret"
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex")
}

function encodePayload(payload: Record<string, any>) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
}

function parseCookies(req: VercelRequest) {
  const raw = req.headers.cookie || ""
  const out: Record<string, string> = {}

  raw.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=")
    if (!key) return
    out[key] = rest.join("=")
  })

  return out
}

export function setAuthCookie(
  res: VercelResponse,
  user: { id: string; username: string; role: string }
) {
  const isProd = process.env.NODE_ENV === "production"

  const payload = encodePayload({
    id: user.id,
    username: user.username,
    role: user.role,
  })

  const signature = sign(payload)
  const token = `${payload}.${signature}`

  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    isProd ? "SameSite=None" : "SameSite=Lax",
    isProd ? "Secure" : "",
    "Max-Age=28800",
  ]
    .filter(Boolean)
    .join("; ")

  res.setHeader("Set-Cookie", cookie)
}

export function clearAuthCookie(res: VercelResponse) {
  const isProd = process.env.NODE_ENV === "production"

  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    isProd ? "SameSite=None" : "SameSite=Lax",
    isProd ? "Secure" : "",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ")

  res.setHeader("Set-Cookie", cookie)
}

export function getAuthUser(req: VercelRequest) {
  try {
    const cookies = parseCookies(req)
    const token = cookies[COOKIE_NAME]
    if (!token) return null

    const [payload, signature] = token.split(".")
    if (!payload || !signature) return null

    const expected = sign(payload)
    if (signature !== expected) return null

    const user = decodePayload(payload)
    if (!user?.id || !user?.username || !user?.role) return null

    return user
  } catch {
    return null
  }
}

export function isAdminRequest(req: VercelRequest) {
  const user = getAuthUser(req)
  return !!user && user.role === "ADMIN"
}

export function requireAdmin(req: VercelRequest, res: VercelResponse) {
  const user = getAuthUser(req)

  if (!user) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }

  if (user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" })
    return false
  }

  return true
}