'use client'

import { createContext, useContext } from 'react'
import type { CurrencyInfo } from '@/lib/format'
import type { Lang } from '@/lib/i18n'

export type PlatformPlan = {
  id: string
  name: string
  slug: string
  monthlyPrice: number
  customDomainPrice: number
  externalApiPrice: number
  portalDesigns: string
}

export type AppPlatform = {
  id: string
  name: string
  slug: string
  domainType: string
  customDomain: string | null
  domainStatus: string
  status: string
  theme: string
  accent: string
  logoUrl: string | null
  tagline: string | null
  heroTitle: string | null
  heroSubtitle: string | null
  heroCta: string | null
  currency: string
  externalApi: boolean
  monthlyFee: number
  nextBilling: string | null
  settings: string
  plan: PlatformPlan
}

export type AppUser = {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'RESELLER' | 'CLIENT' | 'TEAM' | string
  balance: number
  currency: string
  language: Lang | string
  apiKey: string
  twoFactorEnabled: boolean
  status: string
  platformId: string | null
  /** Referral program (lazy-generated server-side) */
  refCode?: string | null
  referralCount?: number
  referralEarned?: number
  platform?: AppPlatform | null
  /** The reseller storefront this user belongs to (white-label branding) */
  storefront?: {
    id: string
    name: string
    slug: string
    theme: string
    accent: string
    logoUrl: string | null
    tagline: string | null
    domainType: string
    customDomain: string | null
    status: string
  } | null
  createdAt?: string
}

export type PublicSettings = {
  brand_name: string
  brand_tagline: string
  landing_theme: string
  landing_copy: string
  subdomain_base: string
  /** Domain this instance is actually installed on, detected from the request */
  app_host: string
  conversion_mode: string
  /** Referral program config (Admin → Settings → Referral program) */
  ref_enabled: string
  ref_bonus_amount: string
  ref_welcome_credit: string
}

export type AppState = {
  user: AppUser
  setUser: (u: AppUser) => void
  refresh: () => Promise<unknown>
  currencies: CurrencyInfo[]
  currencyOf: (code: string) => CurrencyInfo
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: never) => string
  setView: (view: 'landing' | 'client' | 'reseller' | 'admin' | 'buy') => void
  view: string
  viewStorefrontSlug: string | null
  publicSettings: PublicSettings | null
  refreshPublic: () => Promise<void>
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppContext provider')
  return ctx
}
