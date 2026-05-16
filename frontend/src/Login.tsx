import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

const LS_KEY = "mt_session_v1"
const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

type OperationalAccess = "NONE" | "FIELD" | "PJA" | "ALL"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

const SUPER_ADMIN_USERNAMES = ["MFBAB", "Q4IUM"]

/**
 * Mapping sementara untuk akun yang belum punya kolom site dari backend.
 * Tambahkan akun lain di sini sesuai arahan superadmin.
 */
const USER_SITE_MAP: Record<string, SiteCode> = {
  V1JWF: "LAT",

  // contoh:
  // ABCDE: "IPR",
  // QWERT: "SDJ",
  // ZXCVB: "ADT",
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

function isSuperAdminUsername(username?: string | null) {
  return SUPER_ADMIN_USERNAMES.includes(normalizeText(username))
}

function isSiteCode(value?: string | null): value is SiteCode {
  const clean = normalizeText(value)
  return clean === "LAT" || clean === "IPR" || clean === "SDJ" || clean === "ADT"
}

function getUserSite(user: any, username: string): SiteCode {
  const fromApi =
    user?.site ||
    user?.siteCode ||
    user?.activeSite ||
    user?.selectedSite ||
    user?.workspaceSite ||
    user?.area ||
    user?.mineSite

  const normalizedFromApi = normalizeText(fromApi)

  if (isSiteCode(normalizedFromApi)) {
    return normalizedFromApi
  }

  const normalizedUsername = normalizeText(username)

  if (USER_SITE_MAP[normalizedUsername]) {
    return USER_SITE_MAP[normalizedUsername]
  }

  return "LAT"
}

function normalizeOperationalAccess(value?: string | null): OperationalAccess {
  const clean = normalizeText(value)

  if (clean === "FIELD") return "FIELD"
  if (clean === "PJA") return "PJA"
  if (clean === "ALL") return "ALL"

  return "NONE"
}

function normalizeAccountRole(value?: string | null, username?: string | null) {
  if (isSuperAdminUsername(username)) return "ADMIN"

  const clean = normalizeText(value)

  if (clean === "ADMIN" || clean === "SUPER_ADMIN") return "ADMIN"

  return "USER"
}

function saveBaseSession(payload: {
  username: string
  accountRole: string
  operationalAccess?: OperationalAccess | string
  id?: string
  site?: SiteCode
}) {
  const cleanUsername = normalizeText(payload.username)
  const isSuperAdmin = isSuperAdminUsername(cleanUsername)
  const site = payload.site || "LAT"

  const accountRole = isSuperAdmin
    ? "ADMIN"
    : normalizeAccountRole(payload.accountRole, cleanUsername)

  const operationalAccess = isSuperAdmin
    ? "ALL"
    : normalizeOperationalAccess(payload.operationalAccess)

  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      id: payload.id ?? null,
      username: cleanUsername,
      accountRole,
      operationalAccess,

      activeRole: null,

      site,
      siteCode: site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,

      ts: Date.now(),
    })
  )
}

export default function Login() {
  const nav = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const canProceed = useMemo(() => {
    return username.trim().length > 0 && password.trim().length > 0
  }, [username, password])

  async function handleLogin() {
    if (!canProceed || loading) return

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data?.error || "Login gagal")
        setLoading(false)
        return
      }

      const user = data?.user

      if (!user?.username || !user?.role) {
        alert("Respons login tidak valid")
        setLoading(false)
        return
      }

      const userSite = getUserSite(user, user.username)

      saveBaseSession({
        id: user.id,
        username: user.username,
        accountRole: user.role,
        operationalAccess: user.operationalAccess ?? "NONE",
        site: userSite,
      })

      nav("/select-role", { replace: true })
    } catch (err) {
      console.error("login error:", err)
      alert("Tidak dapat terhubung ke server")
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/LoginBackground.jpeg')" }}
      />

      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-buma-green/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-buma-orange/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1600px] px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-10 lg:hidden"
            >
              <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <img
                    src="/PT.-BUMA-Logo-Vector.svg-.png"
                    alt="PT BUMA Logo"
                    className="h-8 w-auto object-contain"
                  />

                  <div className="text-left leading-tight">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                      Production Division
                    </div>
                    <div className="text-xs font-extrabold text-white">
                      Mine Technology
                    </div>
                  </div>
                </div>

                <h1 className="mt-4 text-[20px] font-extrabold leading-tight text-white">
                  <span className="text-buma-green">Tinggi Jenjang</span> Space
                </h1>
              </div>
            </motion.div>

            <div className="hidden flex-col justify-center lg:flex lg:pl-14 xl:pl-20">
              <div className="max-w-lg">
                <div className="mb-5 inline-flex items-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-2xl">
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

                  <h1 className="text-[36px] font-extrabold leading-[1.05] tracking-tight text-white xl:text-[42px]">
                    Tinggi Jenjang
                    <br className="hidden lg:block" />
                    <span className="text-buma-green">Space</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 xl:text-base">
                    Platform pengukuran tinggi jenjang multi-site
                  </p>

                  <div className="mt-6 text-xs text-white/60">
                    PT Bukit Makmur Mandiri Utama
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center pb-10 lg:pb-0">
              <div className="w-full max-w-md">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full overflow-hidden rounded-3xl border border-white/20 bg-white/14 p-6 shadow-2xl backdrop-blur-2xl"
                >
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
                    <div className="absolute inset-0 ring-1 ring-white/10" />
                  </div>

                  <div className="relative">
                    <div className="mb-6">
                      <div className="text-xl font-extrabold text-white">
                        Login Sistem
                      </div>
                      <div className="mt-1 text-sm text-white/75">
                        Masuk untuk melanjutkan ke pemilihan role
                      </div>
                    </div>

                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      Username
                    </label>

                    <input
                      disabled={loading}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none transition focus:border-buma-green/60 focus:ring-2 focus:ring-buma-green/35"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                    />

                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        disabled={loading}
                        type={showPass ? "text" : "password"}
                        className="w-full rounded-xl border border-white/15 bg-white/15 px-3 py-2 pr-10 text-sm text-white placeholder:text-white/60 outline-none transition focus:border-buma-green/60 focus:ring-2 focus:ring-buma-green/35"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLogin()
                        }}
                        placeholder="Masukkan password"
                      />

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                        title={
                          showPass
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                      >
                        {showPass ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>

                    <button
                      onClick={handleLogin}
                      disabled={!canProceed || loading}
                      className="
                        mt-6 w-full rounded-xl
                        bg-gradient-to-r from-[#15803D] to-[#22A745]
                        px-4 py-2.5 text-sm font-extrabold text-white
                        transition-all duration-300 ease-out
                        hover:from-[#166534] hover:to-[#16A34A]
                        hover:shadow-[0_12px_28px_rgba(34,167,69,0.30)]
                        hover:-translate-y-[2px]
                        active:translate-y-[0px]
                        focus:outline-none focus:ring-2 focus:ring-[#22A745]/45
                        disabled:cursor-not-allowed disabled:opacity-50
                        disabled:hover:translate-y-0 disabled:hover:shadow-none
                      "
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                          Memproses...
                        </span>
                      ) : (
                        "Masuk"
                      )}
                    </button>
                  </div>
                </motion.div>

                <div className="mt-3 text-center text-[11px] text-white/55 lg:hidden">
                  PT Bukit Makmur Mandiri Utama
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
    >
      <path d="M3 3l18 18" />
    </svg>
  )
}