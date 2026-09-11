'use client'

// Super Admin — Platform settings: brand, pricing, currency conversion and danger zone.

import { useMemo, useState } from 'react'
import { Save, RefreshCw, Link2, AlertTriangle, Cog, Zap, Turtle, Rocket, MessagesSquare, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { api, mutate, useApi } from '@/lib/api'
import { AdminCard, FieldLabel } from './admin-ui'
import { cn } from '@/lib/utils'

const GENERAL_DEFAULTS = { brand_name: 'GrowthRush', brand_tagline: '', subdomain_base: 'growthrush.io' }
const PRICING_DEFAULTS = { external_api_price: '19.99', custom_domain_price: '9.99' }
const ENGINE_DEFAULTS = { engine_enabled: '1', engine_speed: 'normal', engine_partial_rate: '0.07' }
const REFERRAL_DEFAULTS = { ref_enabled: '1', ref_bonus_amount: '1', ref_welcome_credit: '1' }

const SPEEDS = [
  { key: 'slow', label: 'Slow', icon: Turtle, hint: '~30s queue · done in ~2 min' },
  { key: 'normal', label: 'Normal', icon: Cog, hint: '~12s queue · done in ~1 min' },
  { key: 'turbo', label: 'Turbo', icon: Rocket, hint: '~4s queue · done in ~15 s' },
] as const

export function SettingsSection() {
  const { refreshPublic } = useApp()
  const { data, loading, refresh } = useApi<{ settings: Record<string, string>; platformCount: number }>('/api/admin/settings')

  // Server values with unsaved local edits layered on top (no hydration effects needed)
  const [generalEdits, setGeneralEdits] = useState<Partial<typeof GENERAL_DEFAULTS>>({})
  const [pricingEdits, setPricingEdits] = useState<Partial<typeof PRICING_DEFAULTS>>({})
  const [conversionEdits, setConversionEdits] = useState<Record<string, string>>({})
  const [engineEdits, setEngineEdits] = useState<Partial<typeof ENGINE_DEFAULTS>>({})
  const [referralEdits, setReferralEdits] = useState<Partial<typeof REFERRAL_DEFAULTS>>({})
  const [syncing, setSyncing] = useState(false)

  const general = useMemo(() => {
    const s = data?.settings ?? {}
    return {
      brand_name: generalEdits.brand_name ?? s.brand_name ?? GENERAL_DEFAULTS.brand_name,
      brand_tagline: generalEdits.brand_tagline ?? s.brand_tagline ?? GENERAL_DEFAULTS.brand_tagline,
      subdomain_base: generalEdits.subdomain_base ?? s.subdomain_base ?? GENERAL_DEFAULTS.subdomain_base,
    }
  }, [data, generalEdits])

  const pricing = useMemo(() => {
    const s = data?.settings ?? {}
    return {
      external_api_price: pricingEdits.external_api_price ?? s.external_api_price ?? PRICING_DEFAULTS.external_api_price,
      custom_domain_price: pricingEdits.custom_domain_price ?? s.custom_domain_price ?? PRICING_DEFAULTS.custom_domain_price,
    }
  }, [data, pricingEdits])

  const conversion = useMemo(() => {
    const s = data?.settings ?? {}
    return {
      conversion_mode: conversionEdits.conversion_mode ?? s.conversion_mode ?? 'manual',
      conversion_api_url: conversionEdits.conversion_api_url ?? s.conversion_api_url ?? '',
    }
  }, [data, conversionEdits])

  const engine = useMemo(() => {
    const s = data?.settings ?? {}
    return {
      engine_enabled: engineEdits.engine_enabled ?? s.engine_enabled ?? ENGINE_DEFAULTS.engine_enabled,
      engine_speed: engineEdits.engine_speed ?? s.engine_speed ?? ENGINE_DEFAULTS.engine_speed,
      engine_partial_rate: engineEdits.engine_partial_rate ?? s.engine_partial_rate ?? ENGINE_DEFAULTS.engine_partial_rate,
    }
  }, [data, engineEdits])

  const chatter = data?.settings?.crm_chatter ?? '1'

  const referral = useMemo(() => {
    const s = data?.settings ?? {}
    return {
      ref_enabled: referralEdits.ref_enabled ?? s.ref_enabled ?? REFERRAL_DEFAULTS.ref_enabled,
      ref_bonus_amount: referralEdits.ref_bonus_amount ?? s.ref_bonus_amount ?? REFERRAL_DEFAULTS.ref_bonus_amount,
      ref_welcome_credit: referralEdits.ref_welcome_credit ?? s.ref_welcome_credit ?? REFERRAL_DEFAULTS.ref_welcome_credit,
    }
  }, [data, referralEdits])

  const saveGroup = async (
    group: 'general' | 'pricing' | 'conversion' | 'engine' | 'chatter' | 'referral',
    payload: Record<string, string>,
    success: string,
  ) => {
    const ok = await mutate(() => api.patch('/api/admin/settings', payload), { success })
    if (ok) {
      if (group === 'general') setGeneralEdits({})
      else if (group === 'pricing') setPricingEdits({})
      else if (group === 'engine') setEngineEdits({})
      else if (group === 'referral') setReferralEdits({})
      else if (group === 'chatter') { /* value-only toggle, nothing to clear */ }
      else setConversionEdits({})
      refresh()
      refreshPublic()
    }
  }

  const testSync = async () => {
    setSyncing(true)
    await mutate(() => api.post('/api/admin/currencies/refresh'), { success: 'Rates synced from API' })
    setSyncing(false)
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PanelPageHeader title="Settings" description="…" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PanelPageHeader title="Settings" description="Global configuration for the GrowthRush master platform." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* General */}
        <AdminCard title="General" description={`${data?.platformCount ?? 0} reseller platform(s) live`}>
          <div className="space-y-3">
            <div><FieldLabel>Brand name</FieldLabel><Input value={general.brand_name} onChange={(e) => setGeneralEdits({ ...generalEdits, brand_name: e.target.value })} /></div>
            <div><FieldLabel>Tagline</FieldLabel><Input value={general.brand_tagline} onChange={(e) => setGeneralEdits({ ...generalEdits, brand_tagline: e.target.value })} placeholder="The #1 SMM panel & reseller SaaS" /></div>
            <div><FieldLabel hint="resellers get slug.subdomain_base">Subdomain base</FieldLabel><Input value={general.subdomain_base} onChange={(e) => setGeneralEdits({ ...generalEdits, subdomain_base: e.target.value })} /></div>
            <Button onClick={() => saveGroup('general', general, 'General settings saved')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Save className="mr-1.5 h-4 w-4" /> Save general
            </Button>
          </div>
        </AdminCard>

        {/* Pricing */}
        <AdminCard title="Add-on pricing" description="Fees charged to resellers for optional extras (USD)">
          <div className="space-y-3">
            <div><FieldLabel hint="monthly connector fee">External API price</FieldLabel><Input type="number" step="0.01" value={pricing.external_api_price} onChange={(e) => setPricingEdits({ ...pricingEdits, external_api_price: e.target.value })} /></div>
            <div><FieldLabel hint="one-time setup fee">Custom domain price</FieldLabel><Input type="number" step="0.01" value={pricing.custom_domain_price} onChange={(e) => setPricingEdits({ ...pricingEdits, custom_domain_price: e.target.value })} /></div>
            <Button onClick={() => saveGroup('pricing', pricing, 'Pricing saved')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Save className="mr-1.5 h-4 w-4" /> Save pricing
            </Button>
          </div>
        </AdminCard>

        {/* Currency conversion */}
        <AdminCard title="Currency conversion" description="How display exchange rates are kept fresh" className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <RadioGroup value={conversion.conversion_mode} onValueChange={(v) => setConversionEdits({ ...conversionEdits, conversion_mode: v })} className="gap-2">
                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
                  <div>
                    <Label htmlFor="mode-manual" className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">Manual rates</Label>
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">You edit rates by hand in the Currencies section.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <RadioGroupItem value="api" id="mode-api" className="mt-0.5" />
                  <div>
                    <Label htmlFor="mode-api" className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">Automatic (API)</Label>
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">Pull rates from the endpoint below — any JSON with a rates map.</p>
                  </div>
                </div>
              </RadioGroup>
              <Button
                onClick={() => saveGroup('conversion', conversion, 'Conversion settings saved')}
                className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]"
                style={{ background: 'var(--brand)' }}
              >
                <Save className="mr-1.5 h-4 w-4" /> Save conversion
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel hint="try https://open.er-api.com/v6/latest/USD">Conversion API URL</FieldLabel>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    value={conversion.conversion_api_url}
                    onChange={(e) => setConversionEdits({ ...conversionEdits, conversion_api_url: e.target.value })}
                    className="pl-9 font-mono text-[12px]"
                    placeholder="https://api.exchangerate.host/latest?base=USD"
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-zinc-400 dark:text-zinc-500">Accepts <code className="rounded bg-zinc-100 dark:bg-zinc-800/60 px-1">{'{rates:{USD:1,…}}'}</code> or a flat <code className="rounded bg-zinc-100 dark:bg-zinc-800/60 px-1">{'{USD:1,…}'}</code> map. 5s timeout.</p>
              </div>
              <Button
                variant="outline"
                onClick={testSync}
                disabled={syncing || !conversion.conversion_api_url}
                className="h-9 rounded-full px-4 text-[13px] font-bold"
              >
                <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing…' : 'Test & sync now'}
              </Button>
              <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">Tip: save the URL first, then test. Synced rates are stored in the Currencies table.</p>
            </div>
          </div>
        </AdminCard>

        {/* Delivery engine */}
        <AdminCard
          title="Delivery engine"
          description="Simulates provider progress on SMM orders (cron worker)"
          actions={
            <Switch
              checked={engine.engine_enabled !== '0'}
              onCheckedChange={(v) => saveGroup('engine', { ...engine, engine_enabled: v ? '1' : '0' }, v ? 'Delivery engine started' : 'Delivery engine paused')}
              aria-label="Toggle delivery engine"
            />
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SPEEDS.map((s) => {
                const active = engine.engine_speed === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => saveGroup('engine', { ...engine, engine_speed: s.key }, `Speed set to ${s.label}`)}
                    disabled={engine.engine_enabled === '0'}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition disabled:opacity-50',
                      active
                        ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold">
                      <s.icon className={cn('h-3.5 w-3.5', active ? 'text-[var(--brand)]' : 'text-zinc-400 dark:text-zinc-500')} />
                      {s.label}
                    </span>
                    <span className="text-[10.5px] leading-snug text-zinc-400 dark:text-zinc-500">{s.hint}</span>
                  </button>
                )
              })}
            </div>
            <div className="max-w-[220px]">
              <FieldLabel hint="chance an order finishes PARTIAL with auto-refund">Partial delivery rate</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="0" max="90" step="1"
                  value={Math.round(parseFloat(engine.engine_partial_rate || '0') * 100)}
                  onChange={(e) => setEngineEdits({ ...engineEdits, engine_partial_rate: String(Math.min(90, Math.max(0, Number(e.target.value) || 0) / 100)) })}
                  disabled={engine.engine_enabled === '0'}
                />
                <span className="flex items-center gap-1 text-[13px] font-bold text-zinc-500 dark:text-zinc-400"><Zap className="h-3.5 w-3.5" /> %</span>
              </div>
            </div>
            <Button
              onClick={() => saveGroup('engine', engine, 'Delivery engine saved')}
              disabled={engine.engine_enabled === '0'}
              className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              <Save className="mr-1.5 h-4 w-4" /> Save engine
            </Button>
          </div>
        </AdminCard>

        {/* CRM live chatter */}
        <AdminCard
          title="CRM live chatter"
          description="Customers keep writing into reseller inboxes (simulated) — conversations on AI mode get instant bot replies"
          actions={
            <Switch
              checked={chatter !== '0'}
              onCheckedChange={(v) => saveGroup('chatter', { crm_chatter: v ? '1' : '0' }, v ? 'CRM live chatter enabled' : 'CRM live chatter disabled')}
              aria-label="Toggle CRM live chatter"
            />
          }
        >
          <div className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
              <MessagesSquare className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold">Omnichannel inbox demo traffic</p>
              <p className="text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                ~1 incoming message per minute across platforms. Unread badges, bell notifications and websocket live-bubbles included.
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                chatter !== '0' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400',
              )}
            >
              {chatter !== '0' ? 'LIVE' : 'PAUSED'}
            </span>
          </div>
        </AdminCard>

        {/* Referral program */}
        <AdminCard
          title="Referral program"
          description="Viral growth loop — clients share a link, earn credit on friends' first orders"
          actions={
            <Switch
              checked={referral.ref_enabled !== '0'}
              onCheckedChange={(v) => saveGroup('referral', { ...referral, ref_enabled: v ? '1' : '0' }, v ? 'Referral program enabled' : 'Referral program paused')}
              aria-label="Toggle referral program"
            />
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
                <Gift className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">Invite → signup → first order → bonus</p>
                <p className="text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                  Every account gets a unique ?ref= link in Account. When paused, links stop attributing and pending bonuses stop accruing.
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                  referral.ref_enabled !== '0' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400',
                )}
              >
                {referral.ref_enabled !== '0' ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel hint="credited on friend's first completed order">Referral bonus (USD)</FieldLabel>
                <Input
                  type="number" min="0" max="100" step="0.5"
                  value={referral.ref_bonus_amount}
                  onChange={(e) => setReferralEdits({ ...referralEdits, ref_bonus_amount: String(Math.min(100, Math.max(0, Number(e.target.value) || 0))) })}
                  disabled={referral.ref_enabled === '0'}
                />
              </div>
              <div>
                <FieldLabel hint="free credit for every new account">Welcome credit (USD)</FieldLabel>
                <Input
                  type="number" min="0" max="100" step="0.5"
                  value={referral.ref_welcome_credit}
                  onChange={(e) => setReferralEdits({ ...referralEdits, ref_welcome_credit: String(Math.min(100, Math.max(0, Number(e.target.value) || 0))) })}
                />
              </div>
            </div>
            <Button
              onClick={() => saveGroup('referral', referral, 'Referral program saved')}
              className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              <Save className="mr-1.5 h-4 w-4" /> Save referral program
            </Button>
          </div>
        </AdminCard>

        {/* Danger zone */}
        <AdminCard title="Danger zone" description="Irreversible or high-impact actions" className="border-rose-200 dark:border-rose-900/60 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-rose-800">Handle with care</p>
              <p className="text-[12px] text-rose-600/80">
                Suspending platforms, banning users and rejecting deposits take effect immediately. Deleting catalog items is blocked while orders exist to preserve financial history.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
