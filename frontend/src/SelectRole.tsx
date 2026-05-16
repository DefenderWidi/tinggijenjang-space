import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

type ActiveRole = "FRONT"
type AccountRole = "USER" | "ADMIN" | "admin" | "super_admin" | "SUPER_ADMIN"
type OperationalAccess = "NONE" | "FIELD" | "PJA" | "ALL"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

const LS_KEY = "mt_session_v1"

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: AccountRole
  operationalAccess?: OperationalAccess
  activeRole?: ActiveRole | null

  // Field site dibuat beberapa variasi agar lebih aman
  // kalau file lain membaca nama key yang berbeda.
  site?: SiteCode | null
  activeSite?: SiteCode | null
  selectedSite?: SiteCode | null
  workspaceSite?: SiteCode | null

  ts?: number
}

const SITE_OPTIONS: {
  code: SiteCode
  name: string
  desc: string
}[] = [
  {
    code: "LAT",
    name: "Lati Mine Operation",
    desc: "Workspace demo untuk area LAT.",
  },
  {
    code: "IPR",
    name: "IPR Mine Operation",
    desc: "Workspace demo untuk area IPR.",
  },
  {
    code: "SDJ",
    name: "SDJ Mine Operation",
    desc: "Workspace demo untuk area SDJ.",
  },
  {
    code: "ADT",
    name: "ADT Mine Operation",
    desc: "Workspace demo untuk area ADT.",
  },
]

function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as SessionData
    if (!parsed || typeof parsed !== "object") return null

    return parsed
  } catch {
    return null
  }
}

function saveSessionMerge(patch: Partial<SessionData>) {
  const prev = getSession() || {}

  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      ...prev,
      ...patch,
      ts: Date.now(),
    })
  )
}

function ensureDemoSession() {
  const existing = getSession()

  if (existing?.username) {
    return existing
  }

  const demoSession: SessionData = {
    id: "demo-session",
    username: "DEMO",
    accountRole: "ADMIN",
    operationalAccess: "ALL",
    activeRole: null,
    site: null,
    activeSite: null,
    selectedSite: null,
    workspaceSite: null,
    ts: Date.now(),
  }

  localStorage.setItem(LS_KEY, JSON.stringify(demoSession))
  return demoSession
}

function normalizeAccountRole(role?: AccountRole) {
  return String(role || "").toUpperCase()
}

function normalizeOperationalAccess(access?: OperationalAccess) {
  return String(access || "NONE").toUpperCase()
}

function isAdminRole(role?: AccountRole) {
  const normalized = normalizeAccountRole(role)

  return normalized === "ADMIN" || normalized === "SUPER_ADMIN"
}

function getInitialSite(session: SessionData | null): SiteCode {
  const site =
    session?.activeSite ||
    session?.selectedSite ||
    session?.workspaceSite ||
    session?.site

  if (site === "LAT" || site === "IPR" || site === "SDJ" || site === "ADT") {
    return site
  }

  return "LAT"
}

