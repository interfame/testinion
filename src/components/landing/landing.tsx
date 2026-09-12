'use client'

// GrowthRush — public marketing homepage (RedFamosa-style codecanyon sales page)

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Bot, Check, Code2, CreditCard, Database, Globe, Inbox, Languages,
  Layers, LayoutTemplate, Menu, MessagesSquare, Palette, Plug, Rocket,
  ShieldCheck, ShoppingCart, Sparkles, Store, Users, Wallet, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { useI18n, type DictKey, type Lang } from '@/lib/i18n'
import { useApi } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { themeVars } from '@/lib/themes'
import { SOCIAL_ICONS } from '@/lib/social'
import { SocialLogo } from '@/components/shared/social-logo'
import { CouponBanner } from '@/components/shared/coupon-banner'
import { CurrencyChip, LanguageChip } from '@/components/shared/chips'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  AdminCommandMock, ClientPortalMock, InboxMock, PanelDashboardMock,
  StorefrontMock, ThemeSwatches,
} from './landing-mocks'
import { DemoDialog } from './demo-dialog'

/* ------------------------------- landing copy ------------------------------ */

type LandingCopy = {
  badge?: string
  heroTitle1?: string
  heroTitle2?: string
  heroTitle3?: string
  heroSub?: string
  ctaPrimary?: string
  ctaSecondary?: string
  statsOrders?: string
  statsResellers?: string
  statsServices?: string
  statsUptime?: string
  // Landing Studio — section-by-section overrides (all optional)
  stepsTitle?: string
  steps?: { n?: string; title?: string; desc?: string }[]
  featuresEyebrow?: string
  featuresTitle?: string
  featuresSub?: string
  pricingEyebrow?: string
  pricingTitle?: string
  pricingSub?: string
  faqEyebrow?: string
  faqTitle?: string
  faqSub?: string
  ctaTitle?: string
  ctaSub?: string
  ctaButton?: string
}

// Language-neutral stat values (labels come from the dict); admin copy can override
const DEFAULT_STATS = {
  statsOrders: '12.4M+',
  statsResellers: '3,800+',
  statsServices: '18,500+',
  statsUptime: '99.9%',
}

function parseCopy(json?: string | null): LandingCopy {
  if (!json) return {}
  try {
    return JSON.parse(json) as LandingCopy
  } catch {
    return {}
  }
}

/* ------------------------------ static content ----------------------------- */

const FEATURES: { icon: LucideIcon; titleKey: DictKey; descKey: DictKey }[] = [
  { icon: Database, titleKey: 'landing.feat.providers.title', descKey: 'landing.feat.providers.desc' },
  { icon: Layers, titleKey: 'landing.feat.catalogue.title', descKey: 'landing.feat.catalogue.desc' },
  { icon: ShoppingCart, titleKey: 'landing.feat.orders.title', descKey: 'landing.feat.orders.desc' },
  { icon: Wallet, titleKey: 'landing.feat.wallet.title', descKey: 'landing.feat.wallet.desc' },
  { icon: CreditCard, titleKey: 'landing.feat.gateways.title', descKey: 'landing.feat.gateways.desc' },
  { icon: Code2, titleKey: 'landing.feat.api.title', descKey: 'landing.feat.api.desc' },
  { icon: Inbox, titleKey: 'landing.feat.inbox.title', descKey: 'landing.feat.inbox.desc' },
  { icon: Bot, titleKey: 'landing.feat.agents.title', descKey: 'landing.feat.agents.desc' },
  { icon: Zap, titleKey: 'landing.feat.flows.title', descKey: 'landing.feat.flows.desc' },
  { icon: Store, titleKey: 'landing.feat.panels.title', descKey: 'landing.feat.panels.desc' },
  { icon: Globe, titleKey: 'landing.feat.domains.title', descKey: 'landing.feat.domains.desc' },
  { icon: LayoutTemplate, titleKey: 'landing.feat.builder.title', descKey: 'landing.feat.builder.desc' },
  { icon: Palette, titleKey: 'landing.feat.designs.title', descKey: 'landing.feat.designs.desc' },
  { icon: Languages, titleKey: 'landing.feat.languages.title', descKey: 'landing.feat.languages.desc' },
  { icon: Users, titleKey: 'landing.feat.roles.title', descKey: 'landing.feat.roles.desc' },
  { icon: ShieldCheck, titleKey: 'landing.feat.security.title', descKey: 'landing.feat.security.desc' },
]

