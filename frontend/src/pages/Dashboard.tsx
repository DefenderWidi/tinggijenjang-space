import { useMemo, useState, useEffect } from "react"
import AppLayout from "../layouts/AppLayout"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts"

type Shift = "DAY" | "NIGHT"
type ReviewStatus = "PENDING" | "VALID" | "REJECT"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

function mapInspection(r: any): InspectionRow {
  return {
    id: r.id,
    inspectedAt: r.inspected_at, // ISO string dari DB
    inspector: r.inspector,
    shift: r.shift,
    pelaksanaan: r.pelaksanaan,
    front: r.front,
    linesCount: r.lines_count ?? 0,
    linesOkCount: r.lines_ok_count ?? 0,
    maxHeightM: Number(r.max_height_m ?? 0),
    reviewedBy: r.reviewed_by ?? null,
    reviewStatus: r.review_status ?? "PENDING",
  }
}

async function fetchInspections(signal?: AbortSignal): Promise<InspectionRow[]> {
  const res = await fetch(`${API_BASE}/api/inspections`, { signal })
  if (!res.ok) throw new Error(`Failed to load inspections (${res.status})`)
  const json = await res.json()
  const rows = Array.isArray(json?.data) ? json.data : []
  return rows.map(mapInspection)
}

type InspectionRow = {
  id: string
  inspectedAt: string
  inspector: string
  shift: Shift
  pelaksanaan: string
  front: string
  linesCount: number
  linesOkCount: number
  maxHeightM: number
  reviewedBy: string | null
  reviewStatus: ReviewStatus
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function shiftLabel(s: Shift) {
  return s === "DAY" ? "Day Shift" : "Night Shift"
}

function formatDateTime(dt: string) {
  const d = new Date(dt)
  if (!Number.isFinite(d.getTime())) {
    // fallback kalau format lama "YYYY-MM-DD HH:mm"
    const [dd, tt] = String(dt).split(" ")
    return { date: dd ?? "-", time: tt ?? "-" }
  }
  // tampilkan waktu lokal Indonesia (opsional). Default browser timezone.
  const date = d.toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" })
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  return { date, time }
}

function ymd(dt: string) {
  const d = new Date(dt)
  if (!Number.isFinite(d.getTime())) return String(dt).split(" ")[0] ?? ""
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function inRange(dateStr: string, from?: string, to?: string) {
  if (from && dateStr < from) return false
  if (to && dateStr > to) return false
  return true
}

function inMonth(dateStr: string, month: string) {
  return dateStr.startsWith(month)
}

/** dummy weekly label (UI) */
function fakeWeekLabel(dateStr: string) {
  const m = Number(dateStr.split("-")[1] ?? 0)
  return m <= 2 ? "W-08" : "W-00"
}

function pctOk(linesOkCount: number, linesCount: number) {
  if (!linesCount || linesCount <= 0) return 0
  return Math.round((linesOkCount / linesCount) * 100)
}

function StatPill({
  label,
  value,
  tone = "info",
}: {
  label: string
  value: string
  tone?: "ok" | "info" | "warn"
}) {
  const toneCls =
    tone === "ok"
      ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
      : tone === "warn"
        ? "border-red-500/25 bg-red-500/10 text-red-600"
        : "border-buma-blue/25 bg-buma-blue/10 text-buma-blue"

  return (
    <div className={cls("rounded-2xl border px-4 py-3 shadow-soft", toneCls)}>
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
    </div>
  )
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
      <div className="p-8">
        <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-buma-border bg-buma-bg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 21h10a2 2 0 0 0 2-2V8l-5-5H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                opacity="0.7"
              />
              <path
                d="M14 3v5h5"
                stroke="currentColor"
                strokeWidth="1.6"
                opacity="0.7"
              />
              <path
                d="M8 12h8M8 16h6"
                stroke="currentColor"
                strokeWidth="1.6"
                opacity="0.7"
              />
            </svg>
          </div>
          <div className="text-base font-extrabold text-buma-text">{title}</div>
          <div className="mt-1 text-sm text-buma-muted">{desc}</div>

          <div className="mt-4 rounded-2xl border border-buma-border bg-buma-bg px-4 py-3 text-xs text-buma-muted">
            Tips: ubah mode <b className="text-buma-text">Daily/Weekly</b> atau pilih range
            tanggal/bulan yang berbeda.
          </div>
        </div>
      </div>
    </div>
  )
}

function DonutCompliance({ ok, bad }: { ok: number; bad: number }) {
  const total = Math.max(0, ok + bad)
  const okPct = total === 0 ? 0 : Math.round((ok / total) * 100)

  const data = [
    { name: "Sesuai", value: ok },
    { name: "Tidak sesuai", value: bad },
  ]
  const COLORS = ["#15803D", "#EF4444"]

  return (
    <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              Kepatuhan Tinggi Jenjang
            </div>
            <div className="mt-1 text-sm text-buma-muted">
              Perbandingan <b className="text-buma-text">jumlah garis</b> yang sesuai vs tidak sesuai.
            </div>
          </div>

          <div className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-xs text-buma-muted">
            <span className="font-semibold text-buma-text">Compliance: </span>
            {okPct}%
          </div>
        </div>

        {total === 0 ? (
          <div className="mt-5 rounded-2xl border border-buma-border bg-buma-bg p-4 text-sm text-buma-muted">
            Belum ada data untuk ditampilkan pada grafik.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr] md:items-center">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="rgba(0,0,0,0.06)"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ marginTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <StatPill label="Garis sesuai" value={`${ok}`} tone="ok" />
              <StatPill label="Garis tidak sesuai" value={`${bad}`} tone="warn" />
              <StatPill label="Total garis" value={`${total}`} tone="info" />
              <StatPill label="Persentase sesuai" value={`${okPct}%`} tone="ok" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrendBar({
  title,
  subtitle,
  data,
  empty,
}: {
  title: string
  subtitle?: string
  data: Array<{ label: string; sesuai: number; tidakSesuai: number }>
  empty: boolean
}) {
  return (
    <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              {title}
            </div>
            <div className="mt-1 text-sm text-buma-muted">
              {subtitle ?? "Trend jumlah garis sesuai vs tidak sesuai."}
            </div>
          </div>

          <div className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-xs text-buma-muted">
            <span className="font-semibold text-buma-text">Chart: </span>Bar
          </div>
        </div>

        {empty ? (
          <div className="mt-5 rounded-2xl border border-buma-border bg-buma-bg p-4 text-sm text-buma-muted">
            Belum ada data untuk trend pada periode ini.
          </div>
        ) : (
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap={14}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sesuai" name="Garis sesuai" fill="#15803D" radius={[10, 10, 0, 0]} />
                <Bar dataKey="tidakSesuai" name="Garis tidak sesuai" fill="#EF4444" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailTable({
  mode,
  rows,
}: {
  mode: "DAILY" | "WEEKLY"
  rows: InspectionRow[]
}) {
  return (
    <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
      <div className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
                Detail Operasional
              </div>
              <span className="inline-flex rounded-full border border-buma-border bg-buma-bg px-2.5 py-1 text-[11px] font-extrabold text-buma-muted">
                {mode === "DAILY" ? "Daily View" : "Weekly View"}
              </span>
            </div>
            <div className="mt-1 text-sm text-buma-muted">
              {mode === "DAILY"
                ? "Tanggal & waktu inspeksi ditampilkan."
                : "Weekly: kolom waktu diisi ‘—’."}
            </div>
          </div>

          <div className="text-xs text-buma-muted">
            Total inspeksi: <b className="text-buma-text">{rows.length}</b>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-buma-border bg-buma-bg p-6 text-sm text-buma-muted">
              Tidak ada data pada periode ini.
            </div>
          ) : (
            <table className="w-full min-w-[1220px] text-sm text-buma-text">
              <thead>
                <tr className="border-y border-buma-border text-left text-buma-muted">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="py-3">Waktu</th>
                  <th className="py-3">Inspector</th>
                  <th className="py-3">Shift</th>
                  <th className="py-3">Pelaksanaan</th>
                  <th className="py-3">Front</th>
                  <th className="py-3">Total Garis</th>
                  <th className="py-3">% Sesuai</th>
                  <th className="py-3">Reviewer PJA</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => {
                  const { date, time } = formatDateTime(r.inspectedAt)
                  const zebra = idx % 2 === 0 ? "bg-white" : "bg-buma-bg"

                  const pct = pctOk(r.linesOkCount, r.linesCount)
                  const pctCls =
                    pct >= 90
                      ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
                      : pct >= 60
                        ? "border-buma-blue/25 bg-buma-blue/10 text-buma-blue"
                        : "border-red-500/25 bg-red-500/10 text-red-600"

                  return (
                    <tr
                      key={r.id}
                      className={cls("border-b border-buma-border hover:bg-black/5", zebra)}
                    >
                      <td className="px-4 py-3 font-semibold">{date}</td>

                      <td className="py-3 text-buma-muted">{mode === "DAILY" ? time : "—"}</td>

                      <td className="py-3">{r.inspector}</td>
                      <td className="py-3 text-buma-muted">{shiftLabel(r.shift)}</td>

                      <td className="py-3 text-buma-muted">{r.pelaksanaan}</td>
                      <td className="py-3 text-buma-muted">{r.front}</td>

                      <td className="py-3">
                        <span className="inline-flex rounded-full border border-buma-border bg-white px-2.5 py-1 text-xs font-extrabold">
                          {r.linesCount}
                        </span>
                      </td>

                      <td className="py-3">
                        <span
                          className={cls(
                            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-extrabold",
                            pctCls
                          )}
                        >
                          {pct}%
                          <span className="text-[11px] font-semibold opacity-80">
                            ({r.linesOkCount}/{r.linesCount})
                          </span>
                        </span>
                      </td>

                      <td className="py-3">{r.reviewedBy}</td>

                      <td className="py-3">
                        <span
                          className={cls(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold",
                            r.reviewStatus === "VALID"
                              ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
                              : r.reviewStatus === "REJECT"
                                ? "border-red-500/25 bg-red-500/10 text-red-600"
                                : "border-buma-blue/25 bg-buma-blue/10 text-buma-blue"
                          )}
                        >
                          {r.reviewStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [mode, setMode] = useState<"DAILY" | "WEEKLY">("DAILY")

  // filters
  const [fromDate, setFromDate] = useState("2026-02-17")
  const [toDate, setToDate] = useState("2026-02-19")
  const [month, setMonth] = useState("2026-02")

  const [inspectionsAll, setInspectionsAll] = useState<InspectionRow[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const ac = new AbortController()

  setLoading(true)
  setError(null)

  fetchInspections(ac.signal)
    .then(setInspectionsAll)
    .catch((e) => setError(e?.message || "Failed to load"))
    .finally(() => setLoading(false))

  return () => ac.abort()
}, [])

  const inspections = useMemo(() => {
    if (mode === "DAILY") {
      return inspectionsAll.filter((x) => {
        const d = ymd(x.inspectedAt)
        return inRange(d, fromDate || undefined, toDate || undefined)
      })
    }
    return inspectionsAll.filter((x) => {
      const d = ymd(x.inspectedAt)
      return inMonth(d, month)
    })
  }, [inspectionsAll, mode, fromDate, toDate, month])

  /** ✅ TOTAL BERDASARKAN GARIS (bukan jumlah inspeksi) */
  const compliance = useMemo(() => {
    const ok = inspections.reduce((s, x) => s + (x.linesOkCount ?? 0), 0)
    const totalLines = inspections.reduce((s, x) => s + (x.linesCount ?? 0), 0)
    const bad = Math.max(0, totalLines - ok)
    return { ok, bad, total: totalLines }
  }, [inspections])

  /** ✅ Trend BERDASARKAN GARIS (bukan jumlah inspeksi) */
  const trendData = useMemo(() => {
    if (inspections.length === 0) return []

    if (mode === "DAILY") {
      const byDay = new Map<string, { sesuai: number; tidakSesuai: number }>()
      inspections.forEach((x) => {
        const d = x.inspectedAt.split(" ")[0]
        const cur = byDay.get(d) ?? { sesuai: 0, tidakSesuai: 0 }

        const okLines = x.linesOkCount ?? 0
        const totalLines = x.linesCount ?? 0
        const badLines = Math.max(0, totalLines - okLines)

        cur.sesuai += okLines
        cur.tidakSesuai += badLines
        byDay.set(d, cur)
      })

      return Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, v]) => ({ label, ...v }))
    }

    const wk = new Map<string, { sesuai: number; tidakSesuai: number }>()
    inspections.forEach((x) => {
      const d = ymd(x.inspectedAt)
      const w = fakeWeekLabel(d)
      const cur = wk.get(w) ?? { sesuai: 0, tidakSesuai: 0 }

      const okLines = x.linesOkCount ?? 0
      const totalLines = x.linesCount ?? 0
      const badLines = Math.max(0, totalLines - okLines)

      cur.sesuai += okLines
      cur.tidakSesuai += badLines
      wk.set(w, cur)
    })

    return Array.from(wk.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, v]) => ({ label, ...v }))
  }, [inspections, mode])

  const isEmpty = inspections.length === 0

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-4 relative overflow-hidden rounded-3xl border border-buma-border bg-white shadow-soft">
        <div className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-buma-green via-buma-blue to-buma-orange" />
        <div className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-buma-text">
                Dashboard Operasional
              </div>
              <div className="mt-1 text-sm text-buma-muted">
                Monitoring kepatuhan tinggi jenjang & ringkasan verifikasi (Daily / Weekly).
              </div>
              <div className="mt-1 text-xs text-buma-muted">
                * Semua metrik grafik dihitung berdasarkan <b className="text-buma-text">jumlah garis</b>.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <StatPill label="Total Garis" value={`${compliance.total}`} tone="info" />
              <StatPill label="Garis Sesuai" value={`${compliance.ok}`} tone="ok" />
              <StatPill label="Garis Tidak Sesuai" value={`${compliance.bad}`} tone="warn" />
              <StatPill label="Mode" value={mode} tone="info" />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-buma-border bg-buma-bg p-1">
                <button
                  type="button"
                  onClick={() => setMode("DAILY")}
                  className={cls(
                    "min-w-[96px] rounded-lg px-4 py-2 text-xs font-extrabold uppercase tracking-widest transition",
                    mode === "DAILY"
                      ? "bg-gradient-to-r from-[#15803D] to-[#22A745] text-white shadow-soft"
                      : "text-buma-muted hover:text-buma-text"
                  )}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setMode("WEEKLY")}
                  className={cls(
                    "min-w-[96px] rounded-lg px-4 py-2 text-xs font-extrabold uppercase tracking-widest transition",
                    mode === "WEEKLY"
                      ? "bg-gradient-to-r from-[#15803D] to-[#22A745] text-white shadow-soft"
                      : "text-buma-muted hover:text-buma-text"
                  )}
                >
                  Weekly
                </button>
              </div>

              <div className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs text-buma-muted">
                Mode mempengaruhi grafik & tabel.
              </div>
            </div>

            {/* Date/Month filter */}
            {mode === "DAILY" ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-xs font-extrabold text-buma-muted">
                  Range Tanggal
                </div>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text outline-none focus:ring-2 focus:ring-buma-blue/20"
                  aria-label="Tanggal mulai"
                />
                <span className="text-xs font-extrabold text-buma-muted">→</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text outline-none focus:ring-2 focus:ring-buma-blue/20"
                  aria-label="Tanggal akhir"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-xs font-extrabold text-buma-muted">
                  Bulan
                </div>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text outline-none focus:ring-2 focus:ring-buma-blue/20"
                  aria-label="Pilih bulan"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
      <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
        <div className="p-6 text-sm text-buma-muted">Loading data inspeksi…</div>
      </div>
    ) : error ? (
      <div className="rounded-3xl border border-red-200 bg-red-50 shadow-soft">
        <div className="p-6 text-sm text-red-700">
          Gagal memuat data: <b>{error}</b>
        </div>
      </div>
    ) : isEmpty ? (
      <EmptyState
        title="Tidak ada data pada periode ini"
        desc="Ubah range tanggal (Daily) atau bulan (Weekly). Jika data belum masuk, pastikan ingestion berjalan."
      />
    ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <DonutCompliance ok={compliance.ok} bad={compliance.bad} />
            <TrendBar
              title={mode === "DAILY" ? "Trend Harian" : "Trend Mingguan"}
              subtitle={
                mode === "DAILY"
                  ? "Agregasi jumlah garis per tanggal."
                  : "Agregasi jumlah garis per week."
              }
              data={trendData}
              empty={trendData.length === 0}
            />
          </div>

          <div className="mt-4">
            <DetailTable mode={mode} rows={inspections} />
          </div>
        </>
      )}
    </AppLayout>
  )
}
