'use client'

// GrowthRush — RESELLER LAUNCH CHECKLIST
// Progressive onboarding card for the reseller dashboard: a progress ring plus
// six actionable steps (branding → landing → payment method → coupon → first
// client → first order). Server-computed via /api/reseller/stats → `checklist`.
// Dismissal persists per platform in localStorage; completing everything turns
// the card into a celebration state with a CSS confetti burst.

import { useState } from 'react'
import {
  Check, ChevronRight, WalletCards, Ticket, Users, ShoppingCart, Palette, PanelTop, PartyPopper, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export type ChecklistData = {
  branding: boolean
  landing: boolean
  payment: boolean
  coupon: boolean
  clients: boolean
  orders: boolean
}

type Step = {
  key: keyof ChecklistData
  label: string
  sub: string
  icon: LucideIcon
  nav: string
}

export default function LaunchChecklist({ checklist, platformId, onNavigate }: {
  checklist: ChecklistData
  platformId: string
  onNavigate: (key: string) => void
}) {
  const { t } = useI18n()
  const storageKey = `gr-checklist-hide:${platformId}`
  const [hidden, setHidden] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  const steps: Step[] = [
    { key: 'branding', label: t('reseller.checklist.branding'), sub: t('reseller.checklist.brandingSub'), icon: Palette, nav: 'settings' },
    { key: 'landing', label: t('reseller.checklist.landing'), sub: t('reseller.checklist.landingSub'), icon: PanelTop, nav: 'storefront' },
    { key: 'payment', label: t('reseller.checklist.payment'), sub: t('reseller.checklist.paymentSub'), icon: WalletCards, nav: 'payment-methods' },
    { key: 'coupon', label: t('reseller.checklist.coupon'), sub: t('reseller.checklist.couponSub'), icon: Ticket, nav: 'coupons' },
    { key: 'clients', label: t('reseller.checklist.clients'), sub: t('reseller.checklist.clientsSub'), icon: Users, nav: 'clients' },
    { key: 'orders', label: t('reseller.checklist.orders'), sub: t('reseller.checklist.ordersSub'), icon: ShoppingCart, nav: 'orders' },
  ]

  if (hidden) return null

  const done = steps.filter((s) => checklist[s.key]).length
  const total = steps.length
  const complete = done === total

  // Progress ring geometry
  const R = 20
  const C = 2 * Math.PI * R

  const dismiss = () => {
    setHidden(true)
    try {
      window.localStorage.setItem(storageKey, '1')
    } catch { /* private mode */ }
  }

  return (
    <section
      aria-label={t('reseller.checklist.title')}
      className="relative mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900"
      style={complete ? { borderColor: 'color-mix(in srgb, var(--brand) 45%, transparent)' } : undefined}
    >
      {complete && (
        <div className="gr-confetti" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => <i key={i} />)}
        </div>
      )}

      {/* Brand header strip */}
      <div className="h-1 w-full" style={{ background: complete ? 'linear-gradient(90deg, #10b981, var(--brand), #f59e0b, #10b981)' : 'linear-gradient(90deg, var(--brand), color-mix(in srgb, var(--brand) 35%, transparent))' }} />

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        {/* Progress ring */}
        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:gap-2">
          <div className="relative h-[72px] w-[72px]">
            <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
              <circle cx="24" cy="24" r={R} fill="none" strokeWidth="4.5" className="stroke-zinc-100 dark:stroke-zinc-800" />
              <circle
                cx="24" cy="24" r={R} fill="none" strokeWidth="4.5" strokeLinecap="round"
                stroke={complete ? '#10b981' : 'var(--brand)'}
                strokeDasharray={C}
                strokeDashoffset={C * (1 - done / total)}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {complete ? (
                <PartyPopper className="gr-check-pop h-6 w-6 text-emerald-500" aria-hidden="true" />
              ) : (
                <>
                  <span className="text-[15px] font-black leading-none text-zinc-900 dark:text-zinc-50">{Math.round((done / total) * 100)}%</span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{done}/{total}</span>
                </>
              )}
            </div>
          </div>
          <div className="min-w-0 sm:text-center">
            <p className="text-[14px] font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">
              {complete ? t('reseller.checklist.allSet') : t('reseller.checklist.title')}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-zinc-400 dark:text-zinc-500">
              {complete ? t('reseller.checklist.allSetSub') : t('reseller.checklist.sub')}
            </p>
          </div>
        </div>

        {/* Steps */}
        <ul className={`grid min-w-0 flex-1 gap-1.5 md:grid-cols-2 2xl:grid-cols-3 ${complete ? 'sm:col-span-2' : ''}`}>
          {steps.map((s) => {
            const ok = checklist[s.key]
            const Icon = s.icon
            return (
              <li key={s.key}>
                <button
                  onClick={() => { if (!ok) onNavigate(s.nav) }}
                  disabled={ok}
                  className={`group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    ok
                      ? 'border-transparent bg-emerald-50/70 dark:bg-emerald-950/25'
                      : 'border-zinc-100 bg-zinc-50/60 hover:-translate-y-px hover:border-zinc-200 hover:bg-white hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                      ok
                        ? 'gr-check-pop bg-emerald-500 text-white'
                        : 'border-2 border-dashed border-zinc-300 text-zinc-300 group-hover:border-[var(--brand)] group-hover:text-[var(--brand)] dark:border-zinc-700 dark:text-zinc-600'
                    }`}
                  >
                    {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[12px] font-bold ${ok ? 'text-emerald-700 line-through decoration-emerald-400/60 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                      {s.label}
                    </span>
                    <span className={`block truncate text-[10.5px] ${ok ? 'text-emerald-600/70 dark:text-emerald-500/70' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {s.sub}
                    </span>
                  </span>
                  {!ok && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)] dark:text-zinc-600" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label={t('reseller.checklist.hide')}
          title={t('reseller.checklist.hide')}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  )
}
