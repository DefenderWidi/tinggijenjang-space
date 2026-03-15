import { useEffect, useMemo, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import BumaLoader from "../components/BumaLoader"
import BumaCheck from "../components/BumaCheck"
import BumaCross from "../components/BumaCross"
import { getLimitM } from "../config/reference"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""
const LS_KEY = "mt_session_v1"

type Shift = "DAY" | "NIGHT"
type Pelaksanaan = "START" | "MID" | "END"
type ReviewStatus = "PENDING" | "VALID" | "REJECT"
type TabKey = "PENDING" | "VALID" | "REJECT" | "ALL"

type InspectionRow = {
  id: string
  inspectedAt: string
  inspector: string
  shift: Shift
  pelaksanaan: Pelaksanaan
  front: string
  linesCount: number
  linesOkCount: number
  maxHeightM: number
  reviewStatus: ReviewStatus
  reviewedBy: string | null
  reviewNotes?: string | null
  ref_unit?: string | null
  ref_meter?: number | null
}

type MeasureRow = {
  id: string
  inspection_id: string
  image_url: string
  created_at?: string
  orientation?: string | null
  ref_unit?: string | null
  ref_meter?: number | null
  pixel_per_meter?: number | null
  lines_count?: number | null
  lines_ok_count?: number | null
  max_height_m?: number | null
  lines?: any[] | null
  line_items?: any[] | null
  lineItems?: any[] | null
  items?: any[] | null
}

type LineItem = { label: string; heightM: number | null; ok?: boolean | null }

function getSession() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { role?: string; username?: string }
  } catch {
    return null
  }
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function shiftLabel(s: Shift) {
  return s === "DAY" ? "Siang" : "Malam"
}

function pelaksanaanLabel(p: Pelaksanaan) {
  if (p === "START") return "Awal Shift"
  if (p === "MID") return "Tengah Shift"
  return "Akhir Shift"
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "-", time: "-" }
  const pad = (n: number) => String(n).padStart(2, "0")
  const date = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { date, time }
}

function pillReview(review: ReviewStatus) {
  if (review === "VALID")
    return "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
  if (review === "REJECT")
    return "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600"
  if (review === "PENDING")
    return "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"
  return "bg-black/5 text-buma-muted border-buma-border"
}

function tabActiveClass(k: TabKey) {
  switch (k) {
    case "VALID":
      return "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green shadow-sm"
    case "REJECT":
      return "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600 shadow-sm"
    case "PENDING":
      return "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue shadow-sm"
    case "ALL":
    default:
      return "border-buma-border bg-gradient-to-r from-black/20 to-black/5 text-buma-text shadow-sm"
  }
}

// backend belum punya endpoint line-items? fallback label A,B,C...
function buildFallbackLines(n: number): LineItem[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  return Array.from({ length: Math.max(0, n) }, (_, i) => ({
    label: letters[i] ?? String(i + 1),
    heightM: null,
  }))
}

function parseLinesFromMeasure(m: MeasureRow | any): LineItem[] {
  const arr =
    (Array.isArray(m?.lines) && m.lines) ||
    (Array.isArray(m?.line_items) && m.line_items) ||
    (Array.isArray(m?.lineItems) && m.lineItems) ||
    (Array.isArray(m?.items) && m.items) ||
    []

  const mapped: LineItem[] = arr
    .map((x: any) => {
      const label = String(x?.label ?? x?.point ?? x?.name ?? "").trim()
      const rawH = x?.height_m ?? x?.heightM ?? x?.height ?? null
      const heightNum = rawH == null ? null : Number(rawH)
      return {
        label,
        heightM: Number.isFinite(heightNum) ? heightNum : null,
        ok: x?.ok === true ? true : x?.ok === false ? false : null,
      }
    })
    .filter((x: LineItem) => x.label)

  return mapped
}

function MetaCard({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-buma-border bg-white p-3 text-xs">
      <div className="text-buma-muted">{k}</div>
      <div className="mt-1 font-extrabold text-buma-text">{v}</div>
    </div>
  )
}

