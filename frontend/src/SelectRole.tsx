import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

type ActiveRole = "FRONT" | "PJA" | "EVALUATOR"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

const LS_KEY = "mt_session_v1"

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: string
  operationalAccess?: string
  activeRole?: ActiveRole | null

  site?: SiteCode | string | null
  siteCode?: SiteCode | string | null
  activeSite?: SiteCode | string | null
  selectedSite?: SiteCode | string | null
  workspaceSite?: SiteCode | string | null
  area?: SiteCode | string | null
  mineSite?: SiteCode | string | null

  ts?: number
}

const SITE_OPTIONS: { code: SiteCode; label: string }[] = [
  { code: "LAT", label: "LAT" },
  { code: "IPR", label: "IPR" },
  { code: "SDJ", label: "SDJ" },
  { code: "ADT", label: "ADT" },
]

const SUPER_ADMIN_USERNAMES = ["MFBAB", "Q4IUM"]

const routeMap: Record<ActiveRole, string> = {
  FRONT: "/measure",
  PJA: "/pja",
  EVALUATOR: "/app",
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

function isSiteCode(value?: string | null): value is SiteCode {
  const clean = normalizeText(value)
  return clean === "LAT" || clean === "IPR" || clean === "SDJ" || clean === "ADT"
}

function asSiteCode(value?: string | null): SiteCode | null {
  const clean = normalizeText(value)
  return isSiteCode(clean) ? clean : null
}

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

function isSuperAdminUsername(username?: string | null) {
  return SUPER_ADMIN_USERNAMES.includes(normalizeText(username))
}

function isAdminSession(session?: SessionData | null) {
  const username = normalizeText(session?.username)
  const accountRole = normalizeText(session?.accountRole)

  return (
    accountRole === "ADMIN" ||
    accountRole === "SUPER_ADMIN" ||
    SUPER_ADMIN_USERNAMES.includes(username)
  )
}

function getSessionSite(session: SessionData | null): SiteCode | null {
  return (
    asSiteCode(session?.activeSite) ||
    asSiteCode(session?.selectedSite) ||
    asSiteCode(session?.workspaceSite) ||
    asSiteCode(session?.site) ||
    asSiteCode(session?.siteCode) ||
    asSiteCode(session?.area) ||
    asSiteCode(session?.mineSite)
  )
}

function ensureSessionAccess(session: SessionData | null) {
  if (!session) return null

  const currentSite = getSessionSite(session) || "LAT"

  if (isSuperAdminUsername(session.username)) {
    const upgradedSession: SessionData = {
      ...session,
      accountRole: "ADMIN",
      operationalAccess: "ALL",
      site: currentSite,
      siteCode: currentSite,
      activeSite: currentSite,
      selectedSite: currentSite,
      workspaceSite: currentSite,
      ts: Date.now(),
    }

    localStorage.setItem(LS_KEY, JSON.stringify(upgradedSession))
    return upgradedSession
  }

  const normalizedSession: SessionData = {
    ...session,
    site: currentSite,
    siteCode: currentSite,
    activeSite: currentSite,
    selectedSite: currentSite,
    workspaceSite: currentSite,
    ts: Date.now(),
  }

  localStorage.setItem(LS_KEY, JSON.stringify(normalizedSession))
  return normalizedSession
}

export default function SelectRole() {
  const nav = useNavigate()

  const [session, setSession] = useState<SessionData | null>(() =>
    ensureSessionAccess(getSession())
  )
  const [selectedSite, setSelectedSite] = useState<SiteCode>(() => {
    return getSessionSite(getSession()) || "LAT"
  })
  const [hoveredRole, setHoveredRole] = useState<ActiveRole | "ADMIN" | null>(
    null
  )
  const [notice, setNotice] = useState("")

  const username = session?.username || "-"
  const operationalAccess = session?.operationalAccess ?? "NONE"
  const isAdminAccount = isAdminSession(session)

  const normalizedAccess = useMemo(
    () => normalizeText(operationalAccess),
    [operationalAccess]
  )

  const canAccessFront = useMemo(() => {
    return (
      isAdminAccount ||
      normalizedAccess === "FIELD" ||
      normalizedAccess === "PJA" ||
      normalizedAccess === "ALL"
    )
  }, [isAdminAccount, normalizedAccess])

  const canAccessPja = useMemo(() => {
    return isAdminAccount || normalizedAccess === "PJA" || normalizedAccess === "ALL"
  }, [isAdminAccount, normalizedAccess])

  const canAccessEvaluator = useMemo(() => {
    return isAdminAccount || normalizedAccess === "ALL"
  }, [isAdminAccount, normalizedAccess])

  useEffect(() => {
    const current = ensureSessionAccess(getSession())
    setSession(current)

    if (!current?.username) {
      nav("/login", { replace: true })
      return
    }

    setSelectedSite(getSessionSite(current) || "LAT")
  }, [nav])

  function saveActiveSite(site: SiteCode) {
    saveSessionMerge({
      site,
      siteCode: site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,
    })

    setSelectedSite(site)
    setSession(getSession())
  }

  function handleChangeSite(site: SiteCode) {
    if (!isAdminAccount) return
    setNotice("")
    saveActiveSite(site)
  }

  function canAccessRole(role: ActiveRole) {
    if (role === "FRONT") return canAccessFront
    if (role === "PJA") return canAccessPja
    if (role === "EVALUATOR") return canAccessEvaluator
    return false
  }

  function handlePickRole(role: ActiveRole) {
    if (!canAccessRole(role)) {
      if (role === "FRONT") {
        setNotice("Akun ini belum memiliki akses ke Inspector Front.")
      } else if (role === "PJA") {
        setNotice("Akun ini belum memiliki akses ke Verifikasi PJA.")
      } else {
        setNotice("Akun ini belum memiliki akses ke Evaluator.")
      }
      return
    }

    saveSessionMerge({
      activeRole: role,
      site: selectedSite,
      siteCode: selectedSite,
      activeSite: selectedSite,
      selectedSite,
      workspaceSite: selectedSite,
    })

    setNotice("")
    setHoveredRole(null)
    nav(routeMap[role], { replace: true })
  }

  function handleOpenAdmin() {
    if (!isAdminAccount) {
      setNotice("Pusat Admin hanya tersedia untuk akun admin.")
      return
    }

    saveSessionMerge({
      accountRole: "ADMIN",
      operationalAccess: "ALL",
      site: selectedSite,
      siteCode: selectedSite,
      activeSite: selectedSite,
      selectedSite,
      workspaceSite: selectedSite,
    })

    setNotice("")
    setHoveredRole(null)
    nav("/admin", { replace: true })
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
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
                    Monitoring
                    <br className="hidden lg:block" />
                    <span className="text-buma-green">Tinggi Jenjang</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 xl:text-base">
                    Pilih role sesuai site aktif yang sudah ditentukan admin.
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
                  <button
                    onMouseEnter={() => setHoveredRole(null)}
                    onMouseLeave={() => setHoveredRole(null)}
                    onClick={() => nav("/login", { replace: true })}
                    className="
                      absolute left-0 top-0 z-20
                      group inline-flex items-center justify-center gap-2
                      rounded-xl border border-white/20 bg-white/10
                      px-4 py-2 text-xs font-extrabold text-white/90
                      backdrop-blur-md transition-all duration-300 ease-out
                      hover:-translate-y-[2px] hover:border-white/35
                      hover:bg-white/18 hover:shadow-[0_8px_20px_rgba(255,255,255,0.12)]
                      active:translate-y-0
                    "
                  >
                    ← Kembali
                  </button>

                  <div className="mb-4 flex items-start justify-between gap-3 pt-12">
                    <div className="min-w-0">
                      <div className="text-xl font-extrabold text-white md:text-2xl">
                        Pilih Role
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-relaxed text-white/75 md:text-sm">
                        Mode site aktif:{" "}
                        <span className="font-extrabold text-white">
                          {selectedSite}
                        </span>
                        . Semua fitur akan masuk sesuai site tersebut.
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1 text-right text-[11px] leading-none text-white/85">
                      <div className="max-w-[120px] truncate font-semibold text-white/95">
                        {username}
                      </div>

                      {isAdminAccount ? (
                        <span className="inline-flex rounded-full border border-buma-green/35 bg-buma-green/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          {operationalAccess}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 rounded-2xl border border-white/12 bg-black/15 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/55">
                          Site Aktif
                        </div>
                        <div className="mt-1 text-lg font-black text-white">
                          {selectedSite}
                        </div>
                      </div>

                      {isAdminAccount ? (
                        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/15 bg-slate-950/55 p-1.5">
                          {SITE_OPTIONS.map((site) => {
                            const active = selectedSite === site.code

                            return (
                              <button
                                key={site.code}
                                type="button"
                                onClick={() => handleChangeSite(site.code)}
                                className={`
                                  h-9 rounded-xl px-3 text-xs font-black tracking-wider text-white
                                  transition-all duration-200 active:scale-[0.98]
                                  ${
                                    active
                                      ? "border border-buma-green/60 bg-buma-green/25 shadow-[0_0_18px_rgba(34,167,69,0.18)]"
                                      : "border border-white/10 bg-white/8 hover:border-buma-green/45 hover:bg-white/15"
                                  }
                                `}
                              >
                                {site.code}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold text-white/85">
                          Site dikunci oleh admin
                        </div>
                      )}
                    </div>
                  </div>

                  {notice ? (
                    <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-400/15 px-4 py-3 text-[12px] font-semibold leading-relaxed text-amber-50">
                      {notice}
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <RoleCard
                      title={`Inspector Front ${selectedSite}`}
                      desc={`Pengukuran tinggi jenjang untuk site ${selectedSite}.`}
                      badge="FRONT"
                      imageSrc="/inspectorimage.png"
                      active={hoveredRole === "FRONT"}
                      disabled={!canAccessFront}
                      onHover={() => setHoveredRole("FRONT")}
                      onLeave={() => setHoveredRole(null)}
                      onClick={() => handlePickRole("FRONT")}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <RoleCard
                        title={`Verifikasi PJA ${selectedSite}`}
                        desc={`Validasi hasil pengukuran site ${selectedSite}.`}
                        badge="PJA"
                        imageSrc="/verificatorimage.png"
                        active={hoveredRole === "PJA"}
                        disabled={!canAccessPja}
                        onHover={() => setHoveredRole("PJA")}
                        onLeave={() => setHoveredRole(null)}
                        onClick={() => handlePickRole("PJA")}
                      />

                      <RoleCard
                        title={`Evaluator ${selectedSite}`}
                        desc={`Rekap dan evaluasi dashboard site ${selectedSite}.`}
                        badge="EV"
                        imageSrc="/evaluatorimage.png"
                        active={hoveredRole === "EVALUATOR"}
                        disabled={!canAccessEvaluator}
                        onHover={() => setHoveredRole("EVALUATOR")}
                        onLeave={() => setHoveredRole(null)}
                        onClick={() => handlePickRole("EVALUATOR")}
                      />
                    </div>

                    {isAdminAccount && (
                      <AdminCard
                        active={hoveredRole === "ADMIN"}
                        onHover={() => setHoveredRole("ADMIN")}
                        onLeave={() => setHoveredRole(null)}
                        onClick={handleOpenAdmin}
                      />
                    )}
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

function RoleCard({
  title,
  desc,
  badge,
  imageSrc,
  active,
  disabled,
  onHover,
  onLeave,
  onClick,
}: {
  title: string
  desc: string
  badge: string
  imageSrc: string
  active?: boolean
  disabled?: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onMouseEnter={() => !disabled && onHover()}
      onMouseLeave={onLeave}
      onFocus={() => !disabled && onHover()}
      onBlur={onLeave}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      className={`
        group relative min-h-[92px] overflow-hidden rounded-2xl border px-3 py-3 text-left text-white
        backdrop-blur-xl transition-all duration-300
        ${
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/5 opacity-55"
            : active
              ? "border-buma-green/60 bg-buma-green/18 shadow-[0_8px_22px_rgba(34,167,69,0.18)]"
              : "border-white/18 bg-white/10 hover:border-buma-green/50 hover:bg-white/16 hover:shadow-[0_8px_20px_rgba(34,167,69,0.14)]"
        }
      `}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-br from-white/14 via-transparent to-transparent" />
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10">
          <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            className={`h-16 w-16 object-contain ${disabled ? "grayscale" : ""}`}
            draggable={false}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-white">{title}</div>
          <div className="mt-1 text-[11px] font-semibold leading-relaxed text-white/68">
            {desc}
          </div>
        </div>

        <div className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-extrabold tracking-widest text-white/85">
          {badge}
        </div>
      </div>
    </motion.button>
  )
}

function AdminCard({
  active,
  onHover,
  onLeave,
  onClick,
}: {
  active?: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={`
        group relative w-full overflow-hidden
        rounded-2xl border px-3 py-2.5 text-left text-white backdrop-blur-xl
        transition-all duration-300
        ${
          active
            ? "border-buma-green/60 bg-buma-green/18 shadow-[0_8px_20px_rgba(34,167,69,0.18)]"
            : "border-buma-green/35 bg-white/10 hover:border-buma-green/55 hover:bg-white/16 hover:shadow-[0_8px_20px_rgba(34,167,69,0.18)]"
        }
      `}
    >
      <div className="relative flex items-center gap-3">
        <div className="flex h-8 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            className="text-white"
          >
            <path
              fill="currentColor"
              d="M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z"
            />
            <circle cx="12" cy="8.5" r="2.5" fill="currentColor" />
            <path
              fill="currentColor"
              d="M7 15a5.78 5.78 0 0 0 5 3a5.78 5.78 0 0 0 5-3c-.025-1.896-3.342-3-5-3c-1.667 0-4.975 1.104-5 3"
            />
          </svg>
        </div>

        <div className="flex-1 text-sm font-extrabold text-white">
          Pusat Admin
        </div>

        <div className="rounded-lg border border-buma-green/40 bg-buma-green/18 px-2 py-1 text-[10px] font-extrabold tracking-widest text-white">
          ADMIN
        </div>
      </div>
    </motion.button>
  )
}