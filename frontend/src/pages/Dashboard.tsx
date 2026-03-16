import { useMemo, useState, useEffect } from "react"
import AppLayout from "../layouts/AppLayout"
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import * as XLSX from "xlsx"
import { getLimitM } from "../config/reference"

type Shift = "SIANG" | "MALAM"
type ReviewStatus = "PENDING" | "VALID" | "REJECT"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

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
  refUnit?: string | null
  refMeter?: number | null
  refVerifyOk?: boolean | null
  refVerifyMeter?: number | null
}

type ReviewLine = {
  label: string
  heightM: number
  ok: boolean | null
}

type ReviewDetail = {
  inspection: InspectionRow
  notes: string | null
  lines?: ReviewLine[]
  photoUrl?: string | null
}

type ActualBucketRow = {
  label: string
  count: number
  pct: number
}

/* =========================
   Helpers
========================= */

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function mapInspection(r: any): InspectionRow {
  return {
    id: String(r.id ?? ""),
    inspectedAt: String(r.inspected_at ?? r.inspectedAt ?? ""),
    inspector: String(r.inspector ?? ""),
    shift: (r.shift === "MALAM" ? "MALAM" : "SIANG") as Shift,
    pelaksanaan: pelaksanaanLabel(r.pelaksanaan),
    front: String(r.front ?? ""),
    linesCount: Number(r.lines_count ?? r.linesCount ?? 0),
    linesOkCount: Number(r.lines_ok_count ?? r.linesOkCount ?? 0),
    maxHeightM: Number(r.max_height_m ?? r.maxHeightM ?? 0),
    reviewedBy: r.reviewed_by ? String(r.reviewed_by) : r.reviewedBy ? String(r.reviewedBy) : null,
    reviewStatus: (r.review_status === "VALID" || r.review_status === "REJECT" || r.review_status === "PENDING"
      ? r.review_status
      : r.reviewStatus === "VALID" || r.reviewStatus === "REJECT" || r.reviewStatus === "PENDING"
        ? r.reviewStatus
        : "PENDING") as ReviewStatus,
    refUnit:
      String(r.ref_unit ?? r.refUnit ?? "").trim() || null,
    refMeter: r.ref_meter ?? r.refMeter ?? null,
    refVerifyOk:
  r.ref_verify_ok === true
    ? true
    : r.ref_verify_ok === false
      ? false
      : r.refVerifyOk === true
        ? true
        : r.refVerifyOk === false
          ? false
          : null,

refVerifyMeter:
  r.ref_verify_meter != null
    ? Number(r.ref_verify_meter)
    : r.refVerifyMeter != null
      ? Number(r.refVerifyMeter)
      : null,
  }
}

async function fetchInspections(signal?: AbortSignal): Promise<InspectionRow[]> {
  const res = await fetch(`${API_BASE}/api/inspections`, { signal })
  if (!res.ok) throw new Error(`Failed to load inspections (${res.status})`)
  const json = await res.json()
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
  return rows.map(mapInspection)
}

function shiftLabel(s: Shift) {
  return s === "SIANG" ? "Siang" : "Malam"
}

function formatDateTime(dt: string) {
  const d = new Date(dt)
  if (!Number.isFinite(d.getTime())) {
    const [dd, tt] = String(dt).split(" ")
    return { date: dd ?? "-", time: tt ?? "-" }
  }
  const date = d.toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" })
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  return { date, time }
}

function pelaksanaanLabel(p?: string) {
  const raw = String(p ?? "").trim().toUpperCase()

  // dukung kode dari backend/legacy
  if (raw === "START" || raw === "AWAL") return "Awal Shift"
  if (raw === "MID" || raw === "TENGAH") return "Tengah Shift"
  if (raw === "END" || raw === "AKHIR") return "Akhir Shift"

  // kalau backend sudah kirim teks Indonesia, biarin rapiin sedikit
  if (raw.includes("AWAL")) return "Awal Shift"
  if (raw.includes("TENGAH")) return "Tengah Shift"
  if (raw.includes("AKHIR")) return "Akhir Shift"

  return p ? String(p) : "—"
}

