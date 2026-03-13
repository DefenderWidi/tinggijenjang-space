import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

type ActiveRole = "FIELD" | "PJA" | "EVALUATOR"
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

function roleLabel(role: ActiveRole) {
  switch (role) {
    case "FIELD":
      return "Inspector Lapangan"
    case "PJA":
      return "Verifikasi PJA"
    case "EVALUATOR":
      return "Evaluator"
  }
}

export default function SelectRole() {
  const nav = useNavigate()
  const [selectedRole, setSelectedRole] = useState<ActiveRole>("FIELD")
  const [notice, setNotice] = useState("")

  const session = useMemo(() => getSession(), [])
  const username = session?.username
  const accountRole = session?.accountRole
  const operationalAccess = session?.operationalAccess ?? "NONE"
  const isAdminAccount = accountRole === "ADMIN"

  const canAccessField =
    isAdminAccount ||
    operationalAccess === "FIELD" ||
    operationalAccess === "PJA"

  const canAccessPja = isAdminAccount || operationalAccess === "PJA"
  const canAccessEvaluator = isAdminAccount
  const hasAnyOperationalAccess =
    canAccessField || canAccessPja || canAccessEvaluator

  useEffect(() => {
    if (!username) nav("/", { replace: true })
  }, [username, nav])

  useEffect(() => {
    if (isAdminAccount) {
      setNotice("Akun admin memiliki akses penuh ke seluruh workspace.")
      return
    }

    if (operationalAccess === "NONE") {
      setNotice(
        "Akun Anda belum memiliki akses role operasional. Silakan hubungi admin."
      )
      return
    }

    if (operationalAccess === "FIELD") {
      setNotice("Akun Anda hanya memiliki akses ke role Inspector Lapangan.")
      return
    }

    if (operationalAccess === "PJA") {
      setNotice(
        "Akun Anda memiliki akses ke Inspector Lapangan dan Verifikasi PJA."
      )
      return
    }

    setNotice("")
  }, [isAdminAccount, operationalAccess])

  function handlePickRole(role: ActiveRole) {
    const allowed =
      role === "FIELD"
        ? canAccessField
        : role === "PJA"
          ? canAccessPja
          : canAccessEvaluator

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

      setNotice("Anda tidak memiliki akses ke role tersebut.")
      return
    }

    saveSessionMerge({ activeRole: role })

    if (role === "FIELD") return nav("/measure", { replace: true })
    if (role === "PJA") return nav("/pja", { replace: true })
    return nav("/app", { replace: true })
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/LoginBackground.jpeg')" }}
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* soft accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-buma-green/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-buma-orange/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1600px] px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            {/* LEFT PANEL */}
            <div className="hidden lg:flex flex-col justify-center lg:pl-14 xl:pl-20">
              <div className="max-w-lg">
                <div className="mb-5 inline-flex items-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
                  <img
                    src="/PT.-BUMA-Logo-Vector.svg-.png"
                    alt="PT BUMA Logo"
                    className="h-9 w-auto object-contain"
                  />
                  <div className="leading-tight">
                    <div className="text-xs font-semibold uppercase tracking-[0.26em] text-white/70">
                      Production Division
                    </div>
                    <div className="text-sm font-extrabold text-white">
                      Mine Technology
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 hidden h-24 w-1 rounded-full bg-gradient-to-b from-buma-green via-buma-green/70 to-transparent lg:block" />

                  <h1 className="text-[36px] xl:text-[42px] font-extrabold text-white leading-[1.05] tracking-tight">
                    Monitoring
                    <br className="hidden lg:block" />
                    <span className="text-buma-green">Tinggi Jenjang</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm xl:text-base text-white/80 leading-relaxed">
                    Pilih role untuk melanjutkan ke workspace sesuai kewenangan.
                  </p>

                  <div className="mt-6 text-xs text-white/60">
                    PT Bukit Makmur Mandiri Utama
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="flex items-center justify-center py-10 lg:py-0">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/18 p-6 shadow-2xl backdrop-blur-xl"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                  <div className="absolute inset-0 ring-1 ring-white/10" />
                </div>

                <div className="relative">
           <div className="mb-4 flex items-start justify-between">
  <div className="text-xl font-extrabold text-white">
    Pilih Role
  </div>

 <div className="flex flex-col items-end gap-1.5 pt-1 text-[11px] text-white/80 text-right leading-none">
  <div className="font-semibold text-white/95">{username}</div>

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
  <div
    className={`mb-3 rounded-2xl border px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed backdrop-blur-md shadow-[0_8px_16px_rgba(0,0,0,0.12)] ${
      !hasAnyOperationalAccess
        ? "border-amber-300/35 bg-amber-500/12 text-amber-100"
        : "border-white/10 bg-white/5 text-white/90"
    }`}
  >
    {notice}
  </div>
) : null}

                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.08 } },
                    }}
                    className="grid gap-3"
                  >
                    <RoleCard
                      title="Inspector Lapangan"
                      desc="Masuk ke workspace pengukuran."
                      active={selectedRole === "FIELD" && canAccessField}
                      disabled={!canAccessField}
                      onHover={() => canAccessField && setSelectedRole("FIELD")}
                      onClick={() => handlePickRole("FIELD")}
                      badge="FIELD"
                      imgSrc="/inspectorimage.png"
                      disabledText={
                        operationalAccess === "NONE"
                          ? "Hubungi admin untuk membuka akses role ini"
                          : "Role ini tidak tersedia untuk akun Anda"
                      }
                    />

                    <RoleCard
                      title="Verifikasi PJA"
                      desc="Validasi hasil pengukuran dari inspector."
                      active={selectedRole === "PJA" && canAccessPja}
                      disabled={!canAccessPja}
                      onHover={() => canAccessPja && setSelectedRole("PJA")}
                      onClick={() => handlePickRole("PJA")}
                      badge="PJA"
                      imgSrc="/verificatorimage.png"
                      disabledText={
                        operationalAccess === "NONE"
                          ? "Hubungi admin untuk membuka akses role ini"
                          : "Role ini tidak tersedia untuk akun Anda"
                      }
                    />

                    <RoleCard
                      title="Evaluator"
                      desc="Rekap & evaluasi melalui dashboard."
                      active={selectedRole === "EVALUATOR" && canAccessEvaluator}
                      disabled={!canAccessEvaluator}
                      onHover={() =>
                        canAccessEvaluator && setSelectedRole("EVALUATOR")
                      }
                      onClick={() => handlePickRole("EVALUATOR")}
                      badge="EV"
                      imgSrc="/evaluatorimage.png"
                      disabledText="Role Evaluator hanya untuk admin"
                    />
                  </motion.div>

                  <div className="mt-3 space-y-3">
                    {isAdminAccount && (
                      <motion.button
                        type="button"
                        onClick={() => nav("/admin", { replace: true })}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        className="
                          group relative w-full overflow-hidden
                          rounded-2xl border border-buma-green/35
                          bg-white/10 px-3 py-2.5
                          text-left backdrop-blur-xl
                          transition-all duration-300
                          hover:bg-white/20 hover:border-buma-green/55
                          hover:shadow-[0_8px_20px_rgba(34,167,69,0.18)]
                        "
                      >
                        <div className="relative flex items-center gap-3">
                          <div className="
                            flex h-8 w-10 shrink-0 items-center justify-center
                            rounded-xl border border-white/15
                            bg-white/10 text-white
                          ">
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

                          <div className="
                            rounded-lg border border-buma-green/40
                            bg-buma-green/18 px-2 py-1
                            text-[10px] font-extrabold tracking-widest text-white
                          ">
                            ADMIN
                          </div>
                        </div>
                      </motion.button>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => nav("/login", { replace: true })}
                        className="
                          group inline-flex items-center justify-center gap-2
                          rounded-xl border border-white/20
                          bg-white/10 px-6 py-2
                          text-xs font-extrabold text-white/85
                          backdrop-blur-md
                          transition-all duration-300 ease-out
                          hover:bg-white/20 hover:border-white/35
                          hover:-translate-y-[2px]
                          hover:shadow-[0_8px_20px_rgba(255,255,255,0.15)]
                          active:translate-y-0
                        "
                      >
                        ← Kembali
                      </button>

                      <div className="text-xs text-white/70">
                        Role terpilih:{" "}
                        <span className="font-semibold text-white">
                          {canAccessField || canAccessPja || canAccessEvaluator
                            ? roleLabel(selectedRole)
                            : "Belum tersedia"}
                        </span>
                      </div>
                    </div>
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

/* ===== Role Card ===== */
function RoleCard({
  title,
  desc,
  badge,
  active,
  disabled,
  disabledText,
  onClick,
  onHover,
  imgSrc,
}: {
  title: string
  desc: string
  badge: string
  active?: boolean
  disabled?: boolean
  disabledText?: string
  onClick: () => void
  onHover?: () => void
  imgSrc?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      whileHover={disabled ? undefined : { scale: 1.012 }}
      whileTap={disabled ? undefined : { scale: 0.992 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`
        relative group w-full text-left
        rounded-3xl border p-3
        backdrop-blur-xl overflow-hidden
        transition-all duration-300
        ${
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/5 opacity-60"
            : active
              ? "border-[#22A745]/60 bg-white/20 shadow-[0_0_28px_rgba(34,167,69,0.22)]"
              : "border-white/20 bg-white/12 hover:bg-white/18"
        }
      `}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/12 blur-3xl" />
      </div>

      <div className="relative flex items-center gap-4">
        <div
          className={`
            relative overflow-hidden rounded-2xl
            w-[92px] h-[92px] shrink-0
            ${active && !disabled ? "ring-2 ring-[#22A745]/55" : "ring-1 ring-white/20"}
            bg-black/10
          `}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={title}
              className={`h-full w-full object-cover ${disabled ? "grayscale" : ""}`}
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
              <div className="text-[15px] md:text-base font-extrabold text-white leading-tight">
                {title}
              </div>
              <div className="mt-1 text-[13px] text-white/80 leading-relaxed">
                {desc}
              </div>
            </div>

            <div
              className={`
                shrink-0 rounded-xl px-3 py-1.5 text-[11px]
                font-extrabold tracking-widest border
                ${
                  active && !disabled
                    ? "bg-[#22A745]/22 text-white border-[#22A745]/55"
                    : "bg-white/10 text-white/85 border-white/20"
                }
              `}
            >
              {badge}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/70">
            <span
              className={`h-2 w-2 rounded-full ${
                disabled ? "bg-amber-300" : active ? "bg-[#22A745]" : "bg-white/35"
              }`}
            />
            <span className="truncate">
              {disabled
                ? disabledText || "Role tidak dapat diakses"
                : active
                  ? "Role aktif — klik untuk masuk"
                  : "Klik untuk memilih role"}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`
          pointer-events-none absolute inset-x-0 bottom-0 h-[2px]
          ${
            disabled
              ? "bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
              : active
                ? "bg-gradient-to-r from-transparent via-[#22A745]/70 to-transparent"
                : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
          }
        `}
      />
    </motion.button>
  )
}