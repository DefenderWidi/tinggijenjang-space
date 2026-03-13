import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import Login from "./Login"
import SelectRole from "./SelectRole"
import Measure from "./pages/Measure"
import PjaDashboard from "./pages/PjaDashboard"
import EvaluatorDashboard from "./pages/Dashboard"
import Admin from "./pages/Admin"

type ActiveRole = "FIELD" | "PJA" | "EVALUATOR"
type AccountRole = "USER" | "ADMIN"
type OperationalAccess = "NONE" | "FIELD" | "PJA"

const LS_KEY = "mt_session_v1"

type Session = {
  id?: string | null
  username?: string
  accountRole?: AccountRole
  operationalAccess?: OperationalAccess
  activeRole?: ActiveRole | null
  ts?: number
}

/** session boleh belum punya activeRole */
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

function isValidRole(role: any): role is ActiveRole {
  return role === "FIELD" || role === "PJA" || role === "EVALUATOR"
}

function canAccessRole(session: Session, role: ActiveRole) {
  const isAdmin = session.accountRole === "ADMIN"
  const access = session.operationalAccess ?? "NONE"

  if (isAdmin) return true

  if (role === "FIELD") {
    return access === "FIELD" || access === "PJA"
  }

  if (role === "PJA") {
    return access === "PJA"
  }

  if (role === "EVALUATOR") {
    return false
  }

  return false
}

function defaultRouteForSession(session: Session) {
  const isAdmin = session.accountRole === "ADMIN"
  const access = session.operationalAccess ?? "NONE"

  if (isAdmin) {
    if (isValidRole(session.activeRole)) {
      if (session.activeRole === "FIELD") return "/measure"
      if (session.activeRole === "PJA") return "/pja"
      if (session.activeRole === "EVALUATOR") return "/app"
    }
    return "/select-role"
  }

  if (isValidRole(session.activeRole) && canAccessRole(session, session.activeRole)) {
    if (session.activeRole === "FIELD") return "/measure"
    if (session.activeRole === "PJA") return "/pja"
  }

  if (access === "FIELD" || access === "PJA" || access === "NONE") {
    return "/select-role"
  }

  return "/login"
}

/** cukup sudah login */
function RequireBaseAuth({ children }: { children: React.ReactNode }) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** butuh login + activeRole valid + akses sesuai session */
function RequireRoles({
  roles,
  children,
}: {
  roles: ActiveRole[]
  children: React.ReactNode
}) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />

  if (!isValidRole(s.activeRole)) {
    return <Navigate to="/select-role" replace />
  }

  if (!canAccessRole(s, s.activeRole)) {
    return <Navigate to="/select-role" replace />
  }

  if (!roles.includes(s.activeRole)) {
    return <Navigate to={defaultRouteForSession(s)} replace />
  }

  return <>{children}</>
}

/** khusus admin only */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />
  if (s.accountRole !== "ADMIN") {
    return <Navigate to={defaultRouteForSession(s)} replace />
  }
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/select-role"
          element={
            <RequireBaseAuth>
              <SelectRole />
            </RequireBaseAuth>
          }
        />

        <Route
          path="/measure"
          element={
            <RequireRoles roles={["FIELD"]}>
              <Measure />
            </RequireRoles>
          }
        />

        <Route
          path="/pja"
          element={
            <RequireRoles roles={["PJA"]}>
              <PjaDashboard />
            </RequireRoles>
          }
        />

        <Route
          path="/app"
          element={
            <RequireRoles roles={["EVALUATOR"]}>
              <EvaluatorDashboard />
            </RequireRoles>
          }
        />

        <Route
          path="/home"
          element={
            <RequireBaseAuth>
              {(() => {
                const s = getSession()
                if (!s) return <Navigate to="/login" replace />
                return <Navigate to={defaultRouteForSession(s)} replace />
              })()}
            </RequireBaseAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)