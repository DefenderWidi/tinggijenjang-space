import type { ReactNode } from 'react'
import Topbar from '../components/Topbar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-buma-bg text-buma-text">
      <Topbar />
      <main className="mx-auto max-w-[1600px] px-4 py-4">
        {children}
      </main>
    </div>
  )
}