function ymd(dt: string) {
  const d = new Date(dt)
  if (!Number.isFinite(d.getTime())) return String(dt).split(" ")[0] ?? ""

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function inRange(dateStr: string, from?: string, to?: string) {
  if (from && dateStr < from) return false
  if (to && dateStr > to) return false
  return true
}

function inMonth(dateStr: string, month: string) {
  return dateStr.startsWith(month)
}

function pctOk(linesOkCount: number, linesCount: number) {
  if (!linesCount || linesCount <= 0) return 0
  return Math.round((linesOkCount / linesCount) * 100)
}

function fmtSigned(x: number) {
  const s = (Number.isFinite(x) ? x : 0).toFixed(2)
  return x > 0 ? `+${s} m` : `${s} m`
}

/* =========================
   Review detail fetchers
========================= */

async function fetchInspectionDetail(id: string, signal?: AbortSignal): Promise<any | null> {
  try {
    const r = await fetch(`${API_BASE}/api/inspections/${encodeURIComponent(id)}`, { signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

async function fetchInspectionLines(id: string, signal?: AbortSignal): Promise<any[] | null> {
  try {
    const r = await fetch(`${API_BASE}/api/inspection-lines?inspection_id=${encodeURIComponent(id)}`, { signal })
    if (!r.ok) return null
    const j = await r.json()
    const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    return arr
  } catch {
    return null
  }
}

async function fetchMeasurePhoto(inspectionId: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(`${API_BASE}/api/measures?inspection_id=${encodeURIComponent(inspectionId)}`, { signal })
    if (!r.ok) return null
    const j = await r.json()
    const data = Array.isArray(j?.data) ? j.data : j?.data ? [j.data] : Array.isArray(j) ? j : []
    const m = data?.[0]
    const url = m?.image_url ?? m?.imageUrl ?? null
    return url ? String(url) : null
  } catch {
    return null
  }
}

function mapReviewLines(linesArr: any[]): ReviewLine[] {
  return linesArr
    .map((x: any) => {
      const label = String(x.label ?? x.point ?? x.name ?? "")
      if (!label) return null

      const okRaw =
        typeof x.ok === "boolean"
          ? x.ok
          : typeof x.is_ok === "boolean"
            ? x.is_ok
            : typeof x.verified_ok === "boolean"
              ? x.verified_ok
              : typeof x.is_valid === "boolean"
                ? x.is_valid
                : x.status === "OK"
                  ? true
                  : x.status === "NOK"
                    ? false
                    : null

      return {
        label,
        heightM: Number(x.height_m ?? x.heightM ?? 0),
        ok: okRaw,
      } as ReviewLine
    })
    .filter(Boolean) as ReviewLine[]
}

/* =========================
   UI Components
========================= */

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
      ? "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
      : tone === "warn"
        ? "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600"
        : "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"

  return (
    <div className={cls("rounded-2xl border px-4 py-3 shadow-soft", toneCls)}>
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</div>
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
              <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
              <path d="M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
            </svg>
          </div>
          <div className="text-base font-extrabold text-buma-text">{title}</div>
          <div className="mt-1 text-sm text-buma-muted">{desc}</div>

          <div className="mt-4 rounded-2xl border border-buma-border bg-buma-bg px-4 py-3 text-xs text-buma-muted">
            Tips: ubah mode <b className="text-buma-text">Daily/Weekly</b> atau pilih range tanggal/bulan yang berbeda.
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
              Kesesuaian Titik
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

function ActualDistributionChart({
  shovelRows,
  backhoeRows,
  empty,
  loading,
}: {
  shovelRows: ActualBucketRow[]
  backhoeRows: ActualBucketRow[]
  empty: boolean
  loading: boolean
}) {
  const shovelData = [
    {
      label: "< 7 m",
      value: shovelRows.find((x) => x.label === "Di bawah 7 m")?.count ?? 0,
    },
    {
      label: "7-8 m",
      value: shovelRows.find((x) => x.label === "7-8 m")?.count ?? 0,
    },
    {
      label: "8-9 m",
      value: shovelRows.find((x) => x.label === "8-9 m")?.count ?? 0,
    },
    {
      label: "> 9 m",
      value: shovelRows.find((x) => x.label === "Di atas 9 m")?.count ?? 0,
    },
  ]

  const backhoeData = [
    {
      label: "< 3 m",
      value: backhoeRows.find((x) => x.label === "Di bawah 3 m")?.count ?? 0,
    },
    {
      label: "3-4 m",
      value: backhoeRows.find((x) => x.label === "3-4 m")?.count ?? 0,
    },
    {
      label: "4-5 m",
      value: backhoeRows.find((x) => x.label === "4-5 m")?.count ?? 0,
    },
    {
      label: "> 5 m",
      value: backhoeRows.find((x) => x.label === "Lebih dari 5 m")?.count ?? 0,
    },
  ]

  const totalShovel = shovelRows.reduce((s, x) => s + x.count, 0)
  const totalBackhoe = backhoeRows.reduce((s, x) => s + x.count, 0)

  function Section({
    title,
    total,
    data,
    fill,
    legendLabel,
  }: {
    title: string
    total: number
    data: Array<{ label: string; value: number }>
    fill: string
    legendLabel: string
  }) {
    return (
      <div className="rounded-2xl border border-buma-border bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
              {title}
            </div>
          </div>

          <div className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-[11px] font-extrabold text-buma-muted">
            Total titik: <span className="text-buma-text">{total}</span>
          </div>
        </div>

        <div className="mt-3 h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={20}>
              <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(label) => `Kategori: ${String(label ?? "")}`}
                formatter={(value: number | string | undefined) => [`${value ?? 0} titik`, legendLabel]}
              />
              <Legend />
              <Bar
                dataKey="value"
                name={legendLabel}
                fill={fill}
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              Kesesuaian Tinggi Jenjang
            </div>
            <div className="mt-1 text-sm text-buma-muted">
              Distribusi tinggi actual per titik berdasarkan tipe alat referensi.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center justify-center rounded-2xl border border-buma-border bg-white p-8">
            <div className="relative flex items-center justify-center">
              {/* Outer Ring */}
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-buma-green border-r-buma-green/40 sm:h-20 sm:w-20" />

              {/* Inner Ring */}
              <div className="absolute h-11 w-11 animate-[spin_1.2s_linear_reverse_infinite] rounded-full border-4 border-transparent border-t-buma-blue border-l-buma-blue/40 sm:h-14 sm:w-14" />
            </div>
          </div>
        ) : empty ? (
          <div className="mt-5 rounded-2xl border border-buma-border bg-buma-bg p-4 text-sm text-buma-muted">
            Belum ada data titik actual untuk ditampilkan.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Section
              title="Shovel"
              total={totalShovel}
              data={shovelData}
              fill="#15803D"
              legendLabel="Shovel"
            />
            <Section
              title="Backhoe"
              total={totalBackhoe}
              data={backhoeData}
              fill="#2563EB"
              legendLabel="Backhoe"
            />
          </div>
        )}
      </div>
    </div>
  )
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

/* =========================
   Detail Table (PJA-like button)
========================= */

function DetailTable({
  mode,
  rows,
  onOpenReview,

  onExportExcel,
  exportDisabled,
  exportBusy,
  exportMsg,
}: {
  mode: "DAILY" | "WEEKLY"
  rows: InspectionRow[]
  onOpenReview: (r: InspectionRow) => void

  onExportExcel: () => void
  exportDisabled: boolean
  exportBusy: boolean
  exportMsg?: string
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
              {mode === "DAILY" ? "Tanggal & waktu inspeksi ditampilkan." : "Weekly: kolom waktu diisi ‘—’."}
            </div>
          </div>

          {/* RIGHT TOP: Export + total */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onExportExcel}
              disabled={exportDisabled || exportBusy}
              className={cls(
                "inline-flex items-center justify-center gap-2 rounded-xl border border-buma-border bg-white px-3 py-2",
                "text-xs font-extrabold text-buma-text shadow-sm transition hover:bg-black/5",
                "disabled:opacity-50"
              )}
              title={exportDisabled ? "Tidak ada data untuk diexport" : "Export Excel sesuai view saat ini"}
            >
              <span className="text-sm leading-none">⤓</span>
              {exportBusy ? "Export..." : "Export Excel"}
            </button>

            <div className="text-xs text-buma-muted">
              Total inspeksi: <b className="text-buma-text">{rows.length}</b>
            </div>

            {exportBusy && exportMsg ? (
              <div className="w-full text-right text-[11px] text-buma-muted">{exportMsg}</div>
            ) : null}
          </div>
        </div>

        {/* Mobile spacing biar nggak mepet */}
        <div className="mt-4 overflow-x-auto -mx-5 px-4">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-buma-border bg-buma-bg p-6 text-sm text-buma-muted">
              Tidak ada data pada periode ini.
            </div>
          ) : (
            <table className="w-full min-w-[1280px] text-sm text-buma-text">
              <thead>
                <tr className="border-y border-buma-border text-left text-buma-muted">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="py-3">Waktu</th>
                  <th className="py-3">Inspector</th>
                  <th className="py-3">Shift</th>
                  <th className="py-3">Pelaksanaan</th>
                  <th className="py-3">Front</th>
                  <th className="py-3">Total Garis</th>
                  <th className="py-3">Kesesuaian</th>
                  <th className="py-3">Reviewer PJA</th>
                  <th className="py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => {
                  const { date, time } = formatDateTime(r.inspectedAt)
                  const zebra = idx % 2 === 0 ? "bg-white" : "bg-buma-bg"

                  const isReviewed = r.reviewStatus !== "PENDING" && !!r.reviewedBy
                  const pct = isReviewed ? pctOk(r.linesOkCount, r.linesCount) : 0

                  const pctCls =
                    pct >= 90
                      ? "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
                      : pct >= 60
                        ? "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"
                        : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600"

                  const statusCls =
                    r.reviewStatus === "VALID"
                      ? "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
                      : r.reviewStatus === "REJECT"
                        ? "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600"
                        : "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"

                  return (
                    <tr key={r.id} className={cls("border-b border-buma-border hover:bg-black/5", zebra)}>
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
                        {isReviewed ? (
                          <span className={cls("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-extrabold", pctCls)}>
                            {pct}%
                            <span className="text-[11px] font-semibold opacity-80">
                              ({r.linesOkCount}/{r.linesCount})
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-buma-border bg-buma-bg px-2.5 py-1 text-xs font-extrabold text-buma-muted">
                            —
                          </span>
                        )}
                      </td>

                      <td className="py-3">{r.reviewedBy ?? "—"}</td>

                      <td className="py-3">
                        <span className={cls("inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold", statusCls)}>
                          {r.reviewStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenReview(r)}
                          className="inline-flex items-center gap-1.5 rounded-xl
                                     border border-buma-border
                                     bg-gradient-to-r from-black/5 to-transparent
                                     px-3 py-2 text-xs font-extrabold text-buma-text
                                     shadow-sm transition-all duration-200
                                     hover:border-black/30
                                     hover:bg-gradient-to-r hover:from-black/8 hover:to-transparent
                                     hover:shadow-md"
                          title="Lihat detail verifikasi PJA (view only)"
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
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================
   Review Detail Modal 
========================= */

function ReviewDetailModal({
  open,
  row,
  onClose,
}: {
  open: boolean
  row: InspectionRow | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [imgOpen, setImgOpen] = useState(false)

  useEffect(() => {
    if (!open || !row) return

    const ac = new AbortController()
    setLoading(true)
    setErr(null)
    setDetail(null)
    setImgOpen(false)

      ; (async () => {
        const base = row

        const j1 = await fetchInspectionDetail(row.id, ac.signal)
        const data1 = j1?.data ?? j1

        const mapped = data1 ? mapInspection(data1) : base

const inspectionFromDetail = {
  ...mapped,
  refUnit: mapped.refUnit ?? base.refUnit,
  refMeter: mapped.refMeter ?? base.refMeter,
  refVerifyOk: mapped.refVerifyOk ?? base.refVerifyOk ?? null,
  refVerifyMeter: mapped.refVerifyMeter ?? base.refVerifyMeter ?? null,
}

        const notes =
          (data1?.review_notes ??
            data1?.notes ??
            data1?.comment ??
            data1?.pja_notes ??
            null) as string | null

        let linesArr: any[] = Array.isArray(data1?.lines)
          ? data1.lines
          : Array.isArray(data1?.data?.lines)
            ? data1.data.lines
            : []

        if (!linesArr.length) {
          const fallbackLines = await fetchInspectionLines(row.id, ac.signal)
          linesArr = Array.isArray(fallbackLines) ? fallbackLines : []
        }

        const mappedLines = linesArr.length ? mapReviewLines(linesArr) : undefined
        const photoUrl = await fetchMeasurePhoto(row.id, ac.signal)

        if (ac.signal.aborted) return

        setDetail({
          inspection: inspectionFromDetail,
          notes,
          lines: mappedLines,
          photoUrl,
        })
        setLoading(false)
      })().catch((e: any) => {
        if (ac.signal.aborted) return
        setErr(e?.message ?? "Failed to load review detail")
        setLoading(false)
      })

    return () => ac.abort()
  }, [open, row])

  if (!open || !row) return null
  // ✅ active dulu
  const active = detail?.inspection ?? row

  // ✅ baru standardM
  const standardM =
    active.refUnit ? getLimitM(active.refUnit) : 0

  const { date, time } = formatDateTime(active.inspectedAt)

  const isReviewed = active.reviewStatus !== "PENDING" && !!active.reviewedBy
  const pct = isReviewed ? pctOk(active.linesOkCount, active.linesCount) : 0

const refVerifyState =
  active.refVerifyOk === true ? true : active.refVerifyOk === false ? false : null

const displayRefMeter =
  active.refVerifyMeter != null
    ? Number(active.refVerifyMeter)
    : active.refMeter != null
      ? Number(active.refMeter)
      : null

  const statusBadgeCls =
    active.reviewStatus === "VALID"
      ? "border-buma-green/30 bg-gradient-to-r from-buma-green/15 to-buma-green/5 text-buma-green"
      : active.reviewStatus === "REJECT"
        ? "border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-600"
        : "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-buma-blue/5 text-buma-blue"

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      <div className="absolute inset-0 flex items-end md:items-center justify-center p-2 md:p-6">
        <div
          className={cls(
            "w-full max-w-[1180px] rounded-3xl border border-buma-border bg-white/95 shadow-soft backdrop-blur",
            "h-[92vh] md:h-[88vh]",
            "overflow-hidden",
            "flex flex-col"
          )}
        >
          {/* ===== header (sticky) ===== */}
          <div className="sticky top-0 z-10 border-b border-buma-border bg-white/95 px-4 py-3 md:px-5 md:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-buma-text">
                  Detail Review — {active.id}
                </div>
                <div className="mt-1 text-xs text-buma-muted">
                  {active.front} • {shiftLabel(active.shift)} • {active.pelaksanaan} • {date} {time} •{" "}
                  {active.inspector}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text hover:bg-black/5"
              >
                ✕ Tutup
              </button>
            </div>
          </div>

          {/* ===== body (scroll) ===== */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
            <div className={cls("grid gap-4 p-3 sm:p-4 md:p-5", "lg:grid-cols-[1.45fr_0.85fr]")}>
              {/* LEFT */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setImgOpen(true)}
                  className="group overflow-hidden rounded-2xl border border-buma-border bg-white text-left disabled:opacity-70"
                  title="Klik untuk memperbesar"
                  disabled={!detail?.photoUrl}
                >
                  <div className="relative w-full bg-white">
                    {loading ? (
                      <div className="grid h-[260px] sm:h-[280px] place-items-center text-xs text-buma-muted">
                        Loading foto overlay…
                      </div>
                    ) : detail?.photoUrl ? (
                      <img
                        src={detail.photoUrl}
                        alt="Foto overlay"
                        className="w-full h-auto object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="grid h-[260px] sm:h-[280px] place-items-center text-xs text-buma-muted">
                        Foto overlay belum tersedia.
                      </div>
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

                {err ? (
                  <div className="rounded-2xl border border-buma-orange/25 bg-buma-orange/10 px-3 py-2 text-xs text-buma-orange">
                    Detail review belum bisa di-load dari backend.<br />
                    Detail error: {err}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <MetaCard k="Inspector" v={active.inspector} />
                  <MetaCard k="Shift" v={shiftLabel(active.shift)} />
                  <MetaCard k="Pelaksanaan" v={active.pelaksanaan || "—"} />
                  <MetaCard k="Front/Area" v={active.front || "—"} />
                  <MetaCard k="Max Height" v={`${Number(active.maxHeightM || 0).toFixed(2)} m`} />
                  <MetaCard k="Lines" v={`${active.linesCount}`} />
                  <MetaCard k="Reviewer" v={active.reviewedBy ?? "—"} />
                  <MetaCard k="Ref Unit" v={active.refUnit ?? "—"} />
                  <MetaCard k="Limit" v={`${standardM.toFixed(2)} m`} />

                  {/* STATUS: jadi badge kecil (bukan card besar) */}
                  <div className="rounded-2xl border border-buma-border bg-white p-3 text-xs">
                    <div className="text-buma-muted">Status</div>
                    <div className="mt-1">
                      <span
                        className={cls(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold",
                          statusBadgeCls
                        )}
                      >
                        {active.reviewStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
                  <div className="font-extrabold text-buma-text">Ringkasan Kepatuhan</div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <MetaMini k="% Sesuai" v={isReviewed ? `${pct}%` : "—"} />
                    <MetaMini k="OK / Total" v={isReviewed ? `${active.linesOkCount}/${active.linesCount}` : "—"} />
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="space-y-3">
{/* Card Verifikasi Unit Referensi */}
<div
  className="
    relative rounded-3xl
    border border-buma-border
    bg-white
    p-3 sm:p-4
    shadow-soft
    before:absolute before:inset-0 before:rounded-3xl
    before:border before:border-black/5
    before:pointer-events-none
  "
>
  <div>
    <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
      Verifikasi Unit Referensi
    </div>

    <div className="mt-1 text-[11px] leading-relaxed text-buma-muted">
      Menampilkan hasil verifikasi referensi dari PJA.
    </div>
  </div>

  {/* REF UNIT + TINGGI REFERENSI */}
  <div className="mt-3 overflow-hidden rounded-2xl border border-buma-border bg-gradient-to-r from-buma-bg to-white shadow-sm">
    <div className="grid grid-cols-[118px_1fr] items-stretch">
      <div className="flex min-h-[68px] flex-col justify-center px-3 py-2.5">
        <div className="text-[9px] uppercase tracking-[0.18em] text-buma-muted">
          Ref Unit
        </div>
        <div className="mt-0.5 text-[15px] font-extrabold leading-none text-buma-text">
          {active.refUnit ?? "—"}
        </div>
      </div>

      <div className="flex min-h-[68px] flex-col justify-center border-l border-buma-border/70 bg-white/60 px-3 py-2.5">
        <div className="text-[9px] uppercase tracking-[0.18em] text-buma-muted">
          Tinggi Referensi
        </div>

        <div className="relative mt-0.5">
          <div className="pr-6 text-[15px] font-extrabold leading-none text-buma-text tabular-nums">
            {displayRefMeter != null ? displayRefMeter.toFixed(2) : "—"}
          </div>

          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-bold text-buma-muted">
            m
          </span>
        </div>
      </div>
    </div>
  </div>

  {/* STATUS */}
  <div className="mt-3">
    <span
      className={cls(
        "inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-widest shadow-sm",
        refVerifyState === null
          ? "border-buma-border bg-white text-buma-muted"
          : refVerifyState
            ? "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
            : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"
      )}
    >
      {refVerifyState === null
        ? "BELUM DIVERIFIKASI"
        : refVerifyState
          ? "REFERENSI SESUAI"
          : "REFERENSI TIDAK SESUAI"}
    </span>
  </div>
</div>
                {/* Card Verifikasi */}
                <div
                  className="
    relative rounded-3xl
    border border-buma-border
    bg-white
    p-3 sm:p-4
    shadow-soft
    before:absolute before:inset-0 before:rounded-3xl
    before:border before:border-black/5
    before:pointer-events-none
  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
                        Verifikasi Tiap Titik
                      </div>

                      <div className="mt-1 text-[11px] leading-relaxed text-buma-muted">
                        Menampilkan hasil verifikasi dari PJA.
                      </div>
                    </div>

                    <div
                      className="
        shrink-0
        rounded-xl
        border border-buma-border/70
        bg-gradient-to-r from-buma-bg to-white
        px-3 py-1.5
        text-[11px] font-extrabold text-buma-muted
        shadow-sm
      "
                    >
                      Limit {standardM.toFixed(1)} m
                    </div>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {loading ? (
                      <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-[11px] text-buma-muted">
                        Loading verifikasi…
                      </div>
                    ) : detail?.lines && detail.lines.length ? (
                      detail.lines.map((ln) => {

                        const v = ln.ok
                        const actual = Number.isFinite(ln.heightM) ? ln.heightM : null
                        const delta = actual == null ? null : actual - standardM

                        const badgeClass =
                          v === null
                            ? "border-buma-border bg-white text-buma-muted"
                            : v
                              ? "border-buma-blue/30 bg-gradient-to-r from-buma-blue/15 to-transparent text-buma-blue"
                              : "border-red-500/30 bg-gradient-to-r from-red-500/15 to-transparent text-red-600"

                        const badgeText = v === null ? "TIDAK ADA DATA" : v ? "SESUAI" : "TIDAK SESUAI"

                        return (
                          <div
                            key={ln.label}
                            className="
              relative
              rounded-2xl
              border border-buma-border
              bg-gradient-to-b from-buma-bg to-white
              p-2.5 sm:p-3
              shadow-sm
              before:absolute before:inset-0 before:rounded-2xl
              before:border before:border-black/5
              before:pointer-events-none
            "
                          >

                            {/* ===== BLOK 1: Kesesuaian Titik ===== */}
                            <div className="rounded-xl border border-buma-border/80 bg-white p-2.5">

                              <div className="text-[12px] font-extrabold text-buma-text">
                                Kesesuaian Titik
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-3">

                                <div className="flex items-center gap-3">

                                  <div className="text-[12px] font-semibold text-buma-text">
                                    Titik
                                  </div>

                                  <div
                                    className="
                      relative
                      inline-flex
                      h-10 w-10
                      items-center justify-center
                      rounded-xl
                      border border-buma-border
                      bg-gradient-to-b from-white to-buma-bg
                      text-xl font-extrabold text-buma-text
                      shadow-sm
                    "
                                  >
                                    <span className="absolute inset-1 rounded-lg bg-white/40" />
                                    <span className="relative">{ln.label}</span>
                                  </div>

                                  <div>
                                    <div className="text-[10px] text-buma-muted">
                                      Tinggi
                                    </div>

                                    <div className="text-[14px] font-extrabold text-buma-text tabular-nums">
                                      {actual == null ? "—" : `${actual.toFixed(2)} m`}
                                    </div>
                                  </div>

                                </div>

                                <span
                                  className={cls(
                                    "rounded-full border px-3 py-1 text-[10px] font-extrabold tracking-widest shadow-sm",
                                    badgeClass
                                  )}
                                >
                                  {badgeText}
                                </span>

                              </div>
                            </div>


                            {/* ===== BLOK 2: Kesesuaian Tinggi Jenjang ===== */}
                            <div className="mt-2.5 rounded-xl border border-buma-border/80 bg-white p-2.5">

                              <div className="text-[12px] font-extrabold text-buma-text">
                                Kesesuaian Tinggi Jenjang
                              </div>

                              <div className="mt-2 grid grid-cols-3 gap-2 text-center">

                                <div className="rounded-xl border border-buma-border/70 bg-gradient-to-r from-buma-bg to-white px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-widest text-buma-muted">
                                    Standar
                                  </div>

                                  <div className="text-[12px] font-extrabold text-buma-text tabular-nums">
                                    {standardM.toFixed(2)} m
                                  </div>
                                </div>

                                <div className="rounded-xl border border-buma-border/70 bg-gradient-to-r from-buma-bg to-white px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-widest text-buma-muted">
                                    Actual
                                  </div>

                                  <div className="text-[12px] font-extrabold text-buma-text tabular-nums">
                                    {actual == null ? "—" : `${actual.toFixed(2)} m`}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-buma-border/70 bg-gradient-to-r from-buma-bg to-white px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-widest text-buma-muted">
                                    Selisih
                                  </div>

                                  <div
                                    className={cls(
                                      "text-[12px] font-extrabold tabular-nums",
                                      delta == null
                                        ? "text-buma-muted"
                                        : actual !== null && actual === standardM
                                          ? "text-buma-green"
                                          : "text-red-600"
                                    )}
                                  >
                                    {delta == null ? "—" : fmtSigned(delta)}
                                  </div>
                                </div>

                              </div>

                              <div className="mt-2 text-[10px] text-buma-muted leading-relaxed">
                                {delta == null ? (
                                  <>Selisih tidak tersedia karena data tinggi belum lengkap.</>
                                ) : actual !== null && actual === standardM ? (
                                  <>
                                    Actual <b className="text-buma-green">tepat pada</b> standar limit ({fmtSigned(delta)})
                                  </>
                                ) : actual !== null && actual > standardM ? (
                                  <>
                                    Actual <b className="text-red-600">melebihi</b> limit ({fmtSigned(delta)})
                                  </>
                                ) : (
                                  <>
                                    Actual <b className="text-red-600">di bawah</b> limit ({fmtSigned(delta)})
                                  </>
                                )}
                              </div>

                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-[11px] text-buma-muted">
                        Data verifikasi per titik belum tersedia.
                      </div>
                    )}
                  </div>
                </div>


                {/* Card Catatan */}
                <div
                  className="
    relative rounded-3xl
    border border-buma-border
    bg-white
    p-3 sm:p-4
    shadow-soft
    before:absolute before:inset-0 before:rounded-3xl
    before:border before:border-black/5
    before:pointer-events-none
  "
                >
                  <div className="text-[13px] font-extrabold tracking-wide text-buma-text">
                    Catatan PJA
                  </div>

                  <div className="mt-2 rounded-xl border border-buma-border bg-gradient-to-b from-buma-bg to-white px-3 py-2 text-[12px] text-buma-text whitespace-pre-wrap">
                    {detail?.notes ? detail.notes : "— Tidak ada catatan / belum tersedia —"}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ===== footer (tanpa tombol, biar ga dobel) ===== */}
          <div className="sticky bottom-0 z-10 border-t border-buma-border bg-white/95 px-4 py-3 md:px-5">
            <div className="text-[11px] text-buma-muted">
              *Dashboard Evaluator hanya menampilkan hasil verifikasi, tanpa bisa mengubah status. (view-only)
            </div>
          </div>
        </div>
      </div>

      {/* ===== IMAGE VIEWER ===== */}
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
                  src={detail?.photoUrl ?? "/miningimage1.png"}
                  alt="Foto overlay"
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
  )
}

/* =========================
   Main Dashboard
========================= */

export default function Dashboard() {
  const [mode, setMode] = useState<"DAILY" | "WEEKLY">("DAILY")

  function todayYMD() {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  function currentMonth() {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }

  const [fromDate, setFromDate] = useState(todayYMD())
  const [toDate, setToDate] = useState(todayYMD())
  const [month, setMonth] = useState(currentMonth())

  const [inspectionsAll, setInspectionsAll] = useState<InspectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // modal state
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewRow, setReviewRow] = useState<InspectionRow | null>(null)

  function openReview(r: InspectionRow) {
    setReviewRow(r)
    setReviewOpen(true)
  }
  function closeReview() {
    setReviewOpen(false)
    setReviewRow(null)
  }

  const [actualDistLoading, setActualDistLoading] = useState(false)

  const [actualDist, setActualDist] = useState<{
    shovel: ActualBucketRow[]
    backhoe: ActualBucketRow[]
  }>({
    shovel: [
      { label: "Di bawah 7 m", count: 0, pct: 0 },
      { label: "7-8 m", count: 0, pct: 0 },
      { label: "8-9 m", count: 0, pct: 0 },
      { label: "Di atas 9 m", count: 0, pct: 0 },
    ],
    backhoe: [
      { label: "Di bawah 3 m", count: 0, pct: 0 },
      { label: "3-4 m", count: 0, pct: 0 },
      { label: "4-5 m", count: 0, pct: 0 },
      { label: "Lebih dari 5 m", count: 0, pct: 0 },
    ],
  })

  useEffect(() => {
    const ac = new AbortController()

    setLoading(true)
    setError(null)

    fetchInspections(ac.signal)
      .then((rows) => {
        if (ac.signal.aborted) return
        setInspectionsAll(rows)
      })
      .catch((e: any) => {
        if (e?.name === "AbortError" || String(e?.message || "").includes("aborted")) return
        setError(e?.message || "Failed to load")
      })
      .finally(() => {
        if (ac.signal.aborted) return
        setLoading(false)
      })

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

  const inspectionsReviewed = useMemo(() => {
    return inspections.filter((x) => x.reviewStatus !== "PENDING" && !!x.reviewedBy)
  }, [inspections])

  const isEmptyReviewed = inspectionsReviewed.length === 0

  // ===== EXPORT (Excel) =====
  const [isExporting, setIsExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState("")

  function safeFilename(s: string) {
    return (s || "").replace(/[^\w\-]+/g, "_").slice(0, 80)
  }

  // ambil raw lines dari backend per inspection
  async function fetchLinesRaw(
    inspectionId: string
  ): Promise<Array<{ label: string; height_m: number | null; ok: boolean | null }>> {
    try {
      const r = await fetch(
        `${API_BASE}/api/inspection-lines?inspection_id=${encodeURIComponent(inspectionId)}`,
        { method: "GET" }
      )
      if (!r.ok) return []
      const j = await r.json()
      const arr = Array.isArray(j?.data) ? j.data : []
      return arr
        .map((x: any) => ({
          label: String(x.label ?? "").trim(),
          height_m: x.height_m == null ? null : Number(x.height_m),
          ok: x.ok === true ? true : x.ok === false ? false : null,
        }))
        .filter((x: any) => x.label)
    } catch {
      return []
    }
  }

  async function fetchPhotoUrl(inspectionId: string): Promise<string | null> {
    try {
      const r = await fetch(
        `${API_BASE}/api/measures?inspection_id=${encodeURIComponent(inspectionId)}`
      )
      if (!r.ok) return null

      const j = await r.json()
      const data = Array.isArray(j?.data) ? j.data : j?.data ? [j.data] : []

      const m = data?.[0]
      const url = m?.image_url ?? m?.imageUrl ?? null
      return url ? String(url) : null
    } catch {
      return null
    }
  }

  async function exportExcelCurrentView() {
    if (isExporting) return
    if (!inspections.length) return

    try {
      setIsExporting(true)
      setExportMsg("Menyiapkan data export...")

      // ===== Sheet 1: Inspections (summary) =====
      const inspectionsSheet = await Promise.all(
        inspections.map(async (x) => {
          const { date, time } = formatDateTime(x.inspectedAt)

          const photoUrl = await fetchPhotoUrl(x.id)

          return {
            inspection_id: x.id,
            tanggal: date,
            waktu: mode === "DAILY" ? time : "—",

            inspector: x.inspector,
            shift: x.shift,
            pelaksanaan: x.pelaksanaan,
            front: x.front,

            ref_unit: x.refUnit ?? "",
            ref_type: (x.refUnit ?? "").startsWith("S")
              ? "Shovel"
              : (x.refUnit ?? "").startsWith("B")
                ? "Backhoe"
                : "",

            limit_m: x.refUnit ? getLimitM(x.refUnit) : "",

            max_height_m: x.maxHeightM,

            lines_count: x.linesCount,
            lines_ok_count: x.linesOkCount,

            compliance_pct: pctOk(x.linesOkCount, x.linesCount),

            review_status: x.reviewStatus,
            reviewed_by: x.reviewedBy ?? "",

            photo_url: photoUrl ?? "",
          }
        })
      )

      // ===== Sheet 2: Lines (per titik) =====
      const allLines: Array<any> = []
      const batchSize = 10

      for (let i = 0; i < inspections.length; i += batchSize) {
        const batch = inspections.slice(i, i + batchSize)
        setExportMsg(`Ambil detail titik... ${Math.min(i + batchSize, inspections.length)}/${inspections.length}`)

        const res = await Promise.all(
          batch.map(async (x) => {
            const linesRaw = await fetchLinesRaw(x.id)
            if (!linesRaw.length) {
              return [{ inspection_id: x.id, label: "", height_m: "", ok: "" }]
            }
            return linesRaw.map((ln) => ({
              inspection_id: x.id,

              ref_unit: x.refUnit ?? "",
              ref_type: (x.refUnit ?? "").startsWith("S")
                ? "Shovel"
                : (x.refUnit ?? "").startsWith("B")
                  ? "Backhoe"
                  : "",

              front: x.front,

              point_label: ln.label,

              height_m: ln.height_m ?? "",

              limit_m: x.refUnit ? getLimitM(x.refUnit) : "",

              delta_m:
                ln.height_m != null && x.refUnit
                  ? Number(ln.height_m) - getLimitM(x.refUnit)
                  : "",

              ok:
                ln.ok === true
                  ? "TRUE"
                  : ln.ok === false
                    ? "FALSE"
                    : "",
            }))
          })
        )

        res.flat().forEach((row) => allLines.push(row))
      }

      // ===== Build workbook =====
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(inspectionsSheet),
        "Inspections_Summary"
      )

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(allLines),
        "Lines_Detail"
      )

      // ===== filename: sesuai mode & filter =====
      const period =
        mode === "DAILY"
          ? `${fromDate || "NA"}_to_${toDate || "NA"}`
          : `${month || "NA"}`
      const fname = `Dashboard_Export_${safeFilename(mode)}_${safeFilename(period)}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`

      XLSX.writeFile(wb, fname)
    } finally {
      setIsExporting(false)
      setExportMsg("")
    }
  }

  const compliance = useMemo(() => {
    const ok = inspectionsReviewed.reduce((s, x) => s + (x.linesOkCount ?? 0), 0)
    const totalLines = inspectionsReviewed.reduce((s, x) => s + (x.linesCount ?? 0), 0)
    const bad = Math.max(0, totalLines - ok)
    return { ok, bad, total: totalLines }
  }, [inspectionsReviewed])

  const isEmpty = inspections.length === 0

  useEffect(() => {
    let cancelled = false

    async function buildActualDistribution() {
      if (!inspections.length) {
        setActualDist({
          shovel: [
            { label: "Di bawah 7 m", count: 0, pct: 0 },
            { label: "7-8 m", count: 0, pct: 0 },
            { label: "8-9 m", count: 0, pct: 0 },
            { label: "Di atas 9 m", count: 0, pct: 0 },
          ],
          backhoe: [
            { label: "Di bawah 3 m", count: 0, pct: 0 },
            { label: "3-4 m", count: 0, pct: 0 },
            { label: "4-5 m", count: 0, pct: 0 },
            { label: "Lebih dari 5 m", count: 0, pct: 0 },
          ],
        })
        return
      }

      setActualDistLoading(true)

      try {
        const shovelCounts = {
          under7: 0,
          m7to8: 0,
          m8to9: 0,
          above9: 0,
        }

        const backhoeCounts = {
          under3: 0,
          m3to4: 0,
          m4to5: 0,
          above5: 0,
        }

        const batchSize = 10

        for (let i = 0; i < inspections.length; i += batchSize) {
          const batch = inspections.slice(i, i + batchSize)

          const batchResults = await Promise.all(
            batch.map(async (insp) => {
              const ref = String(insp.refUnit ?? "").toUpperCase().trim()
              const lines = await fetchLinesRaw(insp.id)
              return { ref, lines }
            })
          )

          for (const item of batchResults) {
            const prefix = item.ref.charAt(0)

            for (const ln of item.lines) {
              const h = Number(ln.height_m)
              if (!Number.isFinite(h)) continue

              if (prefix === "S") {
                if (h < 7) shovelCounts.under7 += 1
                else if (h >= 7 && h < 8) shovelCounts.m7to8 += 1
                else if (h >= 8 && h < 9) shovelCounts.m8to9 += 1
                else shovelCounts.above9 += 1
              }

              if (prefix === "B") {
                if (h < 3) backhoeCounts.under3 += 1
                else if (h >= 3 && h < 4) backhoeCounts.m3to4 += 1
                else if (h >= 4 && h < 5) backhoeCounts.m4to5 += 1
                else backhoeCounts.above5 += 1
              }
            }
          }
        }

        const shovelTotal =
          shovelCounts.under7 + shovelCounts.m7to8 + shovelCounts.m8to9 + shovelCounts.above9

        const backhoeTotal =
          backhoeCounts.under3 + backhoeCounts.m3to4 + backhoeCounts.m4to5 + backhoeCounts.above5

        const pct = (count: number, total: number) =>
          total > 0 ? Math.round((count / total) * 100) : 0

        if (cancelled) return

        setActualDist({
          shovel: [
            {
              label: "Di bawah 7 m",
              count: shovelCounts.under7,
              pct: pct(shovelCounts.under7, shovelTotal),
            },
            {
              label: "7-8 m",
              count: shovelCounts.m7to8,
              pct: pct(shovelCounts.m7to8, shovelTotal),
            },
            {
              label: "8-9 m",
              count: shovelCounts.m8to9,
              pct: pct(shovelCounts.m8to9, shovelTotal),
            },
            {
              label: "Di atas 9 m",
              count: shovelCounts.above9,
              pct: pct(shovelCounts.above9, shovelTotal),
            },
          ],
          backhoe: [
            {
              label: "Di bawah 3 m",
              count: backhoeCounts.under3,
              pct: pct(backhoeCounts.under3, backhoeTotal),
            },
            {
              label: "3-4 m",
              count: backhoeCounts.m3to4,
              pct: pct(backhoeCounts.m3to4, backhoeTotal),
            },
            {
              label: "4-5 m",
              count: backhoeCounts.m4to5,
              pct: pct(backhoeCounts.m4to5, backhoeTotal),
            },
            {
              label: "Lebih dari 5 m",
              count: backhoeCounts.above5,
              pct: pct(backhoeCounts.above5, backhoeTotal),
            },
          ],
        })
      } finally {
        if (!cancelled) setActualDistLoading(false)
      }
    }
    buildActualDistribution()

    return () => {
      cancelled = true
    }
  }, [inspections])

  return (
    <AppLayout>
      {/* Header (tetap style dashboard kamu) */}
      <div className="mb-4 relative overflow-hidden rounded-3xl border border-buma-border bg-white shadow-soft">
        <div className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-buma-green via-buma-blue to-buma-orange" />
        <div className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-buma-text">Dashboard Operasional</div>
              <div className="mt-1 text-sm text-buma-muted">
                Monitoring kepatuhan tinggi jenjang & ringkasan verifikasi (Daily / Weekly).
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
          desc="Ubah range tanggal (Daily) atau bulan (Weekly)."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {isEmptyReviewed ? (
              <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
                <div className="p-6 text-sm text-buma-muted">Data inspeksi belum ada yang diverifikasi.</div>
              </div>
            ) : (
              <>
                <DonutCompliance ok={compliance.ok} bad={compliance.bad} />
                <ActualDistributionChart
                  shovelRows={actualDist.shovel}
                  backhoeRows={actualDist.backhoe}
                  loading={actualDistLoading}
                  empty={
                    (
                      actualDist.shovel.reduce((s, x) => s + x.count, 0) +
                      actualDist.backhoe.reduce((s, x) => s + x.count, 0)
                    ) === 0
                  }
                />
              </>
            )}
          </div>

          <div className="mt-4">
            <DetailTable
              mode={mode}
              rows={inspections}
              onOpenReview={openReview}
              onExportExcel={exportExcelCurrentView}
              exportDisabled={loading || inspections.length === 0}
              exportBusy={isExporting}
              exportMsg={exportMsg}
            />
          </div>
        </>
      )}

      {/* Modal Detail Review (PJA-style, view-only) */}
      <ReviewDetailModal open={reviewOpen} row={reviewRow} onClose={closeReview} />
    </AppLayout>
  )
}