function MetaMini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-buma-border bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-buma-muted">{k}</div>
      <div className="mt-0.5 text-xs font-extrabold text-buma-text">{v}</div>
    </div>
  )
}

function SubmitResultCard({
  variant,
  title,
  desc,
  onClose,
  onRetry,
  icon,
}: {
  variant: "success" | "error"
  title: string
  desc?: string
  onClose: () => void
  onRetry?: () => void
  icon?: React.ReactNode
}) {
  const ok = variant === "success"

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center justify-center gap-3 text-center sm:max-w-[380px]">
      <div className="grid h-16 w-16 place-items-center sm:h-20 sm:w-20">
        {icon ? icon : ok ? <BumaCheck size="md" /> : <BumaCross size="md" />}
      </div>

      <div className="text-sm font-extrabold tracking-wide text-buma-text sm:text-[15px]">
        {title}
      </div>

      {desc ? (
        <div className="text-xs leading-relaxed text-buma-muted sm:text-sm">
          {desc}
        </div>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#15803D] to-[#22A745] px-4 py-2 text-xs font-extrabold text-white shadow-soft transition active:scale-95 hover:opacity-85"
            onClick={onRetry}
          >
            Coba Lagi
          </button>
        ) : null}

        <button
          type="button"
          className="rounded-xl border border-buma-border bg-white px-4 py-2 text-xs font-extrabold text-buma-text shadow-soft transition active:scale-95 hover:bg-black/5"
          onClick={onClose}
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

export default function PjaDashboard() {
  const session = getSession()
  const pjaName = session?.username ? session.username : "PJA"

  const [rows, setRows] = useState<InspectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [tab, setTab] = useState<"ALL" | ReviewStatus>("PENDING")

  // modal state
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<InspectionRow | null>(null)
  const [imgOpen, setImgOpen] = useState(false)
  const [notes, setNotes] = useState("")

  // photo/measures state (lazy)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [measureMeta, setMeasureMeta] = useState<{
    ref_unit?: string | null
    ref_meter?: number | null
    pixel_per_meter?: number | null
    orientation?: string | null
  } | null>(null)
  const [measureLoading, setMeasureLoading] = useState(false)
  const [measureErr, setMeasureErr] = useState<string | null>(null)

  // lines + per-line verification
  const [lines, setLines] = useState<LineItem[]>([])
  const [lineVerify, setLineVerify] = useState<Record<string, boolean | null>>({})

  // submit state (kirim verifikasi)
  type SubmitStatus = "idle" | "loading" | "success" | "error"
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [submitMsg, setSubmitMsg] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ===== fetch inspections =====
  async function fetchInspections() {
    setLoading(true)
    setLoadErr(null)
    try {
      const r = await fetch(`${API_BASE}/api/inspections`, { method: "GET" })
      if (!r.ok) throw new Error(await r.text())
      const j = await r.json()

      const data = Array.isArray(j?.data) ? j.data : []
      const mapped: InspectionRow[] = data.map((x: any) => ({
        id: String(x.id),
        inspectedAt: String(x.inspected_at ?? x.inspectedAt ?? ""),
        inspector: String(x.inspector ?? ""),
        shift: (x.shift === "DAY" || x.shift === "NIGHT" ? x.shift : "DAY") as Shift,
        pelaksanaan: (x.pelaksanaan === "START" || x.pelaksanaan === "MID" || x.pelaksanaan === "END"
          ? x.pelaksanaan
          : "START") as Pelaksanaan,
        front: String(x.front ?? ""),
        linesCount: Number(x.lines_count ?? 0),
        linesOkCount: Number(x.lines_ok_count ?? 0),
        maxHeightM: Number(x.max_height_m ?? 0),
        reviewStatus: (x.review_status === "VALID" || x.review_status === "REJECT" || x.review_status === "PENDING"
          ? x.review_status
          : "PENDING") as ReviewStatus,
        reviewedBy: x.reviewed_by ? String(x.reviewed_by) : null,
        reviewNotes: x.review_notes ?? null,
        ref_unit: x.ref_unit ?? null,
        ref_meter: x.ref_meter ?? null,
      }))

      setRows(mapped)
    } catch (e: any) {
      setLoadErr(e?.message ?? "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInspections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const c = { ALL: rows.length, PENDING: 0, VALID: 0, REJECT: 0 }
    rows.forEach((x) => c[x.reviewStatus]++)
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return rows.filter((x) => {
      const okTab = tab === "ALL" ? true : x.reviewStatus === tab
      const { date, time } = fmtDateTime(x.inspectedAt)
      const okQ =
        !query ||
        x.id.toLowerCase().includes(query) ||
        x.front.toLowerCase().includes(query) ||
        x.inspector.toLowerCase().includes(query) ||
        date.toLowerCase().includes(query) ||
        time.toLowerCase().includes(query)
      return okTab && okQ
    })
  }, [rows, q, tab])

  function closeDetail() {
    setOpen(false)
    setActive(null)
    setNotes("")
    setImgOpen(false)

    setPhotoUrl(null)
    setMeasureMeta(null)
    setMeasureErr(null)
    setMeasureLoading(false)

    setLines([])
    setLineVerify({})
  }

  async function fetchLatestMeasure(inspectionId: string): Promise<LineItem[] | null> {
    setMeasureLoading(true)
    setMeasureErr(null)

    try {
      const r = await fetch(`${API_BASE}/api/measures?inspection_id=${encodeURIComponent(inspectionId)}`, {
        method: "GET",
      })
      if (!r.ok) throw new Error(await r.text())

      const j = await r.json()
      const data: MeasureRow[] = Array.isArray(j?.data) ? j.data : j?.data ? [j.data] : []
      const m: any = data[0]

      if (!m?.image_url) {
        setPhotoUrl(null)
        setMeasureMeta(null)
        return null
      }

      setPhotoUrl(String(m.image_url))
      setMeasureMeta({
        ref_unit: m.ref_unit ?? null,
        ref_meter: m.ref_meter ?? null,
        pixel_per_meter: m.pixel_per_meter ?? null,
        orientation: m.orientation ?? null,
      })

      const linesFromMeasure = parseLinesFromMeasure(m)
      return linesFromMeasure.length ? linesFromMeasure : null
    } catch (e: any) {
      setMeasureErr(e?.message ?? "Failed to load photo")
      setPhotoUrl(null)
      setMeasureMeta(null)
      return null
    } finally {
      setMeasureLoading(false)
    }
  }

  async function fetchLinesForInspection(inspectionId: string, fallbackCount: number): Promise<LineItem[]> {
    try {
      const r2 = await fetch(`${API_BASE}/api/inspection-lines?inspection_id=${encodeURIComponent(inspectionId)}`, {
        method: "GET",
      })
      if (r2.ok) {
        const j2 = await r2.json()
        const arr = Array.isArray(j2?.data) ? j2.data : []
        if (arr.length) {
          return arr
            .map((x: any) => {
              const label = String(x.label ?? "").trim()
              const h = Number(x.height_m ?? x.heightM ?? NaN)
              return {
                label,
                heightM: Number.isFinite(h) ? h : null,
                ok: x.ok === true ? true : x.ok === false ? false : null,
              } as LineItem
            })
            .filter((x: LineItem) => x.label)
        }
      }
      return buildFallbackLines(fallbackCount)
    } catch {
      return buildFallbackLines(fallbackCount)
    }
  }

  async function openDetail(item: InspectionRow) {
    setActive(item)
    setOpen(true)
    setNotes(item.reviewNotes ?? "")
    setImgOpen(false)

    setMeasureMeta((prev) => ({
      ...(prev ?? {}),
      ref_unit: item.ref_unit ?? prev?.ref_unit ?? null,
      ref_meter: item.ref_meter ?? prev?.ref_meter ?? null,
    }))

    const linesFromMeasure = await fetchLatestMeasure(item.id)
    const loadedLines = linesFromMeasure ?? (await fetchLinesForInspection(item.id, item.linesCount))

    setLines(loadedLines)

    const init: Record<string, boolean | null> = {}
    loadedLines.forEach((ln) => (init[ln.label] = ln.ok ?? null))
    setLineVerify(init)
  }

  const allVerified = useMemo(() => {
    if (!lines.length) return false
    return lines.every((ln) => lineVerify[ln.label] !== null && lineVerify[ln.label] !== undefined)
  }, [lines, lineVerify])

  // standar = limit berdasarkan unit (sementara return 8 untuk semua)
const standardM = useMemo(() => {
  return getLimitM(measureMeta?.ref_unit ?? active?.ref_unit ?? null)
}, [measureMeta?.ref_unit, active?.ref_unit])

async function send() {
  if (!active) return
  if (!allVerified) return
  if (isSubmitting) return

  try {
    setIsSubmitting(true)
    setSubmitStatus("loading")
    setSubmitMsg("Mengirim verifikasi & menyimpan hasil...")

    const missingHeight = lines.filter((ln) => ln.heightM == null)
    if (missingHeight.length) {
      throw new Error(
        `Tinggi titik belum tersedia untuk: ${missingHeight.map((x) => x.label).join(", ")}`
      )
    }

    // 1) SIMPAN PER-TITIK
    const payloadLines = lines.map((ln) => ({
      label: ln.label,
      height_m: ln.heightM as number,
      ok: lineVerify[ln.label] ?? null,
    }))

    const rLines = await fetch(`${API_BASE}/api/inspection-lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspection_id: active.id,
        lines: payloadLines,
      }),
    })

    const linesResult = await rLines.json().catch(() => null)
    if (!rLines.ok) {
      throw new Error(linesResult?.error || "Gagal menyimpan detail titik inspeksi")
    }

    // 2) UPDATE SUMMARY INSPECTIONS
    const okCount = Object.values(lineVerify).filter((v) => v === true).length

    const r = await fetch(`${API_BASE}/api/inspections/${encodeURIComponent(active.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        review_status: "VALID",
        reviewed_by: pjaName,
        review_notes: notes || null,
        lines_ok_count: okCount,
      }),
    })

    const result = await r.json().catch(() => null)
    if (!r.ok) {
      throw new Error(result?.error || "Gagal update status inspeksi")
    }

    setSubmitStatus("success")
    setSubmitMsg("Verifikasi berhasil dikirim.")

    await fetchInspections()

    setTimeout(() => {
      setSubmitStatus("idle")
      closeDetail()
    }, 2000)
  } catch (e: any) {
    setSubmitStatus("error")
    setSubmitMsg(e?.message ? String(e.message) : "Terjadi kendala. Silakan coba lagi.")
  } finally {
    setIsSubmitting(false)
  }
}

  return (

    <AppLayout>
      {submitStatus !== "idle" && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

          <div className="relative mx-4 w-[min(92vw,420px)] rounded-2xl border border-buma-border bg-white p-6 shadow-2xl">
            {submitStatus === "loading" ? (
              <BumaLoader />
            ) : submitStatus === "success" ? (
              <SubmitResultCard
                variant="success"
                title="Tersimpan"
                desc={submitMsg || "Verifikasi berhasil dikirim."}
                onClose={() => setSubmitStatus("idle")}
              />
            ) : (
              <SubmitResultCard
                variant="error"
                title="Gagal"
                desc={submitMsg || "Terjadi kendala. Silakan coba lagi."}
                onClose={() => setSubmitStatus("idle")}
                onRetry={() => {
                  setSubmitStatus("loading")
                  setSubmitMsg("Mencoba ulang mengirim verifikasi...")
                  void send()
                }}
              />
            )}
          </div>
        </div>
      )}
      <div className="space-y-4">
        {/* ===== HERO ===== */}
        <div className="relative overflow-hidden rounded-3xl border border-buma-border bg-white shadow-soft">
          <div className="h-[150px] w-full bg-cover bg-center" style={{ backgroundImage: "url('/LoginBackground.jpeg')" }} />
          <div className="absolute inset-0 bg-black/50" />

          <div className="absolute inset-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/70">PJA Console</div>
                <div className="mt-1 text-xl font-extrabold text-white">Dashboard Verifikasi Tinggi Jenjang</div>
                <div className="mt-1 text-sm text-white/80">Menampilkan hasil submit inspector (summary + foto overlay).</div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-right backdrop-blur">
                <div className="text-xs text-white/70">Logged in as</div>
                <div className="text-sm font-extrabold text-white">{pjaName}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/85 backdrop-blur">
                Pending: {counts.PENDING}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/85 backdrop-blur">
                Valid: {counts.VALID}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/85 backdrop-blur">
                Reject: {counts.REJECT}
              </span>
              <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/85 backdrop-blur">
                Limit referensi: {standardM.toFixed(1)} m
              </span>
            </div>
          </div>
        </div>

        {/* ===== FILTERS ===== */}
        <div className="rounded-3xl border border-buma-border bg-white/80 shadow-soft backdrop-blur">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari Tanggal / Waktu / Front / Inspector…"
                className="w-full md:w-[360px] rounded-xl border border-buma-border bg-white px-3 py-2 text-sm text-buma-text placeholder:text-buma-muted outline-none focus:border-buma-green/60"
              />

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["PENDING", `Pending ${counts.PENDING}`],
                    ["VALID", `Valid ${counts.VALID}`],
                    ["REJECT", `Reject ${counts.REJECT}`],
                    ["ALL", `All ${counts.ALL}`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={cls(
                      "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                      tab === k ? tabActiveClass(k) : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                    )}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={fetchInspections}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text transition hover:bg-black/5"
                title="Refresh"
              >
                <span className="text-sm leading-none">↻</span>
                Refresh
              </button>
            </div>

            {loadErr ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Gagal load data: {loadErr}
              </div>
            ) : null}
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="rounded-3xl border border-buma-border bg-white shadow-soft min-w-0">
          <div className="px-4 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-buma-text">Daftar Inspeksi</div>
                <div className="mt-1 text-xs text-buma-muted">
                  Klik <b>Detail</b> untuk lihat foto overlay dan verifikasi.
                </div>
              </div>
            </div>
          </div>

          <div
            className="mt-3 overflow-x-auto px-4 pb-2
             [-webkit-overflow-scrolling:touch]
             overscroll-x-contain"
          >
            <table className="w-full min-w-[980px] text-sm text-buma-text">
              <thead>
                <tr className="border-y border-buma-border text-left text-buma-muted">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="py-3">Waktu</th>
                  <th className="py-3">Inspector</th>
                  <th className="py-3">Shift</th>
                  <th className="py-3">Pelaksanaan</th>
                  <th className="py-3">Front / Area</th>
                  <th className="py-3">Max</th>
                  <th className="py-3">Lines</th>
                  <th className="py-3">Review</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-buma-muted" colSpan={10}>
                      Loading…
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((x) => {
                      const { date, time } = fmtDateTime(x.inspectedAt)
                      const limitRow = getLimitM(x.ref_unit ?? null)
                      const danger = x.maxHeightM > limitRow
                      return (
                        <tr key={x.id} className="border-b border-buma-border hover:bg-black/5">
                          <td className="px-4 py-3 font-semibold">{date}</td>
                          <td className="py-3 text-buma-muted">{time}</td>
                          <td className="py-3">{x.inspector}</td>
                          <td className="py-3 text-buma-muted">{shiftLabel(x.shift)}</td>
                          <td className="py-3 text-buma-muted">{pelaksanaanLabel(x.pelaksanaan)}</td>
                          <td className="py-3 text-buma-muted">{x.front}</td>

                          <td className="py-3">
                            <span
                              className={cls(
                                "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold",
                                danger
                                  ? "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600"
                                  : "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
                              )}
                            >
                              {x.maxHeightM.toFixed(2)} m
                            </span>
                          </td>

                          <td className="py-3">
                            <span className="inline-flex rounded-full border border-buma-border/60 bg-gradient-to-r from-black/5 to-black/0 px-2.5 py-1 text-xs font-extrabold text-buma-muted shadow-sm">
                              {x.linesCount}
                            </span>
                          </td>

                          <td className="py-3">
                            <span className={cls("inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold", pillReview(x.reviewStatus))}>
                              {x.reviewStatus}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void openDetail(x)}
                              className="inline-flex items-center gap-1.5 rounded-xl
                                border border-buma-border
                                bg-gradient-to-r from-black/5 to-transparent
                                px-3 py-2 text-xs font-extrabold text-buma-text
                                shadow-sm transition-all duration-200
                                hover:border-black/30
                                hover:bg-gradient-to-r hover:from-black/8 hover:to-transparent
                                hover:shadow-md"
                              title="Lihat detail inspeksi untuk verifikasi"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 20 20"
                                className="opacity-80"
                              >
                                <path
                                  fill="currentColor"
                                  d="M6.25 4.5A1.75 1.75 0 0 0 4.5 6.25v7.5c0 .966.784 1.75 1.75 1.75h7.5a1.75 1.75 0 0 0 1.75-1.75v-2a.75.75 0 0 1 1.5 0v2A3.25 3.25 0 0 1 13.75 17h-7.5A3.25 3.25 0 0 1 3 13.75v-7.5A3.25 3.25 0 0 1 6.25 3h2a.75.75 0 0 1 0 1.5zm4.25-.75a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0V5.56l-3.72 3.72a.75.75 0 1 1-1.06-1.06l3.72-3.72h-3.19a.75.75 0 0 1-.75-.75"
                                />
                              </svg>
                              Detail
                            </button>
                          </td>
                        </tr>
                      )
                    })}

                    {filtered.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-buma-muted" colSpan={10}>
                          Tidak ada data sesuai filter.
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-4 text-xs text-buma-muted">
            Total tampil: <b className="text-buma-text">{filtered.length}</b>
          </div>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {open && active ? (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/55" onClick={closeDetail} />

          <div className="absolute inset-0 flex items-end md:items-center justify-center p-2 md:p-6">
            <div
              className={cls(
                "w-full max-w-[1180px] rounded-3xl border border-buma-border bg-white/95 shadow-soft backdrop-blur",
                "h-[92vh] md:h-[88vh]",
                "overflow-hidden",
                "flex flex-col"
              )}
            >
              {/* header */}
              <div className="sticky top-0 z-10 border-b border-buma-border bg-white/95 px-4 py-3 md:px-5 md:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-buma-text">Detail Verifikasi — {active.id}</div>
                    <div className="mt-1 text-xs text-buma-muted">
                      {active.front} • {shiftLabel(active.shift)} • {pelaksanaanLabel(active.pelaksanaan)} •{" "}
                      {fmtDateTime(active.inspectedAt).date} {fmtDateTime(active.inspectedAt).time} • {active.inspector}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="shrink-0 rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text hover:bg-black/5"
                  >
                    ✕ Tutup
                  </button>
                </div>
              </div>

              {/* body */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
                <div className={cls("grid gap-4 p-3 sm:p-4 md:p-5", "lg:grid-cols-[1.45fr_0.85fr]")}>
                  {/* LEFT */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setImgOpen(true)}
                      className="group overflow-hidden rounded-2xl border border-buma-border bg-white text-left"
                      title="Klik untuk memperbesar"
                    >
                      <div className="relative w-full bg-white">
                        {measureLoading ? (
                          <div className="grid h-[280px] place-items-center text-xs text-buma-muted">Loading foto overlay…</div>
                        ) : (
                          <img
                            src={photoUrl ?? "/miningimage1.png"}
                            alt="Foto inspeksi"
                            className="w-full h-auto object-contain"
                            draggable={false}
                          />
                        )}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/35 to-transparent p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                          <span className="text-xs font-extrabold text-white/90">Klik untuk perbesar</span>
                         <span
  className="
  inline-flex items-center justify-center
  h-8 w-8
  rounded-full
  border border-white/25
  bg-white/10
  text-white/90
  backdrop-blur
  shadow-sm
  transition
  group-hover:scale-105
"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="m21 21l-4.343-4.343m0 0A8 8 0 1 0 5.343 5.343a8 8 0 0 0 11.314 11.314M11 8v6m-3-3h6"
    />
  </svg>
</span>
                        </div>
                      </div>
                    </button>

                    {measureErr ? (
                      <div className="rounded-2xl border border-buma-orange/25 bg-buma-orange/10 px-3 py-2 text-xs text-buma-orange">
                        Foto overlay belum bisa di-load dari backend. Pastikan ada endpoint{" "}
                        <b className="text-buma-text">GET /api/measures?inspection_id=...</b>.
                        <br />
                        Detail error: {measureErr}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <MetaCard k="Inspector" v={active.inspector} />
                      <MetaCard k="Shift" v={shiftLabel(active.shift)} />
                      <MetaCard k="Pelaksanaan" v={pelaksanaanLabel(active.pelaksanaan)} />
                      <MetaCard k="Front/Area" v={active.front} />
                      <MetaCard k="Max Height" v={`${active.maxHeightM.toFixed(2)} m`} />
                      <MetaCard k="Lines" v={`${active.linesCount}`} />
                    </div>

                    {measureMeta ? (
                      <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
                        <div className="font-extrabold text-buma-text">Metadata Kalibrasi</div>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <MetaMini k="Ref Unit" v={measureMeta.ref_unit ?? "—"} />
                          <MetaMini k="Ref Meter" v={measureMeta.ref_meter != null ? `${measureMeta.ref_meter}` : "—"} />
                          <MetaMini
                            k="Px/m"
                            v={measureMeta.pixel_per_meter != null ? `${measureMeta.pixel_per_meter}` : "—"}
                          />
                          <MetaMini k="Orientation" v={measureMeta.orientation ?? "—"} />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* RIGHT */}
                  <div className="space-y-3">
                    {/* Card Verifikasi */}
                    <div className="rounded-2xl border border-buma-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-extrabold text-buma-text">Verifikasi Tiap Titik</div>
                          <div className="mt-1 text-xs text-buma-muted">Pilih status tiap titik (A/B/C/…).</div>
                        </div>
                        <div className="shrink-0 rounded-2xl border border-buma-border bg-buma-bg px-3 py-2 text-xs font-extrabold text-buma-muted">
                          Limit {standardM.toFixed(1)} m
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {lines.map((ln) => {
                          const v = lineVerify[ln.label] ?? null

                          const toggleVal = (next: boolean) => {
                            setLineVerify((prev) => {
                              const cur = prev[ln.label]
                              return { ...prev, [ln.label]: cur === next ? null : next }
                            })
                          }

                          return (
                            <div key={ln.label} className="rounded-2xl border border-buma-border bg-buma-bg p-3">
                              {/* Row atas */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-semibold text-buma-muted leading-none">titik</span>
                                    <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-buma-border bg-white text-sm font-extrabold text-buma-text">
                                      {ln.label}
                                    </span>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-buma-muted">Tinggi</div>
                                    <div className="mt-0.5 text-sm font-extrabold text-buma-text">
                                      {ln.heightM == null ? "—" : `${ln.heightM.toFixed(2)} m`}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={cls(
                                    "shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
                                    v === null
                                      ? "border-buma-border bg-white text-buma-muted"
                                      : v
                                        ? "border-buma-blue/30 bg-buma-blue/10 text-buma-blue"
                                        : "border-red-500/30 bg-red-500/10 text-red-600"
                                  )}
                                >
                                  {v === null ? "Belum Diverifikasi" : v ? "Sesuai" : "Tidak sesuai"}
                                </span>
                              </div>

                              {/* Buttons */}
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleVal(true)}
                                  className={cls(
                                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none",
                                    v === true
                                      ? "border-buma-blue/40 bg-buma-blue/10 text-buma-blue"
                                      : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                                  )}
                                  aria-pressed={v === true}
                                >
                                  <span
                                    className={cls(
                                      "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px] leading-none",
                                      v === true ? "border-buma-blue/40 bg-buma-blue/10" : "border-buma-border bg-buma-bg"
                                    )}
                                  >
                                    {v === true ? "✓" : ""}
                                  </span>
                                  Sesuai
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleVal(false)}
                                  className={cls(
                                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none",
                                    v === false
                                      ? "border-red-500/35 bg-red-500/10 text-red-600"
                                      : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                                  )}
                                  aria-pressed={v === false}
                                >
                                  <span
                                    className={cls(
                                      "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px] leading-none",
                                      v === false ? "border-red-500/35 bg-red-500/10" : "border-buma-border bg-buma-bg"
                                    )}
                                  >
                                    {v === false ? "✓" : ""}
                                  </span>
                                  Tidak sesuai
                                </button>
                              </div>

                              <div className="mt-2 text-[11px] text-buma-muted">
                                Klik opsi yang sama sekali lagi untuk <b className="text-buma-text">membatalkan</b> pilihan.
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Card Catatan */}
                    <div className="rounded-2xl border border-buma-border bg-white p-4">
                      <div className="text-sm font-extrabold text-buma-text">Catatan</div>
                      <div className="mt-1 text-xs text-buma-muted">Opsional.</div>

                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tulis catatan untuk inspeksi ini…"
                        className="mt-3 w-full resize-none rounded-2xl border border-buma-border bg-white px-3 py-2 text-sm text-buma-text placeholder:text-buma-muted outline-none focus:border-buma-blue/50"
                        rows={4}
                      />
                      <div className="mt-1 text-right text-[11px] text-buma-muted">{notes.length}/1000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* footer */}
              <div className="sticky bottom-0 z-10 border-t border-buma-border bg-white/95 px-4 py-3 md:px-5">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-text hover:bg-black/5"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={!allVerified || isSubmitting || submitStatus === "loading"}
                    onClick={() => void send()}
                    className="rounded-xl bg-gradient-to-r from-[#2D5EFC] to-buma-blue px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95 disabled:opacity-40"
                    title={
                      !allVerified
                        ? "Semua titik harus diverifikasi (Sesuai / Tidak sesuai)"
                        : isSubmitting
                          ? "Mengirim..."
                          : "Kirim verifikasi"
                    }
                  >
                    {isSubmitting ? "Mengirim..." : "Kirim"}
                  </button>
                </div>

                {!allVerified ? (
                  <div className="mt-2 text-xs text-buma-muted">
                    * Wajib pilih <b className="text-buma-text">Sesuai / Tidak sesuai</b> untuk semua titik sebelum kirim.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* image viewer */}
          {imgOpen ? (
            <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-black/80" onClick={() => setImgOpen(false)} />
              <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
                <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="text-sm font-extrabold text-white/90">Preview Foto Overlay</div>
                    <button
                      type="button"
                      onClick={() => setImgOpen(false)}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold text-white/90 hover:bg-white/15"
                    >
                      ✕ Tutup
                    </button>
                  </div>

                  <div className="max-h-[78vh] overflow-auto p-3 [-webkit-overflow-scrolling:touch]">
                    <img
                      src={photoUrl ?? "/miningimage1.png"}
                      alt="Foto inspeksi"
                      className="mx-auto max-w-full h-auto object-contain"
                      draggable={false}
                    />
                  </div>

                  <div className="px-4 pb-4 text-xs text-white/70">
                    Tips: pinch-to-zoom (mobile) atau Ctrl + scroll (desktop) untuk memperbesar.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppLayout>
  )
}