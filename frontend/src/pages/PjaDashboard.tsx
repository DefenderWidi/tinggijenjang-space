import { useEffect, useMemo, useState, useRef } from "react"
import AppLayout from "../layouts/AppLayout"
import BumaLoader from "../components/BumaLoader"
import BumaCheck from "../components/BumaCheck"
import BumaCross from "../components/BumaCross"
import { getLimitM } from "../config/reference"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""
const LS_KEY = "mt_session_v1"
const AUTO_REFRESH_MS = 10000
const DISPOSAL_LIMIT_M = 50
const ROAD_LIMIT_M = 50

type Shift = "DAY" | "NIGHT"
type Pelaksanaan =
  | "START"
  | "MID"
  | "END"
  | "FASE_1"
  | "FASE_2"
  | "FASE_3"
  | "FASE_4"
type ReviewStatus = "PENDING" | "VALID"
type TabKey = "PENDING" | "VALID" | "ALL"
type InspectionType = "FRONT" | "DISPOSAL" | "ROAD"
type TypeFilter = "ALL" | InspectionType

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
  ref_verify_ok?: boolean | null
  ref_verify_meter?: number | null
  type: InspectionType
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

const DISPOSAL_REF_UNITS = new Set(["D155", "D375", "HD789", "HD785", "HD777"])

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
  if (p === "FASE_1") return "Fase 1"
  if (p === "FASE_2") return "Fase 2"
  if (p === "FASE_3") return "Fase 3"
  if (p === "FASE_4") return "Fase 4"

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

function fmtLastRefresh(iso: string | null) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function pillReview(review: ReviewStatus) {
  if (review === "VALID")
    return "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
  if (review === "PENDING")
    return "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"
  return "bg-black/5 text-buma-muted border-buma-border"
}

function tabActiveClass(k: TabKey) {
  switch (k) {
    case "VALID":
      return "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green shadow-sm"
    case "PENDING":
      return "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue shadow-sm"
    case "ALL":
    default:
      return "border-buma-border bg-gradient-to-r from-black/20 to-black/5 text-buma-text shadow-sm"
  }
}

function typeActiveClass(k: TypeFilter) {
  switch (k) {
    case "FRONT":
      return "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue shadow-sm"
    case "DISPOSAL":
      return "border-buma-orange/30 bg-gradient-to-r from-buma-orange/15 to-buma-orange/5 text-buma-orange shadow-sm"
    case "ROAD":
      return "border-violet-400/30 bg-gradient-to-r from-violet-500/15 to-violet-500/5 text-violet-600 shadow-sm"
    case "ALL":
    default:
      return "border-buma-border bg-gradient-to-r from-black/20 to-black/5 text-buma-text shadow-sm"
  }
}

function inferInspectionType(x: any): InspectionType {
  const rawType = String(x?.type ?? x?.inspection_type ?? x?.kind ?? "")
    .trim()
    .toUpperCase()

  if (rawType === "FRONT" || rawType === "DISPOSAL" || rawType === "ROAD") {
    return rawType
  }

  const refUnit = String(x?.ref_unit ?? "").trim().toUpperCase()
  if (DISPOSAL_REF_UNITS.has(refUnit)) return "DISPOSAL"

  const area = String(x?.front ?? "").trim().toLowerCase()
  if (/\broad\b|\bjalan\b/.test(area)) return "ROAD"
  if (/\bdisposal\b/.test(area)) return "DISPOSAL"

  return "FRONT"
}

function typeLabel(t: InspectionType) {
  if (t === "DISPOSAL") return "DISPOSAL"
  if (t === "ROAD") return "ROAD"
  return "FRONT"
}

function typePillClass(t: InspectionType) {
  if (t === "DISPOSAL") {
    return "border-buma-orange/30 bg-gradient-to-r from-buma-orange/15 to-buma-orange/5 text-buma-orange"
  }
  if (t === "ROAD") {
    return "border-violet-400/30 bg-gradient-to-r from-violet-500/15 to-violet-500/5 text-violet-600"
  }
  return "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"
}

function getStandardForInspection(type: InspectionType, refUnit?: string | null) {
  if (type === "DISPOSAL") return DISPOSAL_LIMIT_M
  if (type === "ROAD") return ROAD_LIMIT_M
  return getLimitM(refUnit ?? null)
}

