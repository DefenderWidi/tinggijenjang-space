import React, { useEffect, useMemo, useRef, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import BumaLoader from "../components/BumaLoader"
import BumaCheck from "../components/BumaCheck"
import BumaCross from "../components/BumaCross"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

// ===== Disposal config =====
const DISPOSAL_LIMIT_M = 50

const DISPOSAL_REF_PRESET = {
  D155: { value: 3.39, axis: "vertical" as const },
  D375: { value: 4.28, axis: "vertical" as const },
  HD789: { value: 7.67, axis: "horizontal" as const },
  HD785: { value: 6.64, axis: "horizontal" as const },
  HD777: { value: 6.10, axis: "horizontal" as const },
} as const

type DisposalRefKey = keyof typeof DISPOSAL_REF_PRESET
type Orientation = "vertical" | "horizontal" | "free"
type Shift = "DAY" | "NIGHT"
type SubmitStatus = "idle" | "loading" | "success" | "error"

type Pt = { x: number; y: number }
type Line = { p1: Pt; p2: Pt; id: string; label?: string }
type BadgeRect = { x: number; y: number; w: number; h: number }

const HIT_R = 6
const NEAR = HIT_R * 2
const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const WORK_H = 560

function getDisposalReferenceLabel(k: DisposalRefKey) {
  switch (k) {
    case "D155":
      return "Dozer 155 — Tinggi (3.39 m)"
    case "D375":
      return "Dozer 375 — Tinggi (4.28 m)"
    case "HD789":
      return "HDCT 789 — Lebar (7.67 m)"
    case "HD785":
      return "HDCT 785 — Lebar (6.64 m)"
    case "HD777":
      return "HDCT 777 — Lebar (6.10 m)"
  }
}

function getDisposalReferenceAxis(k?: DisposalRefKey | ""): Orientation {
  if (!k) return "vertical"
  return DISPOSAL_REF_PRESET[k].axis
}

function isDisposalOk(heightM: number) {
  return heightM >= DISPOSAL_LIMIT_M
}

function labelFromIndex(i: number) {
  if (i < ALPH.length) return ALPH[i]
  const a = Math.floor(i / ALPH.length) - 1
  const b = i % ALPH.length
  return `${ALPH[a] ?? "A"}${ALPH[b]}`
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function near(a: Pt, b: Pt) {
  return dist(a, b) < NEAR
}

function rectOverlap(a: BadgeRect, b: BadgeRect, pad = 6) {
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  )
}

function SectionTitle({
  no,
  title,
  desc,
}: {
  no: string
  title: string
  desc?: string
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-semibold text-buma-muted">{no}.</div>
        <div className="text-[12px] font-extrabold uppercase tracking-widest text-buma-text">
          {title}
        </div>
      </div>
      {desc ? <div className="mt-1 text-xs text-buma-muted">{desc}</div> : null}
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

export default function MeasureDisposal() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imgObjectUrlRef = useRef<string | null>(null)
  const submitSeqRef = useRef(0)

  const [imgSrc, setImgSrc] = useState<string>("")
  const [mode, setMode] = useState<"kalibrasi" | "ukur">("kalibrasi")
  const [orientation, setOrientation] = useState<Orientation>("vertical")

  const [refMeterStr, setRefMeterStr] = useState<string>("")
  const [refKey, setRefKey] = useState<DisposalRefKey | "">("")
  const refSelected = refKey !== ""

  const refMeter = useMemo(() => {
    if (!refSelected) return 0
    const n = Number(refMeterStr)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [refMeterStr, refSelected])

  const referenceAxis = useMemo(() => getDisposalReferenceAxis(refKey), [refKey])

  useEffect(() => {
    if (!refKey) {
      setRefMeterStr("")
      return
    }
    setRefMeterStr(DISPOSAL_REF_PRESET[refKey].value.toFixed(2))
  }, [refKey])

  useEffect(() => {
    if (mode === "kalibrasi") {
      setOrientation(referenceAxis)
    }
  }, [referenceAxis, mode])

  useEffect(() => {
    return () => {
      if (imgObjectUrlRef.current) {
        URL.revokeObjectURL(imgObjectUrlRef.current)
        imgObjectUrlRef.current = null
      }
    }
  }, [])

  const [shift, setShift] = useState<"" | Shift>("")
  const [shiftTime, setShiftTime] = useState<"" | "START" | "MID" | "END">("")

  const [pixelPerMeter, setPixelPerMeter] = useState<number | null>(null)
  const [referenceLine, setReferenceLine] = useState<Line | null>(null)
  const [measurements, setMeasurements] = useState<Line[]>([])
  const [tempPoints, setTempPoints] = useState<Pt[]>([])

  const [drag, setDrag] = useState<{
    lineId: string
    which: "p1" | "p2"
    kind: "ref" | "m"
  } | null>(null)

  const [inspectorName, setInspectorName] = useState("")
  const [areaId, setAreaId] = useState("")

  const [formError, setFormError] = useState(false)
  const [calError, setCalError] = useState(false)
  const [measureError, setMeasureError] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [submitMsg, setSubmitMsg] = useState<string>("")

  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({
    w: 1200,
    h: WORK_H,
  })

  const isFormValid =
    inspectorName.trim() !== "" &&
    areaId.trim() !== "" &&
    shift !== "" &&
    shiftTime !== ""

  function getMouse(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): Pt {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const r = canvas.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top

    return {
      x: (mx * canvas.width) / r.width,
      y: (my * canvas.height) / r.height,
    }
  }

  function applyOrientation(p: Pt, anchor?: Pt): Pt {
    if (!anchor) return p
    if (orientation === "vertical") return { x: anchor.x, y: p.y }
    if (orientation === "horizontal") return { x: p.x, y: anchor.y }
    return p
  }

  function drawPoint(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string
  ) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, HIT_R, 0, Math.PI * 2)
    ctx.fill()
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: boolean,
    stroke: boolean
  ) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
    if (fill) ctx.fill()
    if (stroke) ctx.stroke()
  }

  function drawLine(
    ctx: CanvasRenderingContext2D,
    a: Pt,
    b: Pt,
    label: string,
    text: string,
    tone: "measure" | "ref",
    occupiedBadges: BadgeRect[],
    danger = false
  ) {
    const colors =
      tone === "ref"
        ? { core: "#16A34A", glow: "rgba(22,163,74,.25)" }
        : danger
          ? { core: "#DC2626", glow: "rgba(220,38,38,.18)" }
          : { core: "#2563EB", glow: "rgba(37,99,235,.18)" }

    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.strokeStyle = colors.glow
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    ctx.strokeStyle = "rgba(0,0,0,.55)"
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    ctx.strokeStyle = colors.core
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    drawPoint(ctx, a.x, a.y, "#FFFFFF")
    ctx.strokeStyle = "rgba(0,0,0,.55)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(a.x, a.y, HIT_R + 2, 0, Math.PI * 2)
    ctx.stroke()

    drawPoint(ctx, b.x, b.y, "#FFFFFF")
    ctx.beginPath()
    ctx.arc(b.x, b.y, HIT_R + 2, 0, Math.PI * 2)
    ctx.stroke()

    ctx.font = "900 11px Arial"
    const tagW = ctx.measureText(label).width

    ctx.font = "800 11px Arial"
    const txtW = ctx.measureText(text).width

    const chipW = Math.max(18, tagW + 8)
    const textPadLeft = 7
    const textPadRight = 8
    const gap = 4
    const w = chipW + gap + txtW + textPadLeft + textPadRight + 8
    const h = 26

    const topPt = a.y <= b.y ? a : b
    const bottomPt = a.y > b.y ? a : b

    const mx = (a.x + b.x) / 2
    let bx = mx - w / 2
    bx = Math.max(8, Math.min(bx, ctx.canvas.width - w - 8))

    const safeGap = 12
    const laneStep = h + 6

    let by = topPt.y - h - safeGap
    let placed = false

    const candidates: number[] = []
    for (let level = 0; level < 4; level++) {
      const topY = topPt.y - h - safeGap - level * laneStep
      const bottomY = bottomPt.y + safeGap + level * laneStep
      candidates.push(topY)
      candidates.push(bottomY)
    }

    for (const tryY of candidates) {
      if (tryY < 8 || tryY + h > ctx.canvas.height - 8) continue

      const rect = { x: bx, y: tryY, w, h }
      const hit = occupiedBadges.some((r) => rectOverlap(rect, r, 6))

      if (!hit) {
        by = tryY
        occupiedBadges.push(rect)
        placed = true
        break
      }
    }

    if (!placed) {
      occupiedBadges.push({ x: bx, y: by, w, h })
    }

    const badgeCenterX = bx + w / 2
    const badgeBottomY = by + h
    const badgeTopY = by

    const anchorPt =
      by < topPt.y
        ? { x: topPt.x, y: topPt.y - 2 }
        : { x: bottomPt.x, y: bottomPt.y + 2 }

    const startPt =
      by < topPt.y
        ? { x: badgeCenterX, y: badgeBottomY }
        : { x: badgeCenterX, y: badgeTopY }

    ctx.save()
    ctx.strokeStyle = tone === "ref" ? "rgba(22,163,74,.55)" : `${colors.core}88`
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(startPt.x, startPt.y)
    ctx.lineTo(anchorPt.x, anchorPt.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    ctx.fillStyle = "rgba(255,255,255,.94)"
    ctx.strokeStyle = danger ? "rgba(220,38,38,.55)" : "rgba(0,0,0,.18)"
    ctx.lineWidth = danger ? 1.5 : 1
    roundRect(ctx, bx, by, w, h, 999, true, true)

    ctx.fillStyle = colors.core
    roundRect(ctx, bx + 4, by + 4, chipW, h - 8, 999, true, false)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = "900 11px Arial"
    ctx.textBaseline = "middle"
    ctx.fillText(label, bx + 4 + (chipW - tagW) / 2, by + h / 2 + 0.5)

    ctx.font = "800 11px Arial"
    ctx.strokeStyle = "rgba(255,255,255,.92)"
    ctx.lineWidth = 2.5
    const textX = bx + 4 + chipW + gap + textPadLeft
    const textY = by + h / 2 + 0.5
    ctx.strokeText(text, textX, textY)
    ctx.fillStyle = danger ? "#B91C1C" : "#0B1220"
    ctx.fillText(text, textX, textY)

    ctx.restore()
  }

  function ensureCanvasSize() {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = imgRef.current
    const targetH = WORK_H
    let targetW = 1200

    if (img && img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight
      targetW = Math.round(targetH * ratio)
    }

    if (canvas.width !== targetW) canvas.width = targetW
    if (canvas.height !== targetH) canvas.height = targetH

    setCanvasSize({ w: targetW, h: targetH })
  }

  function redraw() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "#F6FAF8"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = "#6B7280"
      ctx.font = "14px Arial"
      ctx.fillText("Upload photo to start measuring.", 16, 28)
    }

    const occupiedBadges: BadgeRect[] = []

    if (referenceLine) {
      drawLine(
        ctx,
        referenceLine.p1,
        referenceLine.p2,
        "REF",
        `${refMeter.toFixed(2)} m`,
        "ref",
        occupiedBadges,
        false
      )
    }

    measurements.forEach((m, idx) => {
      if (!pixelPerMeter) return
      const meter = dist(m.p1, m.p2) / pixelPerMeter
      const danger = meter < DISPOSAL_LIMIT_M
      const label = labelFromIndex(idx)

      drawLine(
        ctx,
        m.p1,
        m.p2,
        label,
        `${meter.toFixed(2)} m`,
        "measure",
        occupiedBadges,
        danger
      )
    })

    if (tempPoints.length === 1) {
      const p = tempPoints[0]
      drawPoint(ctx, p.x, p.y, "red")
    }
  }

  useEffect(() => {
    ensureCanvasSize()
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc, referenceLine, measurements, tempPoints, pixelPerMeter, refMeter])

  function resetMeasurementOnly(nextOrientation?: Orientation) {
    setPixelPerMeter(null)
    setReferenceLine(null)
    setMeasurements([])
    setTempPoints([])
    setDrag(null)
    setMode("kalibrasi")
    setOrientation(nextOrientation ?? getDisposalReferenceAxis(refKey))
    setMeasureError(false)
    setCalError(false)
    setSubmitStatus("idle")
    setSubmitMsg("")
  }

  function resetAll() {
    resetMeasurementOnly(getDisposalReferenceAxis(refKey))
  }

  function computeStats() {
    if (!pixelPerMeter) return null
    const meters = measurements
      .map((m) => dist(m.p1, m.p2) / pixelPerMeter)
      .filter((x) => Number.isFinite(x) && x > 0.01)

    const maxHeightM = meters.length ? Math.max(...meters) : 0
    const linesCount = meters.length
    const linesOkCount = meters.filter((x) => isDisposalOk(x)).length
    return { maxHeightM, linesCount, linesOkCount }
  }

  function buildLinePayload() {
    if (!pixelPerMeter) return []

    const seen = new Set<string>()

    return measurements
      .map((m, idx) => {
        const label = labelFromIndex(idx)
        const height_m = dist(m.p1, m.p2) / pixelPerMeter

        if (!Number.isFinite(height_m) || height_m <= 0.01) return null

        const key = [
          m.p1.x.toFixed(1),
          m.p1.y.toFixed(1),
          m.p2.x.toFixed(1),
          m.p2.y.toFixed(1),
          height_m.toFixed(3),
        ].join("|")

        if (seen.has(key)) return null
        seen.add(key)

        return {
          label,
          height_m,
          ok: null,
        }
      })
      .filter(Boolean) as Array<{
      label: string
      height_m: number
      ok: null
    }>
  }

  async function canvasToFile(canvas: HTMLCanvasElement) {
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Gagal membuat file overlay"))),
        "image/jpeg",
        0.9
      )
    })

    return new File([blob], `disposal-measurement-${Date.now()}.jpg`, {
      type: "image/jpeg",
    })
  }

  async function createInspection(): Promise<string> {
    const r = await fetch(`${API_BASE}/api/inspections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspector: inspectorName.trim(),
        shift,
        pelaksanaan: shiftTime,
        front: areaId.trim(),
        lines_count: 0,
        lines_ok_count: 0,
        max_height_m: 0,
        dashboard_view: "DISPOSAL",
        measure_mode: "DISPOSAL",
        inspection_mode: "DISPOSAL",
      }),
    })

    if (!r.ok) throw new Error(await r.text())
    const j = await r.json()
    const id = j?.data?.id
    if (!id) throw new Error("Inspection ID tidak diterima dari backend")
    return String(id)
  }

  async function uploadMeasure(id: string) {
    const canvas = canvasRef.current
    if (!canvas) throw new Error("Canvas not ready")

    const stats = computeStats()
    if (!stats) throw new Error("Belum ada kalibrasi (Px/m)")

    const file = await canvasToFile(canvas)

    const fd = new FormData()
    fd.append("inspection_id", id)
    fd.append("max_height_m", String(stats.maxHeightM))
    fd.append("lines_count", String(stats.linesCount))
    fd.append("lines_ok_count", String(stats.linesOkCount))
    fd.append("orientation", orientation)
    fd.append("ref_unit", refKey || "")
    fd.append("ref_meter", String(refMeter))
    fd.append("pixel_per_meter", String(pixelPerMeter ?? ""))
    fd.append("dashboard_view", "DISPOSAL")
    fd.append("measure_mode", "DISPOSAL")
    fd.append("inspection_mode", "DISPOSAL")
    fd.append("image", file)

    const r = await fetch(`${API_BASE}/api/measures`, {
      method: "POST",
      body: fd,
    })

    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async function saveInspectionLines(id: string) {
    const rawCount = measurements.length
    const lines = buildLinePayload()

    if (!rawCount) {
      throw new Error("Belum ada garis ukur untuk disimpan")
    }

    if (!lines.length) {
      throw new Error("Semua garis ukur disposal tidak valid")
    }

    if (lines.length !== rawCount) {
      throw new Error("Ada garis ukur duplikat / tidak valid. Cek kembali sebelum submit.")
    }

    const r = await fetch(`${API_BASE}/api/inspection-lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspection_id: id,
        lines,
        dashboard_view: "DISPOSAL",
        measure_mode: "DISPOSAL",
      }),
    })

    const result = await r.json().catch(() => null)

    if (!r.ok) {
      throw new Error(result?.error || "Gagal menyimpan detail titik inspeksi")
    }

    const savedLines = Array.isArray(result?.data) ? result.data : []
    if (savedLines.length !== lines.length) {
      throw new Error(`Detail titik tidak tersimpan lengkap (${savedLines.length}/${lines.length})`)
    }

    return result
  }

  async function onPickFile(file?: File) {
    if (!file) return

    if (imgObjectUrlRef.current) {
      URL.revokeObjectURL(imgObjectUrlRef.current)
      imgObjectUrlRef.current = null
    }

    const url = URL.createObjectURL(file)
    imgObjectUrlRef.current = url
    setImgSrc(url)

    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      ensureCanvasSize()
      resetMeasurementOnly(getDisposalReferenceAxis(refKey))
      redraw()
    }
    img.src = url
  }

  function processLine(p1: Pt, p2: Pt) {
    const px = dist(p1, p2)
    if (px <= 2) return

    if (mode === "kalibrasi") {
      if (!refSelected || refMeter <= 0) {
        setCalError(true)
        return
      }

      const ppm = px / refMeter
      setPixelPerMeter(ppm)
      setReferenceLine({ p1, p2, id: "ref" })
    } else {
      if (!pixelPerMeter) return
      const line: Line = { p1, p2, id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}` }
      setMeasurements((prev) => [...prev, line])
    }
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    ensureCanvasSize()

    if (!imgRef.current) return

    if (mode === "kalibrasi" && !refSelected) {
      setCalError(true)
      return
    }

    if (e.button === 2) return

    const m = getMouse(e)

    for (let i = measurements.length - 1; i >= 0; i--) {
      const line = measurements[i]
      if (near(m, line.p1)) {
        setDrag({ lineId: line.id, which: "p1", kind: "m" })
        return
      }
      if (near(m, line.p2)) {
        setDrag({ lineId: line.id, which: "p2", kind: "m" })
        return
      }
    }

    if (referenceLine) {
      if (near(m, referenceLine.p1)) {
        setDrag({ lineId: "ref", which: "p1", kind: "ref" })
        return
      }
      if (near(m, referenceLine.p2)) {
        setDrag({ lineId: "ref", which: "p2", kind: "ref" })
        return
      }
    }

    const anchored = tempPoints.length === 1 ? tempPoints[0] : undefined
    const p = applyOrientation(m, anchored)

    const next = [...tempPoints, p]
    setTempPoints(next)

    if (next.length === 2) {
      processLine(next[0], next[1])
      setTempPoints([])
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    ensureCanvasSize()

    if (!imgRef.current) return
    if (!drag) return

    const m = getMouse(e)

    const updatePoint = (anchor: Pt, target: Pt) => {
      if (orientation === "vertical") return { x: anchor.x, y: target.y }
      if (orientation === "horizontal") return { x: target.x, y: anchor.y }
      return target
    }

    if (drag.kind === "ref") {
      if (!refSelected || refMeter <= 0) return

      setReferenceLine((prev) => {
        if (!prev) return prev
        const p1 = { ...prev.p1 }
        const p2 = { ...prev.p2 }

        if (drag.which === "p1") {
          const moved = updatePoint(prev.p1, m)
          p1.x = moved.x
          p1.y = moved.y
        } else {
          const moved = updatePoint(prev.p2, m)
          p2.x = moved.x
          p2.y = moved.y
        }

        const px = dist(p1, p2)
        if (px > 2) {
          setPixelPerMeter(px / refMeter)
          return { ...prev, p1, p2 }
        }

        return prev
      })
      return
    }

    setMeasurements((prev) => {
      const idx = prev.findIndex((x) => x.id === drag.lineId)
      if (idx < 0) return prev

      const copy = prev.map((x) => ({
        ...x,
        p1: { ...x.p1 },
        p2: { ...x.p2 },
      }))

      const line = copy[idx]

      if (drag.which === "p1") line.p1 = updatePoint(line.p1, m)
      else line.p2 = updatePoint(line.p2, m)

      const nextLenPx = dist(line.p1, line.p2)
      if (nextLenPx <= 2) return prev

      return copy
    })
  }

  function onMouseUp() {
    if (drag) setDrag(null)
  }

  function onContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault()
    ensureCanvasSize()

    if (!imgRef.current) return
    const m = getMouse(e)

    const hitM = measurements.find((o) => near(m, o.p1) || near(m, o.p2))
    if (hitM) {
      setMeasurements((prev) => prev.filter((x) => x.id !== hitM.id))
      return
    }

    if (referenceLine && (near(m, referenceLine.p1) || near(m, referenceLine.p2))) {
      setReferenceLine(null)
      setPixelPerMeter(null)
      return
    }
  }

  function exportImage() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/jpeg", 0.92)
    a.download = "Disposal_Measurement.jpg"
    a.click()
  }

  async function handleSubmit() {
    if (isSubmitting) return

    if (!isFormValid) {
      setFormError(true)
      return
    }

    if (!pixelPerMeter || !referenceLine) {
      setMeasureError(true)
      return
    }

    if (measurements.length === 0) {
      setMeasureError(true)
      setSubmitStatus("error")
      setSubmitMsg("Belum ada garis ukur disposal yang dibuat.")
      return
    }

    if (!imgSrc || !imgRef.current) {
      setSubmitStatus("error")
      setSubmitMsg("Foto inspeksi belum tersedia. Upload foto dulu sebelum submit.")
      return
    }

    const seq = ++submitSeqRef.current

    try {
      setIsSubmitting(true)
      setSubmitStatus("loading")
      setSubmitMsg("Menyimpan inspeksi disposal & mengunggah foto overlay...")

      const id = await createInspection()
      if (seq !== submitSeqRef.current) return

      await uploadMeasure(id)
      if (seq !== submitSeqRef.current) return

      const savedLinesResult = await saveInspectionLines(id)
      if (seq !== submitSeqRef.current) return

      if (!savedLinesResult?.data?.length) {
        throw new Error("Detail titik gagal tersimpan")
      }

      setSubmitStatus("success")
      setSubmitMsg(`Inspeksi disposal berhasil tersimpan lengkap.${id ? ` ID: ${id}` : ""}`)
      setTimeout(() => {
        if (seq === submitSeqRef.current) {
          setSubmitStatus("idle")
        }
      }, 2000)
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Terjadi kendala. Silakan coba lagi."
      setSubmitStatus("error")
      setSubmitMsg(msg)
    } finally {
      if (seq === submitSeqRef.current) {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <AppLayout>
      {submitStatus !== "idle" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />

          <div className="relative mx-4 w-[min(92vw,420px)] rounded-2xl border border-buma-border bg-white p-6 shadow-2xl">
            {submitStatus === "loading" ? (
              <BumaLoader />
            ) : submitStatus === "success" ? (
              <SubmitResultCard
                variant="success"
                title="Tersimpan"
                desc={submitMsg || "Data inspeksi disposal berhasil disimpan."}
                onClose={() => setSubmitStatus("idle")}
              />
            ) : (
              <SubmitResultCard
                variant="error"
                title="Gagal"
                desc={submitMsg || "Terjadi kendala. Silakan coba lagi."}
                onClose={() => setSubmitStatus("idle")}
                onRetry={() => {
                  setSubmitStatus("idle")
                  setSubmitMsg("")
                  handleSubmit()
                }}
              />
            )}
          </div>
        </div>
      )}

      <div className="mb-2">
        <div className="text-2xl font-extrabold tracking-tight text-buma-text">
          Workspace Pengukuran Disposal
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
        <aside className="relative overflow-hidden rounded-2xl border border-buma-border bg-white shadow-soft">
          <div className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-buma-green via-buma-blue to-buma-orange" />

          <div className="p-4">
            <SectionTitle no="01" title="Data Inspeksi Disposal" />
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Nama Inspektor <span className="text-buma-orange">*</span>
                </label>
                <input
                  value={inspectorName}
                  onChange={(e) => {
                    setInspectorName(e.target.value)
                    setFormError(false)
                  }}
                  placeholder="Masukkan nama inspector"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    formError && !inspectorName
                      ? "border-red-500"
                      : "border-buma-border focus:border-buma-green/60"
                  } bg-white`}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Area Disposal <span className="text-buma-orange">*</span>
                </label>
                <input
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value)
                    setFormError(false)
                  }}
                  placeholder="Contoh: Disposal A"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                    formError && !areaId
                      ? "border-red-500"
                      : "border-buma-border focus:border-buma-green/60"
                  } bg-white`}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Shift (Pagi/Malam) <span className="text-buma-orange">*</span>
                </label>

                <select
                  value={shift}
                  onChange={(e) => {
                    setShift(e.target.value as Shift)
                    setFormError(false)
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition bg-white ${
                    formError && !shift
                      ? "border-red-500"
                      : "border-buma-border focus:border-buma-green/60"
                  }`}
                >
                  <option value="">— Pilih shift —</option>
                  <option value="DAY">Pagi (DAY)</option>
                  <option value="NIGHT">Malam (NIGHT)</option>
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Rentang Shift <span className="text-buma-orange">*</span>
                </label>

                <select
                  value={shiftTime}
                  onChange={(e) => {
                    setShiftTime(e.target.value as "START" | "MID" | "END")
                    setFormError(false)
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition bg-white ${
                    formError && !shiftTime
                      ? "border-red-500"
                      : "border-buma-border focus:border-buma-green/60"
                  }`}
                >
                  <option value="">— Pilih rentang shift —</option>
                  <option value="START">Awal Shift</option>
                  <option value="MID">Tengah Shift</option>
                  <option value="END">Akhir Shift</option>
                </select>
              </div>

              <input
                ref={fileRef}
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />

              <button
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition-all duration-200 active:scale-95 ${
                  isFormValid
                    ? "bg-gradient-to-r from-[#15803D] to-[#22A745] hover:opacity-85"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
                type="button"
                onClick={() => {
                  if (!isFormValid) {
                    setFormError(true)
                    return
                  }
                  fileRef.current?.click()
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className="shrink-0"
                >
                  <g fill="currentColor">
                    <path d="M7 4.174V11h2V4.174l2.608 2.236l1.302-1.518L8 .682l-4.91 4.21L4.392 6.41z" />
                    <path d="M3 13v-3H1v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3h-2v3z" />
                  </g>
                </svg>
                Import Photo
              </button>

              {formError && !isFormValid && (
                <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 animate-pulse">
                  ⚠ Inspektor, Area Disposal, dan Shift wajib diisi sebelum mengimpor foto.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-buma-border p-4">
            <SectionTitle
              no="02"
              title="Kalibrasi Skala Disposal"
              desc="Pilih unit referensi disposal. Referensi lebar akan otomatis horizontal, referensi tinggi otomatis vertical."
            />

            <div className="grid gap-3">
              <div>
                <label className="text-[11px] font-semibold text-buma-muted">
                  Unit Referensi <span className="text-buma-orange">*</span>
                </label>

                <div className="mt-1 grid grid-cols-1 gap-2">
                  <select
                    value={refKey}
                    onChange={(e) => {
                      const v = e.target.value as DisposalRefKey | ""
                      setRefKey(v)
                      setCalError(false)
                      setFormError(false)
                      resetMeasurementOnly(getDisposalReferenceAxis(v))
                    }}
                    className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ${
                      !refSelected && calError
                        ? "border-red-500"
                        : "border-buma-border focus:border-buma-green/60"
                    }`}
                  >
                    <option value="">— Pilih unit referensi disposal —</option>
                    {(Object.keys(DISPOSAL_REF_PRESET) as DisposalRefKey[]).map((k) => (
                      <option key={k} value={k}>
                        {getDisposalReferenceLabel(k)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Standar disposal: garis ukur <b>di bawah 50.00 m</b> akan ditandai merah.
              </div>

              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-soft transition-all duration-200 active:scale-95 ${
                  refSelected
                    ? "bg-gradient-to-r from-[#2D5EFC] to-buma-blue text-white hover:opacity-85"
                    : "bg-gray-200 text-gray-500"
                }`}
                type="button"
                onClick={() => {
                  if (!refSelected) {
                    setCalError(true)
                    return
                  }
                  setCalError(false)
                  setMode("kalibrasi")
                  setOrientation(referenceAxis)
                  setTempPoints([])
                }}
                title={!refSelected ? "Pilih unit referensi dulu" : "Set 2 titik referensi"}
              >
                Set Point
              </button>

              {calError && !refSelected && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 animate-pulse">
                  ⚠ Pilih unit referensi sebelum melakukan kalibrasi.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-buma-border p-4">
            <SectionTitle
              no="03"
              title="Pengukuran Disposal"
              desc="Pilih orientasi, lalu mulai ukur."
            />

            <div className="grid gap-3">
              <div>
                <label className="text-[11px] font-semibold text-buma-muted">
                  Orientasi Garis <span className="text-buma-orange">*</span>
                </label>

                <select
                  value={orientation}
                  onChange={(e) => {
                    setOrientation(e.target.value as Orientation)
                    setMeasureError(false)
                  }}
                  className="mt-1 w-full rounded-xl border border-buma-border bg-white px-3 py-2 text-sm outline-none transition focus:border-buma-green/60"
                >
                  <option value="vertical">Vertikal</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="free">Bebas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-soft transition-all duration-200 active:scale-95 ${
                    refSelected && pixelPerMeter
                      ? "bg-gradient-to-r from-[#15803D] to-[#22A745] text-white hover:opacity-85"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                  type="button"
                  onClick={() => {
                    if (!refSelected || !pixelPerMeter) {
                      setMeasureError(true)
                      return
                    }

                    setMeasureError(false)
                    setMode("ukur")
                    setTempPoints([])
                  }}
                  title={
                    !refSelected
                      ? "Pilih unit referensi dulu"
                      : !pixelPerMeter
                        ? "Kalibrasi dulu"
                        : "Mulai ukur"
                  }
                >
                  Mulai ukur
                </button>

                <button
                  className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-muted hover:bg-black/5"
                  type="button"
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>

              {measureError && (!refSelected || !pixelPerMeter) && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 animate-pulse">
                  {!refSelected ? (
                    <>⚠ Lakukan tahap <b>kalibrasi skala</b> terlebih dahulu sebelum pengukuran.</>
                  ) : (
                    <>⚠ Lakukan <b>kalibrasi</b> dulu (klik <b>Set Point</b> lalu pilih 2 titik referensi).</>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="relative overflow-hidden rounded-2xl border border-buma-border bg-white shadow-soft">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-buma-green/8 via-transparent to-buma-blue/8" />

            <div className="relative p-4">
              <div className="relative w-full overflow-hidden rounded-2xl border border-buma-border bg-gradient-to-br from-white to-[#EEF6F2] p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-extrabold text-buma-text">Photo Workspace</div>

                  <div className="flex items-center gap-2">
                    <div className="relative inline-grid grid-cols-2 rounded-xl border border-buma-border bg-white shadow-soft p-[3px]">
                      <div
                        className={`pointer-events-none absolute top-[3px] left-[3px] h-[calc(100%-6px)] w-[calc(50%-3px)] rounded-lg transition-all duration-200 ${
                          mode === "kalibrasi"
                            ? "translate-x-0 bg-buma-blue"
                            : "translate-x-full bg-buma-green"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setMode("kalibrasi")
                          setOrientation(referenceAxis)
                          setTempPoints([])
                        }}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition ${
                          mode === "kalibrasi"
                            ? "bg-gradient-to-r from-[#2D5EFC] to-buma-blue text-white"
                            : "text-buma-text hover:bg-black/5"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M11 2h2v3.07A7.002 7.002 0 0 1 18.93 11H22v2h-3.07A7.002 7.002 0 0 1 13 18.93V22h-2v-3.07A7.002 7.002 0 0 1 5.07 13H2v-2h3.07A7.002 7.002 0 0 1 11 5.07zM12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10"
                          />
                        </svg>
                        Kalibrasi
                      </button>

                      <button
                        type="button"
                        disabled={!pixelPerMeter}
                        onClick={() => {
                          setMode("ukur")
                          setTempPoints([])
                        }}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition ${
                          mode === "ukur"
                            ? "bg-gradient-to-r from-[#15803D] to-[#22A745] text-white"
                            : "text-buma-text hover:bg-black/5"
                        } ${!pixelPerMeter ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75z"
                          />
                        </svg>
                        Ukur
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={resetAll}
                      className="inline-flex items-center gap-2 rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text shadow-soft hover:bg-black/5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 1 1-9.9-1h-2.1A7 7 0 1 0 12 6"
                        />
                      </svg>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="relative w-full">
                  <div className="relative h-[560px] w-full overflow-auto rounded-xl border border-buma-border bg-white">
                    <div
                      className="relative"
                      style={{ width: canvasSize.w, height: canvasSize.h }}
                    >
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 cursor-crosshair"
                        style={{ willChange: "auto" }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onContextMenu={onContextMenu}
                      />
                    </div>

                    {!imgSrc ? (
                      <div className="pointer-events-none absolute inset-0 grid place-items-center">
                        <div className="rounded-2xl border border-buma-border bg-white/80 p-6 text-center shadow-soft">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            className="mx-auto mb-3 text-buma-muted"
                          >
                            <path
                              fill="currentColor"
                              d="M21 5v11q0 .5-.312.75T20 17t-.687-.262t-.313-.763V5H8q-.5 0-.75-.312T7 4t.25-.687T8 3h11q.825 0 1.413.588T21 5M5 21q-.825 0-1.412-.587T3 19V5.8l-.9-.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l17 17q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-.9-.9zm9.175-4H7q-.3 0-.45-.275t.05-.525l2-2.675q.15-.2.4-.2t.4.2L11.25 16l.825-1.1L5 7.825V19h11.175zM10.6 13.4"
                            />
                          </svg>

                          <div className="text-sm font-extrabold text-buma-text">Belum ada foto</div>
                          <div className="mt-1 text-sm text-buma-muted">
                            Klik <b>Import Photo</b> pada panel.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <div className="shrink-0 rounded-xl border border-buma-blue/20 bg-buma-blue/5 px-3 py-2 text-buma-blue">
                    <span className="font-semibold">Klik kiri</span> untuk set 2 titik
                  </div>
                  <div className="shrink-0 rounded-xl border border-buma-blue/20 bg-buma-blue/5 px-3 py-2 text-buma-blue">
                    <span className="font-semibold">Drag</span> endpoint untuk adjust
                  </div>
                  <div className="shrink-0 rounded-xl border border-buma-blue/20 bg-buma-blue/5 px-3 py-2 text-buma-blue">
                    <span className="font-semibold">Klik kanan</span> dekat titik untuk hapus
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 w-full border-t border-buma-border bg-white/95 backdrop-blur">
              <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#15803D]/20 bg-buma-blue/5 px-4 py-2.5 text-sm font-extrabold text-buma-blue shadow-soft transition-all duration-150 hover:bg-buma-blue/15 hover:border-buma-blue/40 active:scale-95 disabled:opacity-40"
                  type="button"
                  disabled={!imgSrc}
                  onClick={exportImage}
                  title={!imgSrc ? "Upload foto dulu" : "Save as JPG"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    className="shrink-0"
                  >
                    <path
                      fill="currentColor"
                      d="M2.5 6.5V6H2v.5zm4 0V6H6v.5zm0 4H6v.5h.5zm7-7h.5v-.207l-.146-.147zm-3-3l.354-.354L10.707 0H10.5zM2.5 7h1V6h-1zm.5 4V8.5H2V11zm0-2.5v-2H2v2zm.5-.5h-1v1h1zm.5-.5a.5.5 0 0 1-.5.5v1A1.5 1.5 0 0 0 5 7.5zM3.5 7a.5.5 0 0 1 .5.5h1A1.5 1.5 0 0 0 3.5 6zM6 6.5v4h1v-4zm.5 4.5h1v-1h-1zM9 9.5v-2H8v2zM7.5 6h-1v1h1zM9 7.5A1.5 1.5 0 0 0 7.5 6v1a.5.5 0 0 1 .5.5zM7.5 11A1.5 1.5 0 0 0 9 9.5H8a.5.5 0 0 1-.5.5zM10 6v5h1V6zm.5 1H13V6h-2.5zm0 2H12V8h-1.5zM2 5V1.5H1V5zm11-1.5V5h1V3.5zM2.5 1h8V0h-8zm7.646-.146l3 3l.708-.708l-3-3zM2 1.5a.5.5 0 0 1 .5-.5V0A1.5 1.5 0 0 0 1 1.5zM1 12v1.5h1V12zm1.5 3h10v-1h-10zM14 13.5V12h-1v1.5zM12.5 15a1.5 1.5 0 0 0 1.5-1.5h-1a.5.5 0 0 1-.5.5zM1 13.5A1.5 1.5 0 0 0 2.5 15v-1a.5.5 0 0 1-.5-.5z"
                    />
                  </svg>
                  Simpan JPG
                </button>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#15803D] to-[#22A745] px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95 disabled:opacity-50"
                  type="button"
                  disabled={
                    submitStatus === "loading" ||
                    !imgSrc ||
                    !refSelected ||
                    !pixelPerMeter ||
                    !referenceLine ||
                    measurements.length === 0
                  }
                  title={
                    isSubmitting
                      ? "Submitting..."
                      : !imgSrc
                        ? "Upload foto dulu"
                        : !refSelected
                          ? "Pilih unit referensi dulu"
                          : !pixelPerMeter
                            ? "Kalibrasi dulu"
                            : measurements.length === 0
                              ? "Belum ada garis ukur"
                              : "Submit"
                  }
                  onClick={handleSubmit}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    className="shrink-0"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14L21 3m0 0l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1z"
                    />
                  </svg>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}