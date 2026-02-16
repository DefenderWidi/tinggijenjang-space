import React from "react"
import { Link } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"

type Stat = {
  label: string
  value: string
  tone?: "ok" | "info" | "warn"
}

function StatPill({ label, value, tone = "info" }: Stat) {
  const cls =
    tone === "ok"
      ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
      : tone === "warn"
        ? "border-buma-orange/25 bg-buma-orange/10 text-buma-orange"
        : "border-buma-blue/25 bg-buma-blue/10 text-buma-blue"

  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
        {label}
      </div>
      <div className="text-sm font-extrabold">{value}</div>
    </div>
  )
}

/** ============ Ringkasan Sesi (Open/Closed) ============ */

type SummaryTone = "ok" | "info" | "warn" | "neutral"

function CountPill({
  value,
  tone,
  title,
}: {
  value: number
  tone: SummaryTone
  title?: string
}) {
  const dot =
    tone === "ok"
      ? "bg-buma-green"
      : tone === "warn"
        ? "bg-buma-orange"
        : tone === "info"
          ? "bg-buma-blue"
          : "bg-black/50"

  const pill =
    tone === "ok"
      ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
      : tone === "warn"
        ? "border-buma-orange/25 bg-buma-orange/10 text-buma-orange"
        : tone === "info"
          ? "border-buma-blue/25 bg-buma-blue/10 text-buma-blue"
          : "border-buma-border bg-black/5 text-buma-muted"

  return (
    <div
      className={`inline-flex min-w-[72px] items-center justify-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-extrabold ${pill}`}
      title={title ?? `Jumlah: ${value}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{value}</span>
    </div>
  )
}

type SessionSummaryRow = {
  label: string // LMO/Weekly/MTD/YTD
  open: number
  closed: number
  exportedPdf: number
  pendingExport: number
}

function SessionSummaryTable({
  periodLabel,
  rows,
  onClickCell,
}: {
  periodLabel: string
  rows: SessionSummaryRow[]
  onClickCell?: (args: {
    bucket: SessionSummaryRow["label"]
    status: "OPEN" | "CLOSED" | "EXPORTED" | "PENDING_EXPORT"
  }) => void
}) {
  const cellBtnBase =
    "inline-flex items-center justify-center rounded-xl outline-none focus:ring-2 focus:ring-buma-blue/20"

  return (
    <div className="rounded-2xl border border-buma-border bg-white shadow-soft">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              Ringkasan Sesi Pengukuran
            </div>
            <div className="mt-1 text-sm text-buma-muted">
              Rekap sesi berdasarkan status workflow: <span className="font-semibold text-buma-text">Open</span> (sedang dikerjakan)
              dan <span className="font-semibold text-buma-text">Closed</span> (selesai). Export PDF dipisah untuk kebutuhan laporan.
            </div>
          </div>

          <div className="rounded-xl border border-buma-border bg-buma-bg px-3 py-2 text-xs text-buma-muted">
            <span className="font-semibold text-buma-text">Periode: </span>
            {periodLabel}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-buma-muted">
                  Site
                </th>
                <th className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-buma-muted">
                  Open
                </th>
                <th className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-buma-muted">
                  Closed
                </th>
                <th className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-buma-muted">
                  Exported PDF
                </th>
                <th className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-buma-muted">
                  Pending Export
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => {
                const zebra = idx % 2 === 0 ? "bg-white" : "bg-buma-bg"
                return (
                  <tr key={r.label} className={`${zebra}`}>
                    <td className="sticky left-0 z-10 border-t border-buma-border bg-inherit px-3 py-3">
                      <div className="text-sm font-extrabold text-buma-text">
                        {r.label}
                      </div>
                      <div className="text-xs text-buma-muted">
                        Ringkasan {r.label.toUpperCase()}
                      </div>
                    </td>

                    <td className="border-t border-buma-border px-3 py-3">
                      <button
                        type="button"
                        className={cellBtnBase}
                        onClick={() =>
                          onClickCell?.({ bucket: r.label, status: "OPEN" })
                        }
                        title="Lihat daftar sesi OPEN (nanti)"
                      >
                        <CountPill value={r.open} tone={r.open > 0 ? "warn" : "neutral"} />
                      </button>
                    </td>

                    <td className="border-t border-buma-border px-3 py-3">
                      <button
                        type="button"
                        className={cellBtnBase}
                        onClick={() =>
                          onClickCell?.({ bucket: r.label, status: "CLOSED" })
                        }
                        title="Lihat daftar sesi CLOSED (nanti)"
                      >
                        <CountPill value={r.closed} tone="ok" />
                      </button>
                    </td>

                    <td className="border-t border-buma-border px-3 py-3">
                      <button
                        type="button"
                        className={cellBtnBase}
                        onClick={() =>
                          onClickCell?.({ bucket: r.label, status: "EXPORTED" })
                        }
                        title="Lihat sesi yang sudah export PDF (nanti)"
                      >
                        <CountPill value={r.exportedPdf} tone="info" />
                      </button>
                    </td>

                    <td className="border-t border-buma-border px-3 py-3">
                      <button
                        type="button"
                        className={cellBtnBase}
                        onClick={() =>
                          onClickCell?.({
                            bucket: r.label,
                            status: "PENDING_EXPORT",
                          })
                        }
                        title="Lihat sesi closed tapi belum export (nanti)"
                      >
                        <CountPill
                          value={r.pendingExport}
                          tone={r.pendingExport > 0 ? "warn" : "neutral"}
                        />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
          <span className="font-semibold text-buma-text">Implementasi nanti: </span>
          Open = sesi belum “Close”; Closed = sesi sudah final; Exported = sudah generate PDF; Pending Export = Closed tapi belum generate PDF.
        </div>
      </div>
    </div>
  )
}

/** ============ Workflow Step Card ============ */

function StepCard({
  step,
  title,
  desc,
  hint,
  color,
  action,
}: {
  step: string
  title: string
  desc: string
  hint?: string
  color: "green" | "blue" | "orange"
  action?: React.ReactNode
}) {
  const accent =
    color === "green"
      ? "from-buma-green/18 to-transparent"
      : color === "blue"
        ? "from-buma-blue/18 to-transparent"
        : "from-buma-orange/18 to-transparent"

  const dot =
    color === "green"
      ? "bg-buma-green"
      : color === "blue"
        ? "bg-buma-blue"
        : "bg-buma-orange"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-buma-border bg-white shadow-soft">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-buma-muted">
              {step}
            </div>
          </div>
          <div className="rounded-full border border-buma-border bg-white/70 px-3 py-1 text-[11px] font-semibold text-buma-muted">
            Workflow
          </div>
        </div>

        <div className="mt-3 text-lg font-extrabold text-buma-text">{title}</div>
        <div className="mt-1 text-sm text-buma-muted">{desc}</div>

        {hint ? (
          <div className="mt-4 rounded-xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
            <span className="font-semibold text-buma-text">Tips: </span>
            {hint}
          </div>
        ) : null}

        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  )
}

export default function Dashboard() {
  // Dummy filter state (nanti bisa ambil dari query param)
  const [periodMode, setPeriodMode] = React.useState<"MONTHLY" | "WEEKLY">(
    "MONTHLY"
  )
  const [month, setMonth] = React.useState("2026-02")

  const periodLabel =
    periodMode === "MONTHLY" ? `Monthly • ${month}` : `Weekly • ${month}`

  // Dummy ringkasan (contoh fitur) — tinggal ganti dari API
  const sessionSummary: SessionSummaryRow[] = [
    { label: "LMO", open: 2, closed: 12, exportedPdf: 10, pendingExport: 2 },
    { label: "Weekly", open: 4, closed: 18, exportedPdf: 14, pendingExport: 4 },
    { label: "MTD", open: 7, closed: 53, exportedPdf: 41, pendingExport: 12 },
    { label: "YTD", open: 9, closed: 220, exportedPdf: 180, pendingExport: 40 },
  ]

  return (
    <AppLayout>
      {/* Header */}
  <div className="mb-4 rounded-2xl border border-buma-border bg-white shadow-soft ring-1 ring-inset ring-transparent before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:bg-gradient-to-r before:from-buma-green before:via-buma-blue before:to-buma-orange before:content-[''] relative overflow-hidden">
        <div className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-buma-text">
                Dashboard Operasional
              </div>
              <div className="mt-1 text-sm text-buma-muted">
                Workflow: Upload foto → Kalibrasi → Ukur jenjang → Close sesi → Export PDF
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatPill label="System" value="Ready" tone="ok" />
              <StatPill label="Session" value="Open/Close" tone="info" />
              <StatPill label="Export" value="PDF" tone="ok" />
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/app/measure"
              className="
                rounded-xl
                bg-gradient-to-r from-[#15803D] to-[#22A745]
                px-4 py-2.5 text-sm font-extrabold text-white
                shadow-soft transition-all duration-150
                hover:from-[#166534] hover:to-[#15803D]
                hover:ring-2 hover:ring-buma-green/40
                hover:ring-offset-1 hover:ring-offset-white
                hover:shadow-md
              "
            >
              Mulai / Lanjutkan Sesi
            </Link>

            <button
              className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-text hover:bg-black/5"
              disabled
              title="Aktif setelah ada sesi yang CLOSED"
            >
              Export PDF (nanti)
            </button>

            <button
              className="rounded-xl border border-buma-border bg-buma-bg px-4 py-2.5 text-sm font-extrabold text-buma-muted hover:bg-black/5"
              disabled
              title="Akan ditambahkan setelah ada riwayat sesi"
            >
              Riwayat Sesi (nanti)
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar untuk ringkasan */}
      <div className="mb-4 rounded-2xl border border-buma-border bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              Ringkasan
            </div>
            <div className="mt-1 text-sm text-buma-muted">
              Rekap sesi pengukuran berdasarkan periode (dummy).
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-buma-border bg-buma-bg p-1">
              <button
                type="button"
                onClick={() => setPeriodMode("MONTHLY")}
                className={`min-w-[96px] rounded-lg px-4 py-2 text-xs font-extrabold uppercase tracking-widest transition-all duration-150
    ${periodMode === "MONTHLY"
                    ? "bg-gradient-to-r from-[#15803D] to-[#22A745] text-white shadow-soft"
                    : "text-buma-muted hover:text-buma-text"
                  }`}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setPeriodMode("WEEKLY")}
                className={`min-w-[96px] rounded-lg px-4 py-2 text-xs font-extrabold uppercase tracking-widest transition-all duration-150
    ${periodMode === "WEEKLY"
                    ? "bg-gradient-to-r from-[#15803D] to-[#22A745] text-white shadow-soft"
                    : "text-buma-muted hover:text-buma-text"
                  }`}
              >
                Weekly
              </button>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text outline-none focus:ring-2 focus:ring-buma-blue/20"
              aria-label="Pilih bulan"
            />
          </div>
        </div>
      </div>

      {/* Summary table */}
      <div className="mb-4">
        <SessionSummaryTable
          periodLabel={periodLabel}
          rows={sessionSummary}
          onClickCell={() => {
            // nanti: navigate ke /app/sessions?bucket=...&status=...
          }}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left: workflow steps */}
        <div className="grid gap-4 md:grid-cols-2">
          <StepCard
            step="Step 01"
            title="Upload Foto"
            desc="Masukkan foto dari file atau kamera. Foto menjadi dasar overlay dan perhitungan tinggi."
            hint="Pastikan objek referensi terlihat jelas dan area jenjang terlihat penuh."
            color="green"
          />

          <StepCard
            step="Step 02"
            title="Kalibrasi Referensi"
            desc="Masukkan tinggi objek acuan (mis. EX3600 = 7.8 m) lalu klik 2 titik pada objek acuan."
            hint="Pilih titik atas–bawah pada objek yang sama untuk rasio pixel-to-meter yang stabil."
            color="blue"
          />

          <StepCard
            step="Step 03"
            title="Ukur Jenjang"
            desc="Klik titik-ke-titik untuk tiap jenjang yang ingin diukur. Hasil tersimpan per segmen."
            hint="Mulai dari toe → crest (atau sebaliknya) sesuai SOP."
            color="orange"
          />

          <StepCard
            step="Step 04"
            title="Close & Export"
            desc="Tutup sesi saat selesai. Setelah CLOSED, user bisa export PDF ringkas."
            hint="Closing mencegah perubahan data dan mengunci hasil untuk pelaporan."
            color="green"
            action={
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/app/measure"
                  className="
    rounded-xl
    bg-gradient-to-r from-[#15803D] to-[#22A745]
    px-4 py-2.5 text-sm font-extrabold text-white
    shadow-soft transition-all duration-150
    hover:from-[#166534] hover:to-[#15803D]
    hover:ring-2 hover:ring-buma-green/40
    hover:ring-offset-1 hover:ring-offset-white
    hover:shadow-md
  "
                >
                  Ke Workspace
                </Link>
                <button
                  className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-muted hover:bg-black/5"
                  disabled
                  title="Aktif setelah ada sesi CLOSED"
                >
                  Download PDF (nanti)
                </button>
              </div>
            }
          />
        </div>

        {/* Right: guide */}
        <div className="grid gap-4">
          <div className="rounded-2xl border border-buma-border bg-white p-5 shadow-soft">
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              Quick Checklist
            </div>
            <div className="mt-3 space-y-2 text-sm text-buma-muted">
              <div className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-buma-green" />
                <span>Foto jelas, tidak blur.</span>
              </div>
              <div className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-buma-blue" />
                <span>Kalibrasi 2 titik pada objek referensi yang sama.</span>
              </div>
              <div className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-buma-orange" />
                <span>Titik ukur konsisten (toe–crest) sesuai SOP.</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
              <span className="font-semibold text-buma-text">Catatan: </span>
              Ringkasan memakai status OPEN/CLOSED sesuai use case “Kelola Sesi Pengukuran”.
            </div>
          </div>

          <div className="rounded-2xl border border-buma-border bg-white p-5 shadow-soft">
            <div className="text-sm font-extrabold uppercase tracking-widest text-buma-text">
              Latest Session (Preview)
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-buma-border bg-white px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-buma-muted">
                  Session ID
                </div>
                <div className="text-sm font-extrabold text-buma-text">—</div>
              </div>
              <div className="rounded-xl border border-buma-border bg-white px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-buma-muted">
                  Status
                </div>
                <div className="text-sm font-extrabold text-buma-text">OPEN</div>
              </div>
              <div className="rounded-xl border border-buma-border bg-white px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-buma-muted">
                  Segmen
                </div>
                <div className="text-sm font-extrabold text-buma-text">—</div>
              </div>
              <div className="rounded-xl border border-buma-border bg-white px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-buma-muted">
                  PDF
                </div>
                <div className="text-sm font-extrabold text-buma-text">Pending</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to="/app/measure"
                className="
                    flex-1 rounded-xl
                    bg-gradient-to-r from-[#15803D] to-[#22A745]
                    px-4 py-2.5 text-center text-sm font-extrabold text-white
                    shadow-soft
                    transition-all duration-150
                    hover:from-[#166534] hover:to-[#15803D]
                    hover:ring-2 hover:ring-buma-green/40
                    hover:ring-offset-1 hover:ring-offset-white
                    hover:shadow-md
                  "
              >
                Open Workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
