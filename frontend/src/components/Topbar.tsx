import { useMemo, useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

type Role = "FIELD" | "PJA" | "EVALUATOR"
const LS_KEY = "mt_session_v1"

function getSession(): { username?: string; role?: Role } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function roleBadge(role?: Role) {
  switch (role) {
    case "FIELD":
      return "FIELD"
    case "PJA":
      return "PJA"
    case "EVALUATOR":
      return "EV"
    default:
      return "-"
  }
}

function roleLabel(role?: Role) {
  switch (role) {
    case "FIELD":
      return "Inspector Lapangan"
    case "PJA":
      return "Verifikasi PJA"
    case "EVALUATOR":
      return "Evaluator"
    default:
      return "—"
  }
}

function UserIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4m0 2c-4.42 0-8 2-8 4.5V21h16v-2.5c0-2.5-3.58-4.5-8-4.5" />
    </svg>
  )
}

function ChevronDown(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M7 10l5 5l5-5z" />
    </svg>
  )
}

export default function Topbar() {
  const navigate = useNavigate()

  const [acctOpen, setAcctOpen] = useState(false)

  // ref hanya untuk desktop dropdown containment
  const desktopPopRef = useRef<HTMLDivElement | null>(null)

  const session = useMemo(() => getSession(), [])
  const username = session?.username ?? "—"
  const role = session?.role

  const handleBackToSelectRole = () => {
    setAcctOpen(false)
    navigate("/select-role", { replace: true })
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!acctOpen) return

      // ✅ penting: click-outside hanya untuk DESKTOP
      // supaya di mobile tombol "Kembali ke Select Role" tidak ketutup duluan.
      if (window.matchMedia("(min-width: 768px)").matches) {
        if (!desktopPopRef.current) return
        if (desktopPopRef.current.contains(e.target as Node)) return
        setAcctOpen(false)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAcctOpen(false)
    }

    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [acctOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-buma-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/40">
      {/* subtle accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-buma-green/70 via-buma-green/35 to-buma-blue/30" />

      {/* Top row */}
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
        {/* Left: Logo & System */}
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <img
              src="/PT.-BUMA-Logo-Vector.svg-.png"
              alt="PT BUMA Logo"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="hidden md:block leading-tight">
            <div className="text-sm font-extrabold text-buma-text">
              Mine Technology – Monitoring Tinggi Jenjang
            </div>
            <div className="text-xs text-buma-muted">Production Division</div>
          </div>
        </div>

        {/* Right: Account Button */}
        <div className="relative" ref={desktopPopRef}>
          <button
            onClick={() => setAcctOpen((v) => !v)}
            aria-label="Account menu"
            className="group inline-flex items-center gap-2 rounded-xl border border-buma-border bg-white/60 px-3 py-2 text-xs font-bold text-buma-text shadow-sm backdrop-blur transition-all duration-200 hover:border-buma-green/40 hover:bg-buma-green/10 active:scale-95"
          >
            <UserIcon className="h-5 w-5 text-buma-text transition-transform duration-200 group-hover:scale-105" />

            <span className="hidden md:inline">Akun</span>

            <span className="rounded-lg border border-buma-border bg-white/70 px-2 py-0.5 text-[11px] font-extrabold text-buma-text">
              {roleBadge(role)}
            </span>

            <ChevronDown
              className={`h-4 w-4 text-buma-muted transition-transform duration-200 ${
                acctOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Desktop dropdown */}
          {acctOpen && (
            <div className="hidden md:block absolute right-0 mt-2 w-[320px] overflow-hidden rounded-2xl border border-buma-border bg-white/90 shadow-xl backdrop-blur">
              <div className="p-3">
                <div className="rounded-xl border border-buma-border bg-white/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-buma-muted">
                    Info Akun
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-buma-text">
                        {username}
                      </div>
                      <div className="text-xs text-buma-muted">{roleLabel(role)}</div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-buma-border bg-white px-2 py-1 text-[11px] font-extrabold text-buma-text">
                      {roleBadge(role)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleBackToSelectRole}
                  className="mt-3 w-full group inline-flex items-center justify-center gap-2 rounded-xl border border-buma-border bg-white/70 px-4 py-2 text-xs font-extrabold text-buma-text shadow-sm backdrop-blur transition-all duration-200 hover:border-orange-400 hover:bg-orange-500/10 hover:text-orange-800 active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="m4 10l-.707.707L2.586 10l.707-.707zm17 8a1 1 0 1 1-2 0zM8.293 15.707l-5-5l1.414-1.414l5 5zm-5-6.414l5-5l1.414 1.414l-5 5zM4 9h10v2H4zm17 7v2h-2v-2zm-7-7a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5z" />
                  </svg>
                  Kembali ke Select Role
                </button>
              </div>

              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-buma-green/30 to-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile FULL-WIDTH panel */}
      {acctOpen && (
        <div className="md:hidden w-full border-t border-buma-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/40">
          <div className="mx-auto max-w-[1600px] px-4 py-3">
            <div className="overflow-hidden rounded-2xl border border-buma-border bg-white/90 shadow-xl">
              <div className="p-3">
                <div className="rounded-xl border border-buma-border bg-white/70 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-buma-muted">
                    Info Akun
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-buma-text">
                        {username}
                      </div>
                      <div className="text-xs text-buma-muted">{roleLabel(role)}</div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-buma-border bg-white px-2 py-1 text-[11px] font-extrabold text-buma-text">
                      {roleBadge(role)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleBackToSelectRole}
                  className="mt-3 w-full group inline-flex items-center justify-center gap-2 rounded-xl border border-buma-border bg-white/70 px-4 py-2 text-xs font-extrabold text-buma-text shadow-sm backdrop-blur transition-all duration-200 hover:border-orange-400 hover:bg-orange-500/10 hover:text-orange-800 active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="m4 10l-.707.707L2.586 10l.707-.707zm17 8a1 1 0 1 1-2 0zM8.293 15.707l-5-5l1.414-1.414l5 5zm-5-6.414l5-5l1.414 1.414l-5 5zM4 9h10v2H4zm17 7v2h-2v-2zm-7-7a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5z" />
                  </svg>
                  Kembali ke Select Role
                </button>
              </div>

              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-buma-green/30 to-transparent" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
