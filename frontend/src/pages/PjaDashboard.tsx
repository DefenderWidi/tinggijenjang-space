import React, { useMemo, useState } from "react"
import AppLayout from "../layouts/AppLayout"

type ReviewStatus = "PENDING" | "REVIEWED" | "VALID" | "REJECT"
type Shift = "DAY" | "NIGHT"

type LineLabel = string

type LineItem = {
  label: LineLabel
  heightM: number
}

type AlertItem = {
  id: string
  inspectedAt: string // "YYYY/MM/DD HH:mm"
  inspector: string
  shift: Shift
  front: string
  lines: LineItem[]
  photoUrl?: string
  review: ReviewStatus
}

const LS_KEY = "mt_session_v1"
const LIMIT_M = 8.0

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
  return s === "DAY" ? "Day Shift" : "Night Shift"
}

function splitDateTime(inspectedAt: string) {
  // Expect "YYYY/MM/DD HH:mm" or "YYYY-MM-DD HH:mm"
  const parts = inspectedAt.trim().split(" ")
  const date = parts[0] ?? "-"
  const time = parts[1] ?? "-"
  return { date, time }
}

function pillReview(review: ReviewStatus) {
  if (review === "VALID") return "bg-buma-green/15 text-buma-green border-buma-green/25"
  if (review === "REJECT") return "bg-buma-orange/15 text-buma-orange border-buma-orange/25"
  if (review === "REVIEWED") return "bg-buma-blue/15 text-buma-blue border-buma-blue/25"
  return "bg-black/5 text-buma-muted border-buma-border"
}

function reviewLabel(review: ReviewStatus) {
  if (review === "REVIEWED") return "REVIEWED"
  return review
}

