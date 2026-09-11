'use client'

// GrowthRush — config-driven storefront renderer (Landing Studio).
// Draws the reseller's public landing 100% from a LandingConfig: section
// ORDER, section VISIBILITY and per-section COPY. Also renders the Studio's
// PAGES (Terms/Privacy/Refund/About + custom) as an in-place article view,
// and supports a preview mode used by the Landing Studio editor.

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Banknote, Bitcoin, Check, ChevronLeft, ChevronRight, CircleAlert, Code2, CreditCard,
  Headphones, Landmark, LogIn, Menu, MousePointerClick, QrCode, RefreshCw, Rocket, Search,
  ShieldCheck, Sparkles, Star, UserPlus, Wallet, X, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useApp } from '@/components/shared/app-context'
import { useApi, api } from '@/lib/api'
import { SocialLogo } from '@/components/shared/social-logo'
import { SOCIAL_ICONS } from '@/lib/social'
import { CurrencyChip, LanguageChip } from '@/components/shared/chips'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { themeVars, themeOf } from '@/lib/themes'
import { formatDate, formatMoney } from '@/lib/format'
import { CouponBanner } from '@/components/shared/coupon-banner'
import { MASTER_LANDING } from '@/lib/master-landing'
import {
  DEFAULT_PROBLEM_ITEMS, DEFAULT_SOLUTIONS, DEFAULT_TESTIMONIALS, SECTION_META,
  type LandingConfig, type LandingSectionId,
} from '@/lib/landing-config'
import type { Lang } from '@/lib/i18n'

/* --------------------------------- types ---------------------------------- */

type StatsCopy = { orders: string; clients: string; services: string; uptime: string }
type LandingCopyOverride = { stats?: Partial<StatsCopy> }
export type SFPlatform = {
  name: string
  slug: string
  tagline: string | null
  heroTitle: string | null
  heroSubtitle: string | null
  heroCta: string | null
  theme: string
  accent: string
  logoUrl: string | null
  domainType: string
  customDomain: string | null
  landingCopy?: LandingCopyOverride | null
}
export type Cat = { id: string; name: string; slug: string; icon: string; color: string; services: Svc[] }
export type Svc = { id: string; name: string; rate: number; min: number; max: number; type: string; description: string | null; refill: boolean; dripfeed: boolean }
export type Faq = { id: string; question: string; answer: string; category: string }
export type Post = { id: string; title: string; slug: string; excerpt: string | null; cover: string | null; publishedAt: string }
export type StorefrontData = {
  platform: SFPlatform | null
  categories: Cat[]
  publicCoupon?: { code: string; value: number } | null
  welcomeCredit?: number
  faqs?: Faq[]
  posts?: Post[]
  stats?: { networks: number; services: number; minRate: number }
  landing?: LandingConfig | null
}

type FeatureCopy = { icon: string; title: string; desc: string }
type ProblemCopy = { title: string; desc: string }
type StepCopy = { n: string; title: string; desc: string }
type TestimonialCopy = { name: string; role: string; text: string; rating: number }
type PageResponse = { page: { title: string; body: string; updatedAt: string } }

export type PreviewCtl = {
  activeId: LandingSectionId | null
  onSelect?: (id: LandingSectionId) => void
}

/* -------------------------------- constants -------------------------------- */

const FEATURE_ICONS: Record<string, typeof Zap> = {
  zap: Zap,
  refresh: RefreshCw,
  shield: ShieldCheck,
  headset: Headphones,
  card: CreditCard,
  code: Code2,
  star: Star,
  users: UserPlus,
  globe: Landmark,
  rocket: Rocket,
}

const PAYMENT_METHODS: Record<string, { label: string; icon: typeof Wallet }> = {
  paypal: { label: 'PayPal', icon: Wallet },
  card: { label: 'Visa / Mastercard', icon: CreditCard },
  mercadopago: { label: 'MercadoPago', icon: Landmark },
  pix: { label: 'Pix', icon: QrCode },
  crypto: { label: 'Bitcoin / USDT / Crypto', icon: Bitcoin },
  payoneer: { label: 'Payoneer', icon: Banknote },
}

const DEFAULT_PAYMENT_METHODS = ['paypal', 'card', 'mercadopago', 'pix', 'crypto']

const FOOTER_SOCIAL = ['instagram', 'x', 'telegram', 'youtube', 'tiktok', 'whatsapp']

const SIGNIN_TRUST = ['Free welcome credit', 'No password required', 'Cancel anytime']

/** Very light sanitize for page bodies (same approach as the public blog). */
function softSanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

/* --------------------------------- motion --------------------------------- */

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
      <h2 className={`font-black tracking-tight text-3xl sm:text-4xl ${dark ? 'text-white' : 'text-zinc-900 dark:text-zinc-50'}`}>{title}</h2>
      {sub && (
        <p className={`mx-auto mt-4 max-w-2xl text-base sm:text-lg ${dark ? 'text-white/60' : 'text-zinc-500 dark:text-zinc-400'}`}>{sub}</p>
      )}
    </FadeUp>
  )
}

/* ------------------------- preview selection shell ------------------------- */

