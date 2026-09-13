// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, LogOut, Rocket, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { themeVars, themeOf } from '@/lib/themes'
import { NotificationBell } from '@/components/shared/notifications'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { CommandPalette, PaletteTrigger, PaletteTriggerMobile, type ServiceSearch } from '@/components/shared/command-palette'
import { useRealtimeBridge, useServerHealth } from '@/lib/realtime-client'
import { useI18n, type DictKey } from '@/lib/i18n'

/** Status enum → i18n key (falls back to the raw enum, underscores spaced) */
export const STATUS_KEYS: Record<string, DictKey> = {
  PENDING: 'status.PENDING', IN_PROGRESS: 'status.IN_PROGRESS', PROCESSING: 'status.PROCESSING',
  COMPLETED: 'status.COMPLETED', PARTIAL: 'status.PARTIAL', CANCELED: 'status.CANCELED',
  OPEN: 'status.OPEN', ANSWERED: 'status.ANSWERED', CLOSED: 'status.CLOSED',
  ACTIVE: 'status.ACTIVE', SUSPENDED: 'status.SUSPENDED', BANNED: 'status.BANNED',
  APPROVED: 'status.APPROVED', REJECTED: 'status.REJECTED', PAUSED: 'status.PAUSED',
  EXPIRED: 'status.EXPIRED', EXHAUSTED: 'status.EXHAUSTED',
  CONNECTED: 'status.CONNECTED', DISCONNECTED: 'status.DISCONNECTED', AI: 'status.AI', HANDED: 'status.HANDED',
}

/** User/staff role enum → i18n key */
export const ROLE_KEYS: Record<string, DictKey> = {
  CLIENT: 'admin.role.CLIENT', RESELLER: 'admin.role.RESELLER', SUPER_ADMIN: 'admin.role.SUPER_ADMIN',
  ADMIN: 'admin.role.ADMIN', SUPPORT: 'admin.role.SUPPORT', FINANCE: 'admin.role.FINANCE', CONTENT: 'admin.role.CONTENT',
}

/** Hook: translate a status/role enum, falling back to the spaced raw value */
export function useEnumLabel(keys: Record<string, DictKey> = STATUS_KEYS) {
  const { t } = useI18n()
  return (value: string) => {
    const k = keys[value]
    return k ? t(k) : value.replace(/_/g, ' ')
  }
}

export type NavItem = { key: string; label: string; icon: LucideIcon; badge?: number; dot?: boolean }
export type NavSection = { title?: string; items: NavItem[] }

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  const { t } = useI18n()
  return (
    <Button
      variant="ghost" size="icon" onClick={onLogout} title={t('auth.logout')} aria-label={t('auth.logout')}
      className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" />
    </Button>
  )
}

export type PanelShellProps = {
  nav: NavSection[]
  active: string
  onSelect: (key: string) => void
  brandName: string
  brandLogo?: React.ReactNode
  themeKey?: string
  topbarLeft?: React.ReactNode
  topbarRight?: React.ReactNode
  user: { id?: string; name: string; email: string; role: string }
  children: React.ReactNode
  onExit?: () => void
  onLogout: () => void
  /** subtle accent override (hex) */
  accent?: string
  /** optional service search wired into the ⌘K palette (client portal) */
  serviceSearch?: ServiceSearch
}

function MobileMenuButton(props: React.ComponentProps<typeof Button>) {
  const { t } = useI18n()
  return (
    <Button
      variant="outline" size="icon"
      className="fixed left-3 top-2.5 z-50 h-9 w-9 lg:hidden"
      aria-label={t('shell.openMenu')}
      {...props}
    >
      <Menu className="h-4 w-4" />
    </Button>
  )
}

function NavTitle() {
  const { t } = useI18n()
  return <>{t('shell.navigation')}</>
}

