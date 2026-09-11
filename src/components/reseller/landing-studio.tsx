'use client'

// GrowthRush — Landing Studio: full-screen visual editor for the reseller's
// storefront landing. Left = section/pages list (order + visibility), center =
// live click-to-edit preview, right = per-section copy editor. Saved into the
// platform's settings JSON via /api/reseller/landing.

import { useMemo, useState } from 'react'
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Code2, CreditCard, ExternalLink, Eye, EyeOff,
  FileText, Globe, Headphones, HelpCircle, Layers, LayoutTemplate, Loader2, Lock, LogIn,
  Mail, Megaphone, Monitor, MousePointerClick, PanelBottom, PanelTop, Plus, RefreshCw,
  Rocket, RotateCcw, Save, ShieldCheck, Smartphone, Sparkles, Star, Tablet, Trash2,
  TrendingUp, Users, Zap, CircleAlert, ListOrdered, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useApp } from '@/components/shared/app-context'
import { useApi, api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { RichEditor } from '@/components/shared/rich-editor'
import LandingRenderer, { type StorefrontData } from '@/components/storefront/landing-renderer'
import {
  COPY_SCHEMA, PAYMENT_METHOD_KEYS, SECTION_META, defaultLandingConfig,
  type LandingConfig, type LandingPage, type LandingSection, type LandingSectionId,
} from '@/lib/landing-config'

/* -------------------------------- constants -------------------------------- */

const SECTION_ICONS: Record<string, LucideIcon> = {
  'panel-top': PanelTop,
  sparkles: Sparkles,
  'trending-up': TrendingUp,
  'log-in': LogIn,
  'circle-alert': CircleAlert,
  zap: Zap,
  globe: Globe,
  'credit-card': CreditCard,
  'list-ordered': ListOrdered,
  star: Star,
  'circle-help': HelpCircle,
  megaphone: Megaphone,
  mail: Mail,
  'panel-bottom': PanelBottom,
}

const FEATURE_ICON_OPTIONS = ['zap', 'refresh', 'shield', 'headset', 'card', 'code', 'star', 'users', 'globe', 'rocket']

type Device = 'desktop' | 'tablet' | 'mobile'
const DEVICE_WIDTH: Record<Device, string> = { desktop: '100%', tablet: '834px', mobile: '414px' }

const PAYMENT_LABELS: Record<string, string> = {
  paypal: 'PayPal', card: 'Visa / Mastercard', mercadopago: 'MercadoPago',
  pix: 'Pix', crypto: 'Bitcoin / USDT / Crypto', payoneer: 'Payoneer',
}

type TemplateKey = 'growthrush' | 'agency' | 'starter' | 'crypto'
const TEMPLATES: { key: TemplateKey; name: string; desc: string }[] = [
  { key: 'growthrush', name: 'GrowthRush', desc: 'The full reference landing — all sections in the default order with the default copy.' },
  { key: 'agency', name: 'Agency Pro', desc: 'Problem/solution, testimonials and newsletter front and center — built to close agency clients.' },
  { key: 'starter', name: 'Starter', desc: 'Lean and fast: hero, stats, features, how it works, FAQ and CTA only.' },
  { key: 'crypto', name: 'Crypto Store', desc: 'Payments right after the networks with crypto-first checkout messaging.' },
]

/** Build a template config on top of the default, keeping the user's pages. */
function buildTemplate(key: TemplateKey, pages: LandingPage[]): LandingConfig {
  const base = defaultLandingConfig()
  const vis = (map: Partial<Record<LandingSectionId, boolean>>) => ({
    ...base,
    sections: base.sections.map((s) => (map[s.id] !== undefined ? { ...s, visible: map[s.id] as boolean } : s)),
  })
  const withCopy = (cfg: LandingConfig, id: LandingSectionId, copy: Record<string, unknown>) => ({
    ...cfg,
    sections: cfg.sections.map((s) => (s.id === id ? { ...s, copy: { ...s.copy, ...copy } } : s)),
  })
  const moveAfter = (cfg: LandingConfig, id: LandingSectionId, after: LandingSectionId) => {
    const arr = [...cfg.sections]
    const i = arr.findIndex((s) => s.id === id)
    const j = arr.findIndex((s) => s.id === after)
    if (i < 0 || j < 0) return cfg
    const [item] = arr.splice(i, 1)
    const k = arr.findIndex((s) => s.id === after)
    arr.splice(k + 1, 0, item)
    return { ...cfg, sections: arr }
  }

  let cfg: LandingConfig
  switch (key) {
    case 'agency':
      cfg = vis({ problem: true, testimonials: true, newsletter: true, payments: false })
      cfg = withCopy(cfg, 'problem', { eyebrow: 'Why agencies switch' })
      cfg = withCopy(cfg, 'cta', { title: 'Scale your agency with a partner that delivers' })
      break
    case 'starter':
      cfg = vis({ signin: false, problem: false, payments: false, testimonials: false, newsletter: false })
      break
    case 'crypto':
      cfg = vis({ payments: true, problem: false, testimonials: true, newsletter: true })
      cfg = moveAfter(cfg, 'payments', 'networks')
      cfg = withCopy(cfg, 'payments', { sub: 'Pay with crypto — USDT, BTC, ETH and more', methods: ['crypto', 'card', 'paypal'] })
      break
    default:
      cfg = base
  }
  return { ...cfg, template: key, pages }
}

/* -------------------------------- utilities -------------------------------- */

function newPageId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pg-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '')

