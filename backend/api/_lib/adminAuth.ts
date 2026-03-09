import type { VercelRequest, VercelResponse } from "@vercel/node"
import crypto from "crypto"

const COOKIE_NAME = "mt_admin_auth"

function getAdminToken() {
  const user = process.env.ADMIN_USERNAME || ""
  const pass = process.env.ADMIN_PASSWORD || ""
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret"
  return crypto
    .createHash("sha256")
    .update(`${user}:${pass}:${secret}`)
    .digest("hex")
}

export function setAdminCookie(res: VercelResponse) {
  const token = getAdminToken()

  const isProd = process.env.NODE_ENV === "production"
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=28800",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ")

  res.setHeader("Set-Cookie", cookie)
}

export function clearAdminCookie(res: VercelResponse) {
  const isProd = process.env.NODE_ENV === "production"
  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ")

  res.setHeader("Set-Cookie", cookie)
}

export function isAdminRequest(req: VercelRequest) {
  const rawCookie = req.headers.cookie || ""
  const expected = getAdminToken()
  return rawCookie.includes(`${COOKIE_NAME}=${expected}`)
}

export function requireAdmin(req: VercelRequest, res: VercelResponse) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }
  return true
}