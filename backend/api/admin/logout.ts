import type { VercelRequest, VercelResponse } from "@vercel/node"
import { clearAdminCookie } from "../_lib/adminAuth.js"

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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  clearAdminCookie(res)
  return res.status(200).json({ ok: true })
}