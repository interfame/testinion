// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Rocket, LogIn, UserPlus, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Landing from '@/components/landing/landing'
import ClientPanel from '@/components/client/client-panel'
import ResellerPanel from '@/components/reseller/reseller-panel'
import AdminPanel from '@/components/admin/admin-panel'
import BuyPlatform from '@/components/landing/buy-platform'
import StorefrontPublic from '@/components/storefront/storefront-public'
import LegalPages, { isLegalDoc } from '@/components/shared/legal-pages'
import BlogView from '@/components/shared/blog-view'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import type { LegalKey } from '@/lib/legal'
import { AppContext, type AppUser, type PublicSettings } from '@/components/shared/app-context'
import { api } from '@/lib/api'
import { I18nContext, translate, type DictKey, type Lang } from '@/lib/i18n'
import type { CurrencyInfo } from '@/lib/format'

type View = 'landing' | 'client' | 'reseller' | 'admin' | 'buy' | 'storefront' | 'legal' | 'blog'

type MeResponse = { user: AppUser & { platform?: AppUser['platform'] } }
type PublicResponse = {
  settings: PublicSettings
  currencies: CurrencyInfo[]
  platformCount: number
}

const FALLBACK_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, isBase: true },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
]

export default function AppRoot({ initialStorefront }: { initialStorefront?: string | null } = {}) {
  const [booted, setBooted] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [view, setView] = useState<View>('landing')
  const [lang, setLangState] = useState<Lang>('en')
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>(FALLBACK_CURRENCIES)
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null)
  const [authOpen, setAuthOpen] = useState<null | 'login' | 'register' | 'verify'>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [viewStorefrontSlug, setViewStorefrontSlug] = useState<string | null>(null)
  const [blogScope, setBlogScope] = useState<{ slug: string | null } | null>(null)
  const [legalDoc, setLegalDoc] = useState<LegalKey>('terms')
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' })
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyHint, setVerifyHint] = useState<string | null>(null)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('gr_lang', l)
    } catch { /* ignore */ }
  }, [])

  const refreshPublic = useCallback(async () => {
    try {
      const d = await api.get<PublicResponse>('/api/settings/public')
      setPublicSettings(d.settings)
      if (d.currencies?.length) setCurrencies(d.currencies)
    } catch { /* ignore */ }
  }, [])

  const refresh = useCallback(async (retries = 1): Promise<AppUser | null> => {
    try {
      const d = await api.get<MeResponse>('/api/me')
      const u = d.user as AppUser
      setUser(u)
      if (u.language && ['en', 'es', 'pt'].includes(u.language)) setLangState(u.language as Lang)
      return u
    } catch {
      // A single automatic retry — deploys/cold starts can fail transiently
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 800))
        return refresh(retries - 1)
      }
      setUser(null)
      return null
    }
  }, [])

  // Boot
  useEffect(() => {
    ;(async () => {
      await Promise.all([refreshPublic(), refresh()])
      try {
        const saved = localStorage.getItem('gr_lang')
        if (saved && ['en', 'es', 'pt'].includes(saved)) setLangState(saved as Lang)
      } catch { /* ignore */ }
      // Deep link: /?storefront=slug → public white-label storefront
      // Subdomain mode: middleware rewrites slug.domain.com → /?storefront=slug
      try {
        const sf = new URLSearchParams(window.location.search).get('storefront')
        if (sf) {
          setViewStorefrontSlug(sf.toLowerCase())
          setView('storefront')
        } else if (initialStorefront) {
          setViewStorefrontSlug(initialStorefront.toLowerCase())
          setView('storefront')
        }
      } catch { /* ignore */ }
      // Deep link: /?doc=terms|privacy|responsibility → public legal page
      try {
        const doc = new URLSearchParams(window.location.search).get('doc')
        if (doc && isLegalDoc(doc)) {
          setLegalDoc(doc)
          setView('legal')
        }
      } catch { /* ignore */ }
      // Referral deep link: /?ref=CODE → stash until the visitor registers
      try {
        const ref = new URLSearchParams(window.location.search).get('ref')
        if (ref) {
          localStorage.setItem('gr_ref', ref.trim().toUpperCase())
          window.history.replaceState(null, '', window.location.pathname)
        }
      } catch { /* ignore */ }
      setBooted(true)
    })()
  }, [])

  // Global events
  useEffect(() => {
    const onExit = () => setView('landing')
    const onAuth = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'login' || detail === 'register' || detail === 'verify') setAuthOpen(detail)
    }
    const onRefresh = () => refresh()
    const onGo = async (e: Event) => {
      const target = (e as CustomEvent).detail as View
      setView(target)
      await refresh()
    }
    const onStorefront = (e: Event) => {
      const slug = (e as CustomEvent).detail as string
      if (slug) {
        setViewStorefrontSlug(slug)
        setView('storefront')
      }
    }
    // Public legal pages (footer links) — no auth required
    const onLegal = (e: Event) => {
      const doc = (e as CustomEvent).detail as string
      if (doc && isLegalDoc(doc)) {
        setLegalDoc(doc)
        setView('legal')
        window.scrollTo({ top: 0 })
      }
    }
    // Language switch from the legal page itself
    const onLang = (e: Event) => {
      const l = (e as CustomEvent).detail as string
      if (l === 'en' || l === 'es' || l === 'pt') setLang(l)
    }
    // Public blog (master landing footer + storefront footer)
    const onBlog = (e: Event) => {
      const slug = ((e as CustomEvent).detail ?? null) as string | null
      setBlogScope({ slug: slug || null })
      setView('blog')
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('gr:exit', onExit)
    window.addEventListener('gr:auth', onAuth)
    window.addEventListener('gr:refresh', onRefresh)
    window.addEventListener('gr:go', onGo)
    window.addEventListener('gr:storefront', onStorefront)
    window.addEventListener('gr:legal', onLegal)
    window.addEventListener('gr:lang', onLang)
    window.addEventListener('gr:blog', onBlog)
    return () => {
      window.removeEventListener('gr:exit', onExit)
      window.removeEventListener('gr:auth', onAuth)
      window.removeEventListener('gr:refresh', onRefresh)
      window.removeEventListener('gr:go', onGo)
      window.removeEventListener('gr:storefront', onStorefront)
      window.removeEventListener('gr:legal', onLegal)
      window.removeEventListener('gr:lang', onLang)
      window.removeEventListener('gr:blog', onBlog)
    }
  }, [refresh, setLang])

  const navigate = useCallback(
    async (v: View) => {
      const u = user ?? (await refresh())
      if (!u) {
        setAuthOpen('login')
        return
      }
      if (v === 'admin' && u.role !== 'SUPER_ADMIN') {
        toast({ title: translate(lang, 'auth.adminOnly'), variant: 'destructive' })
        return
      }
      // Already own a platform? "Buy" goes to the reseller panel instead of the checkout
      if (v === 'buy' && u.platform) {
        toast({ title: translate(lang, 'client.resellerPanel') })
        setView('reseller')
        return
      }
      if ((v === 'reseller' || v === 'buy') && !u.platform && u.role === 'RESELLER' && v === 'reseller') {
        setView('buy')
        return
      }
      setView(v)
    },
    [user, refresh, lang]
  )

  const handleAuth = async (mode: 'login' | 'register' | 'verify', creds?: { email: string; password: string }) => {
    setAuthBusy(true)
    try {
      if (mode === 'login') {
        await api.post('/api/auth/login', {
          email: creds?.email ?? form.email,
          password: creds?.password ?? form.password,
        })
      } else if (mode === 'register') {
        let refCode: string | undefined
        try {
          refCode = localStorage.getItem('gr_ref') ?? undefined
        } catch { /* ignore */ }
        const d = await api.post<{ ok?: boolean; role?: string; verifyRequired?: boolean; devCode?: string }>('/api/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
          currency: form.currency,
          language: lang,
          // Registering from a reseller storefront → join under it (white-label)
          storefrontSlug: view === 'storefront' ? viewStorefrontSlug : undefined,
          // Referred by a friend → attribute the signup (?ref=CODE)
          ref: refCode,
        })
        try {
          localStorage.removeItem('gr_ref')
        } catch { /* ignore */ }
        // Email verification enabled → swap the dialog to the code step (no session yet)
        if (d?.verifyRequired) {
          setVerifyEmail(form.email)
          setVerifyCode('')
          setVerifyHint(d.devCode ? d.devCode : null)
          setAuthOpen('verify')
          setForm({ name: '', email: '', password: '', currency: 'USD' })
          return
        }
      } else {
        // 'verify' — confirm the 6-digit email code, then log the user in
        const d = await api.post<{ ok?: boolean; role?: string }>('/api/auth/verify', {
          email: verifyEmail,
          code: verifyCode.trim(),
        })
        const u = await refresh()
        setAuthOpen(null)
        setVerifyCode('')
        setVerifyHint(null)
        toast({ title: translate(lang, 'auth.accountCreatedToast') })
        if (u?.role === 'SUPER_ADMIN') setView('admin')
        else if (u?.role === 'RESELLER') setView('reseller')
        else setView('client')
        void d
        return
      }
      const u = await refresh()
      setAuthOpen(null)
      setForm({ name: '', email: '', password: '', currency: 'USD' })
      if (!u) {
        // Login worked but the session could not be loaded — tell the user
        // instead of silently staying on the landing page.
        toast({ title: translate(lang, 'auth.sessionLoadFailed') , variant: 'destructive' })
        return
      }
      const finalLang = u?.language && ['en', 'es', 'pt'].includes(u.language) ? (u.language as Lang) : lang
      toast({ title: translate(finalLang, mode === 'login' ? 'auth.welcomeBackToast' : 'auth.accountCreatedToast') })
      if (u?.role === 'SUPER_ADMIN') setView('admin')
      else if (u?.role === 'RESELLER') setView('reseller')
      else setView('client')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error'
      // Unverified account tried to log in → open the code-verification step
      if (/verif/i.test(msg)) {
        setVerifyEmail(mode === 'login' ? (creds?.email ?? form.email) : form.email)
        setVerifyCode('')
        setVerifyHint(null)
        setAuthOpen('verify')
      }
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setAuthBusy(false)
    }
  }

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout')
    setUser(null)
    setView('landing')
    toast({ title: translate(lang, 'auth.loggedOutToast') })
  }, [lang])

  const currencyOf = useCallback(
    (code: string): CurrencyInfo => currencies.find((c) => c.code === code) ?? currencies[0] ?? FALLBACK_CURRENCIES[0],
    [currencies]
  )

  const appState = useMemo(
    () => ({
      user: (user ?? {
        id: '', name: '', email: '', role: '', balance: 0, currency: 'USD', language: lang,
        apiKey: '', twoFactorEnabled: false, status: 'ACTIVE', platformId: null, platform: null,
      }) as AppUser,
      setUser: (u: AppUser) => setUser(u),
      refresh,
      currencies,
      currencyOf,
      lang,
      setLang,
      t: (key: DictKey) => translate(lang, key),
      setView: (v: View) => navigate(v),
      view,
      viewStorefrontSlug,
      publicSettings,
      refreshPublic,
    }),
    [user, refresh, currencies, currencyOf, lang, setLang, view, viewStorefrontSlug, publicSettings, refreshPublic, navigate]
  )

  const i18nState = useMemo(
    () => ({ lang, setLang, t: (key: DictKey) => translate(lang, key) }),
    [lang, setLang]
  )

  if (!booted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf7f4] dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl text-[var(--on-brand)] shadow-lg" style={{ background: 'var(--brand)' }}>
            <Rocket className="h-6 w-6" />
          </span>
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-500" />
        </div>
      </div>
    )
  }

  return (
    <I18nContext.Provider value={i18nState}>
      <AppContext.Provider value={appState}>
        <div className="flex min-h-screen flex-col bg-[#fbf7f4] dark:bg-zinc-950">
          <ErrorBoundary>
            {view === 'landing' && <Landing />}
            {view === 'buy' && <BuyPlatform />}
            {view === 'storefront' && <StorefrontPublic />}
            {view === 'legal' && <LegalPages doc={legalDoc} />}
            {view === 'blog' && <BlogView slug={blogScope?.slug ?? null} />}
            {view === 'client' && user && (
              <ClientPanel user={user} onRefresh={refresh} onLogout={logout} />
            )}
            {view === 'reseller' && user && <ResellerPanel user={user} onRefresh={refresh} onLogout={logout} />}
            {view === 'admin' && user && <AdminPanel user={user} onRefresh={refresh} onLogout={logout} />}
          </ErrorBoundary>

          {/* Auth dialog */}
          <Dialog open={authOpen !== null} onOpenChange={(o) => !o && setAuthOpen(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                    {authOpen === 'verify' ? <ShieldCheck className="h-3.5 w-3.5" /> : authOpen === 'login' ? <LogIn className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </span>
                  {translate(lang, authOpen === 'verify' ? 'auth.verifyTitle' : authOpen === 'login' ? 'auth.welcome' : 'auth.createAccount')}
                </DialogTitle>
                <DialogDescription>
                  {translate(lang, authOpen === 'verify' ? 'auth.verifyDesc' : authOpen === 'login' ? 'auth.loginDesc' : 'auth.registerDesc')}
                </DialogDescription>
              </DialogHeader>
              {authOpen === 'verify' ? (
                <div className="space-y-3.5">
                  <div className="rounded-xl border p-3 text-center" style={{ borderColor: 'color-mix(in srgb, var(--brand) 45%, transparent)', background: 'color-mix(in srgb, var(--brand) 8%, white)' }}>
                    <p className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {translate(lang, 'auth.codeSentTo')} <span className="font-black">{verifyEmail}</span>
                    </p>
                    {verifyHint && (
                      <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 text-[11.5px] font-bold text-amber-700 dark:text-amber-400">
                        {translate(lang, 'auth.demoCode')} <span className="font-black tracking-[0.3em]">{verifyHint}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-code">{translate(lang, 'auth.verificationCode')}</Label>
                    <Input
                      id="auth-code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6}
                      className="text-center text-lg font-black tracking-[0.5em]"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && verifyCode.length >= 4 && handleAuth('verify')}
                    />
                  </div>
                  <Button
                    className="w-full font-black text-[var(--on-brand)]" disabled={authBusy || verifyCode.length < 4}
                    onClick={() => handleAuth('verify')}
                    style={{ background: 'var(--brand)' }}
                  >
                    {authBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {translate(lang, 'auth.verifyButton')}
                  </Button>
                  <div className="flex items-center justify-between text-[12px]">
                    <button
                      className="font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
                      disabled={authBusy}
                      onClick={async () => {
                        setAuthBusy(true)
                        try {
                          const d = await api.post<{ devCode?: string }>('/api/auth/resend', { email: verifyEmail })
                          setVerifyHint(d?.devCode ?? null)
                          toast({ title: translate(lang, 'auth.codeResent') })
                        } catch (e) {
                          toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
                        } finally { setAuthBusy(false) }
                      }}
                    >
                      {translate(lang, 'auth.resendCode')}
                    </button>
                    <button className="font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => setAuthOpen('login')}>
                      {translate(lang, 'auth.backToLogin')}
                    </button>
                  </div>
                </div>
              ) : (
              <>
              <div className="space-y-3.5">
                {authOpen === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-name">{translate(lang, 'auth.name')}</Label>
                    <Input
                      id="auth-name" placeholder="Jane Doe" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">{translate(lang, 'auth.email')}</Label>
                  <Input
                    id="auth-email" type="email" placeholder="you@company.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && authOpen && handleAuth(authOpen)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-pass">{translate(lang, 'auth.password')}</Label>
                  <Input
                    id="auth-pass" type="password" placeholder="••••••••" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && authOpen && handleAuth(authOpen)}
                  />
                </div>
                {authOpen === 'register' && (
                  <div className="space-y-1.5">
                    <Label>{translate(lang, 'auth.currency')}</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.code} — {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  className="w-full font-black text-[var(--on-brand)]" disabled={authBusy}
                  onClick={() => authOpen && handleAuth(authOpen)}
                  style={{ background: 'var(--brand)' }}
                >
                  {authBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {authOpen === 'login' ? translate(lang, 'auth.login') : translate(lang, 'auth.createAccount')}
                </Button>
                <p className="text-center text-[12px] text-zinc-500 dark:text-zinc-400">
                  {authOpen === 'login' ? translate(lang, 'auth.noAccount') : translate(lang, 'auth.haveAccount')}
                  <button
                    className="ml-1 font-black text-zinc-900 underline decoration-[var(--brand)] decoration-2 underline-offset-2 transition hover:decoration-4 dark:text-[var(--brand-2)]"
                    onClick={() => setAuthOpen(authOpen === 'login' ? 'register' : 'login')}
                  >
                    {authOpen === 'login' ? translate(lang, 'auth.register') : translate(lang, 'auth.login')}
                  </button>
                </p>
              </div>
              </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </AppContext.Provider>
    </I18nContext.Provider>
  )
}

// Re-export X to avoid unused import lint if dialog changes later
export { X as _CloseIcon }
