import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

type ActiveRole = "FIELD" | "PJA" | "EVALUATOR"
type AccountRole = "USER" | "ADMIN"

const LS_KEY = "mt_session_v1"

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: AccountRole
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

function roleBadge(role?: ActiveRole | null) {
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

function roleLabel(role?: ActiveRole | null) {
  switch (role) {
    case "FIELD":
      return "Inspector Lapangan"
    case "PJA":
      return "Verifikasi PJA"
    case "EVALUATOR":
      return "Evaluator"
    default:
      return "Belum dipilih"
  }
}

function accountLabel(role?: AccountRole) {
  return role === "ADMIN" ? "ADMIN" : "USER"
}

function clusterLabel(role?: ActiveRole | null, accountRole?: AccountRole) {
  return `${roleBadge(role)} | ${accountLabel(accountRole)}`
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

function ShieldUserIcon(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z" />
      <circle cx="12" cy="8.5" r="2.5" />
      <path d="M7 15a5.78 5.78 0 0 0 5 3a5.78 5.78 0 0 0 5-3c-.025-1.896-3.342-3-5-3c-1.667 0-4.975 1.104-5 3" />
    </svg>
  )
}

function ClusterBadge({
  activeRole,
  accountRole,
}: {
  activeRole?: ActiveRole | null
  accountRole?: AccountRole
}) {
  const isAdmin = accountRole === "ADMIN"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider ${
        isAdmin
          ? "border-buma-green/40 bg-buma-green/12 text-buma-green"
          : "border-buma-border bg-white/70 text-buma-text"
      }`}
    >
      {isAdmin ? <ShieldUserIcon className="h-3.5 w-3.5" /> : null}
      {clusterLabel(activeRole, accountRole)}
    </span>
  )
}

function BackToSelectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
  )
}

function AccountCard({
  username,
  activeRole,
  accountRole,
  onBack,
}: {
  username: string
  activeRole?: ActiveRole | null
  accountRole?: AccountRole
  onBack: () => void
}) {
  return (
    <div className="p-3">
      <div className="rounded-xl border border-buma-border bg-white/70 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-buma-muted">
          Info Akun
        </div>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-buma-text">
              {username}
            </div>
            <div className="mt-1 text-xs text-buma-muted">
              {roleLabel(activeRole)}
            </div>
          </div>

          <div className="shrink-0">
            <ClusterBadge activeRole={activeRole} accountRole={accountRole} />
          </div>
        </div>
      </div>

      <BackToSelectButton onClick={onBack} />
    </div>
  )
}

export default function Topbar() {
  const navigate = useNavigate()
  const [acctOpen, setAcctOpen] = useState(false)
  const desktopPopRef = useRef<HTMLDivElement | null>(null)

  const session = useMemo(() => getSession(), [])
  const username = session?.username ?? "—"
  const activeRole = session?.activeRole
  const accountRole = session?.accountRole

  const handleBackToSelectRole = () => {
    setAcctOpen(false)
    navigate("/select-role", { replace: true })
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!acctOpen) return

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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-buma-green/[0.1] via-transparent to-transparent" />
      <div className="relative h-1 w-full bg-gradient-to-r from-buma-green/60 via-buma-green/25 to-buma-blue/20" />

      <div className="relative mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
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

        <div className="relative" ref={desktopPopRef}>
          <button
            onClick={() => setAcctOpen((v) => !v)}
            aria-label="Account menu"
            className="group inline-flex items-center gap-2 rounded-xl border border-buma-border bg-white/60 px-3 py-2 text-xs font-bold text-buma-text shadow-sm backdrop-blur transition-all duration-200 hover:border-buma-green/40 hover:bg-buma-green/10 active:scale-95"
          >
            <UserIcon className="h-5 w-5 text-buma-text transition-transform duration-200 group-hover:scale-105" />

            <span className="hidden md:inline">Akun</span>

            <ClusterBadge activeRole={activeRole} accountRole={accountRole} />

            <ChevronDown
              className={`h-4 w-4 text-buma-muted transition-transform duration-200 ${
                acctOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {acctOpen && (
            <div className="hidden md:block absolute right-0 mt-2 w-[340px] overflow-hidden rounded-2xl border border-buma-border bg-white/90 shadow-xl backdrop-blur">
              <AccountCard
                username={username}
                activeRole={activeRole}
                accountRole={accountRole}
                onBack={handleBackToSelectRole}
              />
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-buma-green/30 to-transparent" />
            </div>
          )}
        </div>
      </div>

      {acctOpen && (
        <div className="md:hidden w-full border-t border-buma-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/40">
          <div className="mx-auto max-w-[1600px] px-4 py-3">
            <div className="overflow-hidden rounded-2xl border border-buma-border bg-white/90 shadow-xl">
              <AccountCard
                username={username}
                activeRole={activeRole}
                accountRole={accountRole}
                onBack={handleBackToSelectRole}
              />
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-buma-green/30 to-transparent" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}