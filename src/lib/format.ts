// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import type { Lang } from '@/lib/i18n'

export type CurrencyInfo = { code: string; name: string; symbol: string; rate: number; isBase?: boolean }

const FALLBACK: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, isBase: true },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', rate: 1010 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 5.42 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', rate: 17.08 },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', rate: 4110 },
]

export function convert(usd: number, currency: CurrencyInfo | undefined): number {
  if (!currency) return usd
  return usd * currency.rate
}

export function formatMoney(usd: number, currency: CurrencyInfo | undefined, lang: Lang = 'en'): string {
  const c = currency ?? FALLBACK[0]
  const value = convert(usd, c)
  // Smart decimals: big-rate currencies stay integer; otherwise 2 decimals,
  // stretched to 4 when the value carries meaningful sub-cent precision
  // (e.g. provider costs like $0.0255 must not render as $0.03).
  let decimals = c.rate > 50 ? 0 : 2
  if (decimals === 2) {
    const rounded2 = Math.round(value * 100) / 100
    const farFrom2 = Math.abs(value - rounded2) > 0.005
    const subCentNoise = Math.abs((Math.abs(value) * 100) % 1)
    const hasSubCentPrecision = Math.abs(value) < 1 && subCentNoise > 1e-9 && subCentNoise < 1 - 1e-9
    if (farFrom2 || hasSubCentPrecision) decimals = 4
  }
  const formatted = new Intl.NumberFormat(lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
  return `${c.symbol}${formatted}`
}

export function formatDate(d: string | Date, lang: Lang = 'en'): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(d: string | Date, lang: Lang = 'en'): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
