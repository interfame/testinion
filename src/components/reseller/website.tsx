'use client'

import { useEffect, useState } from 'react'
import {
  Globe, PanelTop, MonitorSmartphone, Check, CheckCircle2, Loader2, Rocket, Copy, ExternalLink,
  Palette, Eye, RefreshCw, ShieldCheck, Lock, Image as ImageIcon, Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useApi, api, mutate } from '@/lib/api'
import { SocialLogo } from '@/components/shared/social-logo'
import { THEMES, themeVars, themeOf } from '@/lib/themes'
import { formatMoney } from '@/lib/format'
import type { Lang } from '@/lib/i18n'

type Cat = { id: string; name: string; icon: string; color: string; services: { id: string; name: string; rate: number }[] }
type Storefront = {
  platform: { name: string; slug: string; tagline: string | null; heroTitle: string | null; heroSubtitle: string | null; heroCta: string | null; theme: string; accent: string; logoUrl: string | null; domainType: string; customDomain: string | null }
  categories: Cat[]
}

export default function ResellerWebsite({ section, onNavigate }: { section: string; onNavigate: (k: string) => void }) {
  switch (section) {
    case 'w-landing': return <LandingBuilder onNavigate={onNavigate} />
    case 'w-portal': return <PortalDesigns onNavigate={onNavigate} />
    case 'w-domains': return <Domains />
    default: return null
  }
}

// ─────────────── Storefront Preview (shared with Storefront section) ───────────────

