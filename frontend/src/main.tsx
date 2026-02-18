import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import Login from "./Login"
import SelectRole from "./SelectRole"
import Measure from "./pages/Measure"
import PjaDashboard from "./pages/PjaDashboard"
import EvaluatorDashboard from "./pages/Dashboard"

type Role = "FIELD" | "PJA" | "EVALUATOR"

const LS_KEY = "mt_session_v1"

type Session = {
  username?: string
  role?: Role
  ts?: number
}

/** session boleh belum punya role (baru selesai login) */
function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.username) return null
    return parsed
  } catch {
    return null
  }
}

function isValidRole(role: any): role is Role {
  return role === "FIELD" || role === "PJA" || role === "EVALUATOR"
}

function defaultRouteByRole(role: Role) {
  switch (role) {
    case "FIELD":
      return "/measure"
    case "PJA":
      return "/pja"
    case "EVALUATOR":
      return "/app"
    default:
      return "/login"
  }
}

/** cukup sudah login (punya username), walau role belum dipilih */
function RequireBaseAuth({ children }: { children: React.ReactNode }) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** butuh login + role valid */
function RequireRoles({
  roles,
  children,
}: {
  roles: Role[]
  children: React.ReactNode
}) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />

  // sudah login tapi role belum dipilih -> arahkan ke select-role
  if (!isValidRole(s.role)) return <Navigate to="/select-role" replace />

  // role ada tapi bukan role yang diizinkan untuk halaman ini
  if (!roles.includes(s.role)) {
    return <Navigate to={defaultRouteByRole(s.role)} replace />
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Root: selalu ke login (sesuai kebutuhan Anda) */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        {/* Select Role: butuh username (base auth) */}
        <Route
          path="/select-role"
          element={
            <RequireBaseAuth>
              <SelectRole />
            </RequireBaseAuth>
          }
        />

        {/* FIELD + MINING_EYES */}
        <Route
          path="/measure"
          element={
            <RequireRoles roles={["FIELD"]}>
              <Measure />
            </RequireRoles>
          }
        />

        {/* PJA */}
        <Route
          path="/pja"
          element={
            <RequireRoles roles={["PJA"]}>
              <PjaDashboard />
            </RequireRoles>
          }
        />

        {/* EVALUATOR */}
        <Route
          path="/app"
          element={
            <RequireRoles roles={["EVALUATOR"]}>
              <EvaluatorDashboard />
            </RequireRoles>
          }
        />

        {/* Optional: landing setelah role dipilih */}
        <Route
          path="/home"
          element={
            <RequireBaseAuth>
              {(() => {
                const s = getSession()
                if (!s) return <Navigate to="/login" replace />
                if (!isValidRole(s.role)) return <Navigate to="/select-role" replace />
                return <Navigate to={defaultRouteByRole(s.role)} replace />
              })()}
            </RequireBaseAuth>
          }
        />

        {/* 404 */}
        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
