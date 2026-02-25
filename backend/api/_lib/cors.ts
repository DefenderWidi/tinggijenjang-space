import type { VercelRequest, VercelResponse } from "@vercel/node"

const ALLOW_ORIGINS = [
  "https://tinggijenjang-exss20pp5-defender-widis-projects.vercel.app",
  // kalau nanti FE kamu pakai domain production lain, tambahin di sini:
  // "https://tinggijenjang-xxxx.vercel.app",
]

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined

  // allow no-origin (Postman/curl) + allowlist (browser)
  const allowed =
    !origin || ALLOW_ORIGINS.includes(origin)

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*")
  }

  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return true // stop handler
  }

  // kalau origin tidak di-allow, boleh reject biar jelas
  if (!allowed) {
    res.status(403).json({ error: "CORS: origin not allowed", origin })
    return true
  }

  return false
}