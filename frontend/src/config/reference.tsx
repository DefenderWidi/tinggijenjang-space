// src/config/reference.ts

// Reference height tiap unit (meter)
export const REF_PRESET_M = {
  B2000: 5.97,
  B6015: 5.25,
  B6020: 6.37,
  S3600: 7.83,
  B3600: 7.83,
  B2500: 7.04,
  S2500: 7.04,
  B1250: 5.18,
  S4000: 8.30,
  B4000: 8.30,
} as const

export type RefKey = keyof typeof REF_PRESET_M


// Limit tinggi jenjang tiap unit (meter)
export const LIMIT_PRESET_M: Record<RefKey, number> = {
  B2000: 4,
  B6015: 3,
  B6020: 4,
  S3600: 8,
  B3600: 4,
  S2500: 8,
  B2500: 4,
  B1250: 3,
  S4000: 8,
  B4000: 4,
}


// ambil limit berdasarkan unit
export function getLimitM(refUnit?: string | null): number {
  const key = String(refUnit ?? "").toUpperCase() as RefKey
  return LIMIT_PRESET_M[key] ?? 8
}


// ambil reference height
export function getReferenceM(refUnit?: string | null): number {
  const key = String(refUnit ?? "").toUpperCase() as RefKey
  return REF_PRESET_M[key] ?? 0
}


// helper label UI
export function formatRefLabel(k: RefKey) {
  const type = k.startsWith("S") ? "Shovel" : "Backhoe"
  return `${k} (${type})`
}