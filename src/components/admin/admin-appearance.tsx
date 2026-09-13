// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Super Admin — Landing Studio: edit the public landing SECTION BY SECTION.
// Copy lives in the `landing_copy` setting (JSON); theme lives in `landing_theme`.

import { useMemo, useState } from 'react'
import {
  BarChart3, Check, ExternalLink, HelpCircle, ListOrdered, Megaphone,
  Palette, Rocket, Save, Sparkles, Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { api, mutate, useApi } from '@/lib/api'
import { THEMES, themeVars, type ThemeKey } from '@/lib/themes'
import { AdminCard, FieldLabel } from './admin-ui'

/* ------------------------------- copy schema ------------------------------- */

type StepCopy = { n: string; title: string; desc: string }

/** Every editable string of the landing copy (kept in sync with landing.tsx defaults). */
const COPY_STRING_KEYS = [
  'badge', 'heroTitle1', 'heroTitle2', 'heroTitle3', 'heroSub', 'ctaPrimary', 'ctaSecondary',
  'statsOrders', 'statsResellers', 'statsServices', 'statsUptime',
  'stepsTitle', 'featuresEyebrow', 'featuresTitle',
  'pricingEyebrow', 'pricingTitle', 'pricingSub',
  'faqEyebrow', 'faqTitle', 'faqSub',
  'ctaTitle', 'ctaSub', 'ctaButton',
] as const

type CopyStringKey = (typeof COPY_STRING_KEYS)[number]

type StudioCopy = Record<CopyStringKey, string> & { steps: StepCopy[] }

/** Defaults mirror the hardcoded landing strings exactly.
 *  Empty string = "inherit the landing default" (i18n / brand-aware fields stay empty). */
const DEFAULT_COPY: StudioCopy = {
  badge: 'One platform. Three powerful businesses.',
  heroTitle1: 'Launch your own',
  heroTitle2: 'social media marketing',
  heroTitle3: 'business today',
  heroSub: 'Automated SMM orders, a built-in omnichannel CRM, AI-powered automations and white-label reseller plans. Everything you need to run — and resell — a social media empire.',
  ctaPrimary: 'Get started free',
  ctaSecondary: 'See live demo',
  statsOrders: '12.4M+',
  statsResellers: '3,800+',
  statsServices: '18,500+',
  statsUptime: '99.9%',
  stepsTitle: 'Live in three steps. Literally.',
  steps: [
    { n: '01', title: 'Pick your plan', desc: 'Start on Starter, Pro or Agency — upgrade whenever your volume grows.' },
    { n: '02', title: 'Choose your domain', desc: 'Get a free subdomain instantly, or connect your own custom domain.' },
    { n: '03', title: 'Launch & resell', desc: 'Import services, set your prices and start taking orders today.' },
  ],
  featuresEyebrow: 'Features',
  featuresTitle: '', // empty → landing falls back to t('landing.features.title')
  pricingEyebrow: 'Pricing',
  pricingTitle: '', // → t('landing.pricing.title')
  pricingSub: '', // → t('landing.pricing.sub')
  faqEyebrow: 'FAQ',
  faqTitle: 'Questions, answered.',
  faqSub: '', // optional, hidden when empty
  ctaTitle: '', // → default keeps the gradient word
  ctaSub: '', // → default interpolates the live brand name
  ctaButton: '', // → t('landing.cta.buy')
}

/** Parse the stored `landing_copy` JSON into a full StudioCopy (missing keys → defaults). */
function normalizeCopy(raw: string | undefined): StudioCopy {
  const base: StudioCopy = { ...DEFAULT_COPY, steps: DEFAULT_COPY.steps.map((s) => ({ ...s })) }
  if (!raw) return base
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return base
  }
  if (typeof parsed !== 'object' || parsed === null) return base
  const out = base
  for (const k of COPY_STRING_KEYS) {
    const v = parsed[k]
    if (typeof v === 'string') out[k] = v
  }
  if (Array.isArray(parsed.steps)) {
    const rows = parsed.steps.slice(0, 3).map((item) => {
      const o = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
      return {
        n: typeof o.n === 'string' ? o.n : '',
        title: typeof o.title === 'string' ? o.title : '',
        desc: typeof o.desc === 'string' ? o.desc : '',
      }
    })
    while (rows.length < 3) rows.push({ n: '', title: '', desc: '' })
    out.steps = rows
  }
  return out
}

