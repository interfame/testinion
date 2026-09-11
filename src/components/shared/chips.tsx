'use client'

import { useState } from 'react'
import { Globe, Wallet, ChevronDown, Copy, Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGS, type Lang } from '@/lib/i18n'
import { formatMoney } from '@/lib/format'
import { useApp } from '@/components/shared/app-context'

/** Balance pill shown in panel topbars */
export function BalanceChip({ onAddFunds }: { onAddFunds?: () => void }) {
  const { user, currencyOf } = useApp()
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1 pl-3 pr-1 shadow-sm">
      <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="text-[13px] font-extrabold tabular-nums">{formatMoney(user.balance, currencyOf(user.currency))}</span>
      {onAddFunds && (
        <Button size="sm" onClick={onAddFunds} className="h-6 rounded-full px-2.5 text-[11px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
          <Zap className="mr-1 h-3 w-3" /> Top up
        </Button>
      )}
    </div>
  )
}

/** Currency selector (multi-currency display conversion) */
export function CurrencyChip() {
  const { user, setUser, currencies } = useApp()
  const current = currencies.find((c) => c.code === user.currency) ?? currencies[0]
  if (!current) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-[12px] font-bold">
          {current.symbol} {current.code}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Currency</DropdownMenuLabel>
        {currencies.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setUser({ ...user, currency: c.code })}
            className={c.code === user.currency ? 'bg-zinc-100 dark:bg-zinc-800/60 font-bold' : ''}
          >
            <span className="w-6 text-zinc-400 dark:text-zinc-500">{c.symbol}</span> {c.code}
            <span className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500">{c.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Language selector (multi-language) */
export function LanguageChip() {
  const { lang, setLang, user, setUser, refresh } = useApp()
  const meta = LANGS.find((l) => l.code === lang) ?? LANGS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-[12px] font-bold">
          <span>{meta.flag}</span> {meta.code.toUpperCase()}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Language</DropdownMenuLabel>
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={async () => {
              setLang(l.code as Lang)
              if (user.language !== l.code) {
                await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: l.code }) })
                refresh()
              }
            }}
            className={l.code === lang ? 'bg-zinc-100 dark:bg-zinc-800/60 font-bold' : ''}
          >
            <span className="mr-2">{l.flag}</span> {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Copyable API key field */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 text-[12px] text-zinc-700 dark:text-zinc-200">
        {label ? `${label}: ` : ''}{value}
      </code>
      <Button
        variant="outline" size="icon" className="h-9 w-9 shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

export function GlobeIcon() {
  return <Globe className="h-4 w-4" />
}
