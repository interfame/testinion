'use client'

import { useState } from 'react'
import { Check, Copy, TicketPercent, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useI18n } from '@/lib/i18n'

/**
 * Ticket-style promo banner for public surfaces (landing + storefronts).
 * Shows "Use code X for $Y in free credit" with a copy-to-clipboard button.
 * Dismissible for the session — reappears next visit (marketing-friendly).
 */
export function CouponBanner({ code, value, moneyLabel, dark = false, notchClass = 'gr-coupon-notches' }: {
  code: string
  value: number
  /** Pre-formatted amount label, e.g. "$10.00" */
  moneyLabel: string
  /** dark: render on a dark hero background (storefront hero variant) */
  dark?: boolean
  /** CSS class that sets --notch to the surrounding page background color */
  notchClass?: string
}) {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  if (dismissed) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      /* clipboard blocked — still show feedback */
    }
    setCopied(true)
    toast({ title: `${t('coupon.copied')} ${code} 🎁` })
    setTimeout(() => setCopied(false), 2200)
  }

  const text = t('coupon.bannerText').replace('{code}', code).replace('{value}', moneyLabel)

  return (
    <div
      className={`gr-coupon-shine relative mx-auto flex w-full max-w-2xl items-center gap-2.5 overflow-visible px-4 py-2.5 sm:gap-3 ${
        dark ? 'gr-coupon-notches-dark' : notchClass
      }`}
      role="status"
    >
      {/* Ticket body */}
      <div
        className={`relative flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border-2 border-dashed px-3.5 py-2.5 shadow-lg backdrop-blur transition sm:gap-3 ${
          dark
            ? 'border-white/40 bg-white/10 text-white'
            : 'border-[var(--brand)] bg-white/95 text-zinc-900 dark:border-[var(--brand)] dark:bg-zinc-900/95 dark:text-zinc-50'
        }`}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md sm:h-9 sm:w-9"
          style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}
        >
          <TicketPercent className="h-4 w-4" />
        </span>

        <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold sm:text-[13.5px]">{text}</p>

        <button
          onClick={copy}
          aria-label={`${t('coupon.copy')} ${code}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition active:scale-95 ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'text-[var(--on-brand)] hover:brightness-110'
          }`}
          style={copied ? undefined : { background: 'var(--brand)' }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden font-mono tracking-wider sm:inline">{code}</span>
          <span className="sm:hidden">{copied ? '✓' : t('coupon.copy')}</span>
        </button>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        aria-label={t('coupon.dismiss')}
        className={`shrink-0 rounded-full p-1.5 transition ${
          dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
        }`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
