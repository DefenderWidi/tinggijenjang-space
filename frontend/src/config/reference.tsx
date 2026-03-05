// src/config/reference.ts

export const REF_PRESET_M = {
  EX3600: 7.8,
  EX2500: 7.0,
  EX2000: 5.97,
} as const

export type RefKey = keyof typeof REF_PRESET_M

// LIMIT per unit
export function getLimitM(refUnit?: string | null): number {
  const key = String(refUnit ?? "").toUpperCase()

  if (key === "EX3600") return 8
  if (key === "EX2500") return 8
  if (key === "EX2000") return 6

  // fallback kalau unit tidak dikenal
  return 8
}

// helper label UI
export function formatRefLabel(k: RefKey) {
  return k
}