import type { ReactNode } from 'react'

export default function StepCard({
  title,
  desc,
  badge,
  children,
}: {
  title: string
  desc: string
  badge: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-slate-400">{desc}</div>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          {badge}
        </span>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
