'use client'

// Super Admin — Appearance: landing theme picker + landing copy builder with live preview.

import { useMemo, useState } from 'react'
import { Check, Paintbrush, Save, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { api, mutate, useApi } from '@/lib/api'
import { THEMES, themeVars, type ThemeKey } from '@/lib/themes'
import { AdminCard, FieldLabel } from './admin-ui'

type LandingCopy = {
  badge: string
  heroTitle1: string
  heroTitle2: string
  heroTitle3: string
  heroSub: string
  ctaPrimary: string
  ctaSecondary: string
  statsOrders: string
  statsResellers: string
  statsServices: string
  statsUptime: string
}

const DEFAULT_COPY: LandingCopy = {
  badge: 'The #1 SMM Panel & Reseller SaaS',
  heroTitle1: 'Grow every',
  heroTitle2: 'social account',
  heroTitle3: 'at rocket speed',
  heroSub: 'Real followers, likes and views with instant delivery — or launch your own SMM panel in minutes.',
  ctaPrimary: 'Get started',
  ctaSecondary: 'View services',
  statsOrders: '2.4M+',
  statsResellers: '1,800+',
  statsServices: '140+',
  statsUptime: '99.9%',
}

const COPY_FIELDS: { key: keyof LandingCopy; label: string; hint?: string; long?: boolean }[] = [
  { key: 'badge', label: 'Badge', hint: 'pill above the hero' },
  { key: 'heroTitle1', label: 'Hero title · line 1' },
  { key: 'heroTitle2', label: 'Hero title · line 2' },
  { key: 'heroTitle3', label: 'Hero title · line 3', hint: 'accent colored' },
  { key: 'heroSub', label: 'Subtitle', long: true },
  { key: 'ctaPrimary', label: 'Primary CTA' },
  { key: 'ctaSecondary', label: 'Secondary CTA' },
  { key: 'statsOrders', label: 'Stat · orders' },
  { key: 'statsResellers', label: 'Stat · resellers' },
  { key: 'statsServices', label: 'Stat · services' },
  { key: 'statsUptime', label: 'Stat · uptime' },
]

export function AppearanceSection() {
  const { t: tk } = useI18n()
  const { refreshPublic } = useApp()
  const { data, loading, refresh } = useApi<{ settings: Record<string, string> }>('/api/admin/settings')

  const savedTheme = (data?.settings?.landing_theme ?? 'rush') as ThemeKey
  const [themeOverride, setThemeOverride] = useState<ThemeKey | null>(null)
  const theme = themeOverride ?? savedTheme
  const t = THEMES[theme] ?? THEMES.rush

  const savedCopy = useMemo<LandingCopy>(() => {
    try {
      return { ...DEFAULT_COPY, ...JSON.parse(data?.settings?.landing_copy ?? '{}') }
    } catch {
      return DEFAULT_COPY
    }
  }, [data])
  const [copyEdits, setCopyEdits] = useState<Partial<LandingCopy>>({})
  const copy: LandingCopy = { ...savedCopy, ...copyEdits }

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

  const saveCopy = async () => {
    const ok = await mutate(
      () => api.patch('/api/admin/settings', { landing_copy: JSON.stringify(copy) }),
      { success: 'Landing copy saved' },
    )
    if (ok) {
      setCopyEdits({})
      refresh()
      refreshPublic()
    }
  }

  // Style objects computed outside JSX to keep markup readable
  const heroGradient = { background: `linear-gradient(165deg, ${t.dark} 30%, ${t.accent}66 130%)` }
  const dotPattern = {
    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
    backgroundSize: '22px 22px',
  }
  const badgeStyle = { borderColor: `${t.accent}55`, color: t.accent2 }
  const title3Style = { color: t.accent2 }
  const primaryCta = { background: t.accent, boxShadow: `0 8px 24px -6px ${t.glow}` }

  return (
    <div className="space-y-5">
      <PanelPageHeader title={tk('admin.appearance')} description={tk('admin.appear.desc')} />

      {/* Theme picker */}
      <AdminCard title={tk('admin.appear.themeTitle')} description={tk('admin.appear.themeDesc')}>
        {loading && !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Object.values(THEMES).map((th) => {
              const active = th.key === theme
              return (
                <button
                  key={th.key}
                  onClick={() => pickTheme(th.key)}
                  aria-pressed={active}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${active ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md'}`}
                >
                  <div className="flex h-20 items-center justify-center rounded-xl" style={{ background: th.dark, ...themeVars(th.key) }}>
                    <div className="flex items-end gap-1">
                      <span className="h-8 w-8 rounded-lg" style={{ background: 'var(--brand)' }} />
                      <span className="h-12 w-8 rounded-lg" style={{ background: 'linear-gradient(var(--brand), var(--brand-2))' }} />
                      <span className="h-6 w-8 rounded-lg" style={{ background: 'var(--brand-2)' }} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13.5px] font-extrabold text-zinc-900 dark:text-zinc-50">{th.name}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{th.pattern}</p>
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
      </AdminCard>

      {/* Landing builder */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminCard
          title={tk('admin.qa.landingBuilder')}
          description={tk('admin.appear.builderDesc')}
          actions={
            <Button onClick={saveCopy} className="h-8 rounded-full px-4 text-[12px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Save className="mr-1 h-3.5 w-3.5" /> Save copy
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COPY_FIELDS.map((f) => (
              <div key={f.key} className={f.long ? 'sm:col-span-2' : ''}>
                <FieldLabel hint={f.hint}>{f.label}</FieldLabel>
                {f.long ? (
                  <Textarea
                    rows={2}
                    value={copy[f.key]}
                    onChange={(e) => setCopyEdits({ ...copyEdits, [f.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    value={copy[f.key]}
                    onChange={(e) => setCopyEdits({ ...copyEdits, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-zinc-400 dark:text-zinc-500">
            Tip: the third hero line is highlighted with the theme accent color.
          </p>
        </AdminCard>

        {/* Live preview */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 px-1 text-[12px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            <Paintbrush className="h-3.5 w-3.5" /> Live preview
          </p>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800" style={themeVars(theme)}>
            <div className="relative px-6 py-8 sm:px-8" style={heroGradient}>
              <div className="pointer-events-none absolute inset-0 opacity-[0.13]" style={dotPattern} />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-bold" style={badgeStyle}>
                  <Rocket className="h-3 w-3" /> {copy.badge || 'Your badge here'}
                </span>
                <h2 className="mt-4 text-[26px] font-black leading-[1.08] tracking-tight text-white sm:text-[30px]">
                  {copy.heroTitle1 || '—'}
                  <br />
                  {copy.heroTitle2 || '—'}{' '}
                  <span style={title3Style}>{copy.heroTitle3 || '—'}</span>
                </h2>
                <p className="mt-3 max-w-md text-[13px] leading-relaxed text-white/60">{copy.heroSub || '—'}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full px-5 py-2.5 text-[12.5px] font-bold text-white shadow-lg" style={primaryCta}>
                    {copy.ctaPrimary || 'CTA'}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-[12.5px] font-bold text-white/85">
                    {copy.ctaSecondary || 'CTA'}
                  </span>
                </div>
                <div className="mt-7 grid grid-cols-4 gap-2 border-t border-white/10 pt-5">
                  {[
                    { v: copy.statsOrders, l: 'Orders' },
                    { v: copy.statsResellers, l: 'Resellers' },
                    { v: copy.statsServices, l: 'Services' },
                    { v: copy.statsUptime, l: 'Uptime' },
                  ].map((s) => (
                    <div key={s.l}>
                      <p className="text-[17px] font-extrabold tracking-tight text-white">{s.v || '—'}</p>
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="px-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Theme <b>{t.name}</b> · updates as you type. Save to publish.
          </p>
        </div>
      </div>
    </div>
  )
}
