import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

const LS_KEY = "mt_session_v1"

function saveBaseSession(payload: { username: string }) {
  // simpan base session saja, role dipilih di SelectRole.tsx
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      username: payload.username,
      ts: Date.now(),
    })
  )
}

export default function Login() {
  const nav = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)

  const canProceed = useMemo(() => {
    return username.trim().length > 0 && password.trim().length > 0
  }, [username, password])

  function handleLogin() {
    if (!canProceed) {
      alert("Username dan password wajib diisi.")
      return
    }

    // TODO: kalau nanti ada autentikasi API, taruh di sini.
    saveBaseSession({ username: username.trim() })

    // lanjut ke halaman select role
    nav("/select-role", { replace: true })
  }

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/LoginBackground.jpeg')" }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1600px] px-4">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* LEFT PANEL (TIDAK DIHAPUS) */}
            <div className="hidden lg:flex flex-col justify-center">
              <div className="max-w-xl pl-8 xl:pl-14">
                <div className="mb-5 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <img
                    src="/PT.-BUMA-Logo-Vector.svg-.png"
                    alt="PT BUMA Logo"
                    className="h-9 w-auto object-contain"
                  />
                  <div className="leading-tight">
                    <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
                      Production Division
                    </div>
                    <div className="text-sm font-extrabold text-white">
                      Mine Technology
                    </div>
                  </div>
                </div>

                <h1 className="text-3xl font-extrabold text-white leading-tight">
                  Monitoring
                  <br />
                  <span className="text-buma-green">Tinggi Jenjang</span>
                </h1>

                <p className="mt-3 max-w-md text-sm text-white/80">
                  Sistem pendukung inspeksi dan dokumentasi tinggi jenjang berbasis foto.
                </p>

                <div className="mt-6 text-xs text-white/60">
                  PT Bukit Makmur Mandiri Utama
                </div>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/18 p-6 shadow-2xl backdrop-blur-xl"
              >
                {/* Glass highlight layer tetap */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
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

                  {/* Username */}
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/70">
                    Username
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />

                  {/* Password */}
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-white/70">
                    Password
                  </label>

                  <div className="relative mt-2">
                    <input
                      type={showPass ? "text" : "password"}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 pr-10 text-sm text-white"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLogin()
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                    >
                      {showPass ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  <button
                    onClick={handleLogin}
                    disabled={!canProceed}
                    className="
                      mt-6 w-full rounded-xl
                      bg-gradient-to-r from-[#15803D] to-[#22A745]
                      px-4 py-2.5 text-sm font-extrabold text-white
                      transition-all duration-300 ease-out
                      hover:from-[#166534] hover:to-[#16A34A]
                      hover:shadow-[0_10px_25px_rgba(34,167,69,0.35)]
                      hover:-translate-y-[2px]
                      active:translate-y-[0px]
                      active:shadow-[0_6px_14px_rgba(34,167,69,0.25)]
                      focus:outline-none focus:ring-2 focus:ring-[#22A745]/40
                      disabled:opacity-50 disabled:cursor-not-allowed
                      disabled:hover:shadow-none disabled:hover:translate-y-0
                    "
                  >
                    Masuk
                  </button>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== ICONS ===== */

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2">
      <path d="M3 3l18 18" />
    </svg>
  )
}
