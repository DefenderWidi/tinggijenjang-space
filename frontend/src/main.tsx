import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import SelectRole from "./SelectRole"
import Measure from "./pages/Measure"
import MeasureDisposal from "./pages/MeasureDisposal"
import MeasureRoad from "./pages/MeasureRoad"
import PjaDashboard from "./pages/PjaDashboard"
import EvaluatorDashboard from "./pages/Dashboard"
import Admin from "./pages/Admin"

type ActiveRole = "FRONT" | "DISPOSAL" | "ROAD" | "PJA" | "EVALUATOR"
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

function saveSession(session: Session) {
  localStorage.setItem(LS_KEY, JSON.stringify(session))
}

/**
 * Session demo sementara.
 * Tujuannya agar user langsung bisa masuk SelectRole tanpa login.
 * Dibuat sebagai ADMIN agar bisa akses semua role saat demo.
 */
function ensureDemoSession() {
  const existing = getSession()

  if (existing?.username) {
    return existing
  }

  const demoSession: Session = {
    id: "demo-session",
    username: "DEMO",
    accountRole: "ADMIN",
    operationalAccess: "PJA",
    activeRole: null,
    ts: Date.now(),
  }

  saveSession(demoSession)
  return demoSession
}

function isValidRole(role: any): role is ActiveRole {
  return (
    role === "FRONT" ||
    role === "DISPOSAL" ||
    role === "ROAD" ||
    role === "PJA" ||
    role === "EVALUATOR"
  )
}

function canAccessRole(session: Session, role: ActiveRole) {
  const isAdmin = session.accountRole === "ADMIN"
  const access = session.operationalAccess ?? "NONE"

  if (isAdmin) return true

  if (role === "FRONT" || role === "DISPOSAL" || role === "ROAD") {
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

  if (isAdmin) {
    if (isValidRole(session.activeRole)) {
      if (session.activeRole === "FRONT") return "/measure"
      if (session.activeRole === "DISPOSAL") return "/measure-disposal"
      if (session.activeRole === "ROAD") return "/measure-road"
      if (session.activeRole === "PJA") return "/pja"
      if (session.activeRole === "EVALUATOR") return "/app"
    }

    return "/select-role"
  }

  if (isValidRole(session.activeRole) && canAccessRole(session, session.activeRole)) {
    if (session.activeRole === "FRONT") return "/measure"
    if (session.activeRole === "DISPOSAL") return "/measure-disposal"
    if (session.activeRole === "ROAD") return "/measure-road"
    if (session.activeRole === "PJA") return "/pja"
  }

  return "/select-role"
}

function DemoSelectRole() {
  useEffect(() => {
    ensureDemoSession()
  }, [])

  return <SelectRole />
}

function RequireBaseAuth({ children }: { children: React.ReactNode }) {
  const s = getSession()

  if (!s) {
    ensureDemoSession()
    return <Navigate to="/select-role" replace />
  }

  return <>{children}</>
}

function RequireRoles({
  roles,
  children,
}: {
  roles: ActiveRole[]
  children: React.ReactNode
}) {
  const s = getSession()

  if (!s) {
    ensureDemoSession()
    return <Navigate to="/select-role" replace />
  }

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

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const s = getSession()

  if (!s) {
    ensureDemoSession()
    return <Navigate to="/select-role" replace />
  }

  if (s.accountRole !== "ADMIN") {
    return <Navigate to={defaultRouteForSession(s)} replace />
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Link utama langsung masuk ke SelectRole */}
        <Route path="/" element={<DemoSelectRole />} />

        {/* Untuk demo, login tidak dipakai */}
        <Route path="/login" element={<Navigate to="/select-role" replace />} />

        {/* SelectRole langsung bisa dibuka tanpa login */}
        <Route path="/select-role" element={<DemoSelectRole />} />

        {/* FRONT */}
        <Route
          path="/measure"
          element={
            <RequireRoles roles={["FRONT"]}>
              <Measure />
            </RequireRoles>
          }
        />

        {/* DISPOSAL */}
        <Route
          path="/measure-disposal"
          element={
            <RequireRoles roles={["DISPOSAL"]}>
              <MeasureDisposal />
            </RequireRoles>
          }
        />

        {/* ROAD */}
        <Route
          path="/measure-road"
          element={
            <RequireRoles roles={["ROAD"]}>
              <MeasureRoad />
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

        {/* Home diarahkan sesuai role aktif */}
        <Route
          path="/home"
          element={
            <RequireBaseAuth>
              {(() => {
                const s = getSession()
                if (!s) return <Navigate to="/select-role" replace />
                return <Navigate to={defaultRouteForSession(s)} replace />
              })()}
            </RequireBaseAuth>
          }
        />

        {/* Admin tetap bisa dibuka oleh session demo karena accountRole = ADMIN */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        {/* Fallback semua URL asing ke SelectRole */}
        <Route path="*" element={<Navigate to="/select-role" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)