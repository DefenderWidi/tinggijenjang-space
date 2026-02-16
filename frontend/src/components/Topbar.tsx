import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Topbar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("token")
    setOpen(false)
    navigate("/") // kembali ke halaman awal
  }

  return (
    <header className="sticky top-0 z-50 border-b border-buma-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/40">
      {/* subtle accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-buma-green/70 via-buma-green/35 to-buma-blue/30" />

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

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-buma-muted">
              Operational Area
            </div>
            <div className="text-sm font-extrabold text-buma-text">
              PIT A – North Sector
            </div>
          </div>

          {/* Logout Button (orange-dark hover) */}
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 rounded-xl border border-buma-border bg-white/60 px-4 py-2 text-xs font-bold text-buma-text shadow-sm backdrop-blur transition-all duration-200 hover:border-orange-400 hover:bg-orange-500/10 hover:text-orange-800 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M10 17l5-5-5-5v3H3v4h7v3zm9-14H9a2 2 0 00-2 2v4h2V5h10v14H9v-4H7v4a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
            </svg>
            Logout
          </button>
        </div>

        {/* Mobile Right: Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            className="rounded-xl border border-buma-border bg-white/60 p-2 shadow-sm backdrop-blur transition-all duration-200 active:scale-95"
          >
            {open ? (
              // X icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-buma-text" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.31 6.3-6.31z" />
              </svg>
            ) : (
              // Hamburger icon
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-buma-text" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {open && (
        <div className="md:hidden border-t border-buma-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/40">
          <div className="mx-auto max-w-[1600px] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-buma-muted">
                  Operational Area
                </div>
                <div className="text-sm font-extrabold text-buma-text">
                  PIT A – North Sector
                </div>
                <div className="mt-1 text-xs text-buma-muted md:hidden">
                  Mine Technology – Monitoring Tinggi Jenjang
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="group flex items-center gap-2 rounded-xl border border-buma-border bg-white/60 px-4 py-2 text-xs font-bold text-buma-text shadow-sm backdrop-blur transition-all duration-200 hover:border-orange-400 hover:bg-orange-500/10 hover:text-orange-800 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M10 17l5-5-5-5v3H3v4h7v3zm9-14H9a2 2 0 00-2 2v4h2V5h10v14H9v-4H7v4a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2z" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
