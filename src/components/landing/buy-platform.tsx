'use client'

// GrowthRush — "Buy Platform" rental wizard (also reachable from the client panel).
// Monthly or annual rental of a white-label platform: plan → identity + domain
// (free subdomain or custom domain) → add-ons (paid external API) → checkout.
// Fully localized (en/es/pt) — English default.

import { useMemo, useState } from 'react'
import {
  BadgeCheck, Check, CheckCircle2, ChevronLeft, Crown, Globe, Loader2, PartyPopper,
  Plug, Rocket, Server, Wallet,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, mutate, useApi } from '@/lib/api'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { formatMoney, type CurrencyInfo } from '@/lib/format'
import { themeVars } from '@/lib/themes'
import type { Lang } from '@/lib/i18n'

type Plan = {
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
  portalDesigns: string
  features: string
  popular: boolean
}

type Gateway = { id: string; name: string; type: string; feePercent: number }
type Cycle = 'monthly' | 'annual'

export default function BuyPlatform() {
  const { user, refresh, currencyOf, lang } = useApp()
  const { t } = useI18n()
  const { data: plansData } = useApi<{ plans: Plan[] }>('/api/plans')
  const { data: fundsData } = useApi<{ gateways: Gateway[] }>('/api/funds')

  const [step, setStep] = useState(1)
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [planId, setPlanId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [domainType, setDomainType] = useState<'SUBDOMAIN' | 'CUSTOM'>('SUBDOMAIN')
  const [slug, setSlug] = useState('')
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [customDomain, setCustomDomain] = useState('')
  const [externalApi, setExternalApi] = useState(false)
  const [buying, setBuying] = useState(false)
  const [done, setDone] = useState<{ slug: string; name: string } | null>(null)
  const [topupOpen, setTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState('100')
  const [topupGateway, setTopupGateway] = useState<string | null>(null)

  const plans = plansData?.plans ?? []
  const plan = plans.find((p) => p.id === planId) ?? null
  const currency: CurrencyInfo = currencyOf(user.currency)
  const money = (usd: number) => formatMoney(usd, currency, lang as Lang)
  const subdomainBase = 'growthrush.io'

  const totals = useMemo(() => {
    if (!plan) return null
    const domainFee = domainType === 'CUSTOM' ? plan.customDomainPrice : 0
    const addonFee = externalApi ? plan.externalApiPrice : 0
    const rental = cycle === 'annual'
      ? (plan.annualPrice ?? Math.round(plan.monthlyPrice * 10 * 100) / 100)
      : plan.monthlyPrice
    const total = Math.round((plan.setupPrice + domainFee + addonFee + rental) * 100) / 100
    const effectiveMonthly = cycle === 'annual'
      ? Math.round(((plan.annualPrice ?? plan.monthlyPrice * 10) / 12 + (externalApi ? plan.externalApiPrice : 0)) * 100) / 100
      : plan.monthlyPrice + (externalApi ? plan.externalApiPrice : 0)
    return { domainFee, addonFee, rental, total, effectiveMonthly }
  }, [plan, domainType, externalApi, cycle])

  const checkSlug = async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(clean)
    if (clean.length < 3) {
      setSlugState('idle')
      return
    }
    setSlugState('checking')
    try {
      const res = await api.get<{ available: boolean; reason?: string }>(`/api/platforms/check-slug?slug=${clean}`)
      setSlugState(res.available ? 'ok' : 'taken')
    } catch {
      setSlugState('idle')
    }
  }

  const purchase = async () => {
    if (!plan) return
    setBuying(true)
    try {
      const res = await api.post<{ platform: { slug: string; name: string } }>('/api/platforms/purchase', {
        planId: plan.id,
        name,
        cycle,
        domainType,
        subdomain: domainType === 'SUBDOMAIN' ? slug : undefined,
        customDomain: domainType === 'CUSTOM' ? customDomain : undefined,
        externalApi,
      })
      await refresh()
      setDone(res.platform)
      toast({ title: t('buy.toastLive') })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    } finally {
      setBuying(false)
    }
  }

  const topUp = async () => {
    const gateway = (fundsData?.gateways ?? []).find((g) => g.id === topupGateway) ?? fundsData?.gateways?.[0]
    if (!gateway) return
    const res = await mutate(
      () => api.post<{ balance: number }>('/api/funds', { amount: parseFloat(topupAmount), gatewayId: gateway.id }),
      { success: t('buy.toastTopup') }
    )
    if (res) {
      await refresh()
      setTopupOpen(false)
    }
  }

  // ── Success screen ──────────────────────
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={themeVars(user.platform?.theme ?? 'nova')}>
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-xl">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <PartyPopper className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{t('buy.successTitle')}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t('buy.successSub').replace('{name}', done.name)}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3">
            <Globe className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <code className="text-sm font-bold">
              {domainType === 'CUSTOM' ? customDomain : `${done.slug}.${subdomainBase}`}
            </code>
            <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">ACTIVE</Badge>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-400 dark:text-zinc-500">{t('buy.successLanding')}</p>
          <Button
            className="mt-6 w-full font-bold text-[var(--on-brand)]"
            style={{ background: 'var(--brand)' }}
            onClick={async () => {
              await refresh()
              window.dispatchEvent(new CustomEvent('gr:go', { detail: 'reseller' }))
            }}
          >
            {t('buy.openReseller')} <Rocket className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const steps = [t('buy.stepPlan'), t('buy.stepIdentity'), t('buy.stepAddons'), t('buy.stepLaunch')]

  return (
    <div className="min-h-screen" style={themeVars('rush')}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/80 px-4 backdrop-blur">
        <button className="flex items-center gap-2" onClick={() => window.dispatchEvent(new Event('gr:exit'))}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}><Rocket className="h-4 w-4 text-[var(--on-brand)]" /></span>
          <span className="font-extrabold tracking-tight">GrowthRush</span>
        </button>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden items-center gap-1.5 rounded-full border bg-white dark:bg-zinc-900 px-3 py-1 font-bold sm:flex">
            <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> {money(user.balance)}
          </span>
          <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event('gr:exit'))}>
            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> {t('buy.site')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="text-center">
          <Badge className="mb-3 rounded-full px-3 py-1 text-[12px] font-bold border-0" style={{ background: 'color-mix(in srgb, var(--brand) 14%, transparent)', color: 'var(--brand)' }}>
            <Crown className="mr-1 h-3 w-3" /> {t('buy.badge')}
          </Badge>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('buy.title')}</h1>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-zinc-500 dark:text-zinc-400">{t('buy.subtitle')}</p>
        </div>

        {/* Steps indicator */}
        <div className="mx-auto mt-8 flex max-w-md items-center">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold transition ${
                    step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'text-[var(--on-brand)]' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                  style={step === i + 1 ? { background: 'var(--brand)' } : undefined}
                >
                  {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`hidden text-[11px] font-bold sm:block ${step === i + 1 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}>{label}</span>
              </div>
              {i < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded ${step > i + 1 ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Plan + billing cycle */}
        {step === 1 && (
          <div className="mx-auto mt-8 max-w-3xl">
            {/* Cycle toggle */}
            <div className="mx-auto flex w-fit items-center rounded-full border bg-zinc-50 dark:bg-zinc-900 p-1">
              {(['monthly', 'annual'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-extrabold transition ${
                    cycle === c ? 'text-[var(--on-brand)] shadow-sm' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                  style={cycle === c ? { background: 'var(--brand)' } : undefined}
                >
                  {c === 'annual' && <BadgeCheck className="h-3.5 w-3.5" />}
                  {c === 'monthly' ? t('buy.cycleMonthly') : t('buy.cycleAnnual')}
                  {c === 'annual' && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${cycle === 'annual' ? 'bg-zinc-950/10' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'}`}>
                      {t('buy.cycleSave')}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {plans.map((p) => {
                const selected = planId === p.id
                const feats: string[] = JSON.parse(p.features || '[]')
                const price = cycle === 'annual'
                  ? (p.annualPrice ?? Math.round(p.monthlyPrice * 10 * 100) / 100)
                  : p.monthlyPrice
                const effMonthly = cycle === 'annual' ? Math.round(((p.annualPrice ?? p.monthlyPrice * 10) / 12) * 100) / 100 : null
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPlanId(p.id)
                      setStep(2)
                    }}
                    className={`relative rounded-2xl border-2 bg-white dark:bg-zinc-900 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                      selected ? 'shadow-lg' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                    style={selected ? { borderColor: 'var(--brand)' } : undefined}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                        {t('buy.mostPopular')}
                      </span>
                    )}
                    <p className="text-sm font-extrabold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{p.name}</p>
                    <p className="mt-1 text-3xl font-black">
                      {money(price)}
                      <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{cycle === 'annual' ? t('buy.perYear') : t('buy.perMonth')}</span>
                    </p>
                    {effMonthly !== null && (
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        ≈ {money(effMonthly)}{t('buy.perMonth')} · {t('buy.billedAnnually')}
                      </p>
                    )}
                    <p className="mt-1 min-h-10 text-[12px] text-zinc-500 dark:text-zinc-400">{p.description}</p>
                    <ul className="mt-3 space-y-1.5">
                      {feats.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-center text-[12px] text-zinc-400 dark:text-zinc-500">{t('buy.rentNote')}</p>
          </div>
        )}

        {/* STEP 2 — Identity + domain */}
        {step === 2 && (
          <div className="mx-auto mt-10 max-w-xl space-y-5">
            <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
              <Label className="text-[13px] font-bold">{t('buy.name')}</Label>
              <Input className="mt-1.5" placeholder="e.g. Nova Boost Social" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{t('buy.nameHint')}</p>
            </div>

            <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
              <p className="text-[13px] font-bold">{t('buy.address')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setDomainType('SUBDOMAIN')}
                  className={`rounded-xl border-2 p-4 text-left transition ${domainType === 'SUBDOMAIN' ? '' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  style={domainType === 'SUBDOMAIN' ? { borderColor: 'var(--brand)', background: 'color-mix(in srgb, var(--brand) 6%, transparent)' } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <Server className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">FREE</Badge>
                  </div>
                  <p className="mt-2 text-sm font-extrabold">{t('buy.subFree')}</p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400">yourbrand.{subdomainBase}</p>
                </button>
                <button
                  onClick={() => setDomainType('CUSTOM')}
                  className={`rounded-xl border-2 p-4 text-left transition ${domainType === 'CUSTOM' ? '' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  style={domainType === 'CUSTOM' ? { borderColor: 'var(--brand)', background: 'color-mix(in srgb, var(--brand) 6%, transparent)' } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <Globe className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">+{money(plan?.customDomainPrice ?? 15)}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-extrabold">{t('buy.customDomain')}</p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400">yourbrand.com — {t('buy.customDesc')}</p>
                </button>
              </div>

              {domainType === 'SUBDOMAIN' ? (
                <div className="mt-4">
                  <Label className="text-[12px] font-bold">{t('buy.pickSub')}</Label>
                  <div className="mt-1.5 flex items-center gap-0">
                    <Input
                      placeholder="yourbrand" value={slug}
                      onChange={(e) => checkSlug(e.target.value)}
                      className="rounded-r-none"
                    />
                    <span className="flex h-9 items-center rounded-r-md border border-l-0 border-input bg-zinc-50 dark:bg-zinc-900/60 px-3 text-sm text-zinc-500 dark:text-zinc-400">
                      .{subdomainBase}
                    </span>
                  </div>
                  {slugState === 'checking' && <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{t('buy.checking')}</p>}
                  {slugState === 'ok' && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> {slug}.{subdomainBase} — {t('buy.available')}
                    </p>
                  )}
                  {slugState === 'taken' && <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">{t('buy.taken')}</p>}
                </div>
              ) : (
                <div className="mt-4">
                  <Label className="text-[12px] font-bold">{t('buy.yourDomain')}</Label>
                  <Input className="mt-1.5" placeholder="yourbrand.com" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
                  <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{t('buy.dnsHint')}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-1 h-4 w-4" /> {t('buy.back')}</Button>
              <Button
                disabled={!name.trim() || (domainType === 'SUBDOMAIN' ? slugState !== 'ok' : customDomain.length < 4)}
                onClick={() => setStep(3)}
                style={{ background: 'var(--brand)', color: '#15180a' }}
              >
                {t('buy.continue')}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Add-ons */}
        {step === 3 && (
          <div className="mx-auto mt-10 max-w-xl space-y-5">
            <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                    <Plug className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">{t('buy.addonTitle')}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">{t('buy.addonDesc')}</p>
                    <Badge className="mt-2 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400">+{money(plan?.externalApiPrice ?? 25)}{t('buy.perMonth')}</Badge>
                  </div>
                </div>
                <Switch checked={externalApi} onCheckedChange={setExternalApi} />
              </div>
            </div>
            <div className="rounded-2xl border border-dashed bg-white dark:bg-zinc-900 p-5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              <p className="font-bold text-zinc-700 dark:text-zinc-200">{t('buy.includedTitle')}</p>
              <p className="mt-1">{t('buy.included')}</p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="mr-1 h-4 w-4" /> {t('buy.back')}</Button>
              <Button onClick={() => setStep(4)} style={{ background: 'var(--brand)', color: '#15180a' }}>{t('buy.review')}</Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Summary */}
        {step === 4 && totals && plan && (
          <div className="mx-auto mt-10 max-w-md">
            <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
              <p className="text-lg font-extrabold">{t('buy.summary')}</p>
              <div className="mt-4 space-y-2.5 text-sm">
                <Row label={t('buy.rowSetup').replace('{plan}', plan.name)} value={money(plan.setupPrice)} />
                <Row
                  label={domainType === 'CUSTOM' ? t('buy.rowCustomDomain').replace('{x}', customDomain || '—') : `${t('buy.rowSubdomain')} ${slug || '—'}.${subdomainBase}`}
                  value={totals.domainFee ? money(totals.domainFee) : 'FREE'}
                />
                <Row label={`${cycle === 'annual' ? t('buy.rowRentalAnnual') : t('buy.rowRentalMonthly')} — ${plan.name}`} value={money(totals.rental)} />
                <Row label={t('buy.rowApi')} value={totals.addonFee ? money(totals.addonFee) : '—'} />
                <div className="border-t pt-2.5">
                  <Row label={t('buy.dueToday')} value={money(totals.total)} bold />
                  <Row label={cycle === 'annual' ? t('buy.effectiveMonthly') : t('buy.thenMonthly')} value={`${money(totals.effectiveMonthly)}${t('buy.perMonth')}`} muted />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3">
                <span className="flex items-center gap-1.5 text-[13px] font-bold"><Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> {t('buy.wallet')}</span>
                <span className="text-[13px] font-extrabold">{money(user.balance)}</span>
              </div>
              {user.balance < totals.total && (
                <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-[12px] text-amber-800 dark:text-amber-300">
                  <p className="font-bold">{t('buy.insufficient')}</p>
                  <p className="mt-0.5">{t('buy.needMore').replace('{x}', money(totals.total - user.balance))}</p>
                  <Button size="sm" className="mt-2 font-bold text-[var(--on-brand)]" onClick={() => setTopupOpen(true)} style={{ background: 'var(--brand)' }}>
                    {t('buy.addFunds')}
                  </Button>
                </div>
              )}
              <Button
                className="mt-4 w-full font-bold text-zinc-950"
                disabled={buying || user.balance < totals.total}
                onClick={purchase}
                style={{ background: 'var(--brand)' }}
              >
                {buying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                {t('buy.payLaunch').replace('{x}', money(totals.total))}
              </Button>
              <button className="mt-3 w-full text-center text-[12px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300" onClick={() => setStep(3)}>
                <ChevronLeft className="mr-1 inline h-3 w-3" /> {t('buy.backAddons')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Top-up dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('buy.topup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {[50, 100, 250, 500].map((a) => (
                <Button
                  key={a} variant="outline" size="sm"
                  className={`flex-1 font-bold ${topupAmount === String(a) ? 'border-current' : ''}`}
                  style={topupAmount === String(a) ? { color: 'var(--brand)' } : undefined}
                  onClick={() => setTopupAmount(String(a))}
                >
                  ${a}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>{t('buy.amountUsd')}</Label>
              <Input type="number" min={5} value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('buy.method')}</Label>
              <div className="grid gap-2">
                {(fundsData?.gateways ?? []).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setTopupGateway(g.id)}
                    className={`flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${
                      (topupGateway ?? fundsData?.gateways?.[0]?.id) === g.id ? '' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                    style={(topupGateway ?? fundsData?.gateways?.[0]?.id) === g.id ? { borderColor: 'var(--brand)', background: 'color-mix(in srgb, var(--brand) 6%, transparent)' } : undefined}
                  >
                    {g.name}
                    {g.feePercent > 0 && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">+{g.feePercent}% fee</span>}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full font-bold text-[var(--on-brand)]" onClick={topUp} style={{ background: 'var(--brand)' }}>
              <Wallet className="mr-2 h-4 w-4" /> {t('buy.deposit').replace('{x}', money(parseFloat(topupAmount) || 0))}
            </Button>
            <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">{t('buy.sandbox')}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-300'}>{label}</span>
      <span className={`${bold ? 'text-base font-black' : 'font-semibold'} ${muted ? 'text-zinc-400 dark:text-zinc-500' : ''}`}>{value}</span>
    </div>
  )
}