const SHOWCASE_ROWS: {
  id: string
  align: 'left' | 'right'
  mock: React.ReactNode
  eyebrowKey: DictKey
  bulletKeys: [DictKey, DictKey, DictKey]
}[] = [
  {
    id: 'admin',
    align: 'left',
    mock: <AdminCommandMock />,
    eyebrowKey: 'landing.sc.admin.eyebrow',
    bulletKeys: ['landing.sc.admin.b1', 'landing.sc.admin.b2', 'landing.sc.admin.b3'],
  },
  {
    id: 'client',
    align: 'right',
    mock: <ClientPortalMock />,
    eyebrowKey: 'landing.sc.client.eyebrow',
    bulletKeys: ['landing.sc.client.b1', 'landing.sc.client.b2', 'landing.sc.client.b3'],
  },
  {
    id: 'inbox',
    align: 'left',
    mock: <InboxMock />,
    eyebrowKey: 'landing.sc.inbox.eyebrow',
    bulletKeys: ['landing.sc.inbox.b1', 'landing.sc.inbox.b2', 'landing.sc.inbox.b3'],
  },
  {
    id: 'reseller',
    align: 'right',
    mock: <StorefrontMock />,
    eyebrowKey: 'landing.sc.reseller.eyebrow',
    bulletKeys: ['landing.sc.reseller.b1', 'landing.sc.reseller.b2', 'landing.sc.reseller.b3'],
  },
]

const BUSINESSES: { icon: LucideIcon; titleKey: DictKey; descKey: DictKey }[] = [
  {
    icon: Rocket,
    titleKey: 'landing.biz.1.title',
    descKey: 'landing.biz.1.desc',
  },
  {
    icon: Store,
    titleKey: 'landing.biz.2.title',
    descKey: 'landing.biz.2.desc',
  },
  {
    icon: MessagesSquare,
    titleKey: 'landing.biz.3.title',
    descKey: 'landing.biz.3.desc',
  },
]

const PLANS: {
  name: string
  price: number
  popular: boolean
  descKey: DictKey
  featureKeys: DictKey[]
}[] = [
  {
    name: 'Starter',
    price: 29,
    popular: false,
    descKey: 'landing.plan.starter.desc',
    featureKeys: ['landing.plan.starter.f1', 'landing.plan.starter.f2', 'landing.plan.starter.f3', 'landing.plan.starter.f4', 'landing.plan.starter.f5', 'landing.plan.starter.f6'],
  },
  {
    name: 'Pro',
    price: 59,
    popular: true,
    descKey: 'landing.plan.pro.desc',
    featureKeys: ['landing.plan.pro.f1', 'landing.plan.pro.f2', 'landing.plan.pro.f3', 'landing.plan.pro.f4', 'landing.plan.pro.f5', 'landing.plan.pro.f6'],
  },
  {
    name: 'Agency',
    price: 119,
    popular: false,
    descKey: 'landing.plan.agency.desc',
    featureKeys: ['landing.plan.agency.f1', 'landing.plan.agency.f2', 'landing.plan.agency.f3', 'landing.plan.agency.f4', 'landing.plan.agency.f5', 'landing.plan.agency.f6'],
  },
]

const STEPS: { n: string; titleKey: DictKey; descKey: DictKey }[] = [
  { n: '01', titleKey: 'landing.step.1.title', descKey: 'landing.step.1.desc' },
  { n: '02', titleKey: 'landing.step.2.title', descKey: 'landing.step.2.desc' },
  { n: '03', titleKey: 'landing.step.3.title', descKey: 'landing.step.3.desc' },
]

const FAQS: { qKey: DictKey; aKey: DictKey }[] = [
  { qKey: 'landing.faq.1.q', aKey: 'landing.faq.1.a' },
  { qKey: 'landing.faq.2.q', aKey: 'landing.faq.2.a' },
  { qKey: 'landing.faq.3.q', aKey: 'landing.faq.3.a' },
  { qKey: 'landing.faq.4.q', aKey: 'landing.faq.4.a' },
  { qKey: 'landing.faq.5.q', aKey: 'landing.faq.5.a' },
  { qKey: 'landing.faq.6.q', aKey: 'landing.faq.6.a' },
]

