import React, { useEffect, useMemo, useRef, useState } from "react"
import AppLayout from "../layouts/AppLayout"

type KV = { k: string; v: string }

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

function Chip({ k, v }: KV) {
  return (
    <div className="rounded-xl border border-buma-border bg-white/80 px-3 py-2 shadow-soft">
      <div className="text-[10px] uppercase tracking-widest text-buma-muted">
        {k}
      </div>
      <div className="text-xs font-semibold text-buma-text">{v}</div>
    </div>
  )
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "ok" | "warn" | "info"
}) {
  const cls =
    tone === "ok"
      ? "bg-buma-green/10 text-buma-green border-buma-green/20"
      : tone === "warn"
        ? "bg-buma-orange/10 text-buma-orange border-buma-orange/20"
        : "bg-buma-blue/10 text-buma-blue border-buma-blue/20"

  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">
        {label}
      </div>
      <div className="text-sm font-extrabold">{value}</div>
    </div>
  )
}

function IconButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: string
  onClick?: () => void
}) {
  return (
    <button
      className="grid h-11 w-11 place-items-center rounded-xl border border-buma-border bg-white/90 shadow-soft hover:bg-black/5"
      title={label}
      type="button"
      onClick={onClick}
    >
      <span className="text-lg leading-none">{icon}</span>
    </button>
  )
}

/* ======= Measuring logic types ======= */
type Pt = { x: number; y: number }
type Line = { p1: Pt; p2: Pt; id: string; label?: string }

const MIN_BENCH = 4
const MAX_BENCH = 8
const HIT_R = 6
const NEAR = HIT_R * 2

