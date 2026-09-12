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
import { useI18n } from '@/lib/i18n'
import { AdminCard, FieldLabel } from './admin-ui'
import { cn } from '@/lib/utils'

const GENERAL_DEFAULTS = { brand_name: 'GrowthRush', brand_tagline: '', subdomain_base: 'growthrush.io' }
const PRICING_DEFAULTS = { external_api_price: '19.99', custom_domain_price: '9.99' }
const ENGINE_DEFAULTS = { engine_enabled: '1', engine_speed: 'normal', engine_partial_rate: '0.07' }
const REFERRAL_DEFAULTS = { ref_enabled: '1', ref_bonus_amount: '1', ref_welcome_credit: '1' }

const SPEEDS: { key: string; labelKey: Parameters<ReturnType<typeof useI18n>['t']>[0]; hintKey: Parameters<ReturnType<typeof useI18n>['t']>[0]; icon: typeof Cog }[] = [
  { key: 'slow', labelKey: 'admin.set.speedSlow', hintKey: 'admin.set.speedSlowHint', icon: Turtle },
  { key: 'normal', labelKey: 'admin.set.speedNormal', hintKey: 'admin.set.speedNormalHint', icon: Cog },
  { key: 'turbo', labelKey: 'admin.set.speedTurbo', hintKey: 'admin.set.speedTurboHint', icon: Rocket },
]

