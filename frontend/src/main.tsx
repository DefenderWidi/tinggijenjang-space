import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import Login from "./Login"
import SelectRole from "./SelectRole"
import Measure from "./pages/Measure"
import MeasureDisposal from "./pages/MeasureDisposal"
import MeasureRoad from "./pages/MeasureRoad"
import PjaDashboard from "./pages/PjaDashboard"
import EvaluatorDashboard from "./pages/Dashboard"
import Admin from "./pages/Admin"

type ActiveRole = "FRONT" | "DISPOSAL" | "ROAD" | "PJA" | "EVALUATOR"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

const LS_KEY = "mt_session_v1"
const SUPER_ADMIN_USERNAMES = ["MFBAB", "Q4IUM"]

type Session = {
  id?: string | null
  username?: string
  accountRole?: string
  operationalAccess?: string
  activeRole?: ActiveRole | null

  site?: SiteCode | string | null
  siteCode?: SiteCode | string | null
  activeSite?: SiteCode | string | null
  selectedSite?: SiteCode | string | null
  workspaceSite?: SiteCode | string | null
  area?: SiteCode | string | null
  mineSite?: SiteCode | string | null

  ts?: number
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

function isSuperAdminUsername(username?: string | null) {
  return SUPER_ADMIN_USERNAMES.includes(normalizeText(username))
}

function isAdminSession(session?: Session | null) {
  const username = normalizeText(session?.username)
  const accountRole = normalizeText(session?.accountRole)

  return (
    accountRole === "ADMIN" ||
    accountRole === "SUPER_ADMIN" ||
    SUPER_ADMIN_USERNAMES.includes(username)
  )
}

function isSiteCode(value?: string | null): value is SiteCode {
  const clean = normalizeText(value)
  return clean === "LAT" || clean === "IPR" || clean === "SDJ" || clean === "ADT"
}

function getSessionSite(session: Session | null): SiteCode {
  const rawSite =
    session?.activeSite ||
    session?.selectedSite ||
    session?.workspaceSite ||
    session?.site ||
    session?.siteCode ||
    session?.area ||
    session?.mineSite

  const clean = normalizeText(rawSite)

  if (isSiteCode(clean)) return clean

  return "LAT"
}

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Session
    if (!parsed?.username) return null

    const site = getSessionSite(parsed)

    const normalized: Session = {
      ...parsed,
      username: normalizeText(parsed.username),
      accountRole: isSuperAdminUsername(parsed.username)
        ? "ADMIN"
        : normalizeText(parsed.accountRole) || "USER",
      operationalAccess: isSuperAdminUsername(parsed.username)
        ? "ALL"
        : normalizeText(parsed.operationalAccess) || "NONE",

      site,
      siteCode: site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,
    }

    return normalized
  } catch {
    return null
  }
}

function saveSession(session: Session) {
  const site = getSessionSite(session)

  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      ...session,
      site,
      siteCode: site,
      activeSite: site,
      selectedSite: site,
      workspaceSite: site,
      ts: Date.now(),
    })
  )
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
  const isAdmin = isAdminSession(session)
  const access = normalizeText(session.operationalAccess)

  if (isAdmin) return true

  if (role === "FRONT" || role === "DISPOSAL" || role === "ROAD") {
    return access === "FIELD" || access === "PJA" || access === "ALL"
  }

  if (role === "PJA") {
    return access === "PJA" || access === "ALL"
  }

  if (role === "EVALUATOR") {
    return access === "ALL"
  }

  return false
}

function defaultRouteForSession(session: Session) {
  const activeRole = session.activeRole

  if (isValidRole(activeRole) && canAccessRole(session, activeRole)) {
    if (activeRole === "FRONT") return "/measure"
    if (activeRole === "DISPOSAL") return "/measure-disposal"
    if (activeRole === "ROAD") return "/measure-road"
    if (activeRole === "PJA") return "/pja"
    if (activeRole === "EVALUATOR") return "/app"
  }

  return "/select-role"
}

function RequireBaseAuth({ children }: { children: React.ReactNode }) {
  const s = getSession()

  if (!s) {
    return <Navigate to="/login" replace />
  }

  saveSession(s)

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
    return <Navigate to="/login" replace />
  }

  saveSession(s)

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
    return <Navigate to="/login" replace />
  }

  saveSession(s)

  if (!isAdminSession(s)) {
    return <Navigate to={defaultRouteForSession(s)} replace />
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Normal flow: buka link utama masuk ke login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login aktif lagi */}
        <Route path="/login" element={<Login />} />

        {/* Pilih role setelah login */}
        <Route
          path="/select-role"
          element={
            <RequireBaseAuth>
              <SelectRole />
            </RequireBaseAuth>
          }
        />

        {/* FRONT */}
        <Route
          path="/measure"
          element={
            <RequireRoles roles={["FRONT"]}>
              <Measure />
            </RequireRoles>
          }
        />

        {/* DISPOSAL - tetap disiapkan kalau nanti dipakai lagi */}
        <Route
          path="/measure-disposal"
          element={
            <RequireRoles roles={["DISPOSAL"]}>
              <MeasureDisposal />
            </RequireRoles>
          }
        />

        {/* ROAD - tetap disiapkan kalau nanti dipakai lagi */}
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

        {/* Home diarahkan sesuai activeRole */}
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

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)