export default function SelectRole() {
  const nav = useNavigate()

  const [session, setSession] = useState<SessionData | null>(() => getSession())
  const [selectedSite, setSelectedSite] = useState<SiteCode>(() =>
    getInitialSite(getSession())
  )
  const [hoveredSite, setHoveredSite] = useState<SiteCode | null>(null)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    const current = ensureDemoSession()
    setSession(current)
    setSelectedSite(getInitialSite(current))
  }, [])

  const username = session?.username || "DEMO"
  const accountRole = session?.accountRole
  const operationalAccess = session?.operationalAccess ?? "NONE"

  const normalizedOperationalAccess = useMemo(
    () => normalizeOperationalAccess(operationalAccess),
    [operationalAccess]
  )

  const isAdminAccount = useMemo(() => isAdminRole(accountRole), [accountRole])

  const hasAllAccess =
    isAdminAccount || normalizedOperationalAccess === "ALL"

  const canAccessFront =
    hasAllAccess ||
    normalizedOperationalAccess === "FIELD" ||
    normalizedOperationalAccess === "PJA"

  const selectedSiteData = SITE_OPTIONS.find((site) => site.code === selectedSite)

  function handlePickSite(site: SiteCode) {
    setSelectedSite(site)
    setHoveredSite(null)
    setNotice("")

    saveSessionMerge({
      site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,
    })

    setSession(getSession())
  }

  function handleOpenFront() {
    if (!canAccessFront) {
      setNotice(
        "Akun ini belum memiliki akses ke Inspector Front. Silakan gunakan akun admin untuk demo."
      )
      return
    }

    saveSessionMerge({
      activeRole: "FRONT",
      site: selectedSite,
      activeSite: selectedSite,
      selectedSite,
      workspaceSite: selectedSite,
    })

    setNotice("")
    nav("/measure", { replace: true })
  }

  function handleOpenAdmin() {
    if (!isAdminAccount) {
      setNotice("Menu Admin hanya tersedia untuk akun admin.")
      return
    }

    saveSessionMerge({
      site: selectedSite,
      activeSite: selectedSite,
      selectedSite,
      workspaceSite: selectedSite,
    })

    setNotice("")
    nav("/admin", { replace: true })
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/LoginBackground.jpeg')" }}
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-buma-green/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-buma-orange/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-5 xl:px-6">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.48fr] lg:gap-12">
            <div className="hidden flex-col justify-center lg:flex lg:pl-14 xl:pl-20">
              <div className="max-w-lg">
                <div className="mb-5 inline-flex items-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
                  <img
                    src="/PT.-BUMA-Logo-Vector.svg-.png"
                    alt="PT BUMA Logo"
                    className="h-9 w-auto object-contain"
                  />

                  <div className="leading-tight">
                    <div className="text-xs font-semibold uppercase tracking-[0.26em] text-white/80">
                      Production Division
                    </div>
                    <div className="text-sm font-extrabold text-white">
                      Mine Technology
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 hidden h-24 w-1 rounded-full bg-gradient-to-b from-buma-green via-buma-green/70 to-transparent lg:block" />

                  <h1 className="text-[36px] font-extrabold leading-[1.05] tracking-tight text-white xl:text-[42px]">
                    Tinggi Jenjang
                    <br className="hidden lg:block" />
                    <span className="text-buma-green">Space</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 xl:text-base">
                    Pilih site dan masuk ke workspace Inspector Front untuk
                    kebutuhan demo pengukuran tinggi jenjang.
                  </p>

                  <div className="mt-6 text-xs text-white/65">
                    PT Bukit Makmur Mandiri Utama
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center py-8 lg:py-0">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative w-full max-w-[1140px] overflow-hidden rounded-3xl border border-white/20 bg-white/16 p-4 shadow-2xl backdrop-blur-xl sm:p-5 md:p-6"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/14 blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
                  <div className="absolute inset-0 ring-1 ring-white/10" />
                </div>

                <div className="relative">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xl font-extrabold text-white md:text-2xl">
                        Pilih Site Demo
                      </div>
                      <div className="mt-1 text-xs font-medium leading-relaxed text-white/70 md:text-sm">
                        Site terpilih akan disimpan ke session dan digunakan saat
                        masuk ke halaman pengukuran.
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1 text-right text-[11px] leading-none text-white/85">
                      <div className="max-w-[140px] truncate font-semibold text-white/95">
                        {username}
                      </div>

                      {hasAllAccess ? (
                        <span className="inline-flex rounded-full border border-buma-green/35 bg-buma-green/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          {normalizedOperationalAccess}
                        </span>
                      )}
                    </div>
                  </div>

                  {notice ? (
                    <div className="mb-4 rounded-2xl border border-amber-200/25 bg-amber-400/10 px-4 py-3 text-[12px] font-semibold leading-relaxed text-amber-50">
                      {notice}
                    </div>
                  ) : null}

                  <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {SITE_OPTIONS.map((site) => {
                      const active = selectedSite === site.code
                      const hovered = hoveredSite === site.code

                      return (
                        <button
                          key={site.code}
                          type="button"
                          onMouseEnter={() => setHoveredSite(site.code)}
                          onMouseLeave={() => setHoveredSite(null)}
                          onClick={() => handlePickSite(site.code)}
                          className={`
                            group relative overflow-hidden rounded-2xl border p-4 text-left
                            backdrop-blur-xl transition-all duration-300 ease-out
                            ${
                              active
                                ? "border-buma-green/70 bg-buma-green/20 shadow-[0_0_0_1px_rgba(54,179,126,0.25),0_18px_40px_rgba(0,0,0,0.18)]"
                                : "border-white/15 bg-white/10 hover:-translate-y-[2px] hover:border-buma-green/45 hover:bg-white/15 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                            }
                          `}
                        >
                          <div
                            className={`
                              pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300
                              ${
                                active || hovered
                                  ? "opacity-100 bg-gradient-to-br from-buma-green/18 via-transparent to-white/5"
                                  : ""
                              }
                            `}
                          />

                          <div className="relative">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div
                                className={`
                                  flex h-11 w-11 items-center justify-center rounded-2xl
                                  border text-sm font-black tracking-wide
                                  ${
                                    active
                                      ? "border-buma-green/60 bg-buma-green/25 text-white"
                                      : "border-white/15 bg-white/10 text-white/90"
                                  }
                                `}
                              >
                                {site.code}
                              </div>

                              {active ? (
                                <span className="rounded-full border border-buma-green/45 bg-buma-green/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                                  Dipilih
                                </span>
                              ) : null}
                            </div>

                            <div className="text-sm font-extrabold text-white">
                              {site.name}
                            </div>
                            <div className="mt-1 text-xs leading-relaxed text-white/68">
                              {site.desc}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <button
                      type="button"
                      onClick={handleOpenFront}
                      className="
                        group relative overflow-hidden rounded-2xl border border-buma-green/45
                        bg-buma-green/20 px-5 py-4 text-left backdrop-blur-xl
                        transition-all duration-300 ease-out
                        hover:-translate-y-[2px] hover:border-buma-green/75
                        hover:bg-buma-green/28 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)]
                        active:translate-y-0
                      "
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-buma-green/20 via-transparent to-white/5 opacity-80" />

                      <div className="relative flex items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-black text-white md:text-lg">
                            Masuk Inspector Front
                          </div>
                          <div className="mt-1 text-xs font-medium leading-relaxed text-white/75 md:text-sm">
                            Site aktif:{" "}
                            <span className="font-extrabold text-white">
                              {selectedSiteData?.code} - {selectedSiteData?.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-black text-white transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </div>
                      </div>
                    </button>

                    {isAdminAccount ? (
                      <button
                        type="button"
                        onClick={handleOpenAdmin}
                        className="
                          rounded-2xl border border-white/20 bg-white/10 px-5 py-4
                          text-sm font-extrabold text-white/95 backdrop-blur-xl
                          transition-all duration-300 ease-out
                          hover:-translate-y-[2px] hover:border-buma-orange/55
                          hover:bg-buma-orange/15 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)]
                          active:translate-y-0
                        "
                      >
                        Admin
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-[11px] leading-relaxed text-white/58">
                    Mode demo sementara: pilihan Verifikasi PJA dan Evaluator
                    disembunyikan. Admin tetap tersedia untuk akun dengan akses
                    admin.
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}