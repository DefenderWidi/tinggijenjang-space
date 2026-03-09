import { useNavigate } from "react-router-dom"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

export default function AdminTopbar() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch {}

    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-buma-border bg-white/90 backdrop-blur">
      <div className="h-1 w-full bg-gradient-to-r from-buma-green/60 via-buma-green/30 to-buma-blue/20" />

      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <img
            src="/PT.-BUMA-Logo-Vector.svg-.png"
            alt="PT BUMA Logo"
            className="h-8 w-auto"
          />

          <div className="leading-tight">
            <div className="text-sm font-extrabold text-buma-text">
              Monitoring Tinggi Jenjang
            </div>
            <div className="text-xs text-buma-muted">
              Admin Control Panel
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl border border-buma-border bg-white px-3 py-2 text-xs font-bold text-buma-text hover:bg-slate-50"
          >
            Login Page
          </button>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
          >
            Logout Admin
          </button>
        </div>
      </div>
    </header>
  )
}