export function SettingsSection() {
  const { t } = useI18n()
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
    await mutate(() => api.post('/api/admin/currencies/refresh'), { success: t('admin.cur.toastSynced') })
    setSyncing(false)
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PanelPageHeader title={t('common.settings')} description="…" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PanelPageHeader title={t('common.settings')} description={t('admin.set.desc')} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* General */}
        <AdminCard title={t('admin.set.general')} description={t('admin.set.platformsLive').replace('{n}', String(data?.platformCount ?? 0))}>
          <div className="space-y-3">
            <div><FieldLabel>{t('admin.set.brandName')}</FieldLabel><Input value={general.brand_name} onChange={(e) => setGeneralEdits({ ...generalEdits, brand_name: e.target.value })} /></div>
            <div><FieldLabel>{t('admin.set.tagline')}</FieldLabel><Input value={general.brand_tagline} onChange={(e) => setGeneralEdits({ ...generalEdits, brand_tagline: e.target.value })} placeholder={t('admin.set.taglinePlaceholder')} /></div>
            <div><FieldLabel hint={t('admin.set.subdomainHint')}>{t('admin.set.subdomainBase')}</FieldLabel><Input value={general.subdomain_base} onChange={(e) => setGeneralEdits({ ...generalEdits, subdomain_base: e.target.value })} /></div>
            <Button onClick={() => saveGroup('general', general, t('admin.set.toastGeneral'))} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Save className="mr-1.5 h-4 w-4" /> {t('admin.set.saveGeneral')}
            </Button>
          </div>
        </AdminCard>

        {/* Pricing */}
        <AdminCard title={t('admin.set.addonPricing')} description={t('admin.set.addonPricingSub')}>
          <div className="space-y-3">
            <div><FieldLabel hint={t('admin.set.apiPriceHint')}>{t('admin.set.apiPrice')}</FieldLabel><Input type="number" step="0.01" value={pricing.external_api_price} onChange={(e) => setPricingEdits({ ...pricingEdits, external_api_price: e.target.value })} /></div>
            <div><FieldLabel hint={t('admin.set.domainPriceHint')}>{t('admin.set.domainPrice')}</FieldLabel><Input type="number" step="0.01" value={pricing.custom_domain_price} onChange={(e) => setPricingEdits({ ...pricingEdits, custom_domain_price: e.target.value })} /></div>
            <Button onClick={() => saveGroup('pricing', pricing, t('admin.set.toastPricing'))} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Save className="mr-1.5 h-4 w-4" /> {t('admin.set.savePricing')}
            </Button>
          </div>
        </AdminCard>

        {/* Currency conversion */}
        <AdminCard title={t('admin.set.conversion')} description={t('admin.set.conversionSub')} className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <RadioGroup value={conversion.conversion_mode} onValueChange={(v) => setConversionEdits({ ...conversionEdits, conversion_mode: v })} className="gap-2">
                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
                  <div>
                    <Label htmlFor="mode-manual" className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">{t('admin.set.manualRates')}</Label>
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">{t('admin.set.manualRatesDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <RadioGroupItem value="api" id="mode-api" className="mt-0.5" />
                  <div>
                    <Label htmlFor="mode-api" className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">{t('admin.set.autoRates')}</Label>
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">{t('admin.set.autoRatesDesc')}</p>
                  </div>
                </div>
              </RadioGroup>
              <Button
                onClick={() => saveGroup('conversion', conversion, t('admin.set.toastConversion'))}
                className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]"
                style={{ background: 'var(--brand)' }}
              >
                <Save className="mr-1.5 h-4 w-4" /> {t('admin.set.saveConversion')}
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel hint="try https://open.er-api.com/v6/latest/USD">{t('admin.set.apiUrl')}</FieldLabel>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    value={conversion.conversion_api_url}
                    onChange={(e) => setConversionEdits({ ...conversionEdits, conversion_api_url: e.target.value })}
                    className="pl-9 font-mono text-[12px]"
                    placeholder="https://api.exchangerate.host/latest?base=USD"
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-zinc-400 dark:text-zinc-500">{t('admin.set.ratesAccepts')} <code className="rounded bg-zinc-100 dark:bg-zinc-800/60 px-1">{'{rates:{USD:1,…}}'}</code> {t('admin.set.ratesOrFlat')} <code className="rounded bg-zinc-100 dark:bg-zinc-800/60 px-1">{'{USD:1,…}'}</code> {t('admin.set.ratesTimeout')}</p>
              </div>
              <Button
                variant="outline"
                onClick={testSync}
                disabled={syncing || !conversion.conversion_api_url}
                className="h-9 rounded-full px-4 text-[13px] font-bold"
              >
                <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? t('admin.set.syncing') : t('admin.set.testSync')}
              </Button>
              <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">{t('admin.set.syncTip')}</p>
            </div>
          </div>
        </AdminCard>

        {/* Delivery engine */}
        <AdminCard
          title={t('admin.set.engine')}
          description={t('admin.set.engineSub')}
          actions={
            <Switch
              checked={engine.engine_enabled !== '0'}
              onCheckedChange={(v) => saveGroup('engine', { ...engine, engine_enabled: v ? '1' : '0' }, v ? t('admin.set.toastEngineOn') : t('admin.set.toastEngineOff'))}
              aria-label={t('admin.set.toggleEngine')}
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
                    onClick={() => saveGroup('engine', { ...engine, engine_speed: s.key }, t('admin.set.toastSpeed').replace('{speed}', t(s.labelKey)))}
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
                      {t(s.labelKey)}
                    </span>
                    <span className="text-[10.5px] leading-snug text-zinc-400 dark:text-zinc-500">{t(s.hintKey)}</span>
                  </button>
                )
              })}
            </div>
            <div className="max-w-[220px]">
              <FieldLabel hint={t('admin.set.partialRateHint')}>{t('admin.set.partialRate')}</FieldLabel>
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
              onClick={() => saveGroup('engine', engine, t('admin.set.toastEngineSaved'))}
              disabled={engine.engine_enabled === '0'}
              className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              <Save className="mr-1.5 h-4 w-4" /> {t('admin.set.saveEngine')}
            </Button>
          </div>
        </AdminCard>

        {/* CRM live chatter */}
        <AdminCard
          title={t('admin.set.chatter')}
          description={t('admin.set.chatterSub')}
          actions={
            <Switch
              checked={chatter !== '0'}
              onCheckedChange={(v) => saveGroup('chatter', { crm_chatter: v ? '1' : '0' }, v ? t('admin.set.toastChatterOn') : t('admin.set.toastChatterOff'))}
              aria-label={t('admin.set.toggleChatter')}
            />
          }
        >
          <div className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
              <MessagesSquare className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold">{t('admin.set.chatterDemo')}</p>
              <p className="text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                {t('admin.set.chatterDemoSub')}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                chatter !== '0' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400',
              )}
            >
              {chatter !== '0' ? t('admin.set.live') : t('admin.set.paused')}
            </span>
          </div>
        </AdminCard>

        {/* Referral program */}
        <AdminCard
          title={t('admin.set.referral')}
          description={t('admin.set.referralSub')}
          actions={
            <Switch
              checked={referral.ref_enabled !== '0'}
              onCheckedChange={(v) => saveGroup('referral', { ...referral, ref_enabled: v ? '1' : '0' }, v ? t('admin.set.toastRefOn') : t('admin.set.toastRefOff'))}
              aria-label={t('admin.set.toggleRef')}
            />
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
                <Gift className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">{t('admin.set.refFlow')}</p>
                <p className="text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {t('admin.set.refFlowSub')}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                  referral.ref_enabled !== '0' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400',
                )}
              >
                {referral.ref_enabled !== '0' ? t('status.ACTIVE') : t('admin.set.paused')}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel hint={t('admin.set.refBonusHint')}>{t('admin.set.refBonus')}</FieldLabel>
                <Input
                  type="number" min="0" max="100" step="0.5"
                  value={referral.ref_bonus_amount}
                  onChange={(e) => setReferralEdits({ ...referralEdits, ref_bonus_amount: String(Math.min(100, Math.max(0, Number(e.target.value) || 0))) })}
                  disabled={referral.ref_enabled === '0'}
                />
              </div>
              <div>
                <FieldLabel hint={t('admin.set.refWelcomeHint')}>{t('admin.set.refWelcome')}</FieldLabel>
                <Input
                  type="number" min="0" max="100" step="0.5"
                  value={referral.ref_welcome_credit}
                  onChange={(e) => setReferralEdits({ ...referralEdits, ref_welcome_credit: String(Math.min(100, Math.max(0, Number(e.target.value) || 0))) })}
                />
              </div>
            </div>
            <Button
              onClick={() => saveGroup('referral', referral, t('admin.set.toastRefSaved'))}
              className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              <Save className="mr-1.5 h-4 w-4" /> {t('admin.set.saveRef')}
            </Button>
          </div>
        </AdminCard>

        {/* Danger zone */}
        <AdminCard title={t('admin.set.danger')} description={t('admin.set.dangerSub')} className="border-rose-200 dark:border-rose-900/60 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-rose-800">{t('admin.set.handleCare')}</p>
              <p className="text-[12px] text-rose-600/80">
                {t('admin.set.dangerNote')}
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