/** Serialize the draft: empty strings are dropped so the JSON stays "optional" (landing defaults kick in). */
function buildCopyJson(copy: StudioCopy): string {
  const out: Record<string, unknown> = {}
  for (const k of COPY_STRING_KEYS) {
    if (copy[k] !== '') out[k] = copy[k]
  }
  if (copy.steps.some((s) => s.n !== '' || s.title !== '' || s.desc !== '')) {
    out.steps = copy.steps.map((s) => ({ n: s.n, title: s.title, desc: s.desc }))
  }
  return JSON.stringify(out)
}

/* --------------------------------- sections -------------------------------- */

const SECTIONS = [
  { key: 'hero', label: 'Hero', icon: Rocket, hint: 'Badge, title, CTAs' },
  { key: 'stats', label: 'Stats bar', icon: BarChart3, hint: '4 numbers' },
  { key: 'steps', label: 'How it works', icon: ListOrdered, hint: 'Title + 3 steps' },
  { key: 'features', label: 'Features header', icon: Sparkles, hint: 'Eyebrow + title' },
  { key: 'pricing', label: 'Pricing header', icon: Tag, hint: 'Eyebrow + title + sub' },
  { key: 'faq', label: 'FAQ header', icon: HelpCircle, hint: 'Eyebrow + title + sub' },
  { key: 'cta', label: 'Final CTA', icon: Megaphone, hint: 'Title + sub + button' },
  { key: 'theme', label: 'Theme', icon: Palette, hint: 'Color preset' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

/** Fields owned by each editor panel ('steps' is the nested array key). */
type CopyField = CopyStringKey | 'steps'

const SECTION_FIELDS: Record<SectionKey, CopyField[]> = {
  hero: ['badge', 'heroTitle1', 'heroTitle2', 'heroTitle3', 'heroSub', 'ctaPrimary', 'ctaSecondary'],
  stats: ['statsOrders', 'statsResellers', 'statsServices', 'statsUptime'],
  steps: ['stepsTitle', 'steps'],
  features: ['featuresEyebrow', 'featuresTitle'],
  pricing: ['pricingEyebrow', 'pricingTitle', 'pricingSub'],
  faq: ['faqEyebrow', 'faqTitle', 'faqSub'],
  cta: ['ctaTitle', 'ctaSub', 'ctaButton'],
  theme: [],
}

/* ---------------------------- small UI helpers ----------------------------- */

function SaveBar({ dirty, saving, onSave }: { dirty: boolean; saving: boolean; onSave: () => void }) {
  return (
    <>
      {dirty && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Unsaved changes
        </span>
      )}
      <Button
        onClick={onSave}
        disabled={!dirty || saving}
        className="h-8 rounded-full px-4 text-[12px] font-bold text-[var(--on-brand)] disabled:opacity-50"
        style={{ background: 'var(--brand)' }}
      >
        <Save className="mr-1 h-3.5 w-3.5" /> Save copy
      </Button>
    </>
  )
}

function TextField({ label, hint, value, placeholder, onChange, long, className }: {
  label: string
  hint?: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  long?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      {long ? (
        <Textarea rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

/* ------------------------------ preview cards ------------------------------ */

function HeroPreview({ copy, themeKey }: { copy: StudioCopy; themeKey: ThemeKey }) {
  const th = THEMES[themeKey] ?? THEMES.rush
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800" style={themeVars(themeKey)}>
      <div className="relative px-4 py-5" style={{ background: `linear-gradient(165deg, ${th.dark} 30%, ${th.accent}66 130%)` }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold" style={{ borderColor: `${th.accent}55`, color: th.accent2 }}>
            <Rocket className="h-3 w-3" /> {copy.badge || 'Your badge here'}
          </span>
          <h3 className="mt-3 text-[19px] font-black leading-[1.12] tracking-tight text-white">
            {copy.heroTitle1 || '—'}
            <br />
            {copy.heroTitle2 || '—'}
            <br />
            <span style={{ color: th.accent2 }}>{copy.heroTitle3 || '—'}</span>
          </h3>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/60">{copy.heroSub || '—'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3.5 py-1.5 text-[11px] font-bold" style={{ background: th.accent, color: th.onBrand }}>
              {copy.ctaPrimary || 'CTA'}
            </span>
            <span className="rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold text-white/85">
              {copy.ctaSecondary || 'CTA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsPreview({ copy, themeKey }: { copy: StudioCopy; themeKey: ThemeKey }) {
  const th = THEMES[themeKey] ?? THEMES.rush
  const stats = [
    { v: copy.statsOrders, l: 'Orders' },
    { v: copy.statsResellers, l: 'Resellers' },
    { v: copy.statsServices, l: 'Services' },
    { v: copy.statsUptime, l: 'Uptime' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-zinc-200 px-4 py-4 dark:border-zinc-800" style={{ background: th.dark, ...themeVars(themeKey) }}>
      {stats.map((s) => (
        <div key={s.l}>
          <p className="text-[15px] font-extrabold tracking-tight" style={{ color: 'var(--brand-2)' }}>{s.v || '—'}</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">{s.l}</p>
        </div>
      ))}
    </div>
  )
}

function HeadPreview({ eyebrow, title, sub, themeKey }: { eyebrow: string; title: string; sub?: string; themeKey: ThemeKey }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-center dark:border-zinc-800 dark:bg-zinc-900" style={themeVars(themeKey)}>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--brand-ink)] dark:text-[var(--brand)]">{eyebrow}</p>
      <p className="text-[17px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">{title}</p>
      {sub ? <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">{sub}</p> : null}
    </div>
  )
}

function StepsPreview({ steps, themeKey }: { steps: StepCopy[]; themeKey: ThemeKey }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900" style={themeVars(themeKey)}>
      {steps.map((s, i) => (
        <div key={i} className="text-center">
          <span
            className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black text-[var(--on-brand)]"
            style={{ background: 'var(--brand)' }}
          >
            {s.n || `0${i + 1}`}
          </span>
          <p className="text-[11.5px] font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">{s.title || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function CtaPreview({ title, sub, button, themeKey }: { title: string; sub: string; button: string; themeKey: ThemeKey }) {
  const th = THEMES[themeKey] ?? THEMES.rush
  return (
    <div className="rounded-2xl px-4 py-6 text-center" style={{ background: th.dark, ...themeVars(themeKey) }}>
      <p className="text-[16px] font-black tracking-tight text-white">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-white/60">{sub}</p>
      <span
        className="mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-bold text-[var(--on-brand)]"
        style={{ background: 'var(--brand)' }}
      >
        {button}
      </span>
    </div>
  )
}

/* ================================ COMPONENT ================================ */

export function AppearanceSection() {
  const { t } = useI18n()
  const { refreshPublic, publicSettings } = useApp()
  const { data, loading, refresh } = useApi<{ settings: Record<string, string> }>('/api/admin/settings')

  const [section, setSection] = useState<SectionKey>('hero')

  // ── Theme (kept as before: instant save on pick) ──
  const savedTheme = (data?.settings?.landing_theme ?? 'rush') as ThemeKey
  const [themeOverride, setThemeOverride] = useState<ThemeKey | null>(null)
  const theme = themeOverride ?? savedTheme
  const th = THEMES[theme] ?? THEMES.rush

  const pickTheme = async (key: ThemeKey) => {
    const prev = theme
    setThemeOverride(key)
    const ok = await mutate(
      () => api.patch('/api/admin/settings', { landing_theme: key }),
      { success: `Landing theme set to ${THEMES[key].name}` },
    )
    if (ok) {
      refresh()
      refreshPublic()
    } else {
      setThemeOverride(prev)
    }
  }

  // ── Copy draft (merged over the stored JSON) ──
  const savedCopy = useMemo(() => normalizeCopy(data?.settings?.landing_copy), [data])
  const [edits, setEdits] = useState<Partial<StudioCopy>>({})
  const draft: StudioCopy = useMemo(() => ({ ...savedCopy, ...edits }), [savedCopy, edits])

  const draftJson = useMemo(() => buildCopyJson(draft), [draft])
  const savedJson = useMemo(() => buildCopyJson(savedCopy), [savedCopy])
  const isDirty = draftJson !== savedJson
  const [saving, setSaving] = useState(false)

  const sectionDirty = (key: SectionKey) =>
    SECTION_FIELDS[key].some((f) => JSON.stringify(draft[f]) !== JSON.stringify(savedCopy[f]))

  const setField = (k: CopyStringKey, v: string) => setEdits((e) => ({ ...e, [k]: v }))
  const setStep = (i: number, k: keyof StepCopy, v: string) =>
    setEdits((e) => {
      const steps = [...(e.steps ?? savedCopy.steps)]
      steps[i] = { ...steps[i], [k]: v }
      return { ...e, steps }
    })

  const saveCopy = async () => {
    setSaving(true)
    const ok = await mutate(
      () => api.patch('/api/admin/settings', { landing_copy: draftJson }),
      { success: 'Landing copy saved' },
    )
    setSaving(false)
    if (ok) {
      setEdits({})
      refresh()
      refreshPublic()
    }
  }

  // ── Effective values (what the landing renders for empty fields) ──
  const brandName = publicSettings?.brand_name || 'GrowthRush'
  const eff = {
    featuresEyebrow: draft.featuresEyebrow || 'Features',
    featuresTitle: draft.featuresTitle || t('landing.features.title'),
    pricingEyebrow: draft.pricingEyebrow || 'Pricing',
    pricingTitle: draft.pricingTitle || t('landing.pricing.title'),
    pricingSub: draft.pricingSub || t('landing.pricing.sub'),
    faqEyebrow: draft.faqEyebrow || 'FAQ',
    faqTitle: draft.faqTitle || 'Questions, answered.',
    faqSub: draft.faqSub || undefined,
    stepsTitle: draft.stepsTitle || 'Live in three steps. Literally.',
    ctaTitle: draft.ctaTitle || 'Ready to launch your SMM empire?',
    ctaSub: draft.ctaSub || `Join thousands of resellers running their own branded panels with ${brandName}. Setup takes less than five minutes.`,
    ctaButton: draft.ctaButton || t('landing.cta.buy'),
  }

  return (
    <div className="space-y-5">
      <PanelPageHeader
        title="Landing Studio"
        description="Edit the public landing section by section — copy saves per panel, theme applies instantly."
        actions={
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event('gr:exit'))}
            className="h-9 rounded-full px-4 text-[12.5px] font-bold"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View landing
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[248px_1fr]">
        {/* ───────────────────────────── LEFT NAV ───────────────────────────── */}
        <nav aria-label="Landing sections" className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
          {SECTIONS.map((s) => {
            const active = section === s.key
            const dirty = sectionDirty(s.key)
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                aria-current={active ? 'true' : undefined}
                className={`flex min-w-[168px] shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition xl:min-w-0 xl:w-full ${
                  active
                    ? 'border-[var(--brand)] bg-white shadow-sm ring-1 ring-[var(--brand)] dark:bg-zinc-900'
                    : 'border-transparent hover:bg-zinc-900/5 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    active ? 'text-[var(--on-brand)]' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800/70 dark:text-zinc-500'
                  }`}
                  style={active ? { background: 'var(--brand)' } : undefined}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[13px] font-bold ${active ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-600 dark:text-zinc-300'}`}>
                    {s.label}
                  </span>
                  <span className="block truncate text-[10.5px] font-medium text-zinc-400 dark:text-zinc-500">{s.hint}</span>
                </span>
                {dirty && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Unsaved changes" />}
              </button>
            )
          })}
        </nav>

        {/* ─────────────────────────── RIGHT EDITOR ─────────────────────────── */}
        <div className="min-w-0 space-y-4">
          {/* ================================ HERO ================================ */}
          {section === 'hero' && (
            <AdminCard
              title="Hero"
              description="The first thing every visitor sees — badge, 3-line title, subtitle and CTAs."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_250px]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField label="Badge" hint="pill above the hero" value={draft.badge} onChange={(v) => setField('badge', v)} className="sm:col-span-2" />
                  <TextField label="Hero title · line 1" value={draft.heroTitle1} onChange={(v) => setField('heroTitle1', v)} />
                  <TextField label="Hero title · line 2" value={draft.heroTitle2} onChange={(v) => setField('heroTitle2', v)} />
                  <TextField label="Hero title · line 3" hint="line 3 is accent colored" value={draft.heroTitle3} onChange={(v) => setField('heroTitle3', v)} />
                  <TextField label="Subtitle" long value={draft.heroSub} onChange={(v) => setField('heroSub', v)} className="sm:col-span-2" />
                  <TextField label="Primary CTA" value={draft.ctaPrimary} onChange={(v) => setField('ctaPrimary', v)} />
                  <TextField label="Secondary CTA" value={draft.ctaSecondary} onChange={(v) => setField('ctaSecondary', v)} />
                </div>
                <div className="space-y-1.5">
                  <p className="px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
                  <HeroPreview copy={draft} themeKey={theme} />
                </div>
              </div>
            </AdminCard>
          )}

          {/* =============================== STATS =============================== */}
          {section === 'stats' && (
            <AdminCard
              title="Stats bar"
              description="The 4 numbers under the hero — keep them short and credible."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField label="Stat · orders" value={draft.statsOrders} onChange={(v) => setField('statsOrders', v)} />
                <TextField label="Stat · resellers" value={draft.statsResellers} onChange={(v) => setField('statsResellers', v)} />
                <TextField label="Stat · services" value={draft.statsServices} onChange={(v) => setField('statsServices', v)} />
                <TextField label="Stat · uptime" value={draft.statsUptime} onChange={(v) => setField('statsUptime', v)} />
              </div>
              <p className="mt-4 mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
              <StatsPreview copy={draft} themeKey={theme} />
            </AdminCard>
          )}

          {/* ============================ HOW IT WORKS ============================ */}
          {section === 'steps' && (
            <AdminCard
              title="How it works"
              description="Section title plus the 3 numbered steps."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid grid-cols-1 gap-3">
                <TextField label="Section title" value={draft.stepsTitle} onChange={(v) => setField('stepsTitle', v)} />
                {draft.steps.map((step, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Step {i + 1}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[80px_1fr]">
                      <TextField label="Nº" value={step.n} placeholder={`0${i + 1}`} onChange={(v) => setStep(i, 'n', v)} />
                      <TextField label="Title" value={step.title} onChange={(v) => setStep(i, 'title', v)} />
                    </div>
                    <div className="mt-3">
                      <TextField label="Description" long value={step.desc} onChange={(v) => setStep(i, 'desc', v)} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
              <StepsPreview steps={draft.steps} themeKey={theme} />
            </AdminCard>
          )}

          {/* =========================== FEATURES HEADER =========================== */}
          {section === 'features' && (
            <AdminCard
              title="Features header"
              description="The heading above the features grid."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid grid-cols-1 gap-3">
                <TextField label="Eyebrow" value={draft.featuresEyebrow} onChange={(v) => setField('featuresEyebrow', v)} />
                <TextField
                  label="Title"
                  hint="leave empty to keep the translated default"
                  value={draft.featuresTitle}
                  placeholder={t('landing.features.title')}
                  onChange={(v) => setField('featuresTitle', v)}
                />
              </div>
              <p className="mt-4 mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
              <HeadPreview eyebrow={eff.featuresEyebrow} title={eff.featuresTitle} themeKey={theme} />
            </AdminCard>
          )}

          {/* =========================== PRICING HEADER =========================== */}
          {section === 'pricing' && (
            <AdminCard
              title="Pricing header"
              description="The heading above the pricing plans."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid grid-cols-1 gap-3">
                <TextField label="Eyebrow" value={draft.pricingEyebrow} onChange={(v) => setField('pricingEyebrow', v)} />
                <TextField
                  label="Title"
                  hint="leave empty to keep the translated default"
                  value={draft.pricingTitle}
                  placeholder={t('landing.pricing.title')}
                  onChange={(v) => setField('pricingTitle', v)}
                />
                <TextField
                  label="Subtitle"
                  long
                  hint="leave empty to keep the translated default"
                  value={draft.pricingSub}
                  placeholder={t('landing.pricing.sub')}
                  onChange={(v) => setField('pricingSub', v)}
                />
              </div>
              <p className="mt-4 mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
              <HeadPreview eyebrow={eff.pricingEyebrow} title={eff.pricingTitle} sub={eff.pricingSub} themeKey={theme} />
            </AdminCard>
          )}

          {/* ============================= FAQ HEADER ============================= */}
          {section === 'faq' && (
            <AdminCard
              title="FAQ header"
              description="The heading above the questions accordion."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid grid-cols-1 gap-3">
                <TextField label="Eyebrow" value={draft.faqEyebrow} onChange={(v) => setField('faqEyebrow', v)} />
                <TextField label="Title" value={draft.faqTitle} onChange={(v) => setField('faqTitle', v)} />
                <TextField
                  label="Subtitle"
                  long
                  hint="optional — leave empty to hide"
                  value={draft.faqSub}
                  onChange={(v) => setField('faqSub', v)}
                />
              </div>
              <p className="mt-4 mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
              <HeadPreview eyebrow={eff.faqEyebrow} title={eff.faqTitle} sub={eff.faqSub} themeKey={theme} />
            </AdminCard>
          )}

          {/* ============================= FINAL CTA ============================= */}
          {section === 'cta' && (
            <AdminCard
              title="Final CTA"
              description="The closing band before the footer."
              actions={<SaveBar dirty={isDirty} saving={saving} onSave={saveCopy} />}
            >
              <div className="grid grid-cols-1 gap-3">
                <TextField
                  label="Title"
                  hint="leave empty to keep the gradient default"
                  value={draft.ctaTitle}
                  placeholder="Ready to launch your SMM empire?"
                  onChange={(v) => setField('ctaTitle', v)}
                />
                <TextField
                  label="Subtitle"
                  long
                  hint="{brand} is injected only in the default text"
                  value={draft.ctaSub}
                  placeholder={eff.ctaSub}
                  onChange={(v) => setField('ctaSub', v)}
                />
                <TextField
                  label="Button"
                  hint="leave empty to keep the translated default"
                  value={draft.ctaButton}
                  placeholder={t('landing.cta.buy')}
                  onChange={(v) => setField('ctaButton', v)}
                />
              </div>
              <p className="mt-4 mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Live preview</p>
              <CtaPreview title={eff.ctaTitle} sub={eff.ctaSub} button={eff.ctaButton} themeKey={theme} />
            </AdminCard>
          )}

          {/* =============================== THEME =============================== */}
          {section === 'theme' && (
            <AdminCard title="Landing theme" description="Applied instantly to the public landing page.">
              {loading && !data ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Object.values(THEMES).map((item) => {
                    const active = item.key === theme
                    return (
                      <button
                        key={item.key}
                        onClick={() => pickTheme(item.key)}
                        aria-pressed={active}
                        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${active ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md'}`}
                      >
                        <div className="flex h-20 items-center justify-center rounded-xl" style={{ background: item.dark, ...themeVars(item.key) }}>
                          <div className="flex items-end gap-1">
                            <span className="h-8 w-8 rounded-lg" style={{ background: 'var(--brand)' }} />
                            <span className="h-12 w-8 rounded-lg" style={{ background: 'linear-gradient(var(--brand), var(--brand-2))' }} />
                            <span className="h-6 w-8 rounded-lg" style={{ background: 'var(--brand-2)' }} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div>
                            <p className="text-[13.5px] font-extrabold text-zinc-900 dark:text-zinc-50">{item.name}</p>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{item.pattern}</p>
                          </div>
                          {active && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              <p className="mt-4 text-[11.5px] text-zinc-400 dark:text-zinc-500">
                Current theme: <b>{th.name}</b> — the previews in every editor use it.
              </p>
            </AdminCard>
          )}

          {/* Footer note for copy sections */}
          {section !== 'theme' && (
            <p className="px-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              Saving writes the full landing copy (all sections at once) — unsaved fields keep their current value.
              Empty optional fields fall back to the landing&apos;s built-in defaults.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
