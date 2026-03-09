import type { ReactNode } from "react"
import Topbar from "../components/Topbar"

type AppLayoutProps = {
  children: ReactNode
  hideTopbar?: boolean
}

export default function AppLayout({
  children,
  hideTopbar = false,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-buma-bg text-buma-text">
      {!hideTopbar && <Topbar />}
      <main className="mx-auto max-w-[1600px] px-4 py-4">
        {children}
      </main>
    </div>
  )
}