const FOOTER_SOCIAL = ['instagram', 'x', 'telegram', 'youtube', 'tiktok', 'whatsapp']

/* --------------------------------- motion ---------------------------------- */

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------ section header ----------------------------- */

function SectionHead({ eyebrow, title, sub, dark = false }: { eyebrow?: string; title: string; sub?: string; dark?: boolean }) {
  return (
    <FadeUp className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      {eyebrow && (
        <p className={`mb-3 text-[11px] font-black uppercase tracking-[0.22em] sm:text-xs ${dark ? 'text-[var(--brand-2)]' : 'text-[var(--brand)]'}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`font-black tracking-tight text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] ${dark ? 'text-white' : 'text-zinc-900 dark:text-zinc-50'}`}>
        {title}
      </h2>
      {sub && (
        <p className={`mx-auto mt-4 max-w-2xl text-base sm:text-lg ${dark ? 'text-white/60' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {sub}
        </p>
      )}
    </FadeUp>
  )
}

/* ------------------------------ check bullets ------------------------------ */

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 flex shrink-0 items-center justify-center rounded-full text-[var(--on-brand)]"
        style={{ background: 'var(--brand)', width: 18, height: 18 }}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
      </span>
      <span className="text-sm font-medium sm:text-[15px] text-zinc-600 dark:text-zinc-300">{children}</span>
    </li>
  )
}

/* ================================ COMPONENT ================================ */

