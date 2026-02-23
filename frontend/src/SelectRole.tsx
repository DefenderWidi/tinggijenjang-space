import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

type Role = "FIELD" | "PJA" | "EVALUATOR"
const LS_KEY = "mt_session_v1"

function getSession(): any | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSessionMerge(patch: Record<string, any>) {
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

function roleLabel(role: Role) {
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
  const [selectedRole, setSelectedRole] = useState<Role>("FIELD")

  const session = useMemo(() => getSession(), [])
  const username = session?.username as string | undefined

  useEffect(() => {
    if (!username) nav("/", { replace: true })
  }, [username, nav])

  function handlePickRole(role: Role) {
    saveSessionMerge({ role })

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

      {/* soft accents (samakan dengan Login) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-buma-green/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-buma-orange/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1600px] px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            {/* LEFT PANEL (DESKTOP ONLY) */}
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

            {/* RIGHT CARD (mobile: hanya card, clean) */}
            <div className="flex items-center justify-center py-10 lg:py-0">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/18 p-6 shadow-2xl backdrop-blur-xl"
              >
                {/* Glass highlight */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                  <div className="absolute inset-0 ring-1 ring-white/10" />
                </div>

                <div className="relative">
                  <div className="mb-4">
                    <div className="text-xl font-extrabold text-white">Pilih Role</div>
                    <div className="mt-1 text-sm text-white/75">
                      Login as <span className="font-semibold text-white">{username}</span>
                    </div>
                  </div>

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
                      active={selectedRole === "FIELD"}
                      onHover={() => setSelectedRole("FIELD")}
                      onClick={() => handlePickRole("FIELD")}
                      badge="FIELD"
                      imgSrc="/inspectorimage.png"
                    />
                    <RoleCard
                      title="Verifikasi PJA"
                      desc="Validasi hasil pengukuran dari inspector."
                      active={selectedRole === "PJA"}
                      onHover={() => setSelectedRole("PJA")}
                      onClick={() => handlePickRole("PJA")}
                      badge="PJA"
                      imgSrc="/verificatorimage.png"
                    />
                    <RoleCard
                      title="Evaluator"
                      desc="Rekap & evaluasi melalui dashboard."
                      active={selectedRole === "EVALUATOR"}
                      onHover={() => setSelectedRole("EVALUATOR")}
                      onClick={() => handlePickRole("EVALUATOR")}
                      badge="EV"
                      imgSrc="/evaluatorimage.png"
                    />
                  </motion.div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => nav("/", { replace: true })}
                      className="
                        group inline-flex items-center gap-2
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
                        {roleLabel(selectedRole)}
                      </span>
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
  onClick,
  onHover,
  imgSrc,
}: {
  title: string
  desc: string
  badge: string
  active?: boolean
  onClick: () => void
  onHover?: () => void
  imgSrc?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`
        relative group w-full text-left
        rounded-3xl border p-4
        backdrop-blur-xl overflow-hidden
        transition-all duration-300
        ${
          active
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
            ${active ? "ring-2 ring-[#22A745]/55" : "ring-1 ring-white/20"}
            bg-black/10
          `}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={title}
              className="h-full w-full object-cover"
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
                  active
                    ? "bg-[#22A745]/22 text-white border-[#22A745]/55"
                    : "bg-white/10 text-white/85 border-white/20"
                }
              `}
            >
              {badge}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/70">
            <span className={`h-2 w-2 rounded-full ${active ? "bg-[#22A745]" : "bg-white/35"}`} />
            <span className="truncate">
              {active ? "Role aktif — klik untuk masuk" : "Klik untuk memilih role"}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`
          pointer-events-none absolute inset-x-0 bottom-0 h-[2px]
          ${
            active
              ? "bg-gradient-to-r from-transparent via-[#22A745]/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60"
          }
        `}
      />
    </motion.button>
  )
}