export function StorefrontPreview({ themeOverride }: { themeOverride?: string }) {
  const app = useApp()
  const platform = app.user.platform
  const { data, loading } = useApi<Storefront>(platform ? `/api/storefront?slug=${platform.slug}` : null, [platform?.slug])
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)
  const baseHost = app.publicSettings?.app_host || app.publicSettings?.subdomain_base || 'growthrush.io'

  if (loading) return <Skeleton className="h-[560px] w-full rounded-2xl" />
  if (!data?.platform) return <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-zinc-400 dark:text-zinc-500">Storefront unavailable.</p>

  const sf = data.platform
  const theme = themeOf(themeOverride ?? sf.theme)

  return (
    <div className="overflow-hidden rounded-2xl border bg-zinc-100 dark:bg-zinc-800/60 shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b bg-white dark:bg-zinc-900 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <div className="ml-2 flex flex-1 items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <code className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {sf.domainType === 'CUSTOM' && sf.customDomain ? sf.customDomain : `${sf.slug}.${baseHost}`}
          </code>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold" style={{ color: theme.accent, borderColor: theme.accent }}>
          {theme.name} DESIGN
        </Badge>
      </div>

      {/* Storefront */}
      <div className="max-h-[620px] overflow-y-auto" style={themeVars(sf.theme)}>
        {/* Hero */}
        <div className="relative overflow-hidden px-6 py-10 text-center text-white" style={{ background: theme.dark }}>
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(600px 200px at 50% -50px, ${theme.glow}, transparent)` }} />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              ✦ {sf.tagline ?? 'SMM Services'}
            </span>
            <h2 className="mx-auto mt-3 max-w-md text-2xl font-black tracking-tight sm:text-3xl">
              {sf.heroTitle ?? `Welcome to ${sf.name}`}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-[12px] text-white/60">{sf.heroSubtitle ?? 'Premium social media marketing services.'}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[12px] font-extrabold text-white" style={{ background: theme.accent }}>
              <Rocket className="h-3.5 w-3.5" /> {sf.heroCta ?? 'Get started'}
            </span>
          </div>
        </div>

        {/* Marquee */}
        <div className="overflow-hidden border-b bg-white dark:bg-zinc-900 py-3">
          <div className="flex justify-center gap-4 px-4">
            {data.categories.slice(0, 12).map((c) => (
              <SocialLogo key={c.id} icon={c.icon} size={18} className="opacity-80" />
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="bg-[#fbf7f4] dark:bg-zinc-950 p-5">
          <p className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">Service catalog</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.categories.slice(0, 4).map((c) => (
              <div key={c.id} className="rounded-xl border bg-white dark:bg-zinc-900 p-3">
                <div className="flex items-center gap-2">
                  <SocialLogo icon={c.icon} size={16} />
                  <p className="text-[12px] font-extrabold">{c.name}</p>
                  <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">{c.services.length} services</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {c.services.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-900/60 px-2.5 py-1.5">
                      <p className="min-w-0 truncate text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">{s.name}</p>
                      <span className="ml-2 shrink-0 text-[11px] font-extrabold" style={{ color: theme.accent }}>{money(s.rate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────── Landing Builder ───────────────

function LandingBuilder({ onNavigate }: { onNavigate: (k: string) => void }) {
  const app = useApp()
  const platform = app.user.platform
  const [form, setForm] = useState({
    tagline: platform?.tagline ?? '',
    heroTitle: platform?.heroTitle ?? '',
    heroSubtitle: platform?.heroSubtitle ?? '',
    heroCta: platform?.heroCta ?? '',
    logoUrl: platform?.logoUrl ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [themeBusy, setThemeBusy] = useState<string | null>(null)

  const allowed = (platform?.plan.portalDesigns ?? 'nova').split(',')

  const save = async () => {
    setSaving(true)
    const res = await mutate(() => api.patch('/api/platform/mine', form), { success: 'Landing updated ✅' })
    setSaving(false)
    if (res) app.refresh()
  }

  const setTheme = async (themeKey: string) => {
    setThemeBusy(themeKey)
    const res = await mutate(() => api.patch('/api/platform/mine', { theme: themeKey }), { success: `${THEMES[themeKey as keyof typeof THEMES].name} design applied 🎨` })
    setThemeBusy(null)
    if (res) app.refresh()
  }

  return (
    <>
      <PanelPageHeader
        title="Landing"
        description="Edit your public landing field by field — and see it live as you type."
        actions={
          <Button variant="outline" size="sm" className="font-bold" onClick={() => onNavigate('storefront')}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> View storefront
          </Button>
        }
      />
      {/* Landing Studio — full visual editor (sections, copy, templates, pages) */}
      <div className="mb-4 flex flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-950/10 bg-zinc-950 p-5 text-white shadow-lg sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold tracking-tight">Open Landing Studio</p>
          <p className="mt-0.5 text-[12.5px] text-white/60">Edit sections, copy, templates and pages of your landing — reorder, hide or show any block and save it live.</p>
        </div>
        <Button
          className="shrink-0 rounded-full px-5 font-black text-[var(--on-brand)] transition-transform hover:scale-[1.03]"
          style={{ background: 'var(--brand)', boxShadow: '0 10px 30px -10px var(--brand-glow)' }}
          onClick={() => onNavigate('landing-studio')}
        >
          <Sparkles className="mr-1.5 h-4 w-4" /> Open Landing Studio
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {/* Editor */}
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold"><PanelTop className="h-4 w-4" style={{ color: 'var(--brand)' }} /> Hero content</p>
            <div className="mt-4 space-y-3.5">
              <div className="space-y-1.5"><Label>Tagline (badge)</Label><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Grow your socials on autopilot" /></div>
              <div className="space-y-1.5"><Label>Hero title</Label><Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Hero subtitle</Label><Textarea rows={2} value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>CTA button text</Label><Input value={form.heroCta} onChange={(e) => setForm({ ...form, heroCta: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Logo URL (optional)</Label>
                <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…/logo.png" />
              </div>
              <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={saving} onClick={save}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save landing
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold"><Palette className="h-4 w-4" style={{ color: 'var(--brand)' }} /> Portal design</p>
            <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">Your plan unlocks: {allowed.map((a) => THEMES[a as keyof typeof THEMES]?.name).filter(Boolean).join(', ')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.values(THEMES).map((t) => {
                const locked = !allowed.includes(t.key)
                const current = platform?.theme === t.key
                return (
                  <button
                    key={t.key}
                    disabled={locked}
                    onClick={() => setTheme(t.key)}
                    className={`relative rounded-xl border-2 p-3 text-left transition ${
                      current ? 'border-emerald-400 bg-emerald-50/40' : locked ? 'cursor-not-allowed border-zinc-100 dark:border-zinc-800/70 opacity-50' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex gap-1">
                      {t.preview.map((c) => <span key={c} className="h-5 w-5 rounded-full" style={{ background: c }} />)}
                    </div>
                    <p className="mt-2 text-[12px] font-extrabold">{t.name}</p>
                    {current && <Badge className="mt-1 bg-emerald-100 text-emerald-700 dark:text-emerald-400"><Check className="mr-1 h-2.5 w-2.5" />ACTIVE</Badge>}
                    {locked && <Badge variant="outline" className="mt-1 text-[9px]"><Lock className="mr-1 h-2.5 w-2.5" />UPGRADE</Badge>}
                    {themeBusy === t.key && <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin" />}
                  </button>
                )
              })}
            </div>
            {allowed.length < 4 && (
              <Button variant="outline" size="sm" className="mt-3 w-full font-bold" onClick={() => onNavigate('plan-billing')}>
                Unlock more designs — upgrade plan
              </Button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="xl:col-span-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-zinc-400 dark:text-zinc-500">
            <Eye className="h-3.5 w-3.5" /> Live preview — updates after save
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-[11px]" onClick={() => app.refresh()}>
              <RefreshCw className="mr-1 h-3 w-3" /> Refresh
            </Button>
          </div>
          <StorefrontPreview />
        </div>
      </div>
    </>
  )
}

