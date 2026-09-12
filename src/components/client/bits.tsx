'use client'

// GrowthRush client portal — small shared UI bits

import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/format'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

/** Card container with the standard portal look */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6', className)}>
      {children}
    </div>
  )
}

/** Card header with title + optional right slot */
export function CardHead({ title, sub, right, icon: Icon }: {
  title: string
  sub?: string
  right?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand)]/10">
            <Icon className="h-4 w-4 text-[var(--brand)]" />
          </span>
        )}
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
          {sub && <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{sub}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

/** Small colored pill */
export function Pill({ children, tone = 'zinc', className }: {
  children: ReactNode
  tone?: 'zinc' | 'emerald' | 'amber' | 'rose' | 'brand' | 'sky' | 'violet'
  className?: string
}) {
  const tones: Record<string, string> = {
    zinc: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
    sky: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
    violet: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
    brand: 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/25',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', tones[tone], className)}>
      {children}
    </span>
  )
}

/** Friendly empty state */
export function EmptyState({ icon: Icon, title, message, action }: {
  icon: LucideIcon
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)]/10">
        <Icon className="h-5 w-5 text-[var(--brand)]" />
      </span>
      <p className="text-[14px] font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
      {message && <p className="max-w-sm text-[12.5px] text-zinc-500 dark:text-zinc-400">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Skeleton lines while tables load */
export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-lg" />
      ))}
    </div>
  )
}

/** Inline spinner + label */
export function SpinnerLine({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? 'Loading…'}
    </div>
  )
}

/** Dark code block with copy button */
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn('group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950', className)}>
      <pre className="overflow-x-auto p-4 pr-12 text-[11.5px] leading-relaxed text-zinc-200 gr-scroll">
        <code className="font-mono">{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        aria-label={t('coupon.copy')}
        className="absolute right-2.5 top-2.5 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-400 dark:text-zinc-500 transition hover:text-white"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

/** Primary button colored with the active theme brand.
 *  Text color follows --on-brand (black on the lime #c6e508, white on darker accents).
 *  Non-solid variants (outline/ghost/link) keep their own scheme and don't get the
 *  inline brand background — otherwise lime text would sit on a lime fill. */
export function BrandButton({ children, className, variant, style, ...props }: ComponentProps<typeof Button>) {
  const solid = variant === undefined || variant === 'default'
  return (
    <Button
      variant={variant}
      className={cn(solid ? 'text-[var(--on-brand)]' : 'hover:opacity-100', 'shadow-sm hover:opacity-90', className)}
      style={solid ? { background: 'var(--brand)', ...style } : style}
      {...props}
    >
      {children}
    </Button>
  )
}

/** Money formatter bound to the user's display currency + language */
export function useMoney() {
  const { user, currencyOf } = useApp()
  const { lang } = useI18n()
  return useCallback(
    (usd: number) => formatMoney(usd, currencyOf(user.currency), lang),
    [user.currency, currencyOf, lang],
  )
}

/** Horizontal scroll wrapper for data tables on small screens.
 *  Shows a soft right-edge fade while more content is available. */
export function TableWrap({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)
  const [atEnd, setAtEnd] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setScrollable(el.scrollWidth - el.clientWidth > 8)
    setAtEnd(el.scrollWidth - el.clientWidth - el.scrollLeft <= 8)
  }, [])

  useEffect(() => {
    measure()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  return (
    <div
      ref={ref}
      onScroll={measure}
      className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 gr-table-scroll', scrollable && 'is-scrollable', atEnd && 'is-end')}
    >
      <div className="min-w-[680px]">{children}</div>
    </div>
  )
}