type LandingApiResponse = {
  config: LandingConfig
  leads: number
  latest: { email: string; createdAt: string }[]
}

type ConfirmState = {
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/* ================================= STUDIO ================================== */

export default function LandingStudio({ onBack }: { onBack: () => void }) {
  const app = useApp()
  const platform = app.user.platform as { id: string; name: string; slug: string; theme: string } | undefined
  const { data, loading } = useApi<LandingApiResponse>(platform ? '/api/reseller/landing' : null)

  if (!platform) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <p className="text-sm font-bold">No platform</p>
        <p className="mt-1 text-[13px] text-zinc-400 dark:text-zinc-500">Buy a platform to edit its landing.</p>
      </div>
    )
  }
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      </div>
    )
  }
  return <StudioBody key={platform.id} platform={platform} initial={data} onBack={onBack} />
}

function StudioBody({ platform, initial, onBack }: {
  platform: { id: string; name: string; slug: string; theme: string }
  initial: LandingApiResponse
  onBack: () => void
}) {
  const [draft, setDraft] = useState<LandingConfig>(() => initial.config)
  const [saved, setSaved] = useState<LandingConfig>(() => initial.config)
  const [selectedId, setSelectedId] = useState<LandingSectionId | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [device, setDevice] = useState<Device>('desktop')
  const [saving, setSaving] = useState(false)
  const [leads, setLeads] = useState(initial.leads)
  const [latest, setLatest] = useState(initial.latest)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [slugsTouched, setSlugsTouched] = useState<Set<string>>(() => new Set())

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const { data: sfData, loading: sfLoading } = useApi<StorefrontData>(`/api/storefront?slug=${platform.slug}`)
  const { data: gwData } = useApi<{ gateways: { enabled: boolean }[] }>('/api/reseller/gateways')
  const gatewayCount = gwData?.gateways ? gwData.gateways.filter((g) => g.enabled).length : null
  const faqCount = sfData?.faqs?.length ?? 0

  const pagesValid = useMemo(() => {
    const slugs = new Set<string>()
    for (const p of draft.pages) {
      if (!/^[a-z0-9-]+$/.test(p.slug) || slugs.has(p.slug)) return false
      slugs.add(p.slug)
    }
    return true
  }, [draft.pages])

  /* ------------------------------ draft editing ----------------------------- */

  const setVisible = (id: LandingSectionId, visible: boolean) =>
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, visible } : s)) }))

  const setCopy = (id: LandingSectionId, patch: Record<string, unknown>) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, copy: { ...s.copy, ...patch } } : s)),
    }))

  const moveSection = (id: LandingSectionId, dir: -1 | 1) =>
    setDraft((d) => {
      const arr = [...d.sections]
      const i = arr.findIndex((s) => s.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return d
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...d, sections: arr }
    })

  const patchPage = (id: string, patch: Partial<LandingPage>) =>
    setDraft((d) => ({ ...d, pages: d.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  const addPage = () => {
    const page: LandingPage = { id: newPageId(), slug: '', title: 'New page', body: '', visible: true, system: false }
    setDraft((d) => ({ ...d, pages: [...d.pages, page] }))
    setSelectedPageId(page.id)
    setSelectedId(null)
  }

  const deletePage = (id: string) => {
    setDraft((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }))
    setSelectedPageId(null)
  }

  const onPageTitle = (page: LandingPage, title: string) => {
    const auto = !page.system && !slugsTouched.has(page.id)
    patchPage(page.id, auto ? { title, slug: slugify(title) } : { title })
  }
  const onPageSlug = (page: LandingPage, value: string) => {
    setSlugsTouched((t) => new Set(t).add(page.id))
    patchPage(page.id, { slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40) })
  }

  /* --------------------------------- actions -------------------------------- */

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/reseller/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: draft }),
      })
      const d = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) throw new Error(d.error || 'Failed to save')
      setSaved(draft)
      toast({ title: 'Landing updated' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to save', variant: 'destructive' })
    }
    setSaving(false)
  }

  const restore = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/reseller/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
      const d = await res.json().catch(() => ({})) as { config?: LandingConfig; error?: string }
      if (!res.ok || !d.config) throw new Error(d.error || 'Failed to restore')
      setDraft(d.config)
      setSaved(d.config)
      setSelectedId(null)
      setSelectedPageId(null)
      toast({ title: 'Landing restored to the GrowthRush default' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to restore', variant: 'destructive' })
    }
    setSaving(false)
  }

  const refreshLeads = async () => {
    try {
      const d = await api.get<LandingApiResponse>('/api/reseller/landing')
      setLeads(d.leads)
      setLatest(d.latest)
    } catch { /* keep the current numbers */ }
  }

  const requestBack = () => {
    if (dirty) {
      setConfirm({
        title: 'Unsaved changes',
        description: 'You have edits that were not saved yet. Leave the Landing Studio anyway?',
        confirmLabel: 'Discard & leave',
        destructive: true,
        onConfirm: onBack,
      })
    } else {
      onBack()
    }
  }

  const applyTemplate = (key: TemplateKey) => {
    const run = () => {
      setDraft((d) => buildTemplate(key, d.pages))
      setTemplatesOpen(false)
      toast({ title: 'Template applied — review and save' })
    }
    if (dirty) {
      setConfirm({
        title: 'Unsaved changes',
        description: 'Applying a template replaces your current section order, visibility and copy (your pages are kept). Continue?',
        confirmLabel: 'Apply template',
        onConfirm: run,
      })
    } else {
      run()
    }
  }

  const viewLanding = () => window.dispatchEvent(new CustomEvent('gr:storefront', { detail: platform.slug }))

  const selectedSection = selectedId ? draft.sections.find((s) => s.id === selectedId) ?? null : null
  const selectedPage = selectedPageId ? draft.pages.find((p) => p.id === selectedPageId) ?? null : null

  /* ---------------------------------- render --------------------------------- */

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* ───────────────────────── Toolbar ───────────────────────── */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2 text-white sm:px-4">
        <Button
          variant="ghost" size="sm" onClick={requestBack}
          className="h-9 shrink-0 gap-1.5 rounded-full px-2.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <span className="mx-0.5 hidden h-5 w-px bg-white/15 sm:block" />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
          <Layers className="h-4 w-4" />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[15px] font-black tracking-tight">Landing Studio</h1>
          {dirty && (
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unsaved changes
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Device switcher */}
          <div className="hidden items-center gap-0.5 rounded-full border border-white/15 p-0.5 md:flex" role="group" aria-label="Preview device">
            {(
              [
                { key: 'desktop', icon: Monitor, label: 'Desktop' },
                { key: 'tablet', icon: Tablet, label: 'Tablet' },
                { key: 'mobile', icon: Smartphone, label: 'Mobile' },
              ] as { key: Device; icon: LucideIcon; label: string }[]
            ).map((d) => (
              <button
                key={d.key}
                title={d.label}
                aria-label={d.label}
                aria-pressed={device === d.key}
                onClick={() => setDevice(d.key)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition',
                  device === d.key ? 'bg-white/15 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white'
                )}
              >
                <d.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <span className="mx-1 hidden h-5 w-px bg-white/15 md:block" />
          <Button
            variant="ghost" size="sm" onClick={() => setTemplatesOpen(true)}
            className="h-9 gap-1.5 rounded-full px-2.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LayoutTemplate className="h-4 w-4" /> <span className="hidden lg:inline">Templates</span>
          </Button>
          <Button
            variant="ghost" size="sm" onClick={viewLanding}
            className="h-9 gap-1.5 rounded-full px-2.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" /> <span className="hidden lg:inline">View landing</span>
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => setConfirm({
              title: 'Restore default landing?',
              description: 'This replaces the current section order, visibility, copy and pages with the GrowthRush default. This cannot be undone.',
              confirmLabel: 'Restore',
              destructive: true,
              onConfirm: restore,
            })}
            className="h-9 gap-1.5 rounded-full px-2.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" /> <span className="hidden lg:inline">Restore</span>
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !pagesValid}
            className="h-9 gap-1.5 rounded-full px-3.5 text-[13px] font-black text-[var(--on-brand)]"
            style={{ background: 'var(--brand)', boxShadow: '0 8px 24px -8px var(--brand-glow)' }}
            title={!pagesValid ? 'Fix the page slugs before saving' : undefined}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* ───────────────────────── Body ───────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* LEFT — sections & pages */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/70 lg:flex">
          <div className="px-4 pb-1 pt-4">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/60">Sections</span>
          </div>
          <p className="px-4 pb-3 text-[11px] leading-snug text-white/30">Click any block in the preview to edit it</p>
          <div className="gr-scroll-dark flex-1 overflow-y-auto px-2 pb-2">
            {draft.sections.map((s, i) => {
              const Icon = SECTION_ICONS[SECTION_META[s.id].icon] ?? Layers
              const selected = selectedId === s.id && !selectedPageId
              return (
                <div
                  key={s.id}
                  onClick={() => { setSelectedId(s.id); setSelectedPageId(null) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedId(s.id); setSelectedPageId(null) } }}
                  className={cn(
                    'group relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition outline-none',
                    selected ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {selected && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" style={{ background: 'var(--brand)' }} />}
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-white/80' : 'text-white/35')} />
                  <span className={cn('truncate', !s.visible && 'line-through opacity-50')}>{SECTION_META[s.id].label}</span>
                  {!s.visible && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">Hidden</span>}
                  <span className="ml-auto flex items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      title="Move up" aria-label={`Move ${SECTION_META[s.id].label} up`} disabled={i === 0}
                      onClick={(e) => { e.stopPropagation(); moveSection(s.id, -1) }}
                      className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-15"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Move down" aria-label={`Move ${SECTION_META[s.id].label} down`} disabled={i === draft.sections.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveSection(s.id, 1) }}
                      className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-15"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  <button
                    title={s.visible ? 'Hide on landing' : 'Show on landing'}
                    aria-label={`${s.visible ? 'Hide' : 'Show'} ${SECTION_META[s.id].label}`}
                    onClick={(e) => { e.stopPropagation(); setVisible(s.id, !s.visible) }}
                    className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    {s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-amber-400" />}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Pages */}
          <div className="border-t border-white/10 px-4 pb-1 pt-3">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/60">Pages</span>
          </div>
          <div className="gr-scroll-dark max-h-44 overflow-y-auto px-2 pb-1">
            {draft.pages.map((p) => {
              const selected = selectedPageId === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => { setSelectedPageId(p.id); setSelectedId(null) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedPageId(p.id); setSelectedId(null) } }}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition outline-none',
                    selected ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <FileText className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-white/80' : 'text-white/35')} />
                  <span className={cn('truncate', !p.visible && 'line-through opacity-50')}>{p.title}</span>
                  <span className="ml-auto flex items-center gap-0.5">
                    {!p.visible && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">Hidden</span>}
                    <button
                      title={p.visible ? 'Hide footer link' : 'Show footer link'}
                      aria-label={`${p.visible ? 'Hide' : 'Show'} footer link for ${p.title}`}
                      onClick={(e) => { e.stopPropagation(); patchPage(p.id, { visible: !p.visible }) }}
                      className="rounded p-1 text-white/40 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    >
                      {p.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-amber-400" />}
                    </button>
                  </span>
                </div>
              )
            })}
            {!draft.pages.length && <p className="px-2.5 py-2 text-[12px] text-white/30">No pages yet.</p>}
          </div>
          <div className="px-3 pb-3 pt-1">
            <button
              onClick={addPage}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 py-2 text-[12px] font-bold text-white/60 transition hover:border-white/40 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add page
            </button>
          </div>
        </aside>

        {/* CENTER — live preview */}
        <div className="gr-scroll h-[42vh] min-h-0 flex-1 overflow-auto bg-zinc-100 p-3 dark:bg-zinc-900 sm:p-5 lg:h-auto">
          <div className="mx-auto transition-all" style={{ width: DEVICE_WIDTH[device], maxWidth: '100%' }}>
            <div className="overflow-hidden rounded-xl border border-zinc-300/70 shadow-2xl dark:border-zinc-700/70">
              {sfLoading || !sfData?.platform ? (
                <Skeleton className="h-[60vh] w-full rounded-none" />
              ) : (
                <LandingRenderer
                  config={draft}
                  platform={sfData.platform}
                  data={sfData}
                  preview={{
                    activeId: selectedId,
                    onSelect: (id) => { setSelectedId(id); setSelectedPageId(null) },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — editor */}
        <aside className="gr-scroll w-full shrink-0 overflow-y-auto border-t bg-card lg:w-80 lg:border-l lg:border-t-0">
          {selectedPage ? (
            <PageEditor
              page={selectedPage}
              pages={draft.pages}
              onTitle={(t) => onPageTitle(selectedPage, t)}
              onSlug={(sv) => onPageSlug(selectedPage, sv)}
              onVisible={(v) => patchPage(selectedPage.id, { visible: v })}
              onBody={(b) => patchPage(selectedPage.id, { body: b })}
              onAskDelete={() => setConfirm({
                title: `Delete “${selectedPage.title}”?`,
                description: 'The page and its footer link are removed when you save. This cannot be undone.',
                confirmLabel: 'Delete page',
                destructive: true,
                onConfirm: () => deletePage(selectedPage.id),
              })}
              onDone={() => setSelectedPageId(null)}
            />
          ) : selectedSection ? (
            <SectionEditor
              section={selectedSection}
              onVisible={(v) => setVisible(selectedSection.id, v)}
              onCopy={(patch) => setCopy(selectedSection.id, patch)}
              faqCount={faqCount}
              gatewayCount={gatewayCount}
              leads={{ total: leads, latest }}
              onRefreshLeads={refreshLeads}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                <MousePointerClick className="h-6 w-6" />
              </span>
              <p className="text-[14px] font-extrabold">Nothing selected</p>
              <p className="max-w-[220px] text-[12.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Select a section in the preview or the list to edit its copy, visibility and order.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ───────────────────────── Dialogs ───────────────────────── */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>Start from a proven layout — your pages are always kept.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const active = draft.template === t.key
              return (
                <div key={t.key} className={cn('rounded-2xl border p-4 transition', active ? 'border-[var(--brand)]' : 'border-zinc-200 dark:border-zinc-800')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-extrabold">{t.name}</p>
                    {active && <Badge className="text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>CURRENT</Badge>}
                  </div>
                  <p className="mt-1 min-h-[36px] text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">{t.desc}</p>
                  <Button variant="outline" size="sm" className="mt-3 w-full font-bold" onClick={() => applyTemplate(t.key)}>
                    Apply
                  </Button>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.destructive ? 'bg-rose-600 text-white hover:bg-rose-600/90' : 'text-[var(--on-brand)]'}
              style={!confirm?.destructive ? { background: 'var(--brand)' } : undefined}
              onClick={() => { const action = confirm; setConfirm(null); action?.onConfirm() }}
            >
              {confirm?.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ============================== editor helpers ============================= */

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-bold text-zinc-600 dark:text-zinc-300">{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{hint}</p>}
    </div>
  )
}

function ItemBox({ index, label, children }: { index: number; label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 rounded-xl border bg-zinc-50/70 p-3 dark:bg-zinc-900/40">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label ?? `Item ${index + 1}`}
      </p>
      {children}
    </div>
  )
}

/* ============================= section editor ============================== */

function SectionEditor({ section, onVisible, onCopy, faqCount, gatewayCount, leads, onRefreshLeads }: {
  section: LandingSection
  onVisible: (v: boolean) => void
  onCopy: (patch: Record<string, unknown>) => void
  faqCount: number
  gatewayCount: number | null
  leads: { total: number; latest: { email: string; createdAt: string }[] }
  onRefreshLeads: () => void
}) {
  const id = section.id
  const c = section.copy
  const str = (k: string, fb = '') => (typeof c[k] === 'string' ? (c[k] as string) : fb)
  const bool = (k: string, fb: boolean) => (typeof c[k] === 'boolean' ? (c[k] as boolean) : fb)
  const items = (k: string) => (Array.isArray(c[k]) ? (c[k] as Record<string, unknown>[]) : [])
  const Icon = SECTION_ICONS[SECTION_META[id].icon] ?? Layers

  const setItem = (key: string, index: number, patch: Record<string, unknown>) => {
    const arr = items(key).map((it, i) => (i === index ? { ...it, ...patch } : it))
    onCopy({ [key]: arr })
  }

  return (
    <div>
      {/* header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-[var(--brand)]" />
            <span className="truncate text-[14px] font-extrabold">{SECTION_META[id].label}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label className="text-[11px] text-zinc-400 dark:text-zinc-500">Show on landing</Label>
            <Switch checked={section.visible} onCheckedChange={onVisible} aria-label="Show on landing" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {id === 'header' && (
          <>
            <div className="flex items-center justify-between rounded-xl border bg-zinc-50/70 px-3.5 py-3 dark:bg-zinc-900/40">
              <Label className="text-[12px] font-bold text-zinc-600 dark:text-zinc-300">Show blog link</Label>
              <Switch checked={bool('showBlog', true)} onCheckedChange={(v) => onCopy({ showBlog: v })} />
            </div>
            <Field label="Blog link label">
              <Input value={str('blogLabel', 'Blog')} onChange={(e) => onCopy({ blogLabel: e.target.value })} placeholder="Blog" />
            </Field>
          </>
        )}

        {id === 'hero' && (
          <>
            <Field label="Title" hint="Leave empty to use your brand hero title from Website → Landing.">
              <Textarea rows={2} value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} placeholder="Launch your own social media marketing business today" />
            </Field>
            <Field label="Subtitle">
              <Textarea rows={2} value={str('subtitle')} onChange={(e) => onCopy({ subtitle: e.target.value })} />
            </Field>
            <Field label="Main button">
              <Input value={str('cta')} onChange={(e) => onCopy({ cta: e.target.value })} placeholder="Get started free" />
            </Field>
            <Field label="Secondary button" hint="Leave empty to hide the secondary button.">
              <Input value={str('secondary', 'Browse services')} onChange={(e) => onCopy({ secondary: e.target.value })} placeholder="Browse services" />
            </Field>
            <div className="flex items-center justify-between rounded-xl border bg-zinc-50/70 px-3.5 py-3 dark:bg-zinc-900/40">
              <Label className="text-[12px] font-bold text-zinc-600 dark:text-zinc-300">Show domain badge</Label>
              <Switch checked={bool('showBadge', true)} onCheckedChange={(v) => onCopy({ showBadge: v })} />
            </div>
          </>
        )}

        {id === 'stats' && (
          <>
            <p className="text-[12px] leading-snug text-zinc-400 dark:text-zinc-500">
              The four numbers shown right below the hero.
            </p>
            {(['orders', 'clients', 'services', 'uptime'] as const).map((k) => (
              <ItemBox key={k} index={0} label={k}>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Value</Label>
                    <Input value={str(k)} onChange={(e) => onCopy({ [k]: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Label</Label>
                    <Input value={str(`${k}Label`)} onChange={(e) => onCopy({ [`${k}Label`]: e.target.value })} />
                  </div>
                </div>
              </ItemBox>
            ))}
          </>
        )}

        {id === 'signin' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Textarea rows={2} value={str('subtitle')} onChange={(e) => onCopy({ subtitle: e.target.value })} /></Field>
            <Field label="Sign-up button"><Input value={str('button')} onChange={(e) => onCopy({ button: e.target.value })} /></Field>
            <Field label="Log-in button"><Input value={str('loginLabel')} onChange={(e) => onCopy({ loginLabel: e.target.value })} /></Field>
          </>
        )}

        {id === 'problem' && (
          <>
            <Field label="Eyebrow"><Input value={str('eyebrow')} onChange={(e) => onCopy({ eyebrow: e.target.value })} /></Field>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <div className="pt-1">
              <Label className="text-[11px] font-black uppercase tracking-wider text-rose-500">The problem</Label>
              <div className="mt-2 space-y-3">
                {items('items').slice(0, 3).map((it, i) => (
                  <ItemBox key={i} index={i}>
                    <Input value={typeof it.title === 'string' ? it.title : ''} onChange={(e) => setItem('items', i, { title: e.target.value })} placeholder="Title" />
                    <Textarea rows={2} value={typeof it.desc === 'string' ? it.desc : ''} onChange={(e) => setItem('items', i, { desc: e.target.value })} placeholder="Description" />
                  </ItemBox>
                ))}
              </div>
            </div>
            <div className="pt-1">
              <Label className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Our solution</Label>
              <div className="mt-2 space-y-3">
                {items('solutions').slice(0, 3).map((it, i) => (
                  <ItemBox key={i} index={i}>
                    <Input value={typeof it.title === 'string' ? it.title : ''} onChange={(e) => setItem('solutions', i, { title: e.target.value })} placeholder="Title" />
                    <Textarea rows={2} value={typeof it.desc === 'string' ? it.desc : ''} onChange={(e) => setItem('solutions', i, { desc: e.target.value })} placeholder="Description" />
                  </ItemBox>
                ))}
              </div>
            </div>
          </>
        )}

        {id === 'features' && (
          <>
            <Field label="Eyebrow"><Input value={str('eyebrow')} onChange={(e) => onCopy({ eyebrow: e.target.value })} /></Field>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={str('sub')} onChange={(e) => onCopy({ sub: e.target.value })} /></Field>
            <div className="space-y-3 pt-1">
              {items('items').slice(0, 6).map((it, i) => (
                <ItemBox key={i} index={i}>
                  <Input value={typeof it.title === 'string' ? it.title : ''} onChange={(e) => setItem('items', i, { title: e.target.value })} placeholder="Title" />
                  <Textarea rows={2} value={typeof it.desc === 'string' ? it.desc : ''} onChange={(e) => setItem('items', i, { desc: e.target.value })} placeholder="Description" />
                  <Select value={typeof it.icon === 'string' ? it.icon : 'zap'} onValueChange={(v) => setItem('items', i, { icon: v })}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEATURE_ICON_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ItemBox>
              ))}
            </div>
          </>
        )}

        {id === 'networks' && (
          <Field label="Title" hint="The brands marquee below the title shows all 30 supported networks.">
            <Textarea rows={2} value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} />
          </Field>
        )}

        {id === 'payments' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={str('sub')} onChange={(e) => onCopy({ sub: e.target.value })} /></Field>
            <Field
              label="Methods shown"
              hint={gatewayCount !== null
                ? `${gatewayCount} payment ${gatewayCount === 1 ? 'method' : 'methods'} enabled — your clients will see the methods you enable in Finance → Payment methods.`
                : 'Your clients will see the methods you enable in Finance → Payment methods.'}
            >
              <div className="grid grid-cols-1 gap-2 rounded-xl border bg-zinc-50/70 p-3 dark:bg-zinc-900/40">
                {PAYMENT_METHOD_KEYS.map((key) => {
                  const list = Array.isArray(c.methods) ? (c.methods as string[]) : []
                  const checked = list.includes(key)
                  return (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? PAYMENT_METHOD_KEYS.filter((k) => k === key || list.includes(k))
                            : list.filter((k) => k !== key)
                          onCopy({ methods: next })
                        }}
                      />
                      {PAYMENT_LABELS[key]}
                    </label>
                  )
                })}
              </div>
            </Field>
          </>
        )}

        {id === 'how' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={str('sub')} onChange={(e) => onCopy({ sub: e.target.value })} /></Field>
            <div className="space-y-3 pt-1">
              {items('steps').slice(0, 3).map((it, i) => (
                <ItemBox key={i} index={i} label={`Step ${String(i + 1).padStart(2, '0')}`}>
                  <Input value={typeof it.title === 'string' ? it.title : ''} onChange={(e) => setItem('steps', i, { title: e.target.value })} placeholder="Title" />
                  <Textarea rows={2} value={typeof it.desc === 'string' ? it.desc : ''} onChange={(e) => setItem('steps', i, { desc: e.target.value })} placeholder="Description" />
                </ItemBox>
              ))}
            </div>
          </>
        )}

        {id === 'testimonials' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <div className="space-y-3 pt-1">
              {items('items').slice(0, 3).map((it, i) => (
                <ItemBox key={i} index={i}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input value={typeof it.name === 'string' ? it.name : ''} onChange={(e) => setItem('items', i, { name: e.target.value })} placeholder="Name" />
                    <Input value={typeof it.role === 'string' ? it.role : ''} onChange={(e) => setItem('items', i, { role: e.target.value })} placeholder="Role" />
                  </div>
                  <Textarea rows={3} value={typeof it.text === 'string' ? it.text : ''} onChange={(e) => setItem('items', i, { text: e.target.value })} placeholder="Testimonial" />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">Rating</Label>
                    <Select value={String(typeof it.rating === 'number' ? it.rating : 5)} onValueChange={(v) => setItem('items', i, { rating: Number(v) })}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3].map((r) => <SelectItem key={r} value={String(r)}>{r} stars</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </ItemBox>
              ))}
            </div>
          </>
        )}

        {id === 'faq' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={str('sub')} onChange={(e) => onCopy({ sub: e.target.value })} /></Field>
            <div className="flex items-center gap-2.5 rounded-xl border border-dashed px-3.5 py-3 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
              <HelpCircle className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              Questions are managed in Content → FAQ
              <Badge variant="outline" className="ml-auto font-bold">{faqCount} live</Badge>
            </div>
          </>
        )}

        {id === 'cta' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={str('sub')} onChange={(e) => onCopy({ sub: e.target.value })} /></Field>
            <Field label="Button"><Input value={str('button')} onChange={(e) => onCopy({ button: e.target.value })} /></Field>
          </>
        )}

        {id === 'newsletter' && (
          <>
            <Field label="Title"><Input value={str('title')} onChange={(e) => onCopy({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={str('sub')} onChange={(e) => onCopy({ sub: e.target.value })} /></Field>
            <Field label="Button"><Input value={str('button')} onChange={(e) => onCopy({ button: e.target.value })} /></Field>
            <div className="rounded-xl border bg-zinc-50/70 p-3.5 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-extrabold">
                  <Mail className="h-3.5 w-3.5 text-[var(--brand)]" /> Newsletter leads
                </p>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] font-bold" onClick={onRefreshLeads}>
                  <RefreshCw className="h-3 w-3" /> Refresh
                </Button>
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight">{leads.total.toLocaleString()}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">emails captured from your landing</p>
              <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                {leads.latest.map((l, i) => (
                  <div key={`${l.email}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-1.5 text-[12px]">
                    <span className="truncate font-semibold">{l.email}</span>
                    <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">{new Date(l.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {!leads.latest.length && <p className="py-2 text-center text-[11.5px] text-zinc-400 dark:text-zinc-500">No leads yet — publish your landing and share it!</p>}
              </div>
            </div>
          </>
        )}

        {id === 'footer' && (
          <>
            <Field label="Tagline" hint="Shown under your brand in the footer.">
              <Textarea rows={2} value={str('tagline')} onChange={(e) => onCopy({ tagline: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between rounded-xl border bg-zinc-50/70 px-3.5 py-3 dark:bg-zinc-900/40">
              <Label className="text-[12px] font-bold text-zinc-600 dark:text-zinc-300">Show social icons</Label>
              <Switch checked={bool('showSocial', true)} onCheckedChange={(v) => onCopy({ showSocial: v })} />
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-dashed px-3.5 py-3 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
              <FileText className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              Legal links come from the Pages list
            </div>
          </>
        )}

        {/* Key whitelist hint for the curious */}
        <p className="pb-2 text-[10.5px] leading-snug text-zinc-300 dark:text-zinc-600">
          Allowed keys: {Object.keys(COPY_SCHEMA[id]).join(', ')}
        </p>
      </div>
    </div>
  )
}

/* ============================== page editor ================================ */

function PageEditor({ page, pages, onTitle, onSlug, onVisible, onBody, onAskDelete, onDone }: {
  page: LandingPage
  pages: LandingPage[]
  onTitle: (title: string) => void
  onSlug: (slug: string) => void
  onVisible: (visible: boolean) => void
  onBody: (body: string) => void
  onAskDelete: () => void
  onDone: () => void
}) {
  const slugValid = /^[a-z0-9-]+$/.test(page.slug)
  const slugTaken = pages.some((p) => p.id !== page.id && p.slug === page.slug)

  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-[var(--brand)]" />
            <span className="truncate text-[14px] font-extrabold">{page.title || 'Untitled page'}</span>
            {page.system ? (
              <Badge variant="outline" className="shrink-0 text-[9px] font-bold">SYSTEM</Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-[9px] font-bold">CUSTOM</Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label className="text-[11px] text-zinc-400 dark:text-zinc-500">Show link in footer</Label>
            <Switch checked={page.visible} onCheckedChange={onVisible} aria-label="Show link in footer" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <Field label="Page title">
          <Input value={page.title} onChange={(e) => onTitle(e.target.value)} placeholder="e.g. Shipping & delivery" />
        </Field>
        <Field
          label="Slug"
          hint={page.system
            ? 'System page — the slug cannot change (links and fallbacks depend on it).'
            : slugTaken ? 'This slug is already used by another page.' : 'Lowercase letters, numbers and dashes.'}
        >
          <div className="flex items-center overflow-hidden rounded-md border bg-background">
            <span className="pl-2.5 text-[13px] font-bold text-zinc-400 dark:text-zinc-500">/</span>
            <Input
              value={page.slug}
              onChange={(e) => onSlug(e.target.value)}
              disabled={page.system}
              placeholder="my-page"
              className="rounded-none border-0 font-mono text-[12.5px] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {page.system && <Lock className="mr-2.5 h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600" />}
          </div>
          {page.slug && (!slugValid || slugTaken) && (
            <p className="text-[11px] font-semibold text-rose-500">{slugTaken ? 'Slug already in use.' : 'Use lowercase letters, numbers and dashes only.'}</p>
          )}
        </Field>
        <Field label="Content">
          <RichEditor value={page.body} onChange={onBody} placeholder="Write the page content…" minRows={13} />
        </Field>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {!page.system ? (
            <Button
              variant="ghost" size="sm"
              onClick={onAskDelete}
              className="gap-1.5 rounded-lg text-[12.5px] font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete page
            </Button>
          ) : (
            <span className="text-[11px] text-zinc-300 dark:text-zinc-600">System pages cannot be deleted</span>
          )}
          <Button
            size="sm"
            onClick={onDone}
            className="gap-1.5 rounded-full px-4 text-[12.5px] font-black text-[var(--on-brand)]"
            style={{ background: 'var(--brand)' }}
          >
            <Check className="h-3.5 w-3.5" /> Done
          </Button>
        </div>
      </div>
    </div>
  )
}