function PreviewShell({ id, preview, children }: { id: LandingSectionId; preview?: PreviewCtl; children: React.ReactNode }) {
  if (!preview) return <>{children}</>
  const active = preview.activeId === id
  return (
    <div
      data-section={id}
      onClick={() => preview.onSelect?.(id)}
      className={`relative cursor-pointer rounded-lg transition-shadow ${active ? 'ring-2 ring-sky-500 ring-offset-0' : 'hover:ring-1 hover:ring-sky-400/40'}`}
    >
      {active && (
        <span className="absolute left-2 top-2 z-[70] inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
          <MousePointerClick className="h-3 w-3" /> {SECTION_META[id].label}
        </span>
      )}
      {children}
    </div>
  )
}

/* ================================ COMPONENT ================================ */

/**
 * Config-driven public storefront — the reseller's landing, drawn entirely
 * from the Landing Studio config (order, visibility and copy per section).
 */
export function LandingRenderer({ platform, data, config, preview }: {
  platform: SFPlatform
  data: StorefrontData
  config: LandingConfig
  preview?: PreviewCtl
}) {
  const app = useApp()
  const [q, setQ] = useState('')
  const [activeCat, setActiveCat] = useState<string>('ALL')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pageSlug, setPageSlug] = useState<string | null>(null)
  const { data: pageData, loading: pageLoading } = useApi<PageResponse>(
    pageSlug && !preview
      ? `/api/storefront/page?slug=${encodeURIComponent(platform.slug)}&page=${encodeURIComponent(pageSlug)}`
      : null,
    [pageSlug]
  )

  const theme = themeOf(platform.theme)
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency || 'USD'), app.lang as Lang)
  const isLoggedIn = !!app.user?.id
  const domainLabel = platform.domainType === 'CUSTOM' && platform.customDomain ? platform.customDomain : `${platform.slug}.growthrush.io`
  const welcomeCredit = data.welcomeCredit ?? 0
  const liveStats = data.stats
  const faqs = data.faqs ?? []
  const posts = data.posts ?? []
  const marqueeItems = Object.entries(SOCIAL_ICONS)

  /* ------------------------------ copy helpers ----------------------------- */

  const copyOf = (id: LandingSectionId): Record<string, unknown> => config.sections.find((s) => s.id === id)?.copy ?? {}
  const s = (v: unknown): string => (typeof v === 'string' ? v : '')
  const statFallback: Partial<StatsCopy> = platform.landingCopy?.stats ?? {}

  const heroCopy = copyOf('hero')
  const hero = {
    title: s(heroCopy.title) || platform.heroTitle || `Welcome to ${platform.name}`,
    subtitle: s(heroCopy.subtitle) || platform.heroSubtitle || platform.tagline || 'Premium social media marketing services with instant delivery.',
    cta: s(heroCopy.cta) || platform.heroCta || 'Get started free',
    secondary: typeof heroCopy.secondary === 'string' ? heroCopy.secondary : 'Browse services',
    showBadge: heroCopy.showBadge !== false,
  }

  const statValue = (key: keyof StatsCopy, fallback: string) => s(copyOf('stats')[key]) || s(statFallback[key]) || fallback
  const statLabel = (key: keyof StatsCopy, fallback: string) => s(copyOf('stats')[`${key}Label`]) || fallback
  const heroStats = [
    { value: statValue('orders', MASTER_LANDING.stats.orders), label: statLabel('orders', 'Orders delivered') },
    { value: statValue('clients', MASTER_LANDING.stats.clients), label: statLabel('clients', 'Happy clients') },
    { value: statValue('services', MASTER_LANDING.stats.services), label: statLabel('services', 'Live services') },
    { value: statValue('uptime', MASTER_LANDING.stats.uptime), label: statLabel('uptime', 'Uptime') },
  ]

  const headerCopy = copyOf('header')
  const blogLabel = s(headerCopy.blogLabel) || 'Blog'
  const showBlog = headerCopy.showBlog !== false

  const signinCopy = {
    title: s(copyOf('signin').title) || 'Ready to grow?',
    subtitle: s(copyOf('signin').subtitle) || 'Create your free account and get your first order in minutes.',
    button: s(copyOf('signin').button) || 'Create free account',
    loginLabel: s(copyOf('signin').loginLabel) || 'Log in',
  }

  const problemCopy = copyOf('problem')
  const problemItems: ProblemCopy[] = Array.isArray(problemCopy.items) && problemCopy.items.length
    ? (problemCopy.items as ProblemCopy[]).filter((i) => i && typeof i.title === 'string')
    : DEFAULT_PROBLEM_ITEMS
  const problemSolutions: ProblemCopy[] = Array.isArray(problemCopy.solutions) && problemCopy.solutions.length
    ? (problemCopy.solutions as ProblemCopy[]).filter((i) => i && typeof i.title === 'string')
    : DEFAULT_SOLUTIONS

  const featuresCopy = copyOf('features')
  const featureItems: FeatureCopy[] = Array.isArray(featuresCopy.items) && featuresCopy.items.length
    ? (featuresCopy.items as FeatureCopy[]).filter((f) => f && typeof f.title === 'string')
    : MASTER_LANDING.features.map((f) => ({ ...f }))

  const networksTitle = s(copyOf('networks').title) || 'From Instagram to Spotify — one catalog for every platform.'

  const paymentsCopy = copyOf('payments')
  const paymentMethods: string[] = Array.isArray(paymentsCopy.methods) && paymentsCopy.methods.length
    ? (paymentsCopy.methods as string[]).filter((m) => typeof m === 'string' && m in PAYMENT_METHODS)
    : DEFAULT_PAYMENT_METHODS

  const howCopy = copyOf('how')
  const howSteps: StepCopy[] = Array.isArray(howCopy.steps) && howCopy.steps.length
    ? (howCopy.steps as StepCopy[]).filter((st) => st && typeof st.title === 'string')
    : MASTER_LANDING.steps.map((st) => ({ ...st }))

  const testimonialsCopy = copyOf('testimonials')
  const testimonialItems: TestimonialCopy[] = Array.isArray(testimonialsCopy.items) && testimonialsCopy.items.length
    ? (testimonialsCopy.items as TestimonialCopy[]).filter((t) => t && typeof t.name === 'string')
    : DEFAULT_TESTIMONIALS

  const faqCopy = { title: s(copyOf('faq').title) || 'Frequently asked questions', sub: s(copyOf('faq').sub) }
  const ctaCopy = {
    title: s(copyOf('cta').title) || 'Ready to go viral?',
    sub: s(copyOf('cta').sub) || 'Join thousands growing with us every day.',
    button: s(copyOf('cta').button) || 'Create free account',
  }
  const footerCopy = copyOf('footer')
  const footerTagline = s(footerCopy.tagline) || platform.tagline || 'Premium social media marketing services with instant delivery.'
  const footerSocial = footerCopy.showSocial !== false

  const visible = (id: LandingSectionId) => config.sections.find((sec) => sec.id === id)?.visible ?? false

  /* ----------------------------- behavior glue ----------------------------- */

  const cta = (id: LandingSectionId) => () => {
    if (preview) { preview.onSelect?.(id); return }
    if (isLoggedIn) window.dispatchEvent(new CustomEvent('gr:go', { detail: 'client' }))
    else window.dispatchEvent(new CustomEvent('gr:auth', { detail: 'register' }))
  }
  const loginCta = (id: LandingSectionId) => () => {
    if (preview) { preview.onSelect?.(id); return }
    window.dispatchEvent(new CustomEvent('gr:auth', { detail: 'login' }))
  }
  const goBlog = (id?: LandingSectionId) => {
    if (preview) { if (id) preview.onSelect?.(id); return }
    window.dispatchEvent(new CustomEvent('gr:blog', { detail: platform.slug }))
  }
  const exitToGrowthRush = (id?: LandingSectionId) => {
    if (preview) { if (id) preview.onSelect?.(id); return }
    window.dispatchEvent(new Event('gr:exit'))
  }
  const legalFallback = (doc: string, id: LandingSectionId) => {
    if (preview) { preview.onSelect?.(id); return }
    window.dispatchEvent(new CustomEvent('gr:legal', { detail: doc }))
  }
  const openPage = (slug: string) => setPageSlug(slug)
  const stopPreview = (e: React.MouseEvent) => { if (preview) e.preventDefault() }

  const cats = data.categories
  const filtered = useMemo(() => {
    const list = activeCat === 'ALL' ? cats : cats.filter((c) => c.id === activeCat)
    if (!q) return list
    return list
      .map((c) => ({ ...c, services: c.services.filter((sv) => sv.name.toLowerCase().includes(q.toLowerCase())) }))
      .filter((c) => c.services.length > 0)
  }, [cats, activeCat, q])

  /* ------------------------------- page view ------------------------------- */

  const localPage = pageSlug ? config.pages.find((p) => p.slug === pageSlug) ?? null : null
  const shownPage = preview
    ? localPage ? { title: localPage.title, body: localPage.body, updatedAt: null as string | null } : null
    : pageData?.page ?? null

  const logoMark = (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-black shadow-[0_6px_20px_-4px_var(--brand-glow)]"
      style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}
    >
      {platform.logoUrl ? <img src={platform.logoUrl} alt={platform.name} className="h-full w-full object-cover" /> : <Rocket className="h-[18px] w-[18px]" />}
    </span>
  )

  const authButtons = isLoggedIn ? (
    <Button
      onClick={cta('header')}
      className="h-9 rounded-full px-4 text-[13px] font-black text-[var(--on-brand)] transition-transform hover:scale-[1.03]"
      style={{ background: 'var(--brand)' }}
    >
      <Zap className="mr-1.5 h-3.5 w-3.5" /> My dashboard
    </Button>
  ) : (
    <>
      <Button
        variant="ghost"
        onClick={loginCta('header')}
        className="h-9 rounded-full px-4 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900/5"
      >
        <LogIn className="mr-1.5 h-3.5 w-3.5" /> Log in
      </Button>
      <Button
        onClick={cta('header')}
        className="h-9 rounded-full px-4 text-[13px] font-black text-[var(--on-brand)] transition-transform hover:scale-[1.03]"
        style={{ background: 'var(--brand)', boxShadow: '0 8px 24px -8px var(--brand-glow)' }}
      >
        <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Sign up
      </Button>
    </>
  )

  const navLinks = [
    { href: '#sf-services', label: 'Services' },
    { href: '#sf-features', label: 'Why us' },
    { href: '#sf-how', label: 'How it works' },
    { href: '#sf-faq', label: 'FAQ' },
  ]

  /* ------------------------------- footer data ------------------------------ */

  const visiblePages = config.pages.filter((p) => p.visible)
  const legalPages = visiblePages.filter((p) => ['terms', 'privacy', 'refund'].includes(p.slug))
  const companyPages = visiblePages.filter((p) => !['terms', 'privacy', 'refund'].includes(p.slug))
  const legalLinks: { label: string; onClick: () => void }[] = legalPages.map((p) => ({ label: p.title, onClick: () => openPage(p.slug) }))
  if (!legalPages.some((p) => p.slug === 'terms')) legalLinks.push({ label: 'Terms', onClick: () => legalFallback('terms', 'footer') })
  if (!legalPages.some((p) => p.slug === 'privacy')) legalLinks.push({ label: 'Privacy', onClick: () => legalFallback('privacy', 'footer') })

  /* --------------------------------- render --------------------------------- */

  const headerBlock = visible('header') && (
    <PreviewShell id="header" preview={preview}>
      <header className="sticky top-0 z-50 border-b border-zinc-900/[0.06] bg-[#fbf7f4]/85 dark:border-zinc-800/70 dark:bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button className="flex shrink-0 items-center gap-2.5" onClick={() => exitToGrowthRush('header')} title="Powered by GrowthRush" aria-label={`${platform.name} — back to GrowthRush`}>
            {logoMark}
            <span className="text-lg font-black tracking-tight">{platform.name}</span>
          </button>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={stopPreview}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-bold text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                {l.label}
              </a>
            ))}
            {showBlog && (
              <button
                onClick={() => goBlog('header')}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-bold text-zinc-600 dark:text-zinc-300 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                {blogLabel}
              </button>
            )}
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
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full lg:hidden" aria-label="Open menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2.5">
                    {logoMark}
                    <span className="text-lg font-black tracking-tight">{platform.name}</span>
                  </SheetTitle>
                  <SheetDescription className="sr-only">Menu</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-1 px-4">
                  {navLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={(e) => { stopPreview(e); setMenuOpen(false) }}
                      className="rounded-xl px-3 py-2.5 text-[15px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900/5"
                    >
                      {l.label}
                    </a>
                  ))}
                  {showBlog && (
                    <button
                      onClick={() => { setMenuOpen(false); goBlog('header') }}
                      className="rounded-xl px-3 py-2.5 text-left text-[15px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900/5"
                    >
                      {blogLabel}
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-2.5 border-t border-zinc-100 dark:border-zinc-800/70 px-4 pt-4">
                  <div className="flex gap-2">
                    <LanguageChip />
                    <CurrencyChip />
                    <ThemeToggle className="h-9 w-9 rounded-full" />
                  </div>
                  {authButtons}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </PreviewShell>
  )

  const heroBlock = (
    <PreviewShell id="hero" preview={preview}>
      <section className="relative overflow-hidden bg-[var(--brand-dark)] text-white" aria-label="Hero">
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
          className="absolute -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
          {hero.showBadge && (
            <FadeUp>
              <code className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-bold text-white/60 backdrop-blur">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> {domainLabel}
              </code>
            </FadeUp>
          )}
          <FadeUp delay={0.08}>
            <h1 className="mt-6 font-black tracking-tight text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
          </FadeUp>
          <FadeUp delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
              {hero.subtitle}
            </p>
          </FadeUp>
          <FadeUp delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={cta('hero')}
                className="h-12 rounded-full px-7 text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.04]"
                style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
              >
                <Zap className="mr-2 h-4 w-4" /> {hero.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {hero.secondary.trim() !== '' && (
                <a
                  href="#sf-services"
                  onClick={stopPreview}
                  className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  {hero.secondary}
                </a>
              )}
            </div>
            {liveStats && liveStats.services > 0 && (
              <p className="mt-4 text-[12px] font-semibold text-white/50">
                {liveStats.networks} networks · {liveStats.services.toLocaleString()} services · from {money(liveStats.minRate)}
              </p>
            )}
          </FadeUp>

          {/* Welcome credit — every new signup of this storefront gets it automatically */}
          {!isLoggedIn && welcomeCredit > 0 && (
            <FadeUp delay={0.38}>
              <button
                onClick={cta('hero')}
                className="group relative mt-6 inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-bold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/15"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Sign up &amp; get {money(welcomeCredit)} in free credit
                <ChevronRight className="h-3 w-3 opacity-60 transition group-hover:translate-x-0.5" />
              </button>
            </FadeUp>
          )}

          {/* Promo coupon ticket — best active platform coupon */}
          {data.publicCoupon && (
            <FadeUp delay={0.42} className="mt-8">
              <CouponBanner
                code={data.publicCoupon.code}
                value={data.publicCoupon.value}
                moneyLabel={money(data.publicCoupon.value)}
                dark
              />
            </FadeUp>
          )}
        </div>
      </section>
    </PreviewShell>
  )

  const statsBlock = (
    <PreviewShell id="stats" preview={preview}>
      <section className="bg-[var(--brand-dark)] pb-14 text-white sm:pb-20" aria-label="Key numbers">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeUp>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {heroStats.map((st) => (
                <div key={st.label} className="flex flex-col bg-[var(--brand-dark)] px-4 py-4 sm:px-5">
                  <dd className="order-1 text-2xl font-black tracking-tight tabular-nums sm:text-3xl" style={{ color: 'var(--brand-2)' }}>
                    {st.value}
                  </dd>
                  <dt className="order-2 mt-1 text-[10px] font-bold uppercase tracking-wider text-white/45 sm:text-[11px]">{st.label}</dt>
                </div>
              ))}
            </dl>
          </FadeUp>
        </div>
      </section>
    </PreviewShell>
  )

  const signinBlock = (
    <PreviewShell id="signin" preview={preview}>
      <section className="border-y border-zinc-900/[0.06] bg-white py-16 dark:bg-zinc-900 sm:py-24" aria-label="Create account">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <FadeUp>
            <h2 className="font-black tracking-tight text-3xl text-zinc-900 dark:text-zinc-50 sm:text-4xl">{signinCopy.title}</h2>
            <p className="mt-4 max-w-md text-base text-zinc-500 dark:text-zinc-400 sm:text-lg">{signinCopy.subtitle}</p>
            <ul className="mt-7 space-y-3">
              {SIGNIN_TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="rounded-3xl border border-zinc-900/5 bg-[#fbf7f4] p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)] dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
              <div className="flex items-center gap-2.5">
                {logoMark}
                <span className="text-lg font-black tracking-tight">{platform.name}</span>
              </div>
              <Button
                onClick={cta('signin')}
                className="mt-6 h-12 w-full rounded-full text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
              >
                <UserPlus className="mr-2 h-4 w-4" /> {signinCopy.button} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={loginCta('signin')}
                className="mt-3 h-11 w-full rounded-full text-sm font-bold"
              >
                <LogIn className="mr-2 h-4 w-4" /> {signinCopy.loginLabel}
              </Button>
              <p className="mt-5 text-center text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Powered by GrowthRush
              </p>
            </div>
          </FadeUp>
        </div>
      </section>
    </PreviewShell>
  )

  const problemBlock = (
    <PreviewShell id="problem" preview={preview}>
      <section className="py-16 sm:py-24" aria-label="The problem">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow={s(problemCopy.eyebrow) || 'The problem'} title={s(problemCopy.title) || 'Growing on social is slow and risky'} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FadeUp>
              <div className="h-full rounded-3xl border border-rose-100 bg-rose-50/70 p-6 dark:border-rose-950/60 dark:bg-rose-950/20 sm:p-8">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400">
                  <CircleAlert className="h-4 w-4" /> The problem
                </p>
                <div className="mt-6 space-y-6">
                  {problemItems.map((it) => (
                    <div key={it.title} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400">
                        <X className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{it.title}</h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{it.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <div className="h-full rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6 dark:border-emerald-950/60 dark:bg-emerald-950/20 sm:p-8">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> The GrowthRush way
                </p>
                <div className="mt-6 space-y-6">
                  {problemSolutions.map((it) => (
                    <div key={it.title} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                        <Check className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{it.title}</h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{it.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </PreviewShell>
  )

  const featuresBlock = (
    <PreviewShell id="features" preview={preview}>
      <section id="sf-features" className="scroll-mt-20 py-16 sm:py-24" aria-label="Why us">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead
            eyebrow={s(featuresCopy.eyebrow) || 'Why us'}
            title={s(featuresCopy.title) || 'Everything you need to grow faster'}
            sub={s(featuresCopy.sub) || undefined}
          />
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {featureItems.map((f, i) => {
              const Icon = FEATURE_ICONS[f.icon] ?? Zap
              return (
                <FadeUp key={`${f.title}-${i}`} delay={(i % 3) * 0.06}>
                  <div className="group relative h-full rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_16px_44px_-16px_var(--brand-glow)]">
                    <span
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand)' }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{f.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{f.desc}</p>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>
    </PreviewShell>
  )

  const networksBlock = (
    <PreviewShell id="networks" preview={preview}>
      <section className="border-y border-zinc-900/[0.06] py-12 sm:py-16" aria-label="Supported platforms">
        <FadeUp className="mx-auto mb-8 max-w-7xl px-4 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl font-black tracking-tight text-2xl text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {networksTitle}
          </h2>
        </FadeUp>
        <div className="gr-marquee relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#fbf7f4] to-transparent dark:from-zinc-950 sm:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#fbf7f4] to-transparent dark:from-zinc-950 sm:w-28" />
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
    </PreviewShell>
  )

  const paymentsBlock = (
    <PreviewShell id="payments" preview={preview}>
      <section className="border-y border-zinc-900/[0.06] bg-white py-14 dark:bg-zinc-900 sm:py-16" aria-label="Payment methods">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <SectionHead title={s(paymentsCopy.title) || 'Pay your way'} sub={s(paymentsCopy.sub) || undefined} />
          <FadeUp>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {paymentMethods.map((m) => {
                const meta = PAYMENT_METHODS[m] ?? PAYMENT_METHODS.card
                const Icon = meta.icon
                return (
                  <span
                    key={m}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[13px] font-bold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200"
                  >
                    <Icon className="h-4 w-4" style={{ color: 'var(--brand)' }} /> {meta.label}
                  </span>
                )
              })}
            </div>
          </FadeUp>
        </div>
      </section>
    </PreviewShell>
  )

  const catalogBlock = (
    <section id="sf-services" className="scroll-mt-20 border-t border-zinc-900/[0.06] py-16 sm:py-20" aria-label="Service catalog">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--brand)] sm:text-xs">Catalog</p>
            <h2 className="font-black tracking-tight text-2xl text-zinc-900 dark:text-zinc-50 sm:text-3xl">Service catalog</h2>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">Transparent pricing per 1,000 — no hidden fees.</p>
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <Input className="pl-9" placeholder="Search services…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search services" />
          </div>
        </div>

        {/* Category pills */}
        <div className="gr-scroll mb-6 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCat('ALL')}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition ${
              activeCat === 'ALL' ? 'border-transparent text-[var(--on-brand)]' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
            style={activeCat === 'ALL' ? { background: 'var(--brand)' } : undefined}
          >
            <Star className="h-3 w-3" /> All networks
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition ${
                activeCat === c.id ? 'border-transparent text-[var(--on-brand)]' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
              style={activeCat === c.id ? { background: 'var(--brand)' } : undefined}
            >
              <SocialLogo icon={c.icon} size={14} /> {c.name}
            </button>
          ))}
        </div>

        {/* Services grouped */}
        <div className="space-y-8">
          {filtered.map((c) => (
            <div key={c.id}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${c.color}16` }}>
                  <SocialLogo icon={c.icon} size={20} />
                </span>
                <h3 className="text-[15px] font-extrabold">{c.name}</h3>
                <Badge variant="outline" className="text-[10px] text-zinc-400 dark:text-zinc-500">{c.services.length} services</Badge>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {c.services.map((sv) => (
                  <div key={sv.id} className="group rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold leading-snug">{sv.name}</p>
                      <span className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-black" style={{ background: `color-mix(in srgb, ${theme.accent} 10%, white)`, color: theme.accent }}>
                        {money(sv.rate)}
                      </span>
                    </div>
                    {sv.description && <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{sv.description}</p>}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                      <span>{sv.min.toLocaleString()}–{sv.max.toLocaleString()}</span>
                      {sv.refill && <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">♻ Refill</span>}
                      {sv.dripfeed && <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 text-sky-600 dark:text-sky-400">⏳ Drip</span>}
                      <button
                        onClick={cta('cta')}
                        className="ml-auto text-[11px] font-extrabold opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                        style={{ color: theme.accent }}
                      >
                        Order now →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <Search className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">No services match “{q}”.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )

  const howBlock = (
    <PreviewShell id="how" preview={preview}>
      <section id="sf-how" className="scroll-mt-20 border-y border-zinc-900/[0.06] bg-white py-16 dark:bg-zinc-900 sm:py-24" aria-label="How it works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead eyebrow="How it works" title={s(howCopy.title) || 'Up and running in three steps.'} sub={s(howCopy.sub) || undefined} />
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-zinc-300 dark:border-zinc-700 md:block" aria-hidden />
            <div className="grid gap-10 md:grid-cols-3 md:gap-6">
              {howSteps.map((st, i) => (
                <FadeUp key={`${st.title}-${i}`} delay={i * 0.1} className="relative text-center">
                  <span
                    className="relative z-10 mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-base font-black text-[var(--on-brand)] shadow-[0_10px_30px_-8px_var(--brand-glow)]"
                    style={{ background: 'var(--brand)' }}
                  >
                    {st.n || String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{st.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{st.desc}</p>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PreviewShell>
  )

  const blogTeaser = posts.length > 0 && (
    <section className="py-16 sm:py-24" aria-label="From the blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Blog" title="Tips & insights from the blog" sub="Growth guides, platform updates and playbooks — fresh from our editors." />
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {posts.map((p, i) => (
            <FadeUp key={p.id} delay={i * 0.07}>
              <button
                onClick={() => goBlog()}
                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-[0_16px_44px_-16px_var(--brand-glow)]"
                aria-label={`Read article: ${p.title}`}
              >
                <span className="relative block h-44 w-full overflow-hidden" aria-hidden>
                  {p.cover ? (
                    <img src={p.cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}
                    >
                      <Rocket className="h-10 w-10 text-black/25 transition-transform duration-500 group-hover:scale-110" />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {formatDate(p.publishedAt, app.lang as Lang)}
                  </span>
                  <span className="mt-1.5 text-[15px] font-extrabold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50 line-clamp-2">
                    {p.title}
                  </span>
                  {p.excerpt && (
                    <span className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">{p.excerpt}</span>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold" style={{ color: theme.accent }}>
                    Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.15} className="mt-8 text-center">
          <button
            onClick={() => goBlog()}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-2.5 text-[13px] font-extrabold text-zinc-700 dark:text-zinc-200 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
          >
            Visit the blog <ArrowRight className="h-4 w-4" />
          </button>
        </FadeUp>
      </div>
    </section>
  )

  const testimonialsBlock = (
    <PreviewShell id="testimonials" preview={preview}>
      <section className="py-16 sm:py-24" aria-label="Testimonials">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead title={s(testimonialsCopy.title) || 'Loved by 3,800+ clients'} />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonialItems.slice(0, 3).map((t, i) => (
              <FadeUp key={`${t.name}-${i}`} delay={(i % 3) * 0.07}>
                <div className="flex h-full flex-col rounded-3xl border border-zinc-200/80 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                  <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-4 w-4 ${n <= (t.rating ?? 5) ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`} />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-300">“{t.text}”</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-black text-black"
                      style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}
                    >
                      {t.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold text-zinc-900 dark:text-zinc-50">{t.name}</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>
    </PreviewShell>
  )

  const faqBlock = (
    <PreviewShell id="faq" preview={preview}>
      <section id="sf-faq" className="scroll-mt-20 border-t border-zinc-900/[0.06] py-16 sm:py-24" aria-label="Frequently asked questions">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHead eyebrow="FAQ" title={faqCopy.title} sub={faqCopy.sub || undefined} />
          <FadeUp>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={f.id}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900 px-5 shadow-sm last:border-b"
                >
                  <AccordionTrigger className="py-4 text-left text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 hover:no-underline">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeUp>
        </div>
      </section>
    </PreviewShell>
  )

  const ctaBlock = (
    <PreviewShell id="cta" preview={preview}>
      <section className="relative overflow-hidden bg-[var(--brand-dark)] py-20 text-center text-white sm:py-28" aria-label="Get started">
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
            <h2 className="font-black tracking-tight text-4xl sm:text-5xl">{ctaCopy.title}</h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/60 sm:text-lg">{ctaCopy.sub}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={cta('cta')}
                className="h-12 rounded-full px-8 text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.04]"
                style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
              >
                <Zap className="mr-2 h-4 w-4" /> {ctaCopy.button} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <a
                href="#sf-services"
                onClick={stopPreview}
                className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/5 px-8 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Browse services
              </a>
            </div>
          </FadeUp>
        </div>
      </section>
    </PreviewShell>
  )

  const newsletterBlock = (
    <PreviewShell id="newsletter" preview={preview}>
      <NewsletterBand
        title={s(copyOf('newsletter').title) || 'Get growth tips in your inbox'}
        sub={s(copyOf('newsletter').sub) || 'One email a week. No spam, unsubscribe anytime.'}
        button={s(copyOf('newsletter').button) || 'Subscribe'}
        slug={platform.slug}
        preview={!!preview}
      />
    </PreviewShell>
  )

  const footerBlock = visible('footer') && (
    <PreviewShell id="footer" preview={preview}>
      <footer className="border-t border-zinc-900/[0.06] bg-white dark:bg-zinc-900" aria-label="Footer">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                {logoMark}
                <span className="text-lg font-black tracking-tight">{platform.name}</span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {footerTagline}
              </p>
              {footerSocial && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {FOOTER_SOCIAL.map((soc) => (
                    <a
                      key={soc}
                      href="#"
                      onClick={(e) => { e.preventDefault(); if (preview) preview.onSelect?.('footer') }}
                      aria-label={SOCIAL_ICONS[soc]?.label ?? soc}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 transition-colors hover:border-[var(--brand)]"
                    >
                      <SocialLogo icon={soc} size={14} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <nav aria-label="Quick links">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Quick links</h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href="#sf-services" onClick={stopPreview} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">Services</a>
                </li>
                <li>
                  <button onClick={() => goBlog()} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">{blogLabel}</button>
                </li>
                <li>
                  <a href="#sf-faq" onClick={stopPreview} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">FAQ</a>
                </li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Legal</h3>
              <ul className="mt-4 space-y-2.5">
                {legalLinks.map((l) => (
                  <li key={l.label}>
                    <button onClick={l.onClick} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {companyPages.length > 0 && (
              <nav aria-label="Company">
                <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Company</h3>
                <ul className="mt-4 space-y-2.5">
                  {companyPages.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => openPage(p.slug)} className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 transition-colors hover:text-[var(--brand)]">
                        {p.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              © {new Date().getFullYear()} {platform.name}. All rights reserved.
            </p>
            <button
              onClick={() => exitToGrowthRush('footer')}
              className="flex items-center gap-1.5 self-start rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 sm:self-auto"
              title="Own platform software"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded text-black" style={{ background: '#c6e508' }}>
                <Rocket className="h-2.5 w-2.5" />
              </span>
              Powered by GrowthRush
            </button>
          </div>
        </div>
      </footer>
    </PreviewShell>
  )

  /* ------------------------- compose the page output ------------------------ */

  const landingSections: React.ReactNode[] = []
  for (const sec of config.sections) {
    if (sec.id === 'header' || sec.id === 'footer') continue
    if (sec.id === 'how') {
      // The catalog always renders right before "How it works" (data-driven, not configurable).
      landingSections.push(<div key="catalog">{catalogBlock}</div>)
    }
    if (sec.id === 'faq') {
      if (posts.length > 0) landingSections.push(<div key="blog-teaser">{blogTeaser}</div>)
    }
    if (!sec.visible) continue
    switch (sec.id) {
      case 'hero': landingSections.push(<div key={sec.id}>{heroBlock}</div>); break
      case 'stats': landingSections.push(<div key={sec.id}>{statsBlock}</div>); break
      case 'signin': landingSections.push(<div key={sec.id}>{signinBlock}</div>); break
      case 'problem': landingSections.push(<div key={sec.id}>{problemBlock}</div>); break
      case 'features': landingSections.push(<div key={sec.id}>{featuresBlock}</div>); break
      case 'networks': landingSections.push(<div key={sec.id}>{networksBlock}</div>); break
      case 'payments': landingSections.push(<div key={sec.id}>{paymentsBlock}</div>); break
      case 'how': landingSections.push(<div key={sec.id}>{howBlock}</div>); break
      case 'testimonials': landingSections.push(<div key={sec.id}>{testimonialsBlock}</div>); break
      case 'faq': landingSections.push(<div key={sec.id}>{faqBlock}</div>); break
      case 'cta': landingSections.push(<div key={sec.id}>{ctaBlock}</div>); break
      case 'newsletter': landingSections.push(<div key={sec.id}>{newsletterBlock}</div>); break
      default: break
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf7f4] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50" style={themeVars(platform.theme)}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html { scroll-behavior: smooth; }
            @keyframes gr-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .gr-marquee-track { animation: gr-marquee 48s linear infinite; }
            .gr-marquee:hover .gr-marquee-track { animation-play-state: paused; }
            @media (prefers-reduced-motion: reduce) { .gr-marquee-track { animation: none; } }
          `,
        }}
      />

      {pageSlug ? (
        <>
          {/* Mini header for the page view */}
          <header className="sticky top-0 z-50 border-b border-zinc-900/[0.06] bg-[#fbf7f4]/85 dark:border-zinc-800/70 dark:bg-zinc-950/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
              <button
                onClick={() => setPageSlug(null)}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[12px] font-bold text-zinc-600 dark:text-zinc-300 transition hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back to home
              </button>
              <div className="ml-auto flex items-center gap-2.5">
                {logoMark}
                <span className="text-base font-black tracking-tight">{platform.name}</span>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
              {pageLoading && !preview ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-2/3" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ) : shownPage ? (
                <>
                  <h1 className="font-black tracking-tight text-3xl text-zinc-900 dark:text-zinc-50 sm:text-4xl">{shownPage.title}</h1>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                    Last updated {formatDate((shownPage.updatedAt as string) ?? new Date().toISOString(), app.lang as Lang)}
                  </p>
                  <div
                    className="prose prose-sm sm:prose-base dark:prose-invert mt-8 max-w-none"
                    dangerouslySetInnerHTML={{ __html: softSanitize(shownPage.body) }}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed p-12 text-center">
                  <p className="text-lg font-extrabold">Page not found</p>
                  <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">This page doesn&apos;t exist or is no longer visible.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setPageSlug(null)}>
                    <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to home
                  </Button>
                </div>
              )}
            </article>
          </main>
        </>
      ) : (
        <>
          {headerBlock}
          <main className="flex-1">{landingSections}</main>
        </>
      )}
      {footerBlock}
    </div>
  )
}

/* ============================ newsletter section =========================== */

/** Default export so both `import LandingRenderer` and `import { LandingRenderer }` work. */
export default LandingRenderer

function NewsletterBand({ title, sub, button, slug, preview }: {
  title: string
  sub: string
  button: string
  slug: string
  preview: boolean
}) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'pending' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase === 'pending') return
    if (preview) { setPhase('ok'); return }
    setPhase('pending')
    setMsg('')
    try {
      await api.post('/api/storefront/subscribe', { slug, email })
      setPhase('ok')
    } catch (err) {
      setPhase('error')
      setMsg(err instanceof Error ? err.message : 'Something went wrong — try again.')
    }
  }

  return (
    <section className="relative overflow-hidden bg-[var(--brand-dark)] py-16 text-white sm:py-24" aria-label="Newsletter">
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
      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <SectionHead dark title={title} sub={sub} />
        {phase === 'ok' ? (
          <FadeUp>
            <div className="mx-auto flex max-w-md items-center justify-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm font-bold text-emerald-300">
              <Check className="h-5 w-5" /> You are on the list! Check your inbox.
            </div>
          </FadeUp>
        ) : (
          <FadeUp delay={0.08}>
            <form onSubmit={submit} className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="h-12 flex-1 rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
              />
              <Button
                type="submit"
                disabled={phase === 'pending'}
                className="h-12 rounded-full px-7 text-sm font-black text-[var(--on-brand)] transition-transform hover:scale-[1.03] disabled:opacity-60"
                style={{ background: 'var(--brand)', boxShadow: '0 14px 44px -10px var(--brand-glow)' }}
              >
                {phase === 'pending' ? 'Subscribing…' : button}
              </Button>
            </form>
            {phase === 'error' && msg && <p className="mt-3 text-[13px] font-semibold text-rose-400">{msg}</p>}
          </FadeUp>
        )}
      </div>
    </section>
  )
}