export function PanelShell({
  nav, active, onSelect, brandName, brandLogo, themeKey = 'rush',
  topbarLeft, topbarRight, user, children, onExit, onLogout, accent, serviceSearch,
}: PanelShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // ONE websocket per panel — events are mirrored onto window as `gr:rt`.
  // When websockets aren't available (serverless/self-hosted), fall back to
  // polling /api/health so the Live chip reflects real platform status.
  const wsUp = useRealtimeBridge(user.id)
  const serverUp = useServerHealth(!wsUp)
  const realtimeUp = wsUp || serverUp

  const navList = (
    <nav className="gr-scroll-dark flex-1 overflow-y-auto px-3 py-4 space-y-5 scroll-smooth">
      {nav.map((section, i) => (
        <div key={i}>
          {section.title && (
            <div className="flex items-center gap-2 px-3 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{section.title}</span>
              <span className="h-px flex-1 bg-white/[0.07]" />
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onSelect(item.key)
                    setMobileOpen(false)
                  }}
                  className={cn(
                    'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all outline-none',
                    'focus-visible:ring-2 focus-visible:ring-white/30',
                    isActive ? 'text-[var(--on-brand)]' : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
                  )}
                  style={isActive ? { background: 'var(--brand)', boxShadow: '0 4px 14px -4px var(--brand-glow)' } : undefined}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/90"
                    />
                  )}
                  <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80')} />
                  <span className="truncate">{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {item.dot && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  const brandBlock = (
    <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-5">
      {brandLogo ?? (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accent ?? 'var(--brand)'}, var(--brand-2, ${accent ?? 'var(--brand)'}))` }}
        >
          <Rocket className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-white">{brandName}</p>
      </div>
    </div>
  )

  const userBlock = (
    <div className="border-t border-white/[0.06] p-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] p-2.5">
        <Avatar className="h-8 w-8 border border-white/10">
          <AvatarFallback className="bg-white/10 text-[11px] font-bold text-white">
            {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">{user.name}</p>
          <p className="truncate text-[10px] text-white/45">{user.email}</p>
        </div>
        <LogoutButton onLogout={onLogout} />
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50" style={themeVars(themeKey)}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col lg:flex" style={{ background: 'var(--brand-dark)' }}>
        {brandBlock}
        {navList}
        {userBlock}
      </aside>

      {/* Mobile sidebar — portals to <body>, so it escapes the themeVars root:
          use the resolved theme hex instead of var(--brand-dark) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <MobileMenuButton />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-white/10 p-0" style={{ background: themeOf(themeKey).dark }}>
          <SheetTitle className="sr-only"><NavTitle /></SheetTitle>
          <div className="flex h-full flex-col">
            {brandBlock}
            {navList}
            {userBlock}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-h-screen w-full flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-200/80 bg-white/85 dark:bg-zinc-900/80 pl-16 pr-3 backdrop-blur lg:pl-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {onExit && <ExitButton onExit={onExit} />}
            {topbarLeft}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PaletteTrigger />
            <PaletteTriggerMobile />
            <LiveChip up={realtimeUp} pulsing={wsUp} />
            <ThemeToggle className="h-9 w-9 rounded-full" />
            <NotificationBell userId={user.id} onNavigate={onSelect} />
            {topbarRight}
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* ⌘K command palette — navigation + quick actions + service search */}
      <CommandPalette nav={nav} onSelect={onSelect} onExit={onExit} onLogout={onLogout} serviceSearch={serviceSearch} />
    </div>
  )
}

function ExitButton({ onExit }: { onExit: () => void }) {
  const { t } = useI18n()
  return (
    <button
      onClick={onExit}
      className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-100"
      title={t('legal.back')}
    >
      <ChevronLeft className="h-3 w-3" /> {t('shell.site')}
    </button>
  )
}

/**
 * Tiny pill showing the platform link state.
 * - up + pulsing: realtime websocket connected (live events)
 * - up, steady: server reachable via /api/health polling (no websocket service)
 * - down: server unreachable
 */
export function LiveChip({ up, pulsing = false }: { up: boolean; pulsing?: boolean }) {
  const { t } = useI18n()
  return (
    <span
      title={up ? (pulsing ? t('shell.rtUp') : t('shell.rtPolling')) : t('shell.rtDown')}
      className={cn(
        'hidden h-9 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-extrabold uppercase tracking-wide sm:flex',
        up
          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500',
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {up && pulsing && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', up ? 'bg-emerald-500' : 'bg-zinc-400')} />
      </span>
      {up ? t('shell.live') : t('shell.off')}
    </span>
  )
}

/** Standard page header used inside panel views */
export function PanelPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** KPI stat card used across dashboards */
export function StatCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  accent?: string
  trend?: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)]">
      {/* brand glow that fades in on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `color-mix(in srgb, ${accent ?? 'var(--brand)'} 28%, transparent)` }}
      />
      <div className="relative flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ background: `color-mix(in srgb, ${accent ?? 'var(--brand)'} 12%, white)` }}>
          <Icon className="h-4.5 w-4.5" style={{ color: accent ?? 'var(--brand)' }} />
        </span>
        {trend && <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>}
      </div>
      <p className="relative mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="relative text-[12px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {sub && <p className="relative mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{sub}</p>}
    </div>
  )
}

export const statusColor: Record<string, string> = {
  PENDING: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  IN_PROGRESS: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
  PROCESSING: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
  COMPLETED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  PARTIAL: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/60',
  CANCELED: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
  OPEN: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  ANSWERED: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
  CLOSED: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  SUSPENDED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  BANNED: 'bg-zinc-900 text-white border-zinc-900',
  APPROVED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  REJECTED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  CONNECTED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  DISCONNECTED: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
  AI: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
  HANDED: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
}

export function StatusBadge({ status }: { status: string }) {
  const label = useEnumLabel()
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold', statusColor[status] ?? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800')}>
      {label(status)}
    </span>
  )
}