// ─────────────── Client Portal Designs ───────────────

function PortalDesigns({ onNavigate }: { onNavigate: (k: string) => void }) {
  const app = useApp()
  const platform = app.user.platform
  const allowed = (platform?.plan.portalDesigns ?? 'nova').split(',')
  const [busy, setBusy] = useState<string | null>(null)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  const apply = async (themeKey: string) => {
    setBusy(themeKey)
    const res = await mutate(() => api.patch('/api/platform/mine', { theme: themeKey }), { success: 'Portal design updated 🎨' })
    setBusy(null)
    if (res) app.refresh()
  }

  return (
    <>
      <PanelPageHeader
        title="Client Portal"
        description="Each reseller plan unlocks its own portal designs — upgrade the plan, unlock the premium look."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(THEMES).map((t) => {
          const locked = !allowed.includes(t.key)
          const current = platform?.theme === t.key
          return (
            <div key={t.key} className={`overflow-hidden rounded-2xl border-2 bg-white dark:bg-zinc-900 transition ${current ? 'border-emerald-400 shadow-md' : 'border-zinc-200 dark:border-zinc-800'}`}>
              {/* Mini portal mock */}
              <div className="relative p-4" style={{ background: t.dark }}>
                <div className="rounded-lg bg-white/95 p-3 shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded" style={{ background: t.accent }} />
                    <span className="h-1.5 w-14 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <span className="ml-auto h-1.5 w-8 rounded" style={{ background: t.accent }} />
                  </div>
                  <p className="mt-2.5 text-[10px] font-extrabold text-zinc-700 dark:text-zinc-200">$256.80</p>
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full rounded bg-zinc-100 dark:bg-zinc-800/60" />
                    <div className="h-1.5 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                    <div className="h-1.5 w-3/5 rounded" style={{ background: `${t.accent}55` }} />
                  </div>
                  <div className="mt-2 flex gap-1">
                    <span className="h-4 w-12 rounded" style={{ background: t.accent }} />
                    <span className="h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-800/60" />
                  </div>
                </div>
                {locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <Badge className="bg-white/90 text-zinc-800 dark:text-zinc-100"><Lock className="mr-1 h-3 w-3" /> {t.name} — upgrade</Badge>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold">{t.name}</p>
                  {current && <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="mr-1 h-3 w-3" /> ACTIVE</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {t.key === 'nova' ? 'Violet premium look' : t.key === 'horizon' ? 'Fresh teal gradient' : t.key === 'boost' ? 'Energetic orange' : 'Signature red'}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline" size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl"
                    onClick={() => setPreviewTheme(t.key)}
                    aria-label={`Preview ${t.name} design`}
                    title="Live preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" className="min-w-0 flex-1 font-bold"
                    disabled={locked || current || busy === t.key}
                    onClick={() => apply(t.key)}
                  >
                    {busy === t.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : current ? 'Current design' : locked ? 'Locked' : 'Apply design'}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {allowed.length < 4 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50 dark:bg-violet-950/40 p-4">
          <p className="text-[13px] font-bold text-violet-900">Want more designs? Upgrade your plan.</p>
          <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => onNavigate('plan-billing')}>See plans</Button>
        </div>
      )}

      {/* Live theme preview dialog — shows the storefront with the picked design applied */}
      <Dialog open={!!previewTheme} onOpenChange={(o) => !o && setPreviewTheme(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: 'var(--brand)' }} />
              Live preview{previewTheme ? ` — ${THEMES[previewTheme as keyof typeof THEMES]?.name ?? previewTheme}` : ''}
            </DialogTitle>
            <DialogDescription>
              Your storefront with this design applied — nothing is saved until you press “Apply design”.
            </DialogDescription>
          </DialogHeader>
          {previewTheme && <StorefrontPreview themeOverride={previewTheme} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────── Domains ───────────────

function Domains() {
  const app = useApp()
  const platform = app.user.platform
  const [mode, setMode] = useState<'SUBDOMAIN' | 'CUSTOM'>(platform?.domainType === 'CUSTOM' ? 'CUSTOM' : 'SUBDOMAIN')
  const [domain, setDomain] = useState(platform?.customDomain ?? '')
  const [subdomain, setSubdomain] = useState(platform?.slug ?? '')
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [verifying, setVerifying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const checkSlug = async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSubdomain(clean)
    if (clean === platform?.slug) { setSlugState('ok'); return }
    if (clean.length < 3) { setSlugState('idle'); return }
    setSlugState('checking')
    try {
      const res = await api.get<{ available: boolean }>(`/api/platforms/check-slug?slug=${clean}`)
      setSlugState(res.available ? 'ok' : 'taken')
    } catch { setSlugState('idle') }
  }

  const applyDomain = async () => {
    setBusy(true)
    const res = await mutate(
      () => api.patch('/api/platform/mine', {
        domainAction: mode === 'CUSTOM' ? 'switch_custom' : 'switch_subdomain',
        customDomain: mode === 'CUSTOM' ? domain : undefined,
      }),
      { success: mode === 'CUSTOM' ? 'Custom domain set — add the DNS records below ⚡' : 'Switched to free subdomain ✅' }
    )
    setBusy(false)
    if (res) { app.refresh(); setConfirmOpen(false) }
  }

  const verify = async () => {
    setVerifying(true)
    const res = await mutate(() => api.post<{ ok: boolean; status?: string; message?: string; error?: string }>('/api/reseller/domains'), {
      success: 'DNS verified — your domain is connected 🔒',
    })
    setVerifying(false)
    if (res) {
      if (res.ok === false) toast({ title: res.error || 'Verification failed', variant: 'destructive' })
      else if (res.status && res.status !== 'ACTIVE' && res.message) toast({ title: res.message, variant: 'destructive' })
      app.refresh()
    }
  }

  const baseHost = app.publicSettings?.app_host || app.publicSettings?.subdomain_base || 'growthrush.io'
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)

  return (
    <>
      <PanelPageHeader title="Domains" description="Free subdomain included — or connect your own domain for a premium look." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Current */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
          <p className="text-sm font-extrabold">Current address</p>
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-900/60 p-4">
            <Globe className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            <code className="min-w-0 flex-1 truncate text-sm font-extrabold">
              {platform?.domainType === 'CUSTOM' && platform.customDomain ? platform.customDomain : `${platform?.slug}.${baseHost}`}
            </code>
            <StatusBadge status={platform?.domainType === 'CUSTOM' ? platform.domainStatus : 'ACTIVE'} />
          </div>
          {platform?.domainType === 'CUSTOM' && platform.customDomain && (
            <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3.5">
              <p className="text-[12px] font-bold text-amber-800">{platform.domainStatus === 'PENDING' ? 'DNS pending — add these records at your registrar:' : 'DNS records expected at your registrar:'}</p>
              <div className="mt-2 space-y-1.5 font-mono text-[11px] text-amber-900">
                <p className="rounded bg-white/70 dark:bg-zinc-900/70 px-2.5 py-1.5">A&nbsp;&nbsp;&nbsp;@ (root) → 76.76.21.21</p>
                <p className="rounded bg-white/70 dark:bg-zinc-900/70 px-2.5 py-1.5">CNAME www → cname.vercel-dns.com</p>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-amber-700">Also add the domain inside your Vercel project (Settings → Domains) so SSL is issued.</p>
              <Button size="sm" variant="outline" className="mt-2.5 font-bold" disabled={verifying} onClick={verify}>
                {verifying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                {verifying ? 'Checking DNS…' : 'Verify DNS'}
              </Button>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3 text-[12px] text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Free SSL certificate on every domain.
            <button
              className="ml-auto flex items-center gap-1 font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100"
              onClick={() => { navigator.clipboard.writeText(platform?.domainType === 'CUSTOM' && platform.customDomain ? platform.customDomain : `${platform?.slug}.${baseHost}`); toast({ title: 'Copied!' }) }}
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>

        {/* Change */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
          <p className="text-sm font-extrabold">Change address</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setMode('SUBDOMAIN')}
              className={`rounded-xl border-2 p-3.5 text-left transition ${mode === 'SUBDOMAIN' ? 'border-rose-600 bg-rose-50/40' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-extrabold">Subdomain</p>
                <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">FREE</Badge>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{subdomain || 'yourbrand'}.{baseHost}</p>
            </button>
            <button
              onClick={() => setMode('CUSTOM')}
              className={`rounded-xl border-2 p-3.5 text-left transition ${mode === 'CUSTOM' ? 'border-rose-600 bg-rose-50/40' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-extrabold">Custom domain</p>
                <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">+{money(platform?.plan?.customDomainPrice ?? 15)}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">yourbrand.com</p>
            </button>
          </div>

          {mode === 'SUBDOMAIN' ? (
            <div className="mt-4">
              <Label className="text-[12px] font-bold">Subdomain</Label>
              <div className="mt-1.5 flex">
                <Input value={subdomain} onChange={(e) => checkSlug(e.target.value)} className="rounded-r-none" />
                <span className="flex items-center rounded-r-md border border-l-0 border-input bg-zinc-50 dark:bg-zinc-900/60 px-3 text-sm text-zinc-500 dark:text-zinc-400">.{baseHost}</span>
              </div>
              {slugState === 'ok' && subdomain !== platform?.slug && <p className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Available!</p>}
              {slugState === 'taken' && <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">Taken — try another.</p>}
            </div>
          ) : (
            <div className="mt-4">
              <Label className="text-[12px] font-bold">Custom domain</Label>
              <Input className="mt-1.5" placeholder="yourbrand.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">One-time setup fee: {money(platform?.plan?.customDomainPrice ?? 15)}. You own the domain at your registrar.</p>
            </div>
          )}

          <Button
            className="mt-4 w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}
            disabled={
              busy ||
              (mode === 'CUSTOM' ? domain.length < 4 || domain === platform?.customDomain : slugState !== 'ok') ||
              (mode === 'SUBDOMAIN' && subdomain === platform?.slug)
            }
            onClick={() => setConfirmOpen(true)}
          >
            {mode === 'CUSTOM' ? `Connect ${domain || 'domain'}` : 'Switch to subdomain'}
          </Button>
          {mode === 'CUSTOM' && platform?.domainType !== 'CUSTOM' && (
            <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Charged once from your wallet balance.</p>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mode === 'CUSTOM' ? `Connect ${domain}?` : 'Switch to free subdomain?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {mode === 'CUSTOM'
                ? `A one-time fee of ${money(platform?.plan?.customDomainPrice ?? 15)} will be charged to your wallet. DNS setup instructions follow.`
                : 'Your storefront will move back to your free subdomain immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction style={{ background: 'var(--brand)' }} onClick={applyDomain}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

void MonitorSmartphone