function isLineOkByType(type: InspectionType, heightM: number, refUnit?: string | null) {
  if (type === "DISPOSAL") return heightM >= DISPOSAL_LIMIT_M
  if (type === "ROAD") return heightM >= ROAD_LIMIT_M
  return heightM <= getLimitM(refUnit ?? null)
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
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [q, setQ] = useState("")
  const [tab, setTab] = useState<"ALL" | ReviewStatus>("PENDING")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<InspectionRow | null>(null)
  const [imgOpen, setImgOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading45, setLoading45] = useState<boolean | null>(null)

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [measureMeta, setMeasureMeta] = useState<{
    ref_unit?: string | null
    ref_meter?: number | null
    pixel_per_meter?: number | null
    orientation?: string | null
  } | null>(null)
  const [measureLoading, setMeasureLoading] = useState(false)
  const [measureErr, setMeasureErr] = useState<string | null>(null)

  const [refVerify, setRefVerify] = useState<boolean | null>(null)
  const [refHeight, setRefHeight] = useState<string>("")

  const [lines, setLines] = useState<LineItem[]>([])
  const [lineVerify, setLineVerify] = useState<Record<string, boolean | null>>({})

  type SubmitStatus = "idle" | "loading" | "success" | "error"
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [submitMsg, setSubmitMsg] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isDeleting, setIsDeleting] = useState(false)

  const fetchingRef = useRef(false)

  async function fetchInspections(options?: { silent?: boolean }) {
    const silent = options?.silent === true

    if (fetchingRef.current) return
    fetchingRef.current = true

    if (silent) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }

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
        pelaksanaan: (() => {
          const rawPelaksanaan = String(x.pelaksanaan ?? "").trim().toUpperCase()

          const validPelaksanaan = [
            "START",
            "MID",
            "END",
            "FASE_1",
            "FASE_2",
            "FASE_3",
            "FASE_4",
          ].includes(rawPelaksanaan)
            ? rawPelaksanaan
            : "FASE_1"

          return validPelaksanaan as Pelaksanaan
        })(),
        front: String(x.front ?? ""),
        linesCount: Number(x.lines_count ?? 0),
        linesOkCount: Number(x.lines_ok_count ?? 0),
        maxHeightM: Number(x.max_height_m ?? 0),
        reviewStatus: (
          x.review_status === "VALID" || x.review_status === "PENDING"
            ? x.review_status
            : "PENDING"
        ) as ReviewStatus,
        reviewedBy: x.reviewed_by ? String(x.reviewed_by) : null,
        reviewNotes: x.review_notes ?? null,
        ref_unit: x.ref_unit ?? null,
        ref_meter: x.ref_meter ?? null,
        ref_verify_ok:
          x.ref_verify_ok === true ? true : x.ref_verify_ok === false ? false : null,
        ref_verify_meter:
          x.ref_verify_meter != null ? Number(x.ref_verify_meter) : null,
        type: inferInspectionType(x),
      }))

      setRows(mapped)
      setLastRefreshAt(new Date().toISOString())
    } catch (e: any) {
      setLoadErr(e?.message ?? "Failed to load")
    } finally {
      fetchingRef.current = false
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchInspections()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    if (open) return
    if (isSubmitting) return
    if (isDeleting) return
    if (submitStatus === "loading") return

    const timer = window.setInterval(() => {
      void fetchInspections({ silent: true })
    }, AUTO_REFRESH_MS)

    return () => window.clearInterval(timer)
  }, [autoRefresh, open, isSubmitting, isDeleting, submitStatus])

  const counts = useMemo(() => {
    const c = { ALL: rows.length, PENDING: 0, VALID: 0 }
    rows.forEach((x) => c[x.reviewStatus]++)
    return c
  }, [rows])

  const typeCounts = useMemo(() => {
    const c: Record<TypeFilter, number> = {
      ALL: rows.length,
      FRONT: 0,
      DISPOSAL: 0,
      ROAD: 0,
    }
    rows.forEach((x) => {
      c[x.type]++
    })
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return rows.filter((x) => {
      const okTab = tab === "ALL" ? true : x.reviewStatus === tab
      const okType = typeFilter === "ALL" ? true : x.type === typeFilter
      const { date, time } = fmtDateTime(x.inspectedAt)
      const okQ =
        !query ||
        x.id.toLowerCase().includes(query) ||
        x.front.toLowerCase().includes(query) ||
        x.inspector.toLowerCase().includes(query) ||
        x.type.toLowerCase().includes(query) ||
        date.toLowerCase().includes(query) ||
        time.toLowerCase().includes(query)

      return okTab && okType && okQ
    })
  }, [rows, q, tab, typeFilter])

  function closeDetail() {
    setOpen(false)
    setActive(null)
    setNotes("")
    setLoading45(null)
    setImgOpen(false)

    setPhotoUrl(null)
    setMeasureMeta(null)
    setMeasureErr(null)
    setMeasureLoading(false)

    setLines([])
    setLineVerify({})
    setRefVerify(null)
    setRefHeight("")
  }

  async function fetchLatestMeasure(inspectionId: string): Promise<LineItem[] | null> {
    setMeasureLoading(true)
    setMeasureErr(null)

    try {
      const r = await fetch(
        `${API_BASE}/api/measures?inspection_id=${encodeURIComponent(inspectionId)}`,
        { method: "GET" }
      )
      if (!r.ok) throw new Error(await r.text())

      const j = await r.json()
      const data: MeasureRow[] = Array.isArray(j?.data) ? j.data : j?.data ? [j.data] : []
      const m: any = data[0]

      if (!m?.image_url) {
        setPhotoUrl(null)
        return null
      }

      setPhotoUrl(String(m.image_url))

      const nextRefMeter =
        m?.ref_meter != null && Number.isFinite(Number(m.ref_meter))
          ? Number(m.ref_meter)
          : null

      setMeasureMeta((prev) => ({
        ref_unit: m.ref_unit ?? prev?.ref_unit ?? null,
        ref_meter: nextRefMeter ?? prev?.ref_meter ?? null,
        pixel_per_meter: m.pixel_per_meter ?? prev?.pixel_per_meter ?? null,
        orientation: m.orientation ?? prev?.orientation ?? null,
      }))

      // Tinggi Referensi harus sama persis dengan Metadata Kalibrasi > Ref Meter
      setRefHeight(nextRefMeter != null ? String(nextRefMeter) : "")

      const linesFromMeasure = parseLinesFromMeasure(m)
      return linesFromMeasure.length ? linesFromMeasure : null
    } catch (e: any) {
      setMeasureErr(e?.message ?? "Failed to load photo")
      setPhotoUrl(null)
      return null
    } finally {
      setMeasureLoading(false)
    }
  }

  async function fetchLinesForInspection(
    inspectionId: string,
    fallbackCount: number
  ): Promise<LineItem[]> {
    try {
      const r2 = await fetch(
        `${API_BASE}/api/inspection-lines?inspection_id=${encodeURIComponent(inspectionId)}`,
        { method: "GET" }
      )
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
    setLoading45(null)

    setRefVerify(
      item.ref_verify_ok === true ? true : item.ref_verify_ok === false ? false : null
    )

    setRefHeight("")

    setImgOpen(false)

    setMeasureMeta({
      ref_unit: item.ref_unit ?? null,
      ref_meter: item.ref_meter ?? null,
      pixel_per_meter: null,
      orientation: null,
    })

    const linesFromMeasure = await fetchLatestMeasure(item.id)
    const loadedLines =
      linesFromMeasure ?? (await fetchLinesForInspection(item.id, item.linesCount))

    setLines(loadedLines)

    const init: Record<string, boolean | null> = {}
    loadedLines.forEach((ln) => (init[ln.label] = ln.ok ?? null))
    setLineVerify(init)
  }

  const allVerified = useMemo(() => {
    if (!lines.length) return false
    return lines.every(
      (ln) => lineVerify[ln.label] !== null && lineVerify[ln.label] !== undefined
    )
  }, [lines, lineVerify])

  const standardM = useMemo(() => {
    if (!active) return getLimitM(measureMeta?.ref_unit ?? null)
    return getStandardForInspection(
      active.type,
      measureMeta?.ref_unit ?? active.ref_unit ?? null
    )
  }, [active, measureMeta?.ref_unit])

  const refHeightNumber = useMemo(() => {
    const n = Number(refHeight)
    return Number.isFinite(n) ? n : null
  }, [refHeight])

  const refVerifiedComplete = useMemo(() => {
    return refVerify !== null && refHeight.trim() !== "" && refHeightNumber !== null
  }, [refVerify, refHeight, refHeightNumber])

  const canSubmit = useMemo(() => {
    return allVerified && refVerifiedComplete && loading45 !== null
  }, [allVerified, refVerifiedComplete, loading45])

  async function send() {
    if (!active) return
    if (!canSubmit) return
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      setSubmitStatus("loading")
      setSubmitMsg("Mengirim verifikasi & menyimpan hasil...")

      if (refVerify === null) {
        throw new Error("Verifikasi unit referensi belum dipilih.")
      }

      if (refHeight.trim() === "" || refHeightNumber == null) {
        throw new Error("Tinggi referensi wajib diisi.")
      }

      if (loading45 === null) {
        throw new Error("Status loading 45 derajat wajib dipilih.")
      }

      const missingHeight = lines.filter((ln) => ln.heightM == null)
      if (missingHeight.length) {
        throw new Error(
          `Tinggi titik belum tersedia untuk: ${missingHeight.map((x) => x.label).join(", ")}`
        )
      }

      const payloadLines = lines.map((ln) => ({
        label: ln.label,
        height_m: ln.heightM as number,
        ok:
          ln.heightM == null
            ? null
            : lineVerify[ln.label] ?? isLineOkByType(active.type, ln.heightM, active.ref_unit),
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

      const okCount = Object.values(lineVerify).filter((v) => v === true).length

      const r = await fetch(`${API_BASE}/api/inspections/${encodeURIComponent(active.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_status: "VALID",
          reviewed_by: pjaName,
          review_notes: notes?.trim() ? notes.trim() : null,
          lines_ok_count: okCount,
          ref_verify_ok: refVerify,
          ref_verify_meter: refHeightNumber,
          loading_45_ok: loading45,
        }),
      })

      const result = await r.json().catch(() => null)
      if (!r.ok) {
        throw new Error(result?.error || "Gagal update status inspeksi")
      }

      setSubmitStatus("success")
      setSubmitMsg("Verifikasi berhasil dikirim.")

      await fetchInspections({ silent: true })

      setTimeout(() => {
        setSubmitStatus("idle")
        closeDetail()
      }, 2000)
    } catch (e: any) {
      setSubmitStatus("error")
      setSubmitMsg(
        e?.message ? String(e.message) : "Terjadi kendala. Silakan coba lagi."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteInspection() {
    if (!active) return
    if (isDeleting) return

    const ok = window.confirm(
      `Hapus inspeksi ini?\n\nID: ${active.id}\nInspector: ${active.inspector}\nArea: ${active.front}\n\nData yang terhapus tidak bisa dikembalikan.`
    )
    if (!ok) return

    try {
      setIsDeleting(true)
      setSubmitStatus("loading")
      setSubmitMsg("Menghapus data inspeksi...")

      const r = await fetch(`${API_BASE}/api/inspections/${encodeURIComponent(active.id)}`, {
        method: "DELETE",
      })

      const result = await r.json().catch(() => null)
      if (!r.ok) {
        throw new Error(result?.error || "Gagal menghapus inspeksi")
      }

      setSubmitStatus("success")
      setSubmitMsg("Data inspeksi berhasil dihapus.")

      await fetchInspections({ silent: true })

      setTimeout(() => {
        setSubmitStatus("idle")
        closeDetail()
      }, 1200)
    } catch (e: any) {
      setSubmitStatus("error")
      setSubmitMsg(
        e?.message ? String(e.message) : "Terjadi kendala saat menghapus data."
      )
    } finally {
      setIsDeleting(false)
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
        <div className="relative overflow-hidden rounded-3xl border border-buma-border bg-white shadow-soft">
          <div
            className="h-[150px] w-full bg-cover bg-center"
            style={{ backgroundImage: "url('/LoginBackground.jpeg')" }}
          />
          <div className="absolute inset-0 bg-black/50" />

          <div className="absolute inset-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
                  PJA Console
                </div>
                <div className="mt-1 text-xl font-extrabold text-white">
                  Dashboard Verifikasi Tinggi Jenjang
                </div>
                <div className="mt-1 text-sm text-white/80">
                  Menampilkan hasil submit inspector.
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-right backdrop-blur">
                <div className="text-xs text-white/70">Login sebagai</div>
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
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-buma-border bg-white/80 shadow-soft backdrop-blur">
          <div className="p-4 space-y-3">
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
                    ["ALL", `All ${counts.ALL}`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={cls(
                      "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                      tab === k
                        ? tabActiveClass(k)
                        : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                    )}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-[11px] font-extrabold text-buma-muted">
                  Last update: {fmtLastRefresh(lastRefreshAt)}
                </span>

                <label
                  className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-buma-border bg-white px-3 cursor-pointer select-none transition hover:bg-black/5"
                  title="Toggle auto refresh data"
                >
                  <span className="text-[11px] font-extrabold text-buma-text whitespace-nowrap">
                    Auto Refresh
                  </span>

                  <span
                    className={cls(
                      "text-[11px] font-black whitespace-nowrap",
                      autoRefresh ? "text-buma-green" : "text-buma-muted"
                    )}
                  >
                    {autoRefresh ? "ON" : "OFF"}
                  </span>

                  <span className="relative inline-flex items-center shrink-0">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={() => setAutoRefresh((v) => !v)}
                      className="sr-only peer"
                    />
                    <span
                      className="
                        relative h-5 w-9 rounded-full bg-slate-200 transition
                        peer-checked:bg-emerald-500/20
                        after:absolute after:left-[2px] after:top-[2px]
                        after:h-4 after:w-4 after:rounded-full after:bg-slate-500 after:shadow-sm after:transition
                        peer-checked:after:translate-x-4 peer-checked:after:bg-emerald-600
                      "
                    />
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => void fetchInspections({ silent: true })}
                  disabled={isRefreshing || loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text transition hover:bg-black/5 disabled:opacity-60"
                  title="Refresh"
                >
                  <span className={cls("text-sm leading-none", isRefreshing && "animate-spin")}>
                    ↻
                  </span>
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", `Semua ${typeCounts.ALL}`],
                  ["FRONT", `Front ${typeCounts.FRONT}`],
                  ["DISPOSAL", `Disposal ${typeCounts.DISPOSAL}`],
                  ["ROAD", `Road ${typeCounts.ROAD}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTypeFilter(k)}
                  className={cls(
                    "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                    typeFilter === k
                      ? typeActiveClass(k)
                      : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                  )}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {loadErr ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Gagal load data: {loadErr}
              </div>
            ) : null}
          </div>
        </div>

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

          <div className="mt-3 overflow-x-auto px-4 pb-2 [-webkit-overflow-scrolling:touch] overscroll-x-contain">
            <table className="w-full min-w-[1060px] text-sm text-buma-text">
              <thead>
                <tr className="border-y border-buma-border text-left text-buma-muted">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="py-3">Waktu</th>
                  <th className="py-3">Type</th>
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
                    <td className="px-4 py-8 text-center text-buma-muted" colSpan={11}>
                      Loading…
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((x) => {
                      const { date, time } = fmtDateTime(x.inspectedAt)
                      const limitRow = getStandardForInspection(x.type, x.ref_unit ?? null)
                      const danger =
                        x.type === "DISPOSAL" || x.type === "ROAD"
                          ? x.maxHeightM < limitRow
                          : x.maxHeightM > limitRow

                      return (
                        <tr key={x.id} className="border-b border-buma-border hover:bg-black/5">
                          <td className="px-4 py-3 font-semibold">{date}</td>
                          <td className="py-3 text-buma-muted">{time}</td>

                          <td className="py-3">
                            <span
                              className={cls(
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-widest",
                                typePillClass(x.type)
                              )}
                            >
                              {typeLabel(x.type)}
                            </span>
                          </td>

                          <td className="py-3">{x.inspector}</td>
                          <td className="py-3 text-buma-muted">{shiftLabel(x.shift)}</td>
                          <td className="py-3 text-buma-muted">
                            {pelaksanaanLabel(x.pelaksanaan)}
                          </td>
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
                            <span
                              className={cls(
                                "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold",
                                pillReview(x.reviewStatus)
                              )}
                            >
                              {x.reviewStatus}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void openDetail(x)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-buma-border bg-gradient-to-r from-black/5 to-transparent px-3 py-2 text-xs font-extrabold text-buma-text shadow-sm transition-all duration-200 hover:border-black/30 hover:bg-gradient-to-r hover:from-black/8 hover:to-transparent hover:shadow-md"
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
                        <td className="px-4 py-8 text-center text-buma-muted" colSpan={11}>
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
              <div className="sticky top-0 z-10 border-b border-buma-border bg-white/95 px-4 py-3 md:px-5 md:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-buma-text">
                      Detail Verifikasi — {active.id}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-buma-muted">
                      <span>{active.front}</span>
                      <span>•</span>
                      <span>{shiftLabel(active.shift)}</span>
                      <span>•</span>
                      <span>{pelaksanaanLabel(active.pelaksanaan)}</span>
                      <span>•</span>
                      <span>
                        {fmtDateTime(active.inspectedAt).date}{" "}
                        {fmtDateTime(active.inspectedAt).time}
                      </span>
                      <span>•</span>
                      <span>{active.inspector}</span>
                      <span
                        className={cls(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-widest",
                          typePillClass(active.type)
                        )}
                      >
                        {typeLabel(active.type)}
                      </span>
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

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
                <div className={cls("grid gap-4 p-3 sm:p-4 md:p-5", "lg:grid-cols-[1.45fr_0.85fr]")}>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setImgOpen(true)}
                      className="group overflow-hidden rounded-2xl border border-buma-border bg-white text-left"
                      title="Klik untuk memperbesar"
                    >
                      <div className="relative w-full bg-white">
                        {measureLoading ? (
                          <div className="grid h-[280px] place-items-center text-xs text-buma-muted">
                            Loading foto overlay…
                          </div>
                        ) : (
                          <img
                            src={photoUrl ?? "/miningimage1.png"}
                            alt="Foto inspeksi"
                            className="w-full h-auto object-contain"
                            draggable={false}
                          />
                        )}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/35 to-transparent p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                          <span className="text-xs font-extrabold text-white/90">
                            Klik untuk perbesar
                          </span>
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-white/25 bg-white/10 text-white/90 backdrop-blur shadow-sm transition group-hover:scale-105">
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
                      <MetaCard k="Type" v={typeLabel(active.type)} />
                      <MetaCard k="Inspector" v={active.inspector} />
                      <MetaCard k="Shift" v={shiftLabel(active.shift)} />
                      <MetaCard k="Pelaksanaan" v={pelaksanaanLabel(active.pelaksanaan)} />
                      <MetaCard k="Front/Area" v={active.front} />
                      <MetaCard k="Max Height" v={`${active.maxHeightM.toFixed(2)} m`} />
                      <MetaCard k="Lines" v={`${active.linesCount}`} />
                      <MetaCard k="Standar" v={`${standardM.toFixed(2)} m`} />
                    </div>

                    {measureMeta ? (
                      <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
                        <div className="font-extrabold text-buma-text">Metadata Kalibrasi</div>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <MetaMini k="Ref Unit" v={measureMeta.ref_unit ?? "—"} />
                          <MetaMini
                            k="Ref Meter"
                            v={measureMeta.ref_meter != null ? `${measureMeta.ref_meter}` : "—"}
                          />
                          <MetaMini
                            k="Px/m"
                            v={
                              measureMeta.pixel_per_meter != null
                                ? `${measureMeta.pixel_per_meter}`
                                : "—"
                            }
                          />
                          <MetaMini k="Orientation" v={measureMeta.orientation ?? "—"} />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="relative rounded-3xl border border-buma-border bg-white p-3 sm:p-4 shadow-soft before:absolute before:inset-0 before:rounded-3xl before:border before:border-black/5 before:pointer-events-none">
                      <div>
                        <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
                          Verifikasi Unit Referensi
                        </div>

                        <div className="mt-1 text-[11px] leading-relaxed text-buma-muted">
                          Pastikan unit referensi dan tinggi referensinya sudah benar.
                        </div>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-2xl border border-buma-border bg-gradient-to-r from-buma-bg to-white shadow-sm">
                        <div className="grid grid-cols-[118px_1fr] items-stretch">
                          <div className="flex min-h-[68px] flex-col justify-center px-3 py-2.5">
                            <div className="text-[9px] uppercase tracking-[0.18em] text-buma-muted">
                              Ref Unit
                            </div>
                            <div className="mt-0.5 text-[15px] font-extrabold leading-none text-buma-text">
                              {measureMeta?.ref_unit ?? active?.ref_unit ?? "—"}
                            </div>
                          </div>

                          <div className="flex min-h-[68px] flex-col justify-center border-l border-buma-border/70 bg-white/60 px-3 py-2.5">
                            <label className="text-[9px] uppercase tracking-[0.18em] text-buma-muted">
                              Tinggi Referensi
                            </label>

                            <div className="relative mt-0.5">
                              <input
                                type="text"
                                value={refHeightNumber != null ? refHeightNumber.toFixed(2) : "—"}
                                readOnly
                                tabIndex={-1}
                                className="w-full border-0 bg-transparent px-0 pr-6 py-0 text-[15px] font-extrabold leading-none text-buma-text outline-none"
                              />
                              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-bold text-buma-muted">
                                m
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRefVerify((prev) => (prev === true ? null : true))}
                          className={cls(
                            "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none shadow-sm",
                            refVerify === true
                              ? "border-buma-blue/40 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                              : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                          )}
                        >
                          <span
                            className={cls(
                              "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px]",
                              refVerify === true
                                ? "border-buma-blue/40 bg-buma-blue/10"
                                : "border-buma-border bg-buma-bg"
                            )}
                          >
                            {refVerify === true ? "✓" : ""}
                          </span>
                          Sesuai
                        </button>

                        <button
                          type="button"
                          onClick={() => setRefVerify((prev) => (prev === false ? null : false))}
                          className={cls(
                            "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none shadow-sm",
                            refVerify === false
                              ? "border-red-500/35 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
                              : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                          )}
                        >
                          <span
                            className={cls(
                              "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px]",
                              refVerify === false
                                ? "border-red-500/35 bg-red-500/10"
                                : "border-buma-border bg-buma-bg"
                            )}
                          >
                            {refVerify === false ? "✓" : ""}
                          </span>
                          Tidak sesuai
                        </button>
                      </div>

                      <div className="mt-3">
                        <span
                          className={cls(
                            "inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-widest shadow-sm",
                            refVerify === null
                              ? "border-buma-border bg-white text-buma-muted"
                              : refVerify
                                ? "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                                : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
                          )}
                        >
                          {refVerify === null
                            ? "BELUM DIVERIFIKASI"
                            : refVerify
                              ? "REFERENSI SESUAI"
                              : "REFERENSI TIDAK SESUAI"}
                        </span>
                      </div>

                      <div className="mt-2 text-[10px] leading-relaxed text-buma-muted">
                        Klik opsi yang sama lagi untuk <b className="text-buma-text">membatalkan</b>{" "}
                        pilihan.
                      </div>
                    </div>

                    <div className="relative rounded-3xl border border-buma-border bg-white p-3 sm:p-4 shadow-soft before:absolute before:inset-0 before:rounded-3xl before:border before:border-black/5 before:pointer-events-none">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
                            Verifikasi Tiap Titik
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-buma-muted">
                            Pilih status tiap titik (A/B/C/…).
                          </div>
                        </div>

                        <div className="shrink-0 rounded-xl border border-buma-border/70 bg-gradient-to-r from-buma-bg to-white px-3 py-1.5 text-[11px] font-extrabold text-buma-muted shadow-sm">
                          Limit {standardM.toFixed(1)} m
                        </div>
                      </div>

                      <div className="mt-3 space-y-2.5">
                        {lines.map((ln) => {
                          const v = lineVerify[ln.label] ?? null

                          const toggleVal = (next: boolean) => {
                            setLineVerify((prev) => {
                              const cur = prev[ln.label]
                              return { ...prev, [ln.label]: cur === next ? null : next }
                            })
                          }

                          return (
                            <div
                              key={ln.label}
                              className="relative rounded-2xl border border-buma-border bg-gradient-to-b from-buma-bg to-white p-2.5 sm:p-3 shadow-sm before:absolute before:inset-0 before:rounded-2xl before:border before:border-black/5 before:pointer-events-none"
                            >
                              <div className="rounded-xl border border-buma-border/80 bg-white p-2.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] font-semibold leading-none text-buma-muted">
                                        titik
                                      </span>

                                      <span className="relative mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-buma-border bg-gradient-to-b from-white to-buma-bg text-sm font-extrabold text-buma-text shadow-sm">
                                        <span className="absolute inset-1 rounded-lg bg-white/40" />
                                        <span className="relative">{ln.label}</span>
                                      </span>
                                    </div>

                                    <div className="min-w-0">
                                      <div className="text-[10px] uppercase tracking-widest text-buma-muted">
                                        Tinggi
                                      </div>
                                      <div className="mt-0.5 text-[14px] font-extrabold text-buma-text tabular-nums">
                                        {ln.heightM == null ? "—" : `${ln.heightM.toFixed(2)} m`}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    className={cls(
                                      "shrink-0 rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-widest shadow-sm",
                                      v === null
                                        ? "border-buma-border bg-white text-buma-muted"
                                        : v
                                          ? "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                                          : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
                                    )}
                                  >
                                    {v === null ? "BELUM" : v ? "SESUAI" : "TIDAK SESUAI"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2.5 rounded-xl border border-buma-border/80 bg-white p-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleVal(true)}
                                    className={cls(
                                      "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none shadow-sm",
                                      v === true
                                        ? "border-buma-blue/40 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                                        : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                                    )}
                                    aria-pressed={v === true}
                                  >
                                    <span
                                      className={cls(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px] leading-none",
                                        v === true
                                          ? "border-buma-blue/40 bg-buma-blue/10"
                                          : "border-buma-border bg-buma-bg"
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
                                      "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none shadow-sm",
                                      v === false
                                        ? "border-red-500/35 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
                                        : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                                    )}
                                    aria-pressed={v === false}
                                  >
                                    <span
                                      className={cls(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px] leading-none",
                                        v === false
                                          ? "border-red-500/35 bg-red-500/10"
                                          : "border-buma-border bg-buma-bg"
                                      )}
                                    >
                                      {v === false ? "✓" : ""}
                                    </span>
                                    Tidak sesuai
                                  </button>
                                </div>

                                <div className="mt-2 text-[10px] leading-relaxed text-buma-muted">
                                  Klik opsi yang sama sekali lagi untuk{" "}
                                  <b className="text-buma-text">membatalkan</b> pilihan.
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="relative rounded-3xl border border-buma-border bg-white p-3 sm:p-4 shadow-soft before:absolute before:inset-0 before:rounded-3xl before:border before:border-black/5 before:pointer-events-none">
                      <div>
                        <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
                          Verifikasi Loading 45 Derajat
                        </div>

                        <div className="mt-1 text-[11px] leading-relaxed text-buma-muted">
                          Pilih apakah posisi loading sudah memenuhi sudut 45 derajat.
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLoading45((prev) => (prev === true ? null : true))}
                          className={cls(
                            "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none shadow-sm",
                            loading45 === true
                              ? "border-buma-blue/40 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                              : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                          )}
                        >
                          <span
                            className={cls(
                              "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px]",
                              loading45 === true
                                ? "border-buma-blue/40 bg-buma-blue/10"
                                : "border-buma-border bg-buma-bg"
                            )}
                          >
                            {loading45 === true ? "✓" : ""}
                          </span>
                          Ya
                        </button>

                        <button
                          type="button"
                          onClick={() => setLoading45((prev) => (prev === false ? null : false))}
                          className={cls(
                            "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition select-none shadow-sm",
                            loading45 === false
                              ? "border-red-500/35 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
                              : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                          )}
                        >
                          <span
                            className={cls(
                              "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[12px]",
                              loading45 === false
                                ? "border-red-500/35 bg-red-500/10"
                                : "border-buma-border bg-buma-bg"
                            )}
                          >
                            {loading45 === false ? "✓" : ""}
                          </span>
                          Tidak
                        </button>
                      </div>

                      <div className="mt-3">
                        <span
                          className={cls(
                            "inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-widest shadow-sm",
                            loading45 === null
                              ? "border-buma-border bg-white text-buma-muted"
                              : loading45
                                ? "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                                : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
                          )}
                        >
                          {loading45 === null
                            ? "BELUM DIPILIH"
                            : loading45
                              ? "LOADING 45°: YA"
                              : "LOADING 45°: TIDAK"}
                        </span>
                      </div>

                      <div className="mt-2 text-[10px] leading-relaxed text-buma-muted">
                        Klik opsi yang sama lagi untuk <b className="text-buma-text">membatalkan</b> pilihan.
                      </div>
                    </div>

                    <div className="relative rounded-3xl border border-buma-border bg-white p-3 sm:p-4 shadow-soft before:absolute before:inset-0 before:rounded-3xl before:border before:border-black/5 before:pointer-events-none">
                      <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
                        Catatan
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-buma-muted">
                        Opsional.
                      </div>

                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tulis catatan untuk inspeksi ini…"
                        className="mt-3 w-full resize-none rounded-2xl border border-buma-border bg-gradient-to-b from-buma-bg to-white px-3 py-2.5 text-sm text-buma-text placeholder:text-buma-muted outline-none transition focus:border-buma-blue/50"
                        rows={4}
                      />
                      <div className="mt-1 text-right text-[11px] text-buma-muted">
                        {notes.length}/1000
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 border-t border-buma-border bg-white/95 px-4 py-3 md:px-5">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => void deleteInspection()}
                    disabled={isDeleting || isSubmitting || submitStatus === "loading"}
                    className="rounded-xl border border-red-500/25 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 hover:bg-red-100 disabled:opacity-40"
                    title={isDeleting ? "Menghapus..." : "Hapus inspeksi ini"}
                  >
                    {isDeleting ? "Menghapus..." : "Hapus"}
                  </button>

                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-text hover:bg-black/5"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={!canSubmit || isSubmitting || isDeleting || submitStatus === "loading"}
                    onClick={() => void send()}
                    className="rounded-xl bg-gradient-to-r from-[#2D5EFC] to-buma-blue px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95 disabled:opacity-40"
                    title={
                      !canSubmit
                        ? "Verifikasi unit referensi dan semua titik wajib dilengkapi sebelum kirim"
                        : isSubmitting
                          ? "Mengirim..."
                          : "Kirim verifikasi"
                    }
                  >
                    {isSubmitting ? "Mengirim..." : "Kirim"}
                  </button>
                </div>

                {!canSubmit ? (
                  <div className="mt-2 text-xs text-buma-muted">
                    * Wajib verifikasi <b className="text-buma-text">unit referensi</b>, semua
                    titik, dan status <b className="text-buma-text">loading 45 derajat</b> sebelum kirim.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {imgOpen ? (
            <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-black/80" onClick={() => setImgOpen(false)} />
              <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
                <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="text-sm font-extrabold text-white/90">
                      Preview Foto Overlay
                    </div>
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