import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import Login from "./Login"
import Measure from "./pages/Measure"
import PjaDashboard from "./pages/PjaDashboard"
import EvaluatorDashboard from "./pages/Dashboard"

type Role = "FIELD" | "MINING_EYES" | "PJA" | "EVALUATOR"

const LS_KEY = "mt_session_v1"

function getSession(): { role: Role; username?: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const r = parsed?.role as Role | undefined
    if (r === "FIELD" || r === "PJA" || r === "MINING_EYES" || r === "EVALUATOR") {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function defaultRouteByRole(role: Role) {
  switch (role) {
    case "FIELD":
      return "/measure"
    case "MINING_EYES":
      return "/measure"
    case "PJA":
      return "/pja"
    case "EVALUATOR":
      return "/app"
    default:
      return "/login"
  }
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** allow multiple roles */
function RequireRoles({
  roles,
  children,
}: {
  roles: Role[]
  children: React.ReactNode
}) {
  const s = getSession()
  if (!s) return <Navigate to="/login" replace />

  if (!roles.includes(s.role)) {
    return <Navigate to={defaultRouteByRole(s.role)} replace />
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Root */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* FIELD + MINING_EYES -> same page */}
        <Route
          path="/measure"
          element={
            <RequireRoles roles={["FIELD", "MINING_EYES"]}>
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

        {/* Optional: authenticated landing */}
        <Route
          path="/home"
          element={
            <RequireAuth>
              <Navigate to={defaultRouteByRole(getSession()!.role)} replace />
            </RequireAuth>
          }
        />

        {/* 404 */}
        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
