import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url) throw new Error("Missing SUPABASE_URL")
if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(url, key)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from("inspections").select("id").limit(1)
  if (error) return res.status(500).json({ ok: false, error: error.message })
  return res.status(200).json({ ok: true, data })
}