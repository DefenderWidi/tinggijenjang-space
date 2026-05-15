import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import Measure from "./pages/Measure"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Halaman utama langsung ke Measure */}
        <Route path="/" element={<Measure />} />

        {/* Semua akses lama diarahkan ke Measure */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/select-role" element={<Navigate to="/" replace />} />
        <Route path="/measure" element={<Navigate to="/" replace />} />

        {/* Route lama lain juga diarahkan ke Measure untuk kebutuhan demo */}
        <Route path="/measure-disposal" element={<Navigate to="/" replace />} />
        <Route path="/measure-road" element={<Navigate to="/" replace />} />
        <Route path="/pja" element={<Navigate to="/" replace />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />

        {/* Fallback semua URL tidak dikenal ke Measure */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)