const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function labelFromIndex(i: number) {
  // 0->A ... 25->Z ... 26->AA (opsional, aman kalau garis banyak)
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
function angleDeg(a: Pt, b: Pt) {
  const dy = Math.abs(b.y - a.y)
  const dx = Math.abs(b.x - a.x)
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

export default function Measure() {
  // ======= Refs =======
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // ======= State =======
  const [imgSrc, setImgSrc] = useState<string>("")
  const [mode, setMode] = useState<"kalibrasi" | "ukur">("kalibrasi")
  const [orientation, setOrientation] = useState<"vertical" | "horizontal" | "free">(
    "vertical"
  )

  const [refMeterStr, setRefMeterStr] = useState<string>("7.80")
  const refMeter = useMemo(() => {
    const n = Number(refMeterStr)
    return Number.isFinite(n) && n > 0 ? n : 1
  }, [refMeterStr])

  // ======= Reference presets (drop-down) =======
  const REF_MAP = {
    EX3600: 7.8,
    EX2500: 7.0,
    EX2000: 5.97,
    TIANG: 4,
  } as const

  const [shiftTime, setShiftTime] = useState<"" | "START" | "MID" | "END">("")

  type RefKey = keyof typeof REF_MAP

  const [refKey, setRefKey] = useState<RefKey | "">("")
  const refSelected = refKey !== ""

  // sync refMeterStr mengikuti pilihan refKey
  useEffect(() => {
    if (!refSelected) return
    setRefMeterStr(REF_MAP[refKey as RefKey].toFixed(2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey])

  const [pixelPerMeter, setPixelPerMeter] = useState<number | null>(null)
  const [referenceLine, setReferenceLine] = useState<Line | null>(null)
  const [measurements, setMeasurements] = useState<Line[]>([])
  const [tempPoints, setTempPoints] = useState<Pt[]>([])

  const [drag, setDrag] = useState<{
    lineId: string
    which: "p1" | "p2"
    kind: "ref" | "m"
  } | null>(null)

  const [currentMeters, setCurrentMeters] = useState<number | null>(null)
  const [currentDeg, setCurrentDeg] = useState<number | null>(null)

  const [hint, setHint] = useState<string>(
    "Upload foto → Mode Kalibrasi → klik 2 titik pada objek referensi."
  )

  const status = useMemo(() => {
    if (currentMeters == null) return { label: "NO DATA", tone: "info" as const }
    const danger = currentMeters < MIN_BENCH || currentMeters > MAX_BENCH
    return danger
      ? { label: "DANGER", tone: "warn" as const }
      : { label: "SAFE OPS", tone: "ok" as const }
  }, [currentMeters])

  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  const zoomBy = (factor: number) => {
    setView((prev) => ({ ...prev, scale: clamp(prev.scale * factor, 0.5, 4) }))
  }

  const resetView = () => setView({ scale: 1, x: 0, y: 0 })

  const [inspectorName, setInspectorName] = useState("")
  const [areaId, setAreaId] = useState("")
  const [formError, setFormError] = useState(false)
  const [calError, setCalError] = useState(false)
  const [measureError, setMeasureError] = useState(false)

  const isFormValid =
    inspectorName.trim() !== "" &&
    areaId.trim() !== "" &&
    shiftTime !== ""

  // ======= Helpers =======
  function getMouse(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): Pt {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const r = canvas.getBoundingClientRect()

    // posisi mouse pada canvas setelah transform (CSS space)
    const mx = e.clientX - r.left
    const my = e.clientY - r.top

    // invert transform (balik ke coordinate sebelum zoom/pan)
    const ux = (mx - view.x) / view.scale
    const uy = (my - view.y) / view.scale

    // map ke internal canvas coordinate (0..width/height)
    return {
      x: (ux * canvas.width) / r.width,
      y: (uy * canvas.height) / r.height,
    }
  }

  function applyOrientation(p: Pt, anchor?: Pt): Pt {
    if (!anchor) return p
    if (orientation === "vertical") return { x: anchor.x, y: p.y }
    if (orientation === "horizontal") return { x: p.x, y: anchor.y }
    return p
  }

  function drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
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
    tone: "safe" | "danger" | "ref"
  ) {
    const colors =
      tone === "ref"
        ? { core: "#16A34A", glow: "rgba(22,163,74,.25)" }
        : tone === "danger"
          ? { core: "#E11D48", glow: "rgba(225,29,72,.18)" }
          : { core: "#2563EB", glow: "rgba(37,99,235,.18)" }

    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // glow layer
    ctx.strokeStyle = colors.glow
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    // dark outline
    ctx.strokeStyle = "rgba(0,0,0,.55)"
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    // core line
    ctx.strokeStyle = colors.core
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    // endpoints: putih + outline hitam
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

    // label box
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2

    ctx.font = "900 12px Arial"
    const tagW = ctx.measureText(label).width
    ctx.font = "700 12px Arial"
    const txtW = ctx.measureText(text).width
    const w = Math.max(tagW + 18, txtW + 50)
    const h = 34

    ctx.fillStyle = "rgba(255,255,255,.92)"
    ctx.strokeStyle = "rgba(0,0,0,.18)"
    ctx.lineWidth = 1
    roundRect(ctx, mx - w / 2, my - h - 10, w, h, 10, true, true)

    // chip label
    ctx.fillStyle = colors.core
    roundRect(ctx, mx - w / 2 + 6, my - h - 10 + 6, 22, 22, 8, true, false)
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "900 12px Arial"
    ctx.fillText(label, mx - w / 2 + 12, my - h - 10 + 21)

    // text dengan outline putih
    ctx.font = "700 12px Arial"
    ctx.strokeStyle = "rgba(255,255,255,.9)"
    ctx.lineWidth = 3
    ctx.strokeText(text, mx - w / 2 + 34, my - h - 10 + 21)
    ctx.fillStyle = "#0B1220"
    ctx.fillText(text, mx - w / 2 + 34, my - h - 10 + 21)

    ctx.restore()
  }

  function redraw() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // background
    ctx.fillStyle = "#F6FAF8"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw image
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = "#6B7280"
      ctx.font = "14px Arial"
      ctx.fillText("Upload photo to start measuring.", 16, 28)
    }

    // reference
    if (referenceLine) {
      drawLine(ctx, referenceLine.p1, referenceLine.p2, "REF", `${refMeter.toFixed(2)} m`, "ref")
    }

    // measurements
    measurements.forEach((m, idx) => {
      if (!pixelPerMeter) return
      const meter = dist(m.p1, m.p2) / pixelPerMeter
      const deg = angleDeg(m.p1, m.p2)
      const danger = meter < MIN_BENCH || meter > MAX_BENCH
      const label = m.label ?? labelFromIndex(idx)
      drawLine(
        ctx,
        m.p1,
        m.p2,
        label,
        `${meter.toFixed(2)} m | ${deg.toFixed(1)}°`,
        danger ? "danger" : "safe"
      )
    })

    // in-progress
    if (tempPoints.length === 1) {
      const p = tempPoints[0]
      drawPoint(ctx, p.x, p.y, "red")
    }
  }

  // ======= Resize canvas to a fixed work size (stabil) =======
  function ensureCanvasSize() {
    const canvas = canvasRef.current
    if (!canvas) return
    // internal resolution aligned to UI height for good mapping
    const targetW = 1200
    const targetH = 560
    if (canvas.width !== targetW) canvas.width = targetW
    if (canvas.height !== targetH) canvas.height = targetH
  }

  // ======= Upload =======
  async function onPickFile(file?: File) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImgSrc(url)

    const img = new Image()
    img.onload = () => {
      imgRef.current = img

      ensureCanvasSize()

      // reset state
      setPixelPerMeter(null)
      setReferenceLine(null)
      setMeasurements([])
      setTempPoints([])
      setCurrentMeters(null)
      setCurrentDeg(null)
      setDrag(null)

      resetView()

      setMode("kalibrasi")
      setHint("Mode Kalibrasi: klik 2 titik pada objek referensi.")
      redraw()
    }
    img.src = url
  }

  // ======= Core click process =======
  function processLine(p1: Pt, p2: Pt) {
    const px = dist(p1, p2)
    if (px <= 0.0001) return

    if (mode === "kalibrasi") {
      const ppm = px / refMeter
      setPixelPerMeter(ppm)
      setReferenceLine({ p1, p2, id: "ref" })
      setHint(`Kalibrasi OK. Scale = ${ppm.toFixed(2)} px/m. Pindah ke mode Ukur.`)
    } else {
      if (!pixelPerMeter) {
        setHint("Skala belum ada. Kalibrasi dulu (set 2 titik referensi).")
        return
      }
      const label = labelFromIndex(measurements.length)
      const line: Line = { p1, p2, id: `${Date.now()}-${Math.random()}`, label }
      const meter = px / pixelPerMeter
      const deg = angleDeg(p1, p2)
      setMeasurements((prev) => [...prev, line])
      setCurrentMeters(meter)
      setCurrentDeg(deg)
      setHint("Ukur: klik 2 titik lagi untuk ukur jenjang berikutnya. Drag titik untuk adjust.")
    }
  }

  // ======= Mouse handlers =======
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    ensureCanvasSize()

    if (!imgRef.current) {
      setHint("Upload foto dulu. Klik Import Photo (Source).")
      return
    }
    if (e.button === 2) return

    const m = getMouse(e)

    // 1) drag measurement endpoints
    for (let i = measurements.length - 1; i >= 0; i--) {
      const line = measurements[i]
      if (near(m, line.p1)) {
        setDrag({ lineId: line.id, which: "p1", kind: "m" })
        setHint("Drag endpoint untuk adjust garis ukur.")
        return
      }
      if (near(m, line.p2)) {
        setDrag({ lineId: line.id, which: "p2", kind: "m" })
        setHint("Drag endpoint untuk adjust garis ukur.")
        return
      }
    }

    // 2) drag reference endpoints
    if (referenceLine) {
      if (near(m, referenceLine.p1)) {
        setDrag({ lineId: "ref", which: "p1", kind: "ref" })
        setHint("Drag endpoint referensi untuk re-kalibrasi.")
        return
      }
      if (near(m, referenceLine.p2)) {
        setDrag({ lineId: "ref", which: "p2", kind: "ref" })
        setHint("Drag endpoint referensi untuk re-kalibrasi.")
        return
      }
    }

    // create points
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

    // prototype-like lock behavior on drag
    const updatePoint = (anchor: Pt, target: Pt) => {
      if (orientation === "vertical") return { x: anchor.x, y: target.y }
      if (orientation === "horizontal") return { x: target.x, y: anchor.y }
      return target
    }

    if (drag.kind === "ref") {
      setReferenceLine((prev) => {
        if (!prev) return prev
        const p1 = { ...prev.p1 }
        const p2 = { ...prev.p2 }

        if (drag.which === "p1") {
          const moved = updatePoint(prev.p1, m)
          p1.x = moved.x
          p1.y = moved.y
          const px = dist(p1, p2)
          const ppm = px / refMeter
          setPixelPerMeter(ppm)
          setHint(`Re-kalibrasi: Scale = ${ppm.toFixed(2)} px/m`)
        } else {
          const moved = updatePoint(prev.p2, m)
          p2.x = moved.x
          p2.y = moved.y
          const px = dist(p1, p2)
          const ppm = px / refMeter
          setPixelPerMeter(ppm)
          setHint(`Re-kalibrasi: Scale = ${ppm.toFixed(2)} px/m`)
        }
        return { ...prev, p1, p2 }
      })
      return
    }

    // measurement drag
    setMeasurements((prev) => {
      const idx = prev.findIndex((x) => x.id === drag.lineId)
      if (idx < 0) return prev

      const copy = prev.map((x) => ({ ...x, p1: { ...x.p1 }, p2: { ...x.p2 } }))
      const line = copy[idx]

      if (drag.which === "p1") {
        line.p1 = updatePoint(line.p1, m)
      } else {
        line.p2 = updatePoint(line.p2, m)
      }

      if (pixelPerMeter) {
        const meter = dist(line.p1, line.p2) / pixelPerMeter
        const deg = angleDeg(line.p1, line.p2)
        setCurrentMeters(meter)
        setCurrentDeg(deg)
      }

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

    // delete measurement
    const hitM = measurements.find((o) => near(m, o.p1) || near(m, o.p2))
    if (hitM) {
      setMeasurements((prev) => prev.filter((x) => x.id !== hitM.id))
      setCurrentMeters(null)
      setCurrentDeg(null)
      setHint("Garis ukur dihapus.")
      return
    }

    // delete reference
    if (referenceLine && (near(m, referenceLine.p1) || near(m, referenceLine.p2))) {
      setReferenceLine(null)
      setPixelPerMeter(null)
      setHint("Referensi dihapus. Kalibrasi ulang.")
      return
    }
  }

  // ======= Redraw on changes =======
  useEffect(() => {
    ensureCanvasSize()
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc, referenceLine, measurements, tempPoints, pixelPerMeter, refMeter])

  // ======= Actions =======
  function resetAll() {
    setPixelPerMeter(null)
    setReferenceLine(null)
    setMeasurements([])
    setTempPoints([])
    setCurrentMeters(null)
    setCurrentDeg(null)
    setDrag(null)
    setMode("kalibrasi")
    setHint("Reset OK. Mode Kalibrasi: klik 2 titik objek referensi.")
    resetView()
  }

  function exportImage() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = "Highwall_Measurement.png"
    a.click()
  }

  const infoRows: KV[] = useMemo(() => {
    return [
      { k: "Calibration", v: pixelPerMeter ? "LOCKED" : "UNLOCKED" },
      { k: "Mode", v: mode === "kalibrasi" ? "CALIBRATION" : "MEASURE" },
      { k: "Orientation", v: orientation.toUpperCase() },
      { k: "Lines", v: String(measurements.length) },
    ]
  }, [pixelPerMeter, mode, orientation, measurements.length])

  const currentValueText = currentMeters == null ? "—" : currentMeters.toFixed(2)
  const varianceText = currentMeters == null ? "—" : (currentMeters - MAX_BENCH).toFixed(2)

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-buma-text">
            Workspace Pengukuran
          </div>
          <div className="mt-1 text-sm text-buma-muted">
            Upload foto → Kalibrasi referensi → Ukur jenjang → Export report
          </div>
        </div>

        <div className="flex items-start justify-end">
          <div className="relative max-w-[420px] rounded-xl border border-buma-border bg-white px-3 py-2 shadow-soft overflow-hidden">

            {/* Accent line kiri */}
            <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-buma-green via-buma-blue to-buma-orange" />

            <div className="pl-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-buma-muted">
                Status
              </div>
              <div className="mt-1 text-xs font-semibold text-buma-text leading-snug">
                {hint}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
        {/* LEFT PANEL */}
        <aside className="relative overflow-hidden rounded-2xl border border-buma-border bg-white shadow-soft">

          {/* TOP GRADIENT STRIP */}
          <div className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-buma-green via-buma-blue to-buma-orange" />

          <div className="p-4">
            <SectionTitle no="01" title="Inspection Data" />
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Inspector Name <span className="text-buma-orange">*</span>
                </label>
                <input
                  value={inspectorName}
                  onChange={(e) => {
                    setInspectorName(e.target.value)
                    setFormError(false)
                  }}
                  placeholder="Masukkan nama inspector"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${formError && !inspectorName
                    ? "border-red-500"
                    : "border-buma-border focus:border-buma-green/60"
                    } bg-white`}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Area / Front ID <span className="text-buma-orange">*</span>
                </label>
                <input
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value)
                    setFormError(false)
                  }}
                  placeholder="Contoh: Front 12-B Highwall"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${formError && !areaId
                    ? "border-red-500"
                    : "border-buma-border focus:border-buma-green/60"
                    } bg-white`}
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[11px] font-semibold text-buma-muted">
                  Shift Time <span className="text-buma-orange">*</span>
                </label>

                <select
                  value={shiftTime}
                  onChange={(e) => {
                    setShiftTime(e.target.value as "START" | "MID" | "END")
                    setFormError(false)
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition bg-white ${formError && !shiftTime
                    ? "border-red-500"
                    : "border-buma-border focus:border-buma-green/60"
                    }`}
                >
                  <option value="">Pilih waktu inspeksi</option>
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
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition-all duration-200 active:scale-95 ${isFormValid
                  ? "bg-gradient-to-r from-buma-green to-buma-blue hover:opacity-95"
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

                Import Photo (Source)
              </button>

              {formError && !isFormValid && (
                <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 animate-pulse">
                  ⚠ Inspector Name, Area / Front ID, dan Shift Time wajib diisi sebelum mengimpor foto.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-buma-border p-4">
            <SectionTitle
              no="02"
              title="Scale Calibration"
              desc="Pilih unit referensi, lalu klik 2 titik pada objek acuan."
            />

            <div className="grid gap-3">
              {/* Reference picker */}
              <div>
                <label className="text-[11px] font-semibold text-buma-muted">
                  Reference Unit <span className="text-buma-orange">*</span>
                </label>

                <div className="mt-1 grid grid-cols-1 gap-2">
                  <select
                    value={refKey}
                    onChange={(e) => {
                      const v = e.target.value as RefKey | ""
                      setRefKey(v)

                      setCalError(false)     // reset error kalibrasi
                      setFormError(false)    // optional: reset error inspeksi

                      // reset kalibrasi kalau ref berubah
                      setPixelPerMeter(null)
                      setReferenceLine(null)
                      setTempPoints([])
                      setMode("kalibrasi")
                      setHint(
                        v
                          ? "Unit dipilih. Klik 'Set Points' lalu klik 2 titik pada objek referensi."
                          : "Pilih unit referensi dulu."
                      )
                    }}
                    className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ${!refSelected && calError
                      ? "border-red-500"
                      : "border-buma-border focus:border-buma-green/60"
                      }`}
                  >
                    <option value="">— Pilih unit referensi —</option>
                    <option value="EX3600">EX3600 (7.80 m)</option>
                    <option value="EX2500">EX2500 (7.00 m)</option>
                    <option value="EX2000">EX2000 (5.97 m)</option>
                    <option value="TIANG">Tiang (4.00 m)</option>
                  </select>
                </div>
              </div>

              {/* Action button (only one) */}
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-soft transition-all duration-200 active:scale-95 ${refSelected
                  ? "bg-buma-blue text-white hover:opacity-95"
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
                  setTempPoints([])
                  setHint("Mode Kalibrasi: klik 2 titik pada objek referensi.")
                }}
                title={!refSelected ? "Pilih unit referensi dulu" : "Set 2 titik referensi"}
              >
                Set Points
              </button>

              {/* error message */}
              {calError && !refSelected && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 animate-pulse">
                  ⚠ Pilih unit referensi (EX3600 / EX2500) sebelum melakukan kalibrasi.
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <StatPill
                  label="Px/m"
                  value={pixelPerMeter ? pixelPerMeter.toFixed(2) : "—"}
                  tone="info"
                />
                <StatPill
                  label="Ref"
                  value={refSelected ? (refKey as string) : "UNSET"}
                  tone={refSelected ? "ok" : "warn"}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-buma-border p-4">
            <SectionTitle
              no="03"
              title="Dimensional Analysis"
              desc="Pilih orientasi, lalu mulai ukur."
            />

            <div className="grid gap-3">
              <div>
                <label className="text-[11px] font-semibold text-buma-muted">
                  Orientation Vector <span className="text-buma-orange">*</span>
                </label>

                <select
                  value={orientation}
                  onChange={(e) => {
                    setOrientation(e.target.value as "vertical" | "horizontal" | "free")
                    setMeasureError(false)
                  }}
                  className="mt-1 w-full rounded-xl border border-buma-border bg-white px-3 py-2 text-sm outline-none transition focus:border-buma-green/60"
                >
                  <option value="">— Pilih orientation —</option>
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-soft transition-all duration-200 active:scale-95 ${refSelected && pixelPerMeter
                    ? "bg-buma-green text-white hover:opacity-95"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  type="button"
                  onClick={() => {
                    if (!refSelected || !pixelPerMeter) {
                      setMeasureError(true)
                      setHint(
                        !refSelected
                          ? "Pilih unit referensi dulu (EX3600 / EX2500), lalu klik Set Points."
                          : "Kalibrasi dulu: klik Set Points lalu pilih 2 titik pada objek referensi."
                      )
                      return
                    }

                    setMeasureError(false)
                    setMode("ukur")
                    setTempPoints([])
                    setHint("Mode Ukur: klik 2 titik untuk ukur jenjang.")
                  }}
                  title={
                    !refSelected
                      ? "Pilih unit referensi dulu"
                      : !pixelPerMeter
                        ? "Kalibrasi dulu"
                        : "Mulai ukur"
                  }
                >
                  Start Measure
                </button>

                <button
                  className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-muted hover:bg-black/5"
                  type="button"
                  onClick={resetAll}
                >
                  Reset All
                </button>
              </div>

              {/* Error message khusus Start Measure */}
              {measureError && (!refSelected || !pixelPerMeter) && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 animate-pulse">
                  {!refSelected ? (
                    <>⚠ Lakukan tahap <b>Scale Calibration</b> terlebih dahulu sebelum pengukuran.</>
                  ) : (
                    <>⚠ Lakukan <b>kalibrasi</b> dulu (klik <b>Set Points</b> lalu pilih 2 titik referensi).</>
                  )}
                </div>
              )}
              {/* Info ringkas: hanya Orientation & Lines */}
              <div className="grid grid-cols-2 gap-2">
                <StatPill
                  label="Orientation"
                  value={orientation.toUpperCase()}
                  tone="info"
                />
                <StatPill
                  label="Lines"
                  value={String(measurements.length)}
                  tone={measurements.length > 0 ? "ok" : "warn"}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT WORKSPACE */}
        <section className="relative overflow-hidden rounded-2xl border border-buma-border bg-white shadow-soft">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-buma-green/8 via-transparent to-buma-blue/8" />

            <div className="relative p-4">
              <div className="relative w-full overflow-hidden rounded-2xl border border-buma-border bg-gradient-to-br from-white to-[#EEF6F2] p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-extrabold text-buma-text">Photo Workspace</div>

                  <div className="flex items-center gap-2">

                    {/* SEGMENTED CONTROL */}
                    <div className="relative inline-grid grid-cols-2 rounded-xl border border-buma-border bg-white shadow-soft p-[3px]">

                      {/* Slider background */}
                      <div
                        className={`pointer-events-none absolute top-[3px] left-[3px] h-[calc(100%-6px)] w-[calc(50%-3px)] rounded-lg transition-all duration-200 ${mode === "kalibrasi"
                          ? "translate-x-0 bg-buma-blue"
                          : "translate-x-full bg-buma-green"
                          }`}
                      />

                      {/* Kalibrasi */}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("kalibrasi")
                          setTempPoints([])
                          setHint("Mode Kalibrasi: klik 2 titik objek referensi.")
                        }}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition ${mode === "kalibrasi"
                          ? "text-white"
                          : "text-buma-text hover:bg-black/5"
                          }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                          <path fill="currentColor"
                            d="M11 2h2v3.07A7.002 7.002 0 0 1 18.93 11H22v2h-3.07A7.002 7.002 0 0 1 13 18.93V22h-2v-3.07A7.002 7.002 0 0 1 5.07 13H2v-2h3.07A7.002 7.002 0 0 1 11 5.07zM12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10" />
                        </svg>
                        Kalibrasi
                      </button>

                      {/* Ukur */}
                      <button
                        type="button"
                        disabled={!pixelPerMeter}
                        onClick={() => {
                          setMode("ukur")
                          setTempPoints([])
                          setHint("Mode Ukur: klik 2 titik untuk ukur jenjang.")
                        }}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition ${mode === "ukur"
                          ? "text-white"
                          : "text-buma-text hover:bg-black/5"
                          } ${!pixelPerMeter ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                          <path fill="currentColor"
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75z" />
                        </svg>
                        Ukur
                      </button>
                    </div>

                    {/* RESET */}
                    <button
                      type="button"
                      onClick={resetAll}
                      className="inline-flex items-center gap-2 rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text shadow-soft hover:bg-black/5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                        <path fill="currentColor"
                          d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 1 1-9.9-1h-2.1A7 7 0 1 0 12 6" />
                      </svg>
                      Reset
                    </button>

                  </div>

                </div>

                <div className="relative w-full">
                  {/* VIEWPORT (nge-clip zoom biar nggak nindih section bawah) */}
                  <div className="relative h-[560px] w-full overflow-hidden rounded-xl border border-buma-border bg-white">
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 h-full w-full cursor-crosshair"
                      style={{
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                        transformOrigin: "0 0",
                        willChange: "transform",
                      }}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onMouseLeave={onMouseUp}
                      onContextMenu={onContextMenu}
                    />

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
                            Klik <b>Import Photo</b> di panel kiri.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>


                <div className="mt-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 text-xs sm:flex-wrap sm:overflow-visible sm:whitespace-normal">

                  {/* INFO BADGE */}
                  <div className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-buma-blue/10 border border-buma-blue/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      className="text-buma-blue"
                    >
                      <path
                        fill="currentColor"
                        d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8
                        8 3.59 8 8-3.59 8-8 8m0-18
                        C6.48 2 2 6.48 2 12s4.48 10 10 10
                        10-4.48 10-10S17.52 2 12 2m-1 15h2v-6h-2v6z"
                      />
                    </svg>
                  </div>

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

            {/* Right toolbar */}
            <div className="absolute right-3 top-28 flex flex-col gap-2">
              <IconButton label="Zoom In" icon="＋" onClick={() => zoomBy(1.15)} />
              <IconButton label="Zoom Out" icon="－" onClick={() => zoomBy(1 / 1.15)} />
              <IconButton label="Reset View" icon="⟲" onClick={resetView} />
              <IconButton label="Capture" icon="📷" onClick={exportImage} />
            </div>

           {/* Bottom bar (actions only) */}
<div className="sticky bottom-0 w-full border-t border-buma-border bg-white/95 backdrop-blur">
  <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
    <button
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-buma-green to-buma-blue px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95 disabled:opacity-50"
      type="button"
      disabled={!pixelPerMeter || measurements.length === 0}
      title={
        !pixelPerMeter
          ? "Kalibrasi dulu"
          : measurements.length === 0
          ? "Belum ada garis ukur"
          : "Submit"
      }
      onClick={() => {
        alert(
          `Submit (demo)\n\nTotal measurement: ${measurements.length}\nLast: ${
            currentMeters ? currentMeters.toFixed(2) + " m" : "—"
          }`
        )
      }}
    >
      {/* Submit icon */}
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

      Finalize & Submit
    </button>

    <button
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-buma-blue/30 bg-buma-blue/10 px-4 py-2.5 text-sm font-extrabold text-buma-blue shadow-soft transition-all duration-150 hover:bg-buma-blue/20 hover:border-buma-blue/40 active:scale-95 disabled:opacity-40"
      type="button"
      disabled={!imgSrc}
      onClick={exportImage}
      title={!imgSrc ? "Upload foto dulu" : "Save as PDF"}
    >
      {/* PDF icon */}
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

      Save as PDF
    </button>
  </div>
</div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
