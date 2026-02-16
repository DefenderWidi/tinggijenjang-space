import React, { useMemo, useState } from "react"
import AppLayout from "../layouts/AppLayout"

type ReviewStatus = "PENDING" | "DRAFT" | "VALID" | "REJECT"
type Shift = "DAY" | "NIGHT"

type LineLabel = string

type LineItem = {
  label: LineLabel
  heightM: number
}

type AlertItem = {
  id: string
  inspectedAt: string
  inspector: string
  shift: Shift
  front: string
  lines: LineItem[]
  photoUrl?: string
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

function riskOf(lines: LineItem[]) {
  const maxH = lines.reduce((m, x) => Math.max(m, x.heightM), 0)
  const anyOver = lines.some((x) => x.heightM >= LIMIT_M)
  return { maxH, anyOver }
}

function pillRisk(anyOver: boolean) {
  return anyOver
    ? "bg-buma-orange/15 text-buma-orange border-buma-orange/25"
    : "bg-buma-green/15 text-buma-green border-buma-green/25"
}

function pillReview(review: ReviewStatus) {
  if (review === "VALID") return "bg-buma-green/15 text-buma-green border-buma-green/25"
  if (review === "REJECT") return "bg-buma-orange/15 text-buma-orange border-buma-orange/25"
  if (review === "DRAFT") return "bg-buma-blue/15 text-buma-blue border-buma-blue/25"
  return "bg-black/5 text-buma-muted border-buma-border"
}

export default function PjaDashboard() {
  const session = getSession()
  const pjaName = session?.username ? session.username : "PJA"

  const [data, setData] = useState<Array<AlertItem & { review: ReviewStatus }>>([
    {
      id: "INT-256d9549",
      inspectedAt: "2026/02/02 23:58",
      inspector: "Alexander Pratama",
      shift: "NIGHT",
      front: "Front 12-B Highwall",
      lines: [
        { label: "A", heightM: 7.8 },
        { label: "B", heightM: 6.9 },
        { label: "C", heightM: 7.4 },
      ],
      photoUrl: "/LoginBackground.jpeg",
      review: "PENDING",
    },
    {
      id: "INT-02102",
      inspectedAt: "2026/02/02 23:33",
      inspector: "Hendra Toban",
      shift: "NIGHT",
      front: "PIT A – North Sector",
      lines: [
        { label: "A", heightM: 9.1 },
        { label: "B", heightM: 7.6 },
      ],
      photoUrl: "/LoginBackground.jpeg",
      review: "PENDING",
    },
    {
      id: "INT-92019",
      inspectedAt: "2026/02/02 22:46",
      inspector: "Rizky",
      shift: "DAY",
      front: "Front 03-A Highwall",
      lines: [
        { label: "A", heightM: 6.4 },
        { label: "B", heightM: 6.8 },
        { label: "C", heightM: 7.2 },
        { label: "D", heightM: 7.7 },
      ],
      photoUrl: "/LoginBackground.jpeg",
      review: "VALID",
    },
  ])

  const [q, setQ] = useState("")
  const [tab, setTab] = useState<"ALL" | "PENDING" | "VALID" | "REJECT" | "DRAFT">("PENDING")
  const [risk, setRisk] = useState<"ALL" | "SAFE" | "DANGER">("ALL")

  const counts = useMemo(() => {
    const c = { ALL: data.length, PENDING: 0, VALID: 0, REJECT: 0, DRAFT: 0, SAFE: 0, DANGER: 0 }
    data.forEach((x) => {
      c[x.review]++
      const r = riskOf(x.lines).anyOver ? "DANGER" : "SAFE"
      c[r]++
    })
    return c
  }, [data])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.filter((x) => {
      const okTab = tab === "ALL" ? true : x.review === tab
      const r = riskOf(x.lines).anyOver ? "DANGER" : "SAFE"
      const okRisk = risk === "ALL" ? true : r === risk
      const okQ =
        !query ||
        x.id.toLowerCase().includes(query) ||
        x.front.toLowerCase().includes(query) ||
        x.inspector.toLowerCase().includes(query)
      return okTab && okRisk && okQ
    })
  }, [data, q, tab, risk])

  // ===== MODAL =====
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<(AlertItem & { review: ReviewStatus }) | null>(null)

  const [lineVerify, setLineVerify] = useState<Record<string, boolean | null>>({})
  const [notes, setNotes] = useState("")

  function openDetail(item: AlertItem & { review: ReviewStatus }) {
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
    if (!active) return { allVerified: false, allUnder: false, canValid: false }
    const allVerified = active.lines.every((ln) => lineVerify[ln.label] !== null)
    const allUnder = active.lines.every((ln) => ln.heightM < LIMIT_M)
    return { allVerified, allUnder, canValid: allVerified && allUnder }
  }, [active, lineVerify])

  function saveDraft() {
    if (!active) return
    setData((prev) => prev.map((x) => (x.id === active.id ? { ...x, review: "DRAFT" } : x)))
    closeDetail()
  }

  function sendDecision(decision: "VALID" | "REJECT") {
    if (!active) return
    if (decision === "VALID" && !checklist.canValid) return
    setData((prev) => prev.map((x) => (x.id === active.id ? { ...x, review: decision } : x)))
    closeDetail()
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* ===== HERO (tetap dark karena banner foto) ===== */}
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
                  Verifikasi tiap garis (A/B/C/…) wajib & harus &lt; {LIMIT_M.toFixed(1)} m.
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-right backdrop-blur">
                <div className="text-xs text-white/70">Logged in as</div>
                <div className="text-sm font-extrabold text-white">{pjaName}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-xs font-extrabold text-emerald-200">
                SAFE {counts.SAFE}
              </span>
              <span className="rounded-full border border-orange-400/30 bg-orange-400/15 px-3 py-1 text-xs font-extrabold text-orange-200">
                DANGER {counts.DANGER}
              </span>
              <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white/85 backdrop-blur">
                Limit: {LIMIT_M.toFixed(1)} m
              </span>
            </div>
          </div>
        </div>

        {/* ===== FILTERS (LIGHT GLASS, tulisan kelihatan) ===== */}
        <div className="rounded-3xl border border-buma-border bg-white/80 shadow-soft backdrop-blur">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari ID / Front / Inspector…"
                className="w-full md:w-[340px] rounded-xl border border-buma-border bg-white px-3 py-2 text-sm text-buma-text placeholder:text-buma-muted outline-none focus:border-buma-green/60"
              />

              <div className="flex flex-wrap gap-2">
                {([
                  ["PENDING", `Pending ${counts.PENDING}`],
                  ["DRAFT", `Draft ${counts.DRAFT}`],
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

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setRisk("ALL")}
                  className={cls(
                    "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                    risk === "ALL"
                      ? "border-buma-blue/40 bg-buma-blue/10 text-buma-blue"
                      : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                  )}
                >
                  Semua Risk
                </button>
                <button
                  type="button"
                  onClick={() => setRisk("SAFE")}
                  className={cls(
                    "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                    risk === "SAFE"
                      ? "border-buma-green/40 bg-buma-green/10 text-buma-green"
                      : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                  )}
                >
                  SAFE
                </button>
                <button
                  type="button"
                  onClick={() => setRisk("DANGER")}
                  className={cls(
                    "rounded-xl border px-3 py-2 text-xs font-extrabold transition",
                    risk === "DANGER"
                      ? "border-buma-orange/40 bg-buma-orange/10 text-buma-orange"
                      : "border-buma-border bg-white text-buma-text hover:bg-black/5"
                  )}
                >
                  DANGER
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABLE (LIGHT) ===== */}
        <div className="rounded-3xl border border-buma-border bg-white shadow-soft">
          <div className="px-4 pt-4">
            <div className="text-sm font-extrabold text-buma-text">Daftar Inspeksi</div>
            <div className="mt-1 text-xs text-buma-muted">
              Klik <b>Detail</b> untuk verifikasi garis A/B/C/…
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm text-buma-text">
              <thead>
                <tr className="border-y border-buma-border text-left text-buma-muted">
                  <th className="px-4 py-3">ID</th>
                  <th className="py-3">Waktu Inspeksi</th>
                  <th className="py-3">Inspector</th>
                  <th className="py-3">Shift</th>
                  <th className="py-3">Front</th>
                  <th className="py-3">Garis</th>
                  <th className="py-3">Max</th>
                  <th className="py-3">Risk</th>
                  <th className="py-3">Review</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((x) => {
                  const r = riskOf(x.lines)
                  const riskLabel = r.anyOver ? "DANGER" : "SAFE"
                  return (
                    <tr key={x.id} className="border-b border-buma-border hover:bg-black/5">
                      <td className="px-4 py-3 font-semibold">{x.id}</td>
                      <td className="py-3 text-buma-muted">{x.inspectedAt}</td>
                      <td className="py-3">{x.inspector}</td>
                      <td className="py-3 text-buma-muted">{shiftLabel(x.shift)}</td>
                      <td className="py-3 text-buma-muted">{x.front}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full border border-buma-border bg-buma-bg px-2.5 py-1 text-xs font-extrabold">
                          {x.lines.length} garis
                        </span>
                      </td>
                      <td className="py-3 font-semibold">{r.maxH.toFixed(2)} m</td>
                      <td className="py-3">
                        <span className={cls("inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold", pillRisk(r.anyOver))}>
                          {riskLabel}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={cls("inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold", pillReview(x.review))}>
                          {x.review}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(x)}
                          className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text hover:bg-black/5"
                        >
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
              </tbody>
            </table>
          </div>

          <div className="px-4 py-4 text-xs text-buma-muted">
            Total tampil: <b className="text-buma-text">{filtered.length}</b>
          </div>
        </div>
      </div>

      {/* ===== MODAL (LIGHT, bukan darkmode) ===== */}
      {open && active ? (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/55" onClick={closeDetail} />

          <div className="absolute left-1/2 top-1/2 w-[96vw] max-w-[1120px] -translate-x-1/2 -translate-y-1/2">
            <div className="relative overflow-hidden rounded-3xl border border-buma-border bg-white/95 shadow-soft backdrop-blur">
              <div className="flex items-center justify-between border-b border-buma-border px-5 py-4">
                <div>
                  <div className="text-sm font-extrabold text-buma-text">
                    Detail Verifikasi — {active.id}
                  </div>
                  <div className="mt-1 text-xs text-buma-muted">
                    {active.front} • {shiftLabel(active.shift)} • {active.inspectedAt}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-extrabold text-buma-text hover:bg-black/5"
                >
                  ✕ Tutup
                </button>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[1.05fr_1fr]">
                {/* LEFT */}
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-buma-border bg-buma-bg">
                    <div
                      className="h-[320px] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url('${active.photoUrl ?? "/miningimage1.png"}')` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MetaCard k="Inspector" v={active.inspector} />
                    <MetaCard k="Waktu inspeksi" v={active.inspectedAt} />
                    <MetaCard k="Shift" v={shiftLabel(active.shift)} />
                    <MetaCard k="Lokasi front" v={active.front} />
                  </div>

                  <div className="rounded-2xl border border-buma-border bg-buma-bg p-3 text-xs text-buma-muted">
                    <div className="font-extrabold text-buma-text">Aturan verifikasi</div>
                    <div className="mt-1 leading-relaxed">
                      Setiap garis harus <b className="text-buma-text">{LIMIT_M.toFixed(1)} m</b>. Tombol{" "}
                      <b className="text-buma-text">Kirim VALID</b> aktif jika semua garis diverifikasi dan semuanya &lt;{" "}
                      {LIMIT_M.toFixed(1)} m.
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-3">
                  <div className="rounded-2xl border border-buma-border bg-white p-4">
                    <div className="text-sm font-extrabold text-buma-text">Verifikasi Tiap Garis</div>
                    <div className="mt-1 text-xs text-buma-muted">
                      Pilih status untuk tiap label (A/B/C/…). Tinggi ditampilkan dari hasil inspector.
                    </div>

                    <div className="mt-3 space-y-2">
                      {active.lines.map((ln) => {
                        const under = ln.heightM < LIMIT_M
                        const v = lineVerify[ln.label]

                        return (
                          <div
                            key={ln.label}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-buma-border bg-buma-bg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-buma-border bg-white text-sm font-extrabold text-buma-text">
                                {ln.label}
                              </span>

                              <div>
                                <div className="text-xs text-buma-muted">Tinggi</div>
                                <div className="text-sm font-extrabold text-buma-text">
                                  {ln.heightM.toFixed(2)} m{" "}
                                  <span
                                    className={cls(
                                      "ml-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-extrabold",
                                      under
                                        ? "border-buma-green/25 bg-buma-green/10 text-buma-green"
                                        : "border-buma-orange/25 bg-buma-orange/10 text-buma-orange"
                                    )}
                                  >
                                    {under ? "OK (<8m)" : "OVER (≥8m)"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-buma-muted">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={v === true}
                                  onChange={() => setLineVerify((prev) => ({ ...prev, [ln.label]: true }))}
                                />
                                Sesuai
                              </label>

                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={v === false}
                                  onChange={() => setLineVerify((prev) => ({ ...prev, [ln.label]: false }))}
                                />
                                Tidak sesuai
                              </label>

                              <span className="ml-2 text-[11px] text-buma-muted">
                                {v === null ? "Belum diverifikasi" : v ? "Verified: Sesuai" : "Verified: Tidak sesuai"}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <StatusChip label="Semua diverifikasi" ok={checklist.allVerified} />
                      <StatusChip label={`Semua < ${LIMIT_M.toFixed(1)}m`} ok={checklist.allUnder} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-buma-border bg-white p-4">
                    <div className="text-sm font-extrabold text-buma-text">Catatan</div>
                    <div className="mt-1 text-xs text-buma-muted">
                      Opsional. Isi jika perlu penjelasan (mis. alasan reject / observasi lapangan).
                    </div>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tulis catatan untuk inspeksi ini…"
                      className="mt-3 w-full resize-none rounded-2xl border border-buma-border bg-white px-3 py-2 text-sm text-buma-text placeholder:text-buma-muted outline-none focus:border-buma-green/60"
                      rows={4}
                    />
                    <div className="mt-1 text-right text-[11px] text-buma-muted">
                      {notes.length}/1000
                    </div>
                  </div>

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
                      onClick={saveDraft}
                      className="rounded-xl border border-buma-border bg-white px-4 py-2.5 text-sm font-extrabold text-buma-text hover:bg-black/5"
                    >
                      Simpan Draf
                    </button>

                    <button
                      type="button"
                      disabled={!checklist.canValid}
                      onClick={() => sendDecision("VALID")}
                      className="rounded-xl bg-gradient-to-r from-buma-green to-buma-blue px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95 disabled:opacity-40"
                      title={!checklist.canValid ? "Semua garis harus diverifikasi & < 8m" : "Kirim VALID"}
                    >
                      Kirim VALID
                    </button>

                    <button
                      type="button"
                      onClick={() => sendDecision("REJECT")}
                      className="rounded-xl bg-gradient-to-r from-buma-orange to-red-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft hover:opacity-95"
                      title="Kirim REJECT"
                    >
                      Kirim REJECT
                    </button>
                  </div>

                  <div className="text-xs text-buma-muted">
                    Catatan: tombol <b className="text-buma-text">VALID</b> nonaktif bila ada garis ≥{" "}
                    {LIMIT_M.toFixed(1)} m. Untuk kasus over-limit, gunakan <b className="text-buma-text">REJECT</b>.
                  </div>
                </div>
              </div>
            </div>
          </div>
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
