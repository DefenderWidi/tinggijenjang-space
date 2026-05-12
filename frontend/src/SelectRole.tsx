import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

type ActiveRole = "FRONT" | "PJA" | "EVALUATOR"
type AccountRole = "USER" | "ADMIN"
type OperationalAccess = "NONE" | "FIELD" | "PJA"

const LS_KEY = "mt_session_v1"

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: AccountRole
  operationalAccess?: OperationalAccess
  activeRole?: ActiveRole | null
  ts?: number
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

const routeMap: Record<ActiveRole, string> = {
  FRONT: "/measure",
  PJA: "/pja",
  EVALUATOR: "/app",
}

export default function SelectRole() {
  const nav = useNavigate()

  const [selectedRole, setSelectedRole] = useState<ActiveRole>("FRONT")
  const [hoveredRole, setHoveredRole] = useState<ActiveRole | null>(null)
  const [notice, setNotice] = useState("")

  const session = useMemo(() => getSession(), [])
  const username = session?.username
  const accountRole = session?.accountRole
  const operationalAccess = session?.operationalAccess ?? "NONE"

  const isAdminAccount = accountRole === "ADMIN"

  const canAccessFront =
    isAdminAccount ||
    operationalAccess === "FIELD" ||
    operationalAccess === "PJA"

  const canAccessPja = isAdminAccount || operationalAccess === "PJA"

  const canAccessEvaluator = isAdminAccount

  const hasAnyOperationalAccess =
    canAccessFront || canAccessPja || canAccessEvaluator

  useEffect(() => {
    if (!username) {
      nav("/", { replace: true })
    }
  }, [username, nav])

  function canAccessRole(role: ActiveRole) {
    switch (role) {
      case "FRONT":
        return canAccessFront
      case "PJA":
        return canAccessPja
      case "EVALUATOR":
        return canAccessEvaluator
    }
  }

  function handlePickRole(role: ActiveRole) {
    const allowed = canAccessRole(role)

    if (!allowed) {
      if (!isAdminAccount && operationalAccess === "NONE") {
        setNotice(
          "Role ini belum tersedia untuk akun Anda. Silakan hubungi admin untuk pengaturan akses."
        )
        return
      }

      if (role === "EVALUATOR") {
        setNotice("Role Evaluator hanya dapat diakses oleh admin.")
        return
      }

      if (role === "PJA") {
        setNotice("Role Verifikasi PJA belum tersedia untuk akun Anda.")
        return
      }

      setNotice("Anda tidak memiliki akses ke role tersebut.")
      return
    }

    setNotice("")
    setSelectedRole(role)
    setHoveredRole(null)
    saveSessionMerge({ activeRole: role })
    nav(routeMap[role], { replace: true })
  }

  const cleanedNotice = notice

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
                    Pilih role untuk melanjutkan ke workspace sesuai kewenangan.
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

                  {cleanedNotice ? (
                    <div
                      className={`mb-4 text-[12px] font-semibold leading-relaxed ${
                        !hasAnyOperationalAccess
                          ? "text-amber-100"
                          : "text-white/95"
                      }`}
                    >
                      {cleanedNotice}
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <InspectorGroupCard
                      hoveredRole={hoveredRole}
                      selectedRole={selectedRole}
                      canAccessFront={canAccessFront}
                      onPickRole={handlePickRole}
                      onPreviewRole={setHoveredRole}
                      onClearPreview={() => setHoveredRole(null)}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <RoleCard
                        title="Verifikasi PJA"
                        desc="Validasi hasil pengukuran dari inspector."
                        active={hoveredRole === "PJA"}
                        selected={selectedRole === "PJA"}
                        disabled={!canAccessPja}
                        onHover={() => canAccessPja && setHoveredRole("PJA")}
                        onLeave={() => setHoveredRole(null)}
                        onClick={() => handlePickRole("PJA")}
                        badge="PJA"
                        imgSrc="/verificatorimage.png"
                      />

                      <RoleCard
                        title="Evaluator"
                        desc="Rekap dan evaluasi melalui dashboard."
                        active={hoveredRole === "EVALUATOR"}
                        selected={selectedRole === "EVALUATOR"}
                        disabled={!canAccessEvaluator}
                        onHover={() =>
                          canAccessEvaluator && setHoveredRole("EVALUATOR")
                        }
                        onLeave={() => setHoveredRole(null)}
                        onClick={() => handlePickRole("EVALUATOR")}
                        badge="EV"
                        imgSrc="/evaluatorimage.png"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {isAdminAccount && (
                      <motion.button
                        type="button"
                        onMouseEnter={() => setHoveredRole(null)}
                        onMouseLeave={() => setHoveredRole(null)}
                        onClick={() => nav("/admin", { replace: true })}
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

function InspectorGroupCard({
  hoveredRole,
  selectedRole,
  canAccessFront,
  onPickRole,
  onPreviewRole,
  onClearPreview,
}: {
  hoveredRole: ActiveRole | null
  selectedRole: ActiveRole
  canAccessFront: boolean
  onPickRole: (role: ActiveRole) => void
  onPreviewRole: (role: ActiveRole | null) => void
  onClearPreview: () => void
}) {
  const inspectorHoverRole = hoveredRole === "FRONT" ? hoveredRole : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onMouseLeave={onClearPreview}
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

            <div className="mt-1 text-[12px] leading-relaxed text-white/85">
              Workspace pengukuran tinggi jenjang area front.
            </div>
          </div>
        </div>

        <div className="grid gap-2" onMouseLeave={onClearPreview}>
          <InspectorSegmentButton
            label="Front"
            role="FRONT"
            active={hoveredRole === "FRONT"}
            selected={selectedRole === "FRONT"}
            disabled={!canAccessFront}
            imgSrc="/frontinspector.png"
            onPreview={onPreviewRole}
            onPick={onPickRole}
          />
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] ${
          inspectorHoverRole
            ? "bg-gradient-to-r from-transparent via-[#22A745]/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
        }`}
      />
    </motion.div>
  )
}

function InspectorSegmentButton({
  label,
  role,
  active,
  selected,
  disabled,
  imgSrc,
  onPreview,
  onPick,
}: {
  label: string
  role: ActiveRole
  active?: boolean
  selected?: boolean
  disabled?: boolean
  imgSrc: string
  onPreview: (role: ActiveRole | null) => void
  onPick: (role: ActiveRole) => void
}) {
  const cardState = disabled
    ? "cursor-not-allowed border-white/10 bg-white/5 opacity-60"
    : active
      ? "border-[#22A745]/60 bg-white/16 shadow-[0_0_28px_rgba(34,167,69,0.18)]"
      : selected
        ? "border-white/24 bg-white/12"
        : "border-white/20 bg-white/10 hover:border-[#22A745]/60 hover:bg-white/16 hover:shadow-[0_0_28px_rgba(34,167,69,0.14)]"

  const imageRing = active
    ? "ring-2 ring-[#22A745]/55"
    : selected
      ? "ring-2 ring-white/25"
      : "ring-1 ring-white/20"

  const bottomLineState = disabled
    ? "bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
    : active
      ? "bg-gradient-to-r from-transparent via-[#22A745]/70 to-transparent"
      : selected
        ? "bg-gradient-to-r from-transparent via-white/25 to-transparent"
        : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"

  return (
    <motion.button
      type="button"
      onMouseEnter={() => !disabled && onPreview(role)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => !disabled && onPreview(role)}
      onBlur={() => onPreview(null)}
      onClick={() => onPick(role)}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.992 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`relative w-full overflow-hidden rounded-3xl border p-2 text-left backdrop-blur-xl transition-all duration-300 ${cardState}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-br from-white/16 via-transparent to-transparent" />
        <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative">
        <div
          className={`relative h-[120px] overflow-hidden rounded-2xl bg-black/10 ${imageRing}`}
        >
          <img
            src={imgSrc}
            alt={label}
            className={`h-full w-full object-contain ${
              disabled ? "grayscale" : ""
            }`}
            draggable={false}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/18 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-2 p-3">
            <div
              className={`text-[18px] font-extrabold leading-none sm:text-[19px] ${
                disabled ? "text-white/80" : "text-white"
              }`}
            >
              {label}
            </div>

            <div
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                disabled
                  ? "bg-amber-300"
                  : active
                    ? "bg-[#22A745]"
                    : selected
                      ? "bg-white/80"
                      : "bg-white/45"
              }`}
            />
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] ${bottomLineState}`}
      />
    </motion.button>
  )
}

function RoleCard({
  title,
  desc,
  badge,
  active,
  selected,
  disabled,
  onClick,
  onHover,
  onLeave,
  imgSrc,
}: {
  title: string
  desc: string
  badge: string
  active?: boolean
  selected?: boolean
  disabled?: boolean
  onClick: () => void
  onHover?: () => void
  onLeave?: () => void
  imgSrc?: string
}) {
  const cardState = disabled
    ? "cursor-not-allowed border-white/10 bg-white/5 opacity-60"
    : active || selected
      ? "border-[#22A745]/60 bg-white/18 shadow-[0_0_28px_rgba(34,167,69,0.18)]"
      : "border-white/20 bg-white/12 hover:border-[#22A745]/60 hover:bg-white/16 hover:shadow-[0_0_28px_rgba(34,167,69,0.14)]"

  const imageRing =
    active || selected ? "ring-2 ring-[#22A745]/55" : "ring-1 ring-white/20"

  const badgeState =
    active || selected
      ? "border-[#22A745]/55 bg-[#22A745]/22 text-white"
      : "border-white/20 bg-white/10 text-white/90"

  return (
    <motion.button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.992 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`relative w-full overflow-hidden rounded-3xl border p-3 text-left backdrop-blur-xl transition-all duration-300 ${cardState}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-br from-white/16 via-transparent to-transparent" />
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative flex items-center gap-4">
        <div
          className={`relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-2xl bg-black/10 ${imageRing}`}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={title}
              className={`h-full w-full object-cover ${
                disabled ? "grayscale" : ""
              }`}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-[11px] font-extrabold tracking-widest text-white/80">
                IMAGE
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold leading-tight text-white md:text-base">
                {title}
              </div>

              <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                {desc}
              </div>
            </div>

            <div
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold tracking-widest ${badgeState}`}
            >
              {badge}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] ${
          disabled
            ? "bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
            : active || selected
              ? "bg-gradient-to-r from-transparent via-[#22A745]/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
        }`}
      />
    </motion.button>
  )
}