export default function PjaDashboard() {
  const session = getSession()
  const pjaName = session?.username ? session.username : "PJA"

  const [data, setData] = useState<AlertItem[]>([
    {
      id: "INT-256d9549",
      inspectedAt: "2026/02/02 12:58",
      inspector: "Hendra Toban",
      shift: "DAY",
      front: "Front 12-B Highwall",
      lines: [
        { label: "A", heightM: 7.71 },
        { label: "B", heightM: 8.08 },
        { label: "C", heightM: 7.15 },
      ],
      photoUrl: "/ContohPengukuran.png",
      review: "PENDING",
    },
  ])

  const [q, setQ] = useState("")
  const [tab, setTab] = useState<"ALL" | "PENDING" | "REVIEWED" | "VALID" | "REJECT">("PENDING")

  const counts = useMemo(() => {
    const c = { ALL: data.length, PENDING: 0, REVIEWED: 0, VALID: 0, REJECT: 0 }
    data.forEach((x) => {
      c[x.review]++
    })
    return c
  }, [data])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.filter((x) => {
      const okTab = tab === "ALL" ? true : x.review === tab
      const { date, time } = splitDateTime(x.inspectedAt)
      const okQ =
        !query ||
        x.id.toLowerCase().includes(query) ||
        x.front.toLowerCase().includes(query) ||
        x.inspector.toLowerCase().includes(query) ||
        date.toLowerCase().includes(query) ||
        time.toLowerCase().includes(query)
      return okTab && okQ
    })
  }, [data, q, tab])

  // ===== MODAL =====
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<AlertItem | null>(null)

  const [lineVerify, setLineVerify] = useState<Record<string, boolean | null>>({})
  const [notes, setNotes] = useState("")
  const [imgOpen, setImgOpen] = useState(false)

  function openDetail(item: AlertItem) {
    setActive(item)
    setOpen(true)
    setNotes("")

    const init: Record<string, boolean | null> = {}
    item.lines.forEach((ln) => (init[ln.label] = null))
    setLineVerify(init)
  }

  function closeDetail() {
    setOpen(false)
    setActive(null)
    setLineVerify({})
    setNotes("")
  }

  const checklist = useMemo(() => {
    if (!active) return { allVerified: false, allUnder: false }
    const allVerified = active.lines.every((ln) => lineVerify[ln.label] !== null)
    const allUnder = active.lines.every((ln) => ln.heightM < LIMIT_M)
    return { allVerified, allUnder }
  }, [active, lineVerify])

  function send() {
    if (!active) return
    if (!checklist.allVerified) return

    // Karena hanya ada tombol "Kirim", status kita jadikan REVIEWED (submitted)
    setData((prev) => prev.map((x) => (x.id === active.id ? { ...x, review: "REVIEWED" } : x)))
    closeDetail()
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* ===== HERO ===== */}
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
                  Verifikasi tiap garis (A/B/C/…) dan kirim hasil verifikasi.
                </div>
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
                Reviewed: {counts.REVIEWED}
              </span>
              <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/85 backdrop-blur">
                Limit referensi: {LIMIT_M.toFixed(1)} m
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
                {([
                  ["PENDING", `Pending ${counts.PENDING}`],
                  ["REVIEWED", `Reviewed ${counts.REVIEWED}`],
                  ["VALID", `Valid ${counts.VALID}`],
                  ["REJECT", `Reject ${counts.REJECT}`],
                  ["ALL", `All ${counts.ALL}`],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={cls(
                      "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                      tab === k
                        ? "border-buma-green/40 bg-buma-green/10 text-buma-green"
                        : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                    )}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
          <div className="px-4 pt-4">
            <div className="text-sm font-extrabold text-buma-text">Daftar Inspeksi</div>
            <div className="mt-1 text-xs text-buma-muted">
              Klik <b>Detail Verifikasi</b> untuk verifikasi garis dan kirim.
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm text-buma-text">
              <thead>
                <tr className="border-y border-buma-border text-left text-buma-muted">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="py-3">Waktu</th>
                  <th className="py-3">Inspector</th>
                  <th className="py-3">Shift</th>
                  <th className="py-3">Front / Area</th>
                  <th className="py-3">Garis</th>
                  <th className="py-3">Review</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((x) => {
                  const { date, time } = splitDateTime(x.inspectedAt)
                  return (
                    <tr key={x.id} className="border-b border-buma-border hover:bg-black/5">
                      <td className="px-4 py-3 font-semibold">{date}</td>
                      <td className="py-3 text-buma-muted">{time}</td>
                      <td className="py-3">{x.inspector}</td>
                      <td className="py-3 text-buma-muted">{shiftLabel(x.shift)}</td>
                      <td className="py-3 text-buma-muted">{x.front}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full border border-buma-border bg-buma-bg px-2.5 py-1 text-xs font-extrabold">
                          {x.lines.length} garis
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={cls(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold",
                            pillReview(x.review)
                          )}
                        >
                          {reviewLabel(x.review)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(x)}
                          className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text hover:bg-black/5"
                        >
                          Detail Verifikasi
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-buma-muted" colSpan={8}>
                      Tidak ada data sesuai filter.
                    </td>
                  </tr>
                ) : null}
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
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-buma-border bg-white/95 px-4 py-3 md:px-5 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-buma-text">
                Detail Verifikasi — {active.id}
              </div>
              <div className="mt-1 text-xs text-buma-muted">
                {active.front} • {shiftLabel(active.shift)} • {active.inspectedAt} • {active.inspector}
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

        {/* BODY (SCROLLABLE) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
          <div className={cls("grid gap-4 p-3 sm:p-4 md:p-5", "lg:grid-cols-[1.45fr_0.85fr]")}>
            {/* LEFT */}
            <div className="space-y-3">
              {/* Foto clickable → open viewer */}
              <button
                type="button"
                onClick={() => setImgOpen(true)}
                className="group overflow-hidden rounded-2xl border border-buma-border bg-white text-left"
                title="Klik untuk memperbesar"
              >
                <div className="relative w-full bg-white">
                  <img
                    src={active.photoUrl ?? "/miningimage1.png"}
                    alt="Foto inspeksi"
                    className="w-full h-auto object-contain"
                    draggable={false}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/35 to-transparent p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                    <span className="text-xs font-extrabold text-white/90">Klik untuk perbesar</span>
                    <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-extrabold text-white/85 backdrop-blur">
                      Preview
                    </span>
                  </div>
                </div>
              </button>

              {/* Meta: mobile 1 kolom, sm jadi 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <MetaCard k="Inspector" v={active.inspector} />
                <MetaCard k="Tanggal/Waktu" v={active.inspectedAt} />
                <MetaCard k="Shift" v={shiftLabel(active.shift)} />
                <MetaCard k="Front/Area" v={active.front} />
              </div>

              <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
                <div className="font-extrabold text-buma-text">Catatan cepat</div>
                <div className="mt-1 leading-relaxed">
                  Pastikan semua <b className="text-buma-text">titik</b> dipilih{" "}
                  <b className="text-buma-text">Sesuai / Tidak sesuai</b> sebelum kirim.
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-buma-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-buma-text">Verifikasi Tiap Titik</div>
                    <div className="mt-1 text-xs text-buma-muted">
                      Pilih status tiap titik (A/B/C/…). Tinggi dari hasil inspector.
                    </div>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-buma-border bg-buma-bg px-3 py-2 text-xs font-extrabold text-buma-muted">
                    Limit {LIMIT_M.toFixed(1)} m
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {active.lines.map((ln) => {
                    const v = lineVerify[ln.label]

                    const toggleVal = (next: boolean) => {
                      setLineVerify((prev) => {
                        const cur = prev[ln.label]
                        return { ...prev, [ln.label]: cur === next ? null : next }
                      })
                    }

                    return (
                      <div
                        key={ln.label}
                        className="rounded-2xl border border-buma-border bg-buma-bg p-3"
                      >
                        {/* Row: label + tinggi */}
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
                                {ln.heightM.toFixed(2)} m
                              </div>
                            </div>
                          </div>

                          {/* Status pill on the right */}
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

                        {/* Actions */}
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

                        <div className="mt-2 text-[11px] text-buma-muted">
                          Klik opsi yang sama sekali lagi untuk <b className="text-buma-text">membatalkan</b> pilihan.
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

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
                <div className="mt-1 text-right text-[11px] text-buma-muted">
                  {notes.length}/1000
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
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
              disabled={!checklist.allVerified}
              onClick={send}
              className="rounded-xl bg-gradient-to-r from-buma-green to-buma-blue px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95 disabled:opacity-40"
              title={!checklist.allVerified ? "Semua titik harus diverifikasi" : "Kirim verifikasi"}
            >
              Kirim
            </button>
          </div>

          {!checklist.allVerified ? (
            <div className="mt-2 text-xs text-buma-muted">
              * Harus memilih <b className="text-buma-text">Sesuai / Tidak sesuai</b> untuk semua titik sebelum kirim.
            </div>
          ) : null}
        </div>
      </div>
    </div>

    {/* ===== IMAGE VIEWER (LIGHTBOX) ===== */}
    {imgOpen ? (
      <div className="fixed inset-0 z-[10000]">
        <div className="absolute inset-0 bg-black/80" onClick={() => setImgOpen(false)} />
        <div className="absolute inset-0 flex items-center justify-center p-3 md:p-6">
          <div className="relative w-full max-w-[1100px] overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-extrabold text-white/90">Preview Foto</div>
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
                src={active.photoUrl ?? "/miningimage1.png"}
                alt="Foto inspeksi"
                className="mx-auto max-w-full h-auto object-contain"
                draggable={false}
              />
            </div>

            <div className="px-4 pb-4 text-xs text-white/70">
              Tips: gunakan pinch-to-zoom (mobile) atau Ctrl + scroll (desktop) untuk memperbesar.
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

/* ==== SMALL COMPONENTS ==== */

function MetaCard({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-buma-border bg-white p-3 text-xs">
      <div className="text-buma-muted">{k}</div>
      <div className="mt-1 font-extrabold text-buma-text">{v}</div>
    </div>
  )
}

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={cls(
        "rounded-2xl border p-2 text-center font-extrabold",
        ok
          ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
          : "border-buma-orange/25 bg-buma-orange/10 text-buma-orange"
      )}
    >
      {label}: {ok ? "✓" : "✕"}
    </div>
  )
}
