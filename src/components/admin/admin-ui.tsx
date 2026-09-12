'use client'

// Shared helpers for the Super Admin panel: types, small UI primitives, hooks.

import React, { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { formatMoney, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Types shared across admin sections ────────────────────────────────

export type AdminStats = {
  totalUsers: number
  newUsers7d: number
  resellers: number
  platformsActive: number
  platformsTotal: number
  ordersToday: number
  ordersTotal: number
  revenue30d: number
  revenueSeries: { date: string; revenue: number }[]
  ordersByStatus: { status: string; count: number }[]
  pendingDeposits: number
  openTickets: number
  topServices: { id: string; name: string; rate: number; orders: number; revenue: number }[]
  recentSignups: { id: string; name: string; email: string; role: string; status: string; createdAt: string }[]
  clientsByPlatform: Record<string, number>
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  balance: number
  currency: string
  language: string
  status: string
  platformId: string | null
  twoFactorEnabled: boolean
  createdAt: string
  platform?: { id: string; name: string; slug: string } | null
}

export type AdminPlatform = {
  id: string
  name: string
  slug: string
  domainType: string
  customDomain: string | null
  domainStatus: string
  status: string
  theme: string
  currency: string
  externalApi: boolean
  monthlyFee: number
  createdAt: string
  owner: { id: string; name: string; email: string; status: string }
  plan: { id: string; name: string; slug: string; monthlyPrice: number }
  ordersCount: number
  clientsCount: number
}

export type AdminPlan = {
  id: string
  name: string
  slug: string
  description: string | null
  monthlyPrice: number
  annualPrice?: number | null
  setupPrice: number
  customDomainPrice: number
  externalApiPrice: number
  maxServices: number
  maxOrders: number
  portalDesigns: string
  features: string
  popular: boolean
  active: boolean
  sortOrder: number
  _count?: { platforms: number }
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  status: string
  sortOrder: number
  _count: { services: number }
}

export type AdminService = {
  id: string
  categoryId: string
  providerId: string | null
  name: string
  type: string
  rate: number
  cost: number | null
  min: number
  max: number
  description: string | null
  dripfeed: boolean
  refill: boolean
  cancel: boolean
  status: string
  featured: boolean
  sortOrder: number
  category: { id: string; name: string; slug: string; icon: string; color: string }
  provider?: { id: string; name: string } | null
  _count: { orders: number }
}

export type AdminProvider = {
  id: string
  name: string
  apiUrl: string
  apiKey: string | null
  status: string
  balance: number
  markup: number
  _count: { services: number }
}

export type AdminOrder = {
  id: string
  userId: string
  serviceName: string
  link: string
  quantity: number
  charge: number
  startCount: number
  remains: number
  status: string
  dripfeed: boolean
  dripRuns: number
  dripInterval: number
  comments: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
  service: { id: string; name: string; category: { id: string; name: string; icon: string; color: string } | null }
}

export type AdminTransaction = {
  id: string
  userId: string
  type: string
  amount: number
  description: string
  status: string
  method: string | null
  reference: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
}

export type AdminDeposit = {
  id: string
  amount: number
  method: string
  reference: string | null
  note: string | null
  status: string
  createdAt: string
  user: { id: string; name: string; email: string }
}

export type AdminGateway = {
  id: string
  name: string
  type: string
  code?: string | null
  instructions: string | null
  feePercent: number
  enabled: boolean
  sortOrder: number
  config?: Record<string, string>
}

export type AdminCurrency = {
  code: string
  name: string
  symbol: string
  rate: number
  isBase: boolean
  auto: boolean
  updatedAt: string
}

export type AdminTicket = {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
  messages: { id: string; senderName: string; isStaff: boolean; body: string; fileUrl?: string | null; fileName?: string | null; fileMime?: string | null; fileSize?: number | null; createdAt: string }[]
}

export type AdminBlacklist = { id: string; type: string; value: string; note: string | null; createdAt: string }

export type AdminTeamMember = {
  id: string
  name: string
  email: string
  role: string
  permissions: string
  status: string
  lastLogin: string | null
  createdAt: string
}

export type AdminNewsItem = { id: string; title: string; body: string; pinned: boolean; createdAt: string }
export type AdminFaqItem = { id: string; question: string; answer: string; category: string; sortOrder: number }
export type AdminPostItem = { id: string; title: string; slug: string; excerpt: string | null; body: string; cover: string | null; status: string; publishedAt: string }
export type AdminPageItem = { id: string; title: string; slug: string; body: string; status: string; createdAt: string }

// ── Small primitives ──────────────────────────────────────────────────

/** Avatar with initials */
export function InitialAvatar({ name, className }: { name: string; className?: string }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white',
        className,
      )}
      style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}
    >
      {initials}
    </span>
  )
}

/** Money in the admin's display currency */
export function Money({ usd, className, sign }: { usd: number; className?: string; sign?: boolean }) {
  const { currencyOf, user } = useApp()
  const text = formatMoney(usd, currencyOf(user.currency))
  return <span className={cn('tabular-nums', className)}>{sign && usd > 0 ? `+${text}` : text}</span>
}

export function AdminDate({ d, className }: { d: string | Date; className?: string }) {
  const { lang } = useApp()
  return <span className={cn('whitespace-nowrap text-[12px] text-zinc-500 dark:text-zinc-400', className)}>{formatDate(d, lang)}</span>
}

/** Card wrapper: rounded-2xl border bg-white dark:bg-zinc-900 with consistent padding */
export function AdminCard({ title, description, actions, children, className, bodyClass }: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/70 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>}
            {description && <p className="mt-0.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClass)}>{children}</div>
    </section>
  )
}

/** Horizontal-scroll table shell with a soft right-edge fade
 *  while more columns are available (light + dark aware via CSS). */
export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = React.useState(false)
  const [atEnd, setAtEnd] = React.useState(false)

  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    setScrollable(el.scrollWidth - el.clientWidth > 8)
    setAtEnd(el.scrollWidth - el.clientWidth - el.scrollLeft <= 8)
  }, [])

  React.useEffect(() => {
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
      className={cn('overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] gr-table-scroll', scrollable && 'is-scrollable', atEnd && 'is-end', className)}
    >
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, hint }: { icon?: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/60">
        <Icon className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
      </span>
      <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{title}</p>
      {hint && <p className="max-w-xs text-[12px] text-zinc-400 dark:text-zinc-500">{hint}</p>}
    </div>
  )
}

/** Small label used in dialogs */
export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{children}</span>
      {hint && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{hint}</span>}
    </div>
  )
}

/** Debounce any value (used by search inputs) */
export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function shortDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Parse a comma-separated string into array */
export function parseList(s: string | null | undefined): string[] {
  return (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)
}

/** Safe JSON.parse of Plan.features */
export function parseFeatures(s: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(s ?? '[]')
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

/** DELETE with a JSON body (resource id) — the shared api.del doesn't support bodies */
export async function apiDel<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  return data as T
}
