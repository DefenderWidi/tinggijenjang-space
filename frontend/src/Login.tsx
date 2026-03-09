import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

const LS_KEY = "mt_session_v1"
const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

function saveBaseSession(payload: { username: string; role: string; id?: string }) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      id: payload.id ?? null,
      username: payload.username,
      role: payload.role,
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

async function handleLogin() {
  if (!canProceed) {
    alert("Username dan password wajib diisi.")
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data?.error || "Login gagal")
      return
    }

    const user = data?.user
    if (!user?.username || !user?.role) {
      alert("Respons login tidak valid")
      return
    }

    saveBaseSession({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    nav("/select-role", { replace: true })
  } catch (err) {
    console.error("login error:", err)
    alert("Tidak dapat terhubung ke server")
  }
}

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
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

      {/* soft accents (BUMA vibe, tetap simpel) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-buma-green/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-buma-orange/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1600px] px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            {/* MOBILE HEADER (branding tetap muncul, compact) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden pt-10"
            >
              <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <img
                    src="/PT.-BUMA-Logo-Vector.svg-.png"
                    alt="PT BUMA Logo"
                    className="h-8 w-auto object-contain"
                  />
                  <div className="leading-tight text-left">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                      Production Division
                    </div>
                    <div className="text-xs font-extrabold text-white">
                      Mine Technology
                    </div>
                  </div>
                </div>

                {/* mobile tetap 1 baris */}
                <h1 className="mt-4 text-[20px] font-extrabold leading-tight text-white">
                  Monitoring <span className="text-buma-green">Tinggi Jenjang</span>
                </h1>
              </div>
            </motion.div>

            {/* LEFT PANEL (DESKTOP) - digeser ke kanan agar sejajar dengan card kanan */}
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
                  {/* garis hijau lebih panjang */}
                  <div className="absolute -left-5 top-1 hidden h-24 w-1 rounded-full bg-gradient-to-b from-buma-green via-buma-green/70 to-transparent lg:block" />

                  {/* desktop pakai BR */}
                  <h1 className="text-[36px] xl:text-[42px] font-extrabold text-white leading-[1.05] tracking-tight">
                    Monitoring
                    <br className="hidden lg:block" />
                    <span className="text-buma-green">Tinggi Jenjang</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm xl:text-base text-white/80 leading-relaxed">
                    Sistem pendukung inspeksi dan dokumentasi tinggi jenjang berbasis foto.
                  </p>

                  <div className="mt-6 text-xs text-white/60">
                    PT Bukit Makmur Mandiri Utama
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="flex items-center justify-center pb-10 lg:pb-0">
              <div className="w-full max-w-md">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full overflow-hidden rounded-3xl border border-white/20 bg-white/14 p-6 shadow-2xl backdrop-blur-xl"
                >
                  {/* subtle glass layer (simple) */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
                    <div className="absolute inset-0 ring-1 ring-white/10" />
                  </div>

                  <div className="relative">
                    <div className="mb-6">
                      <div className="text-xl font-extrabold text-white">Login Sistem</div>
                      <div className="mt-1 text-sm text-white/75">
                        Masuk untuk melanjutkan ke pemilihan role
                      </div>
                    </div>

                    {/* Username */}
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      Username
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-buma-green/60 focus:ring-2 focus:ring-buma-green/25"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                    />

                    {/* Password */}
                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                      Password
                    </label>

                    <div className="relative mt-2">
                      <input
                        type={showPass ? "text" : "password"}
                        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 pr-10 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-buma-green/60 focus:ring-2 focus:ring-buma-green/25"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLogin()
                        }}
                        placeholder="Masukkan password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                        title={showPass ? "Sembunyikan password" : "Tampilkan password"}
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
                        hover:shadow-[0_12px_28px_rgba(34,167,69,0.30)]
                        hover:-translate-y-[2px]
                        active:translate-y-[0px]
                        focus:outline-none focus:ring-2 focus:ring-[#22A745]/45
                        disabled:opacity-50 disabled:cursor-not-allowed
                        disabled:hover:shadow-none disabled:hover:translate-y-0
                      "
                    >
                      Masuk
                    </button>
                  </div>
                </motion.div>

                {/* MOBILE FOOTER (di bawah kotak login) */}
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