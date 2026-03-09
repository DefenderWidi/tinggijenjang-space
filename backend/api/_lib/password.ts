import crypto from "crypto"

export function hashPassword(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function verifyPassword(raw: string, hashed: string) {
  return hashPassword(raw) === hashed
}