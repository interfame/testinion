// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// GrowthRush — theme-aware recharts tooltip.
// Recharts' default Tooltip renders an inline-styled white box that looks
// broken in dark mode. This custom content uses Tailwind classes so it
// reacts to the html.dark class without any JS theme detection.

import type { ReactNode } from 'react'

type TipEntry = { name?: string | number; value?: string | number; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }
type TipPayload = { active?: boolean; payload?: TipEntry[]; label?: string | number }

/**
 * Drop-in for recharts `<Tooltip content={<ChartTip .../>} />`.
 * `format` receives each entry value; `formatLabel` the axis label.
 */
export function ChartTip({
  active, payload, label,
  format, formatLabel, title,
}: {
  active?: boolean
  payload?: TipEntry[]
  label?: string | number
  format?: (value: number, entry: TipEntry) => ReactNode
  formatLabel?: (label: string | number) => string
  title?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.10)] backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      {(title ?? (formatLabel ? formatLabel(label ?? '') : String(label ?? ''))) && (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {title ?? (formatLabel ? formatLabel(label ?? '') : String(label ?? ''))}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? 'var(--brand)' }}
            />
            <span className="capitalize">{String(entry.name ?? entry.dataKey ?? '').replace(/_/g, ' ')}</span>
            <span className="ml-auto pl-3 tabular-nums font-extrabold text-zinc-900 dark:text-zinc-50">
              {format ? format(Number(entry.value ?? 0), entry) : String(entry.value ?? '')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
