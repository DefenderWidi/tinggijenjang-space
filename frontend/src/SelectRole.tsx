import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

type ActiveRole = "FRONT"
type AccountRole = "USER" | "ADMIN"
type OperationalAccess = "NONE" | "FIELD" | "PJA" | "ALL"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

const LS_KEY = "mt_session_v1"

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: AccountRole | string
  operationalAccess?: OperationalAccess | string
  activeRole?: ActiveRole | null

  site?: SiteCode | null
  activeSite?: SiteCode | null
  selectedSite?: SiteCode | null
  workspaceSite?: SiteCode | null

  ts?: number
}

const SITE_OPTIONS: {
  code: SiteCode
  label: string
}[] = [
  { code: "LAT", label: "LAT" },
  { code: "IPR", label: "IPR" },
  { code: "SDJ", label: "SDJ" },
  { code: "ADT", label: "ADT" },
]

const SUPER_ADMIN_USERNAMES = ["MFBAB", "Q4IUM"]

function normalizeText(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
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

function ensureDemoAccessIfNeeded(session: SessionData | null) {
  if (!session) return null

  if (isSuperAdminUsername(session.username)) {
    const upgradedSession: SessionData = {
      ...session,
      accountRole: "ADMIN",
      operationalAccess: "ALL",
      ts: Date.now(),
    }

    localStorage.setItem(LS_KEY, JSON.stringify(upgradedSession))
    return upgradedSession
  }

  return session
}

export default function SelectRole() {
  const nav = useNavigate()

  const [hoveredSite, setHoveredSite] = useState<SiteCode | null>(null)
  const [notice, setNotice] = useState("")
  const [session, setSession] = useState<SessionData | null>(() =>
    ensureDemoAccessIfNeeded(getSession())
  )

  const username = session?.username
  const operationalAccess = session?.operationalAccess ?? "NONE"

  const isAdminAccount = isAdminSession(session)

  const canAccessFront = useMemo(() => {
    const access = normalizeText(operationalAccess)

    return (
      isAdminAccount ||
      access === "FIELD" ||
      access === "PJA" ||
      access === "ALL"
    )
  }, [isAdminAccount, operationalAccess])

  useEffect(() => {
    const current = ensureDemoAccessIfNeeded(getSession())
    setSession(current)

    if (!current?.username) {
      nav("/", { replace: true })
    }
  }, [nav])

  function handlePickSite(site: SiteCode) {
    if (!canAccessFront) {
      setNotice(
        "Akun ini belum memiliki akses ke Inspector Front. Silakan hubungi admin."
      )
      return
    }

    saveSessionMerge({
      activeRole: "FRONT",
      site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,
    })

    setNotice("")
    setHoveredSite(null)
    nav("/measure", { replace: true })
  }

  function handleOpenAdmin() {
    if (!isAdminAccount) {
      setNotice("Pusat Admin hanya tersedia untuk akun admin.")
      return
    }

    saveSessionMerge({
      accountRole: "ADMIN",
      operationalAccess: "ALL",
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
                    Monitoring
                    <br className="hidden lg:block" />
                    <span className="text-buma-green">Tinggi Jenjang</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 xl:text-base">
                    Pilih site untuk langsung masuk ke workspace pengukuran.
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
                    onMouseEnter={() => setHoveredSite(null)}
                    onMouseLeave={() => setHoveredSite(null)}
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
                        Pilih Site
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-relaxed text-white/75 md:text-sm">
                        Klik salah satu site untuk langsung masuk ke halaman
                        pengukuran.
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

                  {notice ? (
                    <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-400/15 px-4 py-3 text-[12px] font-semibold leading-relaxed text-amber-50">
                      {notice}
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <InspectorSiteCard
                      hoveredSite={hoveredSite}
                      onHoverSite={setHoveredSite}
                      onClearHover={() => setHoveredSite(null)}
                      onPickSite={handlePickSite}
                      disabled={!canAccessFront}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {isAdminAccount && (
                      <motion.button
                        type="button"
                        onMouseEnter={() => setHoveredSite(null)}
                        onMouseLeave={() => setHoveredSite(null)}
                        onClick={handleOpenAdmin}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        className="
                          group relative w-full overflow-hidden
                          rounded-2xl border border-buma-green/35
                          bg-white/10 px-3 py-2.5 text-left backdrop-blur-xl
                          transition-all duration-300
                          hover:border-buma-green/55 hover:bg-white/16
                          hover:shadow-[0_8px_20px_rgba(34,167,69,0.18)]
                        "
                      >
                        <div className="relative flex items-center gap-3">
                          <div className="flex h-8 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              className="text-white"
                            >
                              <path
                                fill="currentColor"
                                d="M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z"
                              />
                              <circle
                                cx="12"
                                cy="8.5"
                                r="2.5"
                                fill="currentColor"
                              />
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

function InspectorSiteCard({
  hoveredSite,
  onHoverSite,
  onClearHover,
  onPickSite,
  disabled,
}: {
  hoveredSite: SiteCode | null
  onHoverSite: (site: SiteCode | null) => void
  onClearHover: () => void
  onPickSite: (site: SiteCode) => void
  disabled?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onMouseLeave={onClearHover}
      className="
        relative overflow-hidden rounded-3xl border border-white/20 bg-white/12 p-3
        backdrop-blur-xl transition-all duration-300
      "
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-br from-white/14 via-transparent to-transparent" />
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold leading-tight text-white">
              Inspector
            </div>
          </div>

          <div className="hidden rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-white/85 sm:block">
            FRONT
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SITE_OPTIONS.map((site) => (
            <SiteButton
              key={site.code}
              site={site}
              active={hoveredSite === site.code}
              disabled={disabled}
              onHover={() => !disabled && onHoverSite(site.code)}
              onLeave={() => onHoverSite(null)}
              onClick={() => onPickSite(site.code)}
            />
          ))}
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] ${
          hoveredSite
            ? "bg-gradient-to-r from-transparent via-[#22A745]/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
        }`}
      />
    </motion.div>
  )
}

function SiteButton({
  site,
  active,
  disabled,
  onHover,
  onLeave,
  onClick,
}: {
  site: {
    code: SiteCode
    label: string
  }
  active?: boolean
  disabled?: boolean
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
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`
        relative h-[132px] overflow-hidden rounded-2xl border text-center
        backdrop-blur-xl transition-all duration-300
        ${
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/5 opacity-60"
            : active
              ? "border-[#22A745]/70 bg-[#22A745]/22 shadow-[0_0_26px_rgba(34,167,69,0.18)]"
              : "border-white/18 bg-white/10 hover:border-[#22A745]/60 hover:bg-white/16 hover:shadow-[0_0_26px_rgba(34,167,69,0.14)]"
        }
      `}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-br from-white/16 via-transparent to-transparent" />
      </div>

      <div className="relative flex h-full flex-col items-center justify-center gap-2 px-2">
        <div
          className={`
            flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border
            transition-all duration-300
            ${
              active
                ? "border-[#22A745]/60 bg-[#22A745]/18"
                : "border-white/18 bg-white/10"
            }
          `}
        >
          <SiteIcon />
        </div>

        <div className="text-[22px] font-black leading-none tracking-wide text-white">
          {site.label}
        </div>

        <div
          className={`
            rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest
            ${
              active
                ? "border-[#22A745]/45 bg-[#22A745]/18 text-white"
                : "border-white/18 bg-black/20 text-white/75"
            }
          `}
        >
          Masuk
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] ${
          active
            ? "bg-gradient-to-r from-transparent via-[#22A745]/80 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
        }`}
      />
    </motion.button>
  )
}

function SiteIcon() {
  return (
    <img
      src="/inspectorimage.png"
      alt=""
      aria-hidden="true"
      className="h-12 w-12 object-contain"
      draggable={false}
    />
  )
}