export default function Landing() {
  const app = useApp()
  const { t, setLang } = useI18n()
  // Live FAQs from DB (admin-editable) with static fallback + public coupon for the promo ticket
  const { data: pubFaq } = useApi<{ faqs: { id: string; question: string; answer: string }[]; publicCoupon?: { code: string; value: number } | null }>('/api/settings/public')
  const FAQ_LIST = (pubFaq?.faqs?.length ? pubFaq.faqs.map((f) => ({ q: f.question, a: f.answer })) : FAQS.map((f) => ({ q: t(f.qKey), a: t(f.aKey) })))
  const [menuOpen, setMenuOpen] = useState(false)

  const ps = app.publicSettings
  const brand = ps?.brand_name || 'GrowthRush'
  const tagline = ps?.brand_tagline || t('brand.tagline')
  const subBase = ps?.subdomain_base || 'growthrush.io'

  const copy = useMemo<LandingCopy>(() => ({
    badge: t('landing.badge'),
    heroTitle1: t('landing.hero.title1'),
    heroTitle2: t('landing.hero.title2'),
    heroTitle3: t('landing.hero.title3'),
    heroSub: t('landing.hero.sub'),
    ctaPrimary: t('landing.cta.primary'),
    ctaSecondary: t('landing.cta.secondary'),
    featuresEyebrow: t('landing.nav.features'),
    featuresTitle: t('landing.features.title'),
    featuresSub: t('landing.features.sub'),
    stepsTitle: t('landing.how.title'),
    pricingEyebrow: t('landing.nav.pricing'),
    pricingTitle: t('landing.pricing.title'),
    pricingSub: t('landing.pricing.sub'),
    faqEyebrow: 'FAQ',
    faqTitle: t('landing.faqTitle'),
    ctaSub: t('landing.cta.finalSub'),
    ctaButton: t('landing.cta.buy'),
    ...DEFAULT_STATS,
    ...parseCopy(ps?.landing_copy),
  }), [ps?.landing_copy, t])

  // Steps with optional per-index overrides from the Landing Studio (fallback to i18n defaults)
  const stepsRendered = useMemo(() => STEPS.map((st, i) => {
    const o = copy.steps?.[i]
    return {
      n: o?.n?.trim() || st.n,
      title: o?.title?.trim() || t(st.titleKey),
      desc: o?.desc?.trim() || t(st.descKey),
    }
  }), [copy.steps, t])

  const loggedIn = !!app.user?.id
  const [demoOpen, setDemoOpen] = useState(false)

  function openMyPanel() {
    const role = app.user?.role
    if (role === 'SUPER_ADMIN') app.setView('admin')
    else if (role === 'RESELLER') app.setView('reseller')
    else app.setView('client')
  }

  function goAuth(detail: 'login' | 'register') {
    window.dispatchEvent(new CustomEvent('gr:auth', { detail }))
  }

  const heroStats = [
    { value: copy.statsOrders, label: t('landing.stats.orders') },
    { value: copy.statsResellers, label: t('landing.stats.resellers') },
    { value: copy.statsServices, label: t('landing.stats.services') },
    { value: copy.statsUptime, label: t('landing.stats.uptime') },
  ]

  const navLinks = [
    { href: '#features', label: t('landing.nav.features') },
    { href: '#showcase', label: t('landing.nav.showcase') },
    { href: '#pricing', label: t('landing.nav.pricing') },
    { href: '#faq', label: 'FAQ' },
  ]

  const marqueeItems = Object.entries(SOCIAL_ICONS)

  const year = new Date().getFullYear()

  /* ------------------------------ shared bits ------------------------------ */

  const logoMark = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--on-brand)] shadow-[0_6px_20px_-4px_var(--brand-glow)]" style={{ background: 'var(--brand)' }}>
      <Rocket className="h-[18px] w-[18px]" />
    </span>
  )

  const authButtons = loggedIn ? (
    <Button
      onClick={openMyPanel}
      className="h-9 rounded-full px-4 text-[13px] font-black text-[var(--on-brand)] transition-transform hover:scale-[1.03]"
      style={{ background: 'var(--brand)' }}
    >
      <Zap className="mr-1.5 h-3.5 w-3.5" /> {t('landing.openPanel')}
    </Button>
  ) : (
    <>
      <Button
        variant="ghost"
        onClick={() => goAuth('login')}
        className="h-9 rounded-full px-4 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900/5"
      >
        {t('auth.login')}
      </Button>
      <Button
        onClick={() => goAuth('register')}
        className="h-9 rounded-full px-4 text-[13px] font-black text-[var(--on-brand)] transition-transform hover:scale-[1.03]"
        style={{ background: 'var(--brand)', boxShadow: '0 8px 24px -8px var(--brand-glow)' }}
      >
        {t('auth.register')}
      </Button>
    </>
  )

  return (
    <div style={themeVars(ps?.landing_theme)} className="bg-[#fbf7f4] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <style dangerouslySetInnerHTML={{
        __html: `
          html { scroll-behavior: smooth; }
          @keyframes gr-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .gr-marquee-track { animation: gr-marquee 48s linear infinite; }
          .gr-marquee:hover .gr-marquee-track { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) { .gr-marquee-track { animation: none; } }
        `,
      }} />

      {/* ============================== HEADER ============================== */}
      <header className="sticky top-0 z-50 border-b border-zinc-900/[0.06] bg-[#fbf7f4]/85 dark:border-zinc-800/70 dark:bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5" aria-label={t('landing.a11y.home').replace('{brand}', brand)}>
            {logoMark}
            <span className="text-lg font-black tracking-tight">{brand}</span>
          </a>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label={t('landing.a11y.nav')}>
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-bold text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <LanguageChip />
              <CurrencyChip />
            </div>
            <ThemeToggle className="h-9 w-9 rounded-full" />
            <div className="hidden items-center gap-2 md:flex">{authButtons}</div>
            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full lg:hidden" aria-label={t('landing.a11y.openMenu')}>
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2.5">
                    {logoMark}
                    <span className="text-lg font-black tracking-tight">{brand}</span>
                  </SheetTitle>
                  <SheetDescription className="sr-only">{t('landing.a11y.menu')}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-1 px-4">
                  {navLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-[15px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900/5"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2.5 border-t border-zinc-100 dark:border-zinc-800/70 px-4 pt-4">
                  <div className="flex gap-2">
                    <LanguageChip />
                    <CurrencyChip />
                    <ThemeToggle className="h-9 w-9 rounded-full" />
                  </div>
                  {loggedIn ? (
                    <Button onClick={() => { setMenuOpen(false); openMyPanel() }} className="h-11 rounded-full text-sm font-black text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                      {t('landing.openPanel')}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { setMenuOpen(false); goAuth('login') }} className="h-11 rounded-full text-sm font-bold">
                        {t('auth.login')}
                      </Button>
                      <Button onClick={() => { setMenuOpen(false); goAuth('register') }} className="h-11 rounded-full text-sm font-black text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                        {t('auth.register')}
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="top">
        {/* =============================== HERO =============================== */}
        <section className="relative overflow-hidden bg-[var(--brand-dark)] text-white">
          {/* grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
            aria-hidden
          />
          {/* radial glow */}
          <div
            className="absolute -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }}
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
            <div>
              <FadeUp>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                  <span style={{ color: 'var(--brand-2)' }}>✦</span> {copy.badge}
                </span>
              </FadeUp>
              <FadeUp delay={0.08}>
                <h1 className="mt-6 font-black tracking-tight text-4xl leading-[1.05] sm:text-5xl lg:text-7xl">
                  {copy.heroTitle1}
                  <br />
                  <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)] bg-clip-text text-transparent">
                    {copy.heroTitle2}
                  </span>
                  <br />
                  {copy.heroTitle3}
                </h1>
              </FadeUp>
              <FadeUp delay={0.16}>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
                  {copy.heroSub}
                </p>
              </FadeUp>
              <FadeUp delay={0.24}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {loggedIn ? (
                    <Button
                      onClick={openMyPanel}
                      className="h-12 rounded-full px-7 text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.04]"
                      style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
                    >
                      <Zap className="mr-2 h-4 w-4" /> {t('landing.openPanel')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => goAuth('register')}
                      className="h-12 rounded-full px-7 text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.04]"
                      style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
                    >
                      {copy.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
                  >
                    {copy.ctaSecondary}
                  </button>
                </div>
              </FadeUp>
              <FadeUp delay={0.32}>
                <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
                  {heroStats.map((s) => (
                    <div key={s.label} className="flex flex-col bg-[var(--brand-dark)] px-4 py-4 sm:px-5">
                      <dd className="order-1 text-2xl font-black tracking-tight tabular-nums sm:text-3xl" style={{ color: 'var(--brand-2)' }}>
                        {s.value}
                      </dd>
                      <dt className="order-2 mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45 sm:text-[11px]">
                        {s.label}
                      </dt>
                    </div>
                  ))}
                </dl>
              </FadeUp>
            </div>

            {/* Hero mock — floating browser frame, click to open the tour */}
            <FadeUp delay={0.2} className="relative">
              <div
                className="absolute -inset-8 rounded-[2rem] opacity-60 blur-2xl"
                style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }}
                aria-hidden
              />
              <motion.div
                className="relative cursor-pointer"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                onClick={() => setDemoOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDemoOpen(true) }}
                aria-label={t('landing.a11y.tour')}
              >
                <PanelDashboardMock />
              </motion.div>
            </FadeUp>
          </div>
        </section>

        {/* =========================== PROMO COUPON TICKET ========================= */}
        {pubFaq?.publicCoupon && (
          <div className="relative z-10 flex justify-center px-4 pb-3 pt-4" aria-label={t('landing.a11y.promo')}>
            <CouponBanner
              code={pubFaq.publicCoupon.code}
              value={pubFaq.publicCoupon.value}
              moneyLabel={formatMoney(pubFaq.publicCoupon.value, app.currencyOf(app.user.currency || 'USD'), app.lang as Lang)}
            />
          </div>
        )}

        {/* =========================== BRANDS MARQUEE ========================= */}
        <section className="border-b border-zinc-900/[0.06] py-12 sm:py-16" aria-label={t('landing.a11y.platforms')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeUp className="mb-8 text-center">
              <h2 className="mx-auto max-w-2xl font-black tracking-tight text-2xl text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {t('landing.networksTitle')}
              </h2>
            </FadeUp>
          </div>
          <div className="gr-marquee relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#fbf7f4] to-transparent sm:w-28" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#fbf7f4] to-transparent sm:w-28" />
            <div className="gr-marquee-track flex w-max items-center">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex items-center gap-3 pr-3" aria-hidden={dup === 1}>
                  {marqueeItems.map(([key, meta]) => (
                    <span
                      key={`${dup}-${key}`}
                      className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-200/80 bg-white dark:bg-zinc-900 px-4 py-2 shadow-sm"
                    >
                      <SocialLogo icon={key} size={17} />
                      <span className="whitespace-nowrap text-[13px] font-bold text-zinc-700 dark:text-zinc-200">{meta.label}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ FEATURES ============================= */}
        <section id="features" className="scroll-mt-20 py-16 sm:py-24" aria-label={t('landing.nav.features')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={copy.featuresEyebrow} title={copy.featuresTitle ?? ''} sub={copy.featuresSub} />
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <FadeUp key={f.titleKey} delay={(i % 4) * 0.06}>
                  <div className="group relative h-full rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_16px_44px_-16px_var(--brand-glow)]">
                    {i === 0 && (
                      <span className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                        {t('landing.newBadge')}
                      </span>
                    )}
                    <span
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand)' }}
                    >
                      <f.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{t(f.titleKey)}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{t(f.descKey)}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ============================= SHOWCASE ============================= */}
        <section id="showcase" className="scroll-mt-20 py-16 sm:py-24" aria-label={t('landing.nav.showcase')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={t('landing.nav.showcase')} title={t('landing.showcase.title')} />
            <div className="space-y-16 sm:space-y-24">
              {SHOWCASE_ROWS.map((row, i) => {
                const titles: Record<string, { title: string; sub: string }> = {
                  admin: { title: t('landing.showcase.admin'), sub: t('landing.showcase.adminSub') },
                  client: { title: t('landing.showcase.client'), sub: t('landing.showcase.clientSub') },
                  inbox: { title: t('landing.showcase.inbox'), sub: t('landing.showcase.inboxSub') },
                  reseller: { title: t('landing.showcase.reseller'), sub: t('landing.showcase.resellerSub') },
                }
                const text = (
                  <FadeUp className="lg:w-[44%]">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--brand)] sm:text-xs">{t(row.eyebrowKey)}</p>
                    <h3 className="font-black tracking-tight text-2xl text-zinc-900 dark:text-zinc-50 sm:text-3xl lg:text-4xl">{titles[row.id].title}</h3>
                    <p className="mt-4 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">{titles[row.id].sub}</p>
                    <ul className="mt-6 space-y-3">
                      {row.bulletKeys.map((bk) => <CheckItem key={bk}>{t(bk)}</CheckItem>)}
                    </ul>
                    {row.id === 'reseller' && (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('gr:storefront', { detail: 'kayasocial' }))}
                        className="group mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-[12px] font-extrabold text-zinc-700 dark:text-zinc-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[9px] font-black text-white">K</span>
                        {t('landing.sc.browse').replace('{domain}', 'kayasocial.growthrush.io')}
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </button>
                    )}
                  </FadeUp>
                )
                const mock = (
                  <FadeUp delay={0.1} className="lg:w-[56%]">
                    <div className="relative">
                      <div
                        className="absolute -inset-6 rounded-[2rem] opacity-50 blur-2xl"
                        style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }}
                        aria-hidden
                      />
                      <div className="relative">{row.mock}</div>
                    </div>
                  </FadeUp>
                )
                return (
                  <div key={row.id} className="flex flex-col items-center gap-8 lg:flex-row lg:gap-14">
                    {row.align === 'left' ? <>{mock}{text}</> : <>{text}{mock}</>}
                  </div>
                )
              })}

              {/* 3 portal designs */}
              <div>
                <FadeUp className="mx-auto mb-10 max-w-2xl text-center">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--brand)] sm:text-xs">{t('landing.sc.portals')}</p>
                  <h3 className="font-black tracking-tight text-2xl text-zinc-900 dark:text-zinc-50 sm:text-3xl lg:text-4xl">{t('landing.showcase.themes')}</h3>
                  <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">{t('landing.showcase.themesSub')}</p>
                </FadeUp>
                <FadeUp delay={0.1}>
                  <ThemeSwatches />
                </FadeUp>
              </div>
            </div>
          </div>
        </section>

        {/* ====================== THREE BUSINESSES BAND ======================= */}
        <section className="bg-[var(--brand-dark)] py-16 text-white sm:py-20" aria-label={t('landing.a11y.businesses')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={t('landing.badge')} title={t('landing.biz.title')} dark />
            <div className="grid gap-4 md:grid-cols-3">
              {BUSINESSES.map((b, i) => (
                <FadeUp key={b.titleKey} delay={i * 0.08}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-300 hover:border-[var(--brand)]/60 hover:bg-white/[0.07]">
                    <span
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--brand) 22%, transparent)', color: 'var(--brand-2)' }}
                    >
                      <b.icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-extrabold tracking-tight">{t(b.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{t(b.descKey)}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ============================== PRICING ============================= */}
        <section id="pricing" className="scroll-mt-20 py-16 sm:py-24" aria-label={t('landing.nav.pricing')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={copy.pricingEyebrow} title={copy.pricingTitle ?? ''} sub={copy.pricingSub} />
            <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
              {PLANS.map((plan, i) => (
                <FadeUp key={plan.name} delay={i * 0.08} className="h-full">
                  <div
                    className={`relative flex h-full flex-col rounded-3xl border bg-white dark:bg-zinc-900 p-7 sm:p-8 ${
                      plan.popular
                        ? 'z-10 border-[var(--brand)] shadow-[0_24px_70px_-24px_var(--brand-glow)] lg:scale-[1.04]'
                        : 'border-zinc-200/80 shadow-sm'
                    }`}
                  >
                    {plan.popular && (
                      <span
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-black tracking-[0.18em] text-[var(--on-brand)] shadow-lg"
                        style={{ background: 'var(--brand)', boxShadow: '0 8px 24px -6px var(--brand-glow)' }}
                      >
                        {t('landing.pricing.popular')}
                      </span>
                    )}
                    <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                    <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{t(plan.descKey)}</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">${plan.price}</span>
                      <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{t('landing.pricing.month')}</span>
                    </div>
                    <ul className="mt-6 flex-1 space-y-2.5 border-t border-zinc-100 dark:border-zinc-800/70 pt-6">
                      {plan.featureKeys.map((fk) => (
                        <li key={fk} className="flex items-start gap-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                          <span
                            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                            style={{ background: plan.popular ? 'var(--brand)' : '#17141a', color: plan.popular ? '#0b0d03' : '#ffffff' }}
                          >
                            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                          </span>
                          {t(fk)}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => app.setView('buy')}
                      className={`mt-7 h-12 w-full rounded-full text-sm font-black transition-transform hover:scale-[1.02] ${
                        plan.popular ? 'text-[var(--on-brand)]' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'
                      }`}
                      style={plan.popular ? { background: 'var(--brand)', boxShadow: '0 12px 36px -10px var(--brand-glow)' } : undefined}
                    >
                      {t('landing.pricing.choose')}
                    </Button>
                  </div>
                </FadeUp>
              ))}
            </div>

            {/* Add-ons */}
            <FadeUp delay={0.1}>
              <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
                {[
                  { icon: Globe, title: `${t('landing.pricing.customDomain')} +$15`, desc: 'Point your own domain with automatic SSL.' },
                  { icon: Plug, title: `${t('landing.pricing.externalApi')} +$25/mo`, desc: 'Sync orders with any external panel via API.' },
                  { icon: Sparkles, title: t('landing.pricing.subdomainFree'), desc: `yourbrand.${subBase} — ready in seconds.` },
                ].map((a) => (
                  <div key={a.title} className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand)' }}
                    >
                      <a.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{a.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ============================ HOW IT WORKS ========================== */}
        <section className="border-y border-zinc-900/[0.06] bg-white dark:bg-zinc-900 py-16 sm:py-24" aria-label={t('landing.how.eyebrow')}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead eyebrow={t('landing.how.eyebrow')} title={copy.stepsTitle ?? ''} />
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-zinc-300 dark:border-zinc-700 md:block" aria-hidden />
              <div className="grid gap-10 md:grid-cols-3 md:gap-6">
                {stepsRendered.map((st, i) => (
                  <FadeUp key={st.n + i} delay={i * 0.1} className="relative text-center">
                    <span
                      className="relative z-10 mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-base font-black text-[var(--on-brand)] shadow-[0_10px_30px_-8px_var(--brand-glow)]"
                      style={{ background: 'var(--brand)' }}
                    >
                      {st.n}
                    </span>
                    <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{st.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{st.desc}</p>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================ FAQ =============================== */}
        <section id="faq" className="scroll-mt-20 py-16 sm:py-24" aria-label={t('landing.a11y.faqSection')}>
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHead eyebrow={copy.faqEyebrow} title={copy.faqTitle ?? ''} sub={copy.faqSub} />
            <FadeUp>
              <Accordion type="single" collapsible className="space-y-3">
                {FAQ_LIST.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 px-5 shadow-sm last:border-b"
                  >
                    <AccordionTrigger className="py-4 text-left text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeUp>
          </div>
        </section>

        {/* ============================ FINAL CTA ============================= */}
        <section className="relative overflow-hidden bg-[var(--brand-dark)] py-20 text-center text-white sm:py-28" aria-label={t('landing.a11y.getStarted')}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
            aria-hidden
          />
          <div
            className="absolute -bottom-56 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
            <FadeUp>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--brand-2)] sm:text-xs">
                {copy.badge}
              </p>
              <h2 className="font-black tracking-tight text-4xl sm:text-5xl lg:text-6xl">
                {copy.ctaTitle ? (
                  copy.ctaTitle
                ) : (
                  <>
                    {t('landing.cta.finalPre')}{' '}
                    <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)] bg-clip-text text-transparent">{t('landing.cta.finalPost')}</span>?
                  </>
                )}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-white/60 sm:text-lg">
                {(copy.ctaSub || '').replace('{brand}', brand)}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => app.setView('buy')}
                  className="h-12 rounded-full px-8 text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.04]"
                  style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
                >
                  {copy.ctaButton} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <a
                  href="#pricing"
                  className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/5 px-8 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  {t('landing.cta.compare')}
                </a>
              </div>
            </FadeUp>
          </div>
        </section>
      </main>

      {/* ============================== FOOTER ============================== */}
      <footer className="border-t border-zinc-900/[0.06] bg-white dark:bg-zinc-900" aria-label={t('landing.a11y.footer')}>
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <a href="#top" className="flex items-center gap-2.5" aria-label={t('landing.a11y.home').replace('{brand}', brand)}>
                {logoMark}
                <span className="text-lg font-black tracking-tight">{brand}</span>
              </a>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{tagline}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {FOOTER_SOCIAL.map((s) => (
                  <a
                    key={s}
                    href="#top"
                    aria-label={SOCIAL_ICONS[s]?.label ?? s}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 transition-colors hover:border-[var(--brand)]"
                  >
                    <SocialLogo icon={s} size={14} />
                  </a>
                ))}
              </div>
            </div>
            {[
              {
                title: t('landing.footer.product'),
                links: [
                  { label: t('landing.nav.features'), href: '#features' },
                  { label: t('landing.nav.showcase'), href: '#showcase' },
                  { label: t('landing.nav.pricing'), href: '#pricing' },
                  { label: 'API', onClick: () => app.setView('client') },
                  { label: t('landing.footer.themes'), href: '#showcase' },
                ],
              },
              {
                title: t('landing.footer.company'),
                links: [
                  { label: t('landing.footer.about'), href: '#' },
                  { label: 'Blog', onClick: () => window.dispatchEvent(new CustomEvent('gr:blog', { detail: null })) },
                  { label: t('landing.footer.contact'), href: '#' },
                  { label: t('landing.cta.buy'), onClick: () => app.setView('buy') },
                ],
              },
              {
                title: t('landing.footer.support'),
                links: [
                  { label: 'FAQ', href: '#faq' },
                  { label: t('landing.footer.contact'), href: '#' },
                  { label: t('legal.terms.title'), onClick: () => window.dispatchEvent(new CustomEvent('gr:legal', { detail: 'terms' })) },
                  { label: t('legal.privacy.title'), onClick: () => window.dispatchEvent(new CustomEvent('gr:legal', { detail: 'privacy' })) },
                  { label: t('legal.responsibility.title'), onClick: () => window.dispatchEvent(new CustomEvent('gr:legal', { detail: 'responsibility' })) },
                ],
              },
            ].map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.onClick ? (
                        <button onClick={l.onClick} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">
                          {l.label}
                        </button>
                      ) : (
                        <a href={l.href} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              © {year} {brand}. {t('landing.footer.rights')}
            </p>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{t('landing.footer.tagline')}</p>
            <div className="flex gap-3" aria-label={t('landing.a11y.languages')}>
              {(['en', 'es', 'pt'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={app.lang === l}
                  className={`text-xs font-bold uppercase transition-colors ${app.lang === l ? 'text-[var(--brand)]' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive product tour (See live demo) */}
      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  )
}
