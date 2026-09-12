'use client'

// Client portal — New Order (core flow)

import { useMemo, useState } from 'react'
import {
  BadgeCheck, Ban, CheckCircle2, Droplets, Info, Layers, Link2, Loader2,
  MessageSquareText, Repeat, ShieldCheck, ShoppingBag, Wallet, Zap,
} from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { SocialLogo } from '@/components/shared/social-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, mutate } from '@/lib/api'
import { useClientData } from '../client-data'
import { useMoney, Card, CardHead, Pill, BrandButton } from '../bits'
import type { CatalogCategory, CatalogService, NewOrderResult } from '../types'

type MassLineResult = { line: number; ok: boolean; orderId?: string; service?: string; charge?: number; error?: string }
type MassResult = { results: MassLineResult[]; balance: number }

export type OrderSeed = { categoryId?: string; serviceId?: string } | null

export default function NewOrderSection({ seed, onRefresh, onGoOrders, onGoFunds, onGoTickets }: {
  seed?: OrderSeed
  onRefresh?: () => void
  onGoOrders: () => void
  onGoFunds: () => void
  onGoTickets: () => void
}) {
  const { user, refresh } = useApp()
  const { t } = useI18n()
  const m = useMoney()
  const { catalog, catalogLoading, reloadOrders, reloadFunds } = useClientData()

  const categories = catalog.categories

  // Initial selection can be seeded (e.g. "Order" button on the Services page).
  // The parent remounts this component with a new `key` when a new seed arrives,
  // so plain useState initializers are enough — no sync effects needed.
  const [categoryId, setCategoryId] = useState<string>(seed?.categoryId ?? '')
  const [serviceId, setServiceId] = useState<string>(seed?.serviceId ?? '')
  const [link, setLink] = useState('')
  const [rawQty, setRawQty] = useState('')
  const [comments, setComments] = useState('')
  const [dripfeed, setDripfeed] = useState(false)
  const [dripRuns, setDripRuns] = useState('2')
  const [dripInterval, setDripInterval] = useState('60')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<NewOrderResult | null>(null)
  const [mode, setMode] = useState<'single' | 'mass'>('single')

  // Derived selection (falls back to firsts while catalog loads / ids empty)
  const category: CatalogCategory | undefined = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? categories[0],
    [categories, categoryId],
  )
  const service: CatalogService | undefined = useMemo(
    () => category?.services.find((s) => s.id === serviceId) ?? category?.services[0],
    [category, serviceId],
  )

  // Quantity display: empty input falls back to the service minimum
  const qty = rawQty === '' ? String(service?.min ?? '') : rawQty
  const qtyNum = parseInt(qty) || 0

  const charge = service ? Math.round((qtyNum / 1000) * service.rate * 100) / 100 : 0
  const balanceAfter = Math.round((user.balance - charge) * 100) / 100
  const insufficient = charge > 0 && user.balance < charge
  const canSubmit =
    !!service && !!link.trim() && qtyNum >= (service?.min ?? 1) && qtyNum <= (service?.max ?? Number.MAX_SAFE_INTEGER) &&
    (service?.type !== 'CUSTOM_COMMENTS' || comments.trim().length > 0) && !insufficient && !submitting

  function selectCategory(id: string) {
    setCategoryId(id)
    setServiceId('')
    setDripfeed(false)
    const cat = categories.find((c) => c.id === id)
    setRawQty(String(cat?.services[0]?.min ?? ''))
  }

  function selectService(id: string) {
    setServiceId(id)
    setDripfeed(false)
    const svc = category?.services.find((s) => s.id === id)
    setRawQty(String(svc?.min ?? ''))
  }

  async function submit() {
    if (!service) return
    setSubmitting(true)
    const res = await mutate(
      () =>
        api.post<NewOrderResult>('/api/orders', {
          serviceId: service.id,
          link: link.trim(),
          quantity: qtyNum,
          comments: service.type === 'CUSTOM_COMMENTS' ? comments : undefined,
          dripfeed: service.dripfeed && dripfeed,
          dripRuns: service.dripfeed && dripfeed ? parseInt(dripRuns) || 2 : undefined,
          dripInterval: service.dripfeed && dripfeed ? parseInt(dripInterval) || 60 : undefined,
        }),
      { silent: true },
    )
    setSubmitting(false)
    if (!res) return
    setSuccess(res)
    refresh()
    onRefresh?.()
    reloadOrders()
    reloadFunds()
  }

  function resetForm() {
    setSuccess(null)
    setLink('')
    setComments('')
    setRawQty(String(service?.min ?? ''))
    setDripfeed(false)
  }

  if (success) {
    return (
      <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        <PanelPageHeader title={t('client.placeOrder')} />
        <Card className="mx-auto max-w-xl text-center">
          <div
            className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))', boxShadow: '0 10px 30px -8px var(--brand-glow)' }}
          >
            <CheckCircle2 className="h-10 w-10" />
            <span className="absolute -right-1 -top-2 text-xl">🎉</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{t('cord.successTitle')}</h2>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {t('cord.successDesc')}
          </p>
          <div className="mt-5 space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 text-left text-[13px]">
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">{t('cord.orderId')}</span><span className="font-mono font-bold text-zinc-900 dark:text-zinc-50">#{success.order.id.slice(0, 8)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">{t('common.service')}</span><span className="max-w-[60%] truncate text-right font-semibold text-zinc-900 dark:text-zinc-50">{success.order.serviceName}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">{t('common.quantity')}</span><span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{success.order.quantity.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">{t('common.charge')}</span><span className="font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(success.order.charge)}</span></div>
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2"><span className="text-zinc-500 dark:text-zinc-400">{t('cord.newBalance')}</span><span className="font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(success.balance)}</span></div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <BrandButton onClick={onGoOrders}><ShoppingBag className="mr-1.5 h-4 w-4" /> {t('cord.viewOrders')}</BrandButton>
            <Button variant="outline" onClick={resetForm}><Zap className="mr-1.5 h-4 w-4" /> {t('cord.placeAnother')}</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('client.placeOrder')}
        description={catalogLoading ? t('cord.loadingCatalog') : t('cord.catalogDesc').replace('{n}', String(categories.reduce((s, c) => s + c.services.length, 0))).replace('{c}', String(categories.length))}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand)]/10">
                {mode === 'single' ? <Zap className="h-4 w-4 text-[var(--brand)]" /> : <Layers className="h-4 w-4 text-[var(--brand)]" />}
              </span>
              <div>
                <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{mode === 'single' ? t('cord.orderDetails') : t('client.massOrder')}</h2>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{mode === 'single' ? t('cord.orderDetailsSub') : t('client.massHint')}</p>
              </div>
            </div>
            <div className="flex rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-0.5">
              <button
                onClick={() => setMode('single')}
                className={`flex min-h-[30px] items-center gap-1 rounded-full px-3 text-[11.5px] font-bold transition ${mode === 'single' ? 'text-[var(--on-brand)] shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                style={mode === 'single' ? { background: 'var(--brand)' } : undefined}
              >
                <Zap className="h-3 w-3" /> {t('client.singleOrder')}
              </button>
              <button
                onClick={() => setMode('mass')}
                className={`flex min-h-[30px] items-center gap-1 rounded-full px-3 text-[11.5px] font-bold transition ${mode === 'mass' ? 'text-[var(--on-brand)] shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                style={mode === 'mass' ? { background: 'var(--brand)' } : undefined}
              >
                <Layers className="h-3 w-3" /> {t('client.massOrder')}
              </button>
            </div>
          </div>

          {mode === 'mass' ? (
            <MassOrderPanel
              services={categories.flatMap((c) => c.services)}
              onDone={() => { refresh(); onRefresh?.(); reloadOrders(); reloadFunds() }}
              onGoFunds={onGoFunds}
            />
          ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('common.category')}</Label>
                <Select value={category?.id ?? ''} onValueChange={selectCategory}>
                  <SelectTrigger className="min-h-[40px] w-full">
                    <SelectValue placeholder={catalogLoading ? t('cord.loading') : t('cord.chooseCategory')} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <SocialLogo icon={c.icon} size={15} />
                          <span className="truncate">{c.name}</span>
                          <span className="ml-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">({c.services.length})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('common.service')}</Label>
                <Select
                  value={service?.id ?? ''}
                  onValueChange={selectService}
                  disabled={!category || category.services.length === 0}
                >
                  <SelectTrigger className="min-h-[40px] w-full">
                    <SelectValue placeholder={category ? t('cord.chooseService') : '—'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {category?.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-baseline gap-2">
                          <span className="truncate">{s.name}</span>
                          <span className="shrink-0 text-[11px] font-bold text-zinc-900 dark:text-zinc-50">{m(s.rate)}/1k</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order-link">{t('common.link')}</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <Input
                  id="order-link"
                  className="min-h-[40px] pl-9"
                  placeholder="https://instagram.com/yourprofile"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order-qty">{t('common.quantity')}</Label>
              <Input
                id="order-qty"
                className="min-h-[40px]"
                type="number"
                inputMode="numeric"
                min={service?.min}
                max={service?.max}
                value={qty}
                onChange={(e) => setRawQty(e.target.value)}
                placeholder="1000"
              />
              {service && (
                <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">
                  Min: {t('cord.minMax').replace('{min}', service.min.toLocaleString()).replace('{max}', service.max.toLocaleString())}
                </p>
              )}
            </div>

            {service?.type === 'CUSTOM_COMMENTS' && (
              <div className="space-y-1.5">
                <Label htmlFor="order-comments" className="flex items-center gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5 text-[var(--brand)]" /> {t('cord.customComments')}
                </Label>
                <Textarea
                  id="order-comments"
                  rows={5}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={t('cord.commentsPh')}
                />
                <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">{t('cord.commentsHint')}</p>
              </div>
            )}

            {service?.dripfeed && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-[var(--brand)]" />
                    <div>
                      <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-50">{t('cord.dripfeed')}</p>
                      <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">{t('cord.dripfeedDesc')}</p>
                    </div>
                  </div>
                  <Switch checked={dripfeed} onCheckedChange={setDripfeed} />
                </div>
                {dripfeed && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="drip-runs" className="text-[12px]">{t('cord.runs')}</Label>
                      <Input id="drip-runs" className="min-h-[40px]" type="number" min={2} value={dripRuns} onChange={(e) => setDripRuns(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="drip-int" className="text-[12px]">{t('cord.interval')}</Label>
                      <Input id="drip-int" className="min-h-[40px]" type="number" min={5} value={dripInterval} onChange={(e) => setDripInterval(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Charge summary */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-zinc-500 dark:text-zinc-400">{t('common.charge')}</span>
                <span className="text-lg font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(charge)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px]">
                <span className="text-zinc-400 dark:text-zinc-500">{t('cord.balanceAfter')}</span>
                <span className={`font-bold tabular-nums ${insufficient ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {m(Math.max(balanceAfter, 0))}
                </span>
              </div>
              {insufficient && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 p-2.5 text-[12px] font-semibold text-rose-700 dark:text-rose-400">
                  <span>{t('cord.insufficient')}</span>
                  <Button size="sm" variant="outline" className="h-8 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60" onClick={onGoFunds}>
                    <Wallet className="mr-1 h-3.5 w-3.5" /> {t('common.addFunds')}
                  </Button>
                </div>
              )}
            </div>

            <BrandButton
              className="min-h-[44px] w-full text-[14px]"
              disabled={!canSubmit}
              onClick={submit}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {submitting ? t('cord.placing') : `${t('common.submit')} · ${m(charge)}`}
            </BrandButton>
          </div>
          )}
        </Card>

        {/* Service info */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHead icon={Info} title={t('cord.serviceInfo')} />
            {!service ? (
              <p className="py-6 text-center text-[13px] text-zinc-400 dark:text-zinc-500">{t('cord.selectService')}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <SocialLogo icon={category?.icon ?? 'globe'} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">{service.name}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {category?.name} · ID {service.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('cord.rate1k')}</p>
                    <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(service.rate)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('cord.min')}</p>
                    <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{service.min.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('cord.max')}</p>
                    <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{service.max.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={service.refill ? 'emerald' : 'zinc'}>
                    <Repeat className="h-3 w-3" /> {t('client.refill')} {service.refill ? '✓' : '✗'}
                  </Pill>
                  <Pill tone={service.dripfeed ? 'sky' : 'zinc'}>
                    <Droplets className="h-3 w-3" /> {t('cord.dripfeed')} {service.dripfeed ? '✓' : '✗'}
                  </Pill>
                  <Pill tone={service.cancel ? 'amber' : 'zinc'}>
                    <Ban className="h-3 w-3" /> {t('cord.cancelPill')} {service.cancel ? '✓' : '✗'}
                  </Pill>
                  {service.type === 'CUSTOM_COMMENTS' && <Pill tone="violet"><MessageSquareText className="h-3 w-3" /> {t('cord.custom')}</Pill>}
                </div>

                {service.description && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('cord.description')}</p>
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">{service.description}</p>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-xl bg-[var(--brand)]/5 p-3 text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  {t('cord.warning')}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)]/10">
                <BadgeCheck className="h-5 w-5 text-[var(--brand)]" />
              </span>
              <div>
                <p className="text-[13.5px] font-extrabold text-zinc-900 dark:text-zinc-50">{t('cord.questionsTitle')}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {t('cord.questionsDesc')}
                </p>
                <Button variant="link" className="mt-1 h-auto p-0 text-[12.5px] font-bold text-[var(--brand)]" onClick={onGoTickets}>
                  {t('cord.openTicket')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Mass order ───────────────────────── */

type ParsedLine = {
  raw: string
  service?: CatalogService
  link: string
  qty: number
  charge: number
  error?: string
}

function MassOrderPanel({ services, onDone, onGoFunds }: {
  services: CatalogService[]
  onDone: () => void
  onGoFunds: () => void
}) {
  const { user } = useApp()
  const { t } = useI18n()
  const m = useMoney()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<MassResult | null>(null)

  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])

  const parsed = useMemo<ParsedLine[]>(() => {
    return text.split('\n').map((raw) => {
      const line = raw.trim()
      if (!line) return { raw: line, link: '', qty: 0, charge: 0 }
      const parts = line.split('|').map((p) => p.trim())
      const [serviceId, link, qtyRaw] = parts
      if (!serviceId || !link || !qtyRaw) return { raw: line, link, qty: 0, charge: 0, error: t('cord.massFormat') }
      const svc = byId.get(serviceId)
      if (!svc) return { raw: line, link, qty: 0, charge: 0, error: t('cord.massUnknown') }
      const qty = parseInt(qtyRaw)
      if (!qty || qty <= 0) return { raw: line, link, qty: 0, charge: 0, error: t('cord.massInvalidQty'), service: svc }
      if (qty < svc.min) return { raw: line, link, qty, charge: 0, error: t('cord.massMin').replace('{n}', svc.min.toLocaleString()), service: svc }
      if (qty > svc.max) return { raw: line, link, qty, charge: 0, error: t('cord.massMax').replace('{n}', svc.max.toLocaleString()), service: svc }
      return { raw: line, link, qty, charge: Math.round((qty / 1000) * svc.rate * 100) / 100, service: svc }
    }).filter((l) => l.raw !== '' || l.error)
  }, [text, byId, t])

  const valid = parsed.filter((l) => !l.error && l.service)
  const totalCharge = Math.round(valid.reduce((s, l) => s + l.charge, 0) * 100) / 100
  const insufficient = totalCharge > user.balance

  async function submitMass() {
    setSubmitting(true)
    const res = await mutate(() => api.post<MassResult>('/api/orders/mass', { lines: text }), { silent: true })
    setSubmitting(false)
    if (!res) return
    setResult(res)
    onDone()
  }

  const okCount = result?.results.filter((r) => r.ok).length ?? 0
  const failCount = result?.results.filter((r) => !r.ok).length ?? 0

  return (
    <div className="space-y-4">
      <Textarea
        rows={7}
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(null) }}
        placeholder="serviceId | https://instagram.com/yourprofile | 1000"
        className="font-mono text-[12px]"
        aria-label={t('client.massOrder')}
      />
      <div className="flex items-center justify-between text-[11.5px] text-zinc-400 dark:text-zinc-500">
        <span>{t('client.massHint')}</span>
        <span className="font-semibold tabular-nums">{t('cord.massValid').replace('{ok}', String(valid.length)).replace('{total}', String(parsed.filter((l) => l.raw).length))}</span>
      </div>

      {/* Live line preview (pre-submit) */}
      {parsed.filter((l) => l.raw).length > 0 && !result && (
        <div className="gr-scroll max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5">
          {parsed.filter((l) => l.raw).map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-[11.5px]">
              {l.error
                ? <><Ban className="h-3.5 w-3.5 shrink-0 text-rose-500" /><span className="min-w-0 flex-1 truncate text-rose-600 dark:text-rose-400">{l.error}</span></>
                : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /><span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">{l.service?.name}</span><span className="shrink-0 font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{m(l.charge)}</span></>}
            </div>
          ))}
        </div>
      )}

      {/* Charge summary */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-zinc-500 dark:text-zinc-400">{t('cord.massTotal').replace('{n}', String(valid.length))}</span>
          <span className="text-lg font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(totalCharge)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[12px]">
          <span className="text-zinc-400 dark:text-zinc-500">{t('cord.balanceAfterMass')}</span>
          <span className={`font-bold tabular-nums ${insufficient ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {m(Math.max(user.balance - totalCharge, 0))}
          </span>
        </div>
        {insufficient && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 p-2.5 text-[12px] font-semibold text-rose-700 dark:text-rose-400">
            <span>{t('cord.insufficientMass')}</span>
            <Button size="sm" variant="outline" className="h-8 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60" onClick={onGoFunds}>
              <Wallet className="mr-1 h-3.5 w-3.5" /> {t('common.addFunds')}
            </Button>
          </div>
        )}
      </div>

      <BrandButton
        className="min-h-[44px] w-full text-[14px]"
        disabled={valid.length === 0 || insufficient || submitting}
        onClick={submitMass}
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
        {submitting ? t('cord.placingMass') : `${t('client.massPlace')} · ${m(totalCharge)}`}
      </BrandButton>

      {/* Server results */}
      {result && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5">
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('client.massResults')}</p>
          <div className="mb-2.5 flex gap-2">
            <Pill tone="emerald"><CheckCircle2 className="h-3 w-3" /> {t('cord.massPlaced').replace('{n}', String(okCount))}</Pill>
            {failCount > 0 && <Pill tone="rose"><Ban className="h-3 w-3" /> {t('cord.massFailed').replace('{n}', String(failCount))}</Pill>}
          </div>
          <div className="gr-scroll max-h-44 space-y-1.5 overflow-y-auto">
            {result.results.map((r) => (
              <div key={r.line} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-6 shrink-0 font-mono text-zinc-400 dark:text-zinc-500">#{r.line}</span>
                {r.ok
                  ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /><span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">{r.service}</span><span className="shrink-0 font-mono text-[10.5px] text-zinc-400 dark:text-zinc-500">#{r.orderId?.slice(0, 8)}</span></>
                  : <><Ban className="h-3.5 w-3.5 shrink-0 text-rose-500" /><span className="min-w-0 flex-1 truncate text-rose-600 dark:text-rose-400">{r.error}</span></>}
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">{t('cord.newBalance')}: <span className="font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(result.balance)}</span></p>
        </div>
      )}
    </div>
  )
}
