// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useState } from 'react'
import {
  CreditCard, Wallet, WalletCards, BadgeDollarSign, ArrowLeftRight, Headset, Check,
  CheckCircle2, XCircle, Plus, Trash2, Crown, Zap, Loader2, Rocket, TicketPercent, Dices, Ban, BadgePercent, Users, Store,
  QrCode, Bitcoin, Coins, Landmark, Plug, Unplug,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PanelPageHeader, StatCard, StatusBadge } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useApi, api, mutate } from '@/lib/api'
import { useRealtimeEvents } from '@/lib/realtime-client'
import { GATEWAY_PROVIDERS } from '@/lib/gateways'
import { formatMoney, formatDate, formatDateTime } from '@/lib/format'
import { useI18n, type DictKey, type Lang } from '@/lib/i18n'

type Tx = { id: string; type: string; amount: number; description: string; method: string | null; createdAt: string }
type Gateway = { id: string; name: string; type: string; feePercent: number; instructions: string | null }
type Method = { id: string; brand: string; last4: string; expMonth: number; expYear: number; primary: boolean }
type Deposit = { id: string; amount: number; method: string; reference: string | null; note: string | null; status: string; createdAt: string; user: { name: string; email: string } }
type PlanInfo = { platform: { plan: Plan; monthlyFee: number; nextBilling: string | null; externalApi: boolean; name: string } }
type Plan = { id: string; name: string; monthlyPrice: number; externalApiPrice: number; customDomainPrice: number; maxServices: number; portalDesigns: string; features: string }
type Ticket = { id: string; subject: string; status: string; updatedAt: string; messages: { id: string; senderName: string; isStaff: boolean; body: string; createdAt: string }[] }

export default function ResellerFinance({ section, onNavigate }: { section: string; onNavigate: (k: string) => void }) {
  switch (section) {
    case 'plan-billing': return <PlanBilling onNavigate={onNavigate} />
    case 'add-funds': return <AddFunds />
    case 'payment-methods': return <PaymentMethods />
    case 'deposits': return <Deposits />
    case 'transactions': return <Transactions />
    case 'coupons': return <ResellerCoupons />
    case 'support': return <Support />
    default: return null
  }
}

// ─────────────── Plan & Billing ───────────────

function PlanBilling({ onNavigate }: { onNavigate: (k: string) => void }) {
  const app = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<PlanInfo & { plans?: Plan[] }>('/api/platform/mine')
  const { data: plansData } = useApi<{ plans: Plan[] }>('/api/plans')
  const { data: fundsData, refresh: refreshFunds } = useApi<{ transactions: Tx[] }>('/api/funds')
  const [switching, setSwitching] = useState<Plan | null>(null)

  if (loading) return <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>

  const platform = data?.platform
  const plan = platform?.plan
  const billingHistory = (fundsData?.transactions ?? []).filter((t) => ['PLAN', 'ADDON'].includes(t.type))
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)

  const changePlan = async () => {
    if (!switching || !platform) return
    const price = switching.monthlyPrice
    if (app.user.balance < price) {
      toast({ title: t('rfin.needFunds').replace('{money}', money(price)), variant: 'destructive' })
      return
    }
    const res = await mutate(
      () => api.patch('/api/platform/mine', { changePlan: switching.id }),
      { success: t('rfin.planChanged').replace('{name}', switching.name) }
    )
    if (res) { refresh(); refreshFunds(); app.refresh(); setSwitching(null) }
  }

  return (
    <>
      <PanelPageHeader title={t('reseller.planBilling')} description={t('rfin.billingDesc')} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current plan */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-extrabold">{t('rfin.planNamed').replace('{name}', plan?.name ?? '')}</p>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{t('rfin.monthlySub').replace('{name}', platform?.name ?? '')}</p>
              </div>
            </div>
            <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">{t('rfin.badgeActive')}</Badge>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3.5">
              <p className="text-[11px] font-bold uppercase text-zinc-400 dark:text-zinc-500">{t('rfin.monthly')}</p>
              <p className="mt-1 text-xl font-black">{money(platform?.monthlyFee ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3.5">
              <p className="text-[11px] font-bold uppercase text-zinc-400 dark:text-zinc-500">{t('rfin.nextBilling')}</p>
              <p className="mt-1 text-sm font-extrabold">{platform?.nextBilling ? formatDate(platform.nextBilling, app.lang as Lang) : '—'}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3.5">
              <p className="text-[11px] font-bold uppercase text-zinc-400 dark:text-zinc-500">{t('rfin.externalAddon')}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold">
                {platform?.externalApi ? (
                  <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t('rfin.enabled')}</>
                ) : (
                  <><XCircle className="h-4 w-4 text-zinc-300 dark:text-zinc-600" /> {t('rfin.disabled')}</>
                )}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('rfin.includedFeatures')}</p>
            <div className="flex flex-wrap gap-1.5">
              {plan ? (JSON.parse(plan.features || '[]') as string[]).map((f) => (
                <Badge key={f} variant="outline" className="text-[11px] font-semibold"><Check className="mr-1 h-3 w-3 text-emerald-500" />{f}</Badge>
              )) : null}
            </div>
          </div>
        </div>

        {/* External API upsell */}
        <div className={`rounded-2xl border p-6 ${platform?.externalApi ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40' : 'border-dashed bg-white dark:bg-zinc-900'}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"><Zap className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-extrabold">{t('rfin.externalConnector')}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {platform?.externalApi
              ? t('rfin.externalActive')
              : t('rfin.externalUpsell').replace('{money}', money(plan?.externalApiPrice ?? 25))}
          </p>
          {!platform?.externalApi && (
            <Button size="sm" className="mt-4 w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => onNavigate('integrations')}>
              {t('rfin.enableAddon')}
            </Button>
          )}
        </div>
      </div>

      {/* Change plan */}
      <p className="mb-3 mt-7 text-sm font-extrabold">{t('rfin.changePlan')}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(plansData?.plans ?? []).map((p) => {
          const current = plan?.id === p.id
          return (
            <div key={p.id} className={`rounded-2xl border-2 bg-white dark:bg-zinc-900 p-4 ${current ? 'border-emerald-400' : 'border-zinc-200 dark:border-zinc-800'}`}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-extrabold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{p.name}</p>
                {current && <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">{t('rst.current')}</Badge>}
              </div>
              <p className="mt-1 text-2xl font-black">{money(p.monthlyPrice)}<span className="text-[12px] font-semibold text-zinc-400 dark:text-zinc-500">{t('rfin.perMonth')}</span></p>
              <Button
                variant="outline" size="sm" className="mt-3 w-full font-bold"
                disabled={current}
                onClick={() => setSwitching(p)}
              >
                {current ? t('rcat.active') : t('rfin.switchTo')}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Billing history */}
      <p className="mb-2 mt-7 text-sm font-extrabold">{t('rfin.billingHistory')}</p>
      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="divide-y">
          {billingHistory.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400"><CreditCard className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{t.description}</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDateTime(t.createdAt, app.lang as Lang)} {t.method ? `· ${t.method}` : ''}</p>
              </div>
              <span className={`text-[13px] font-extrabold ${t.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {t.amount < 0 ? '−' : '+'}{money(Math.abs(t.amount))}
              </span>
            </div>
          ))}
          {!billingHistory.length && <p className="p-6 text-center text-sm text-zinc-400 dark:text-zinc-500">{t('rfin.noBilling')}</p>}
        </div>
      </div>

      {/* Switch plan confirm */}
      <AlertDialog open={!!switching} onOpenChange={(o) => !o && setSwitching(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rfin.switchQ').replace('{name}', switching?.name ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rfin.switchDesc').replace('{money}', switching ? money(switching.monthlyPrice) : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction style={{ background: 'var(--brand)' }} onClick={changePlan}>{t('rfin.confirmSwitch')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─────────────── Add Funds ───────────────

function AddFunds() {
  const app = useApp()
  const { t } = useI18n()
  const { data, refresh } = useApi<{ gateways: Gateway[] }>('/api/funds')
  const [amount, setAmount] = useState('100')
  const [gatewayId, setGatewayId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)

  const gateway = (data?.gateways ?? []).find((g) => g.id === gatewayId) ?? data?.gateways?.[0]
  const fee = gateway ? Math.round(parseFloat(amount) * (gateway.feePercent / 100) * 100) / 100 : 0

  const deposit = async () => {
    if (!gateway) return
    setBusy(true)
    const res = await mutate(
      () => api.post<{ balance: number; message: string }>('/api/funds', { amount: parseFloat(amount), gatewayId: gateway.id }),
      { success: t('rfin.fundsAdded') }
    )
    setBusy(false)
    if (res) { app.refresh(); refresh() }
  }

  return (
    <>
      <PanelPageHeader title={t('reseller.addFunds')} description={t('rfin.addFundsDesc')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
          <Label className="text-[13px] font-bold">{t('rfin.amountUsd')}</Label>
          <Input className="mt-1.5 text-lg font-extrabold" type="number" min={5} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="mt-3 flex gap-2">
            {[25, 50, 100, 250, 500].map((a) => (
              <Button key={a} variant="outline" size="sm" className={`flex-1 font-bold ${amount === String(a) ? 'border-rose-600 text-rose-600 dark:text-rose-400' : ''}`} onClick={() => setAmount(String(a))}>
                ${a}
              </Button>
            ))}
          </div>
          <p className="mt-5 text-[13px] font-bold">{t('rfin.paymentMethod')}</p>
          <div className="mt-2 space-y-2">
            {(data?.gateways ?? []).map((g) => (
              <button
                key={g.id}
                onClick={() => setGatewayId(g.id)}
                className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                  gateway?.id === g.id ? 'border-rose-600 bg-rose-50/40' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-[13px] font-bold">{g.name}</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{g.feePercent > 0 ? t('rfin.feePct').replace('{n}', String(g.feePercent)) : t('rfin.noFees')}</span>
              </button>
            ))}
          </div>
          {gateway?.instructions && (
            <p className="mt-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3 text-[12px] text-zinc-500 dark:text-zinc-400">{gateway.instructions}</p>
          )}
          <div className="mt-4 space-y-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3 text-[12px] text-zinc-500 dark:text-zinc-400">
            <p className="flex justify-between"><span>{t('common.amount')}</span><b>{money(parseFloat(amount) || 0)}</b></p>
            {fee > 0 && <p className="flex justify-between"><span>{t('rfin.processingFee')}</span><b>{money(fee)}</b></p>}
            <p className="flex justify-between border-t pt-1.5 text-[13px] text-zinc-800 dark:text-zinc-100"><span className="font-bold">{t('rfin.youReceive')}</span><b>{money((parseFloat(amount) || 0) + fee)}</b></p>
          </div>
          <Button className="mt-4 w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={busy || !parseFloat(amount)} onClick={deposit}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
            {t('rfin.depositCta').replace('{money}', money((parseFloat(amount) || 0) + fee))}
          </Button>
          <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">{t('rfin.sandboxNote')}</p>
        </div>

        <RecentTransactions />
      </div>
    </>
  )
}

function RecentTransactions() {
  const app = useApp()
  const { t } = useI18n()
  const { data } = useApi<{ transactions: Tx[] }>('/api/funds')
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)
  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-900">
      <p className="border-b p-4 text-sm font-extrabold">{t('rfin.recentActivity')}</p>
      <div className="max-h-96 divide-y overflow-y-auto">
        {(data?.transactions ?? []).slice(0, 15).map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.amount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{t.description}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDateTime(t.createdAt, app.lang as Lang)}</p>
            </div>
            <span className={`text-[13px] font-extrabold ${t.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {t.amount > 0 ? '+' : '−'}{money(Math.abs(t.amount))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────── Payment Methods ───────────────

type ProviderGateway = {
  id: string
  code: string | null
  name: string
  type: string
  enabled: boolean
  feePercent: number
  config: Record<string, string>
}

const PROVIDER_ICONS: Record<string, typeof Wallet> = {
  wallet: Wallet, card: CreditCard, qr: QrCode, bitcoin: Bitcoin, coins: Coins, landmark: Landmark,
}

/** My Payment Methods — connect the store's own payment gateways (PayPal,
 *  MercadoPago, Pix, Cryptomus, CoinPayments, Payoneer) with your own API
 *  credentials, plus saved cards for faster checkout. */
function PaymentMethods() {
  const { t } = useI18n()
  const { data: fundsData, refresh: refreshCards } = useApi<{ methods: Method[] }>('/api/funds')
  return (
    <div className="space-y-5">
      <PanelPageHeader
        title={t('reseller.paymentMethods')}
        description={t('rfin.pmDesc')}
      />
      <Tabs defaultValue="gateways">
        <TabsList className="rounded-full">
          <TabsTrigger value="gateways" className="rounded-full px-4"><Plug className="mr-1.5 h-3.5 w-3.5" /> {t('rfin.tabGateways')}</TabsTrigger>
          <TabsTrigger value="cards" className="rounded-full px-4"><WalletCards className="mr-1.5 h-3.5 w-3.5" /> {t('rfin.tabCards')}</TabsTrigger>
        </TabsList>

        {/* ── Gateways (6 providers) ── */}
        <TabsContent value="gateways" className="mt-4">
          <PaymentGateways />
        </TabsContent>

        {/* ── Saved cards ── */}
        <TabsContent value="cards" className="mt-4">
          <SavedCards data={fundsData} refresh={refreshCards} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PaymentGateways() {
  const { t } = useI18n()
  const { data, refresh } = useApi<{ gateways: ProviderGateway[] }>('/api/reseller/gateways')
  const [editing, setEditing] = useState<{ code: string; gateway: ProviderGateway | null } | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fee, setFee] = useState('0')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ProviderGateway | null>(null)

  const rows = data?.gateways ?? []
  const byCode = (code: string) => rows.find((r) => r.code === code) ?? null

  const open = (code: string) => {
    const gw = byCode(code)
    const provider = GATEWAY_PROVIDERS[code]
    const initial: Record<string, string> = {}
    for (const f of provider.fields) initial[f.key] = gw?.config?.[f.key] ?? (f.kind === 'select' ? f.options?.[0] ?? '' : '')
    setValues(initial)
    setTouched({})
    setFee(String(gw?.feePercent ?? 0))
    setEnabled(gw ? !!gw.enabled : true)
    setEditing({ code, gateway: gw })
  }

  const save = async () => {
    if (!editing) return
    const provider = GATEWAY_PROVIDERS[editing.code]
    // only send touched fields (+ selects) so masked values never overwrite real credentials
    const payload: Record<string, unknown> = {}
    for (const f of provider.fields) {
      if (f.kind === 'select' || touched[f.key]) payload[f.key] = values[f.key] ?? ''
    }
    setSaving(true)
    try {
      if (editing.gateway) {
        await api.patch('/api/reseller/gateways', { id: editing.gateway.id, feePercent: parseFloat(fee) || 0, enabled, config: payload })
      } else {
        await api.post('/api/reseller/gateways', { code: editing.code, feePercent: parseFloat(fee) || 0, enabled, config: payload })
      }
      toast({ title: t('rfin.gwConnected').replace('{name}', provider.name) })
      setEditing(null)
      refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t('rfin.error'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (gw: ProviderGateway, on: boolean) => {
    const ok = await mutate(() => api.patch('/api/reseller/gateways', { id: gw.id, enabled: on }), { success: on ? t('rfin.gwEnabled') : t('rfin.gwPaused') })
    if (ok) refresh()
  }

  const disconnect = async () => {
    if (!confirmDelete) return
    const ok = await mutate(() => api.delBody('/api/reseller/gateways', { id: confirmDelete.id }), { success: t('rfin.gwDisconnected') })
    if (ok) { setConfirmDelete(null); refresh() }
  }

  return (
    <>
      <div className="mb-3 rounded-xl border border-dashed bg-zinc-50 dark:bg-zinc-900/60 p-3 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        <p className="font-bold text-zinc-700 dark:text-zinc-200">{t('rfin.chargeOwn')}</p>
        <p>{t('rfin.chargeOwnDesc')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.values(GATEWAY_PROVIDERS).map((provider) => {
          const gw = byCode(provider.code)
          const Icon = PROVIDER_ICONS[provider.icon] ?? Wallet
          const live = !!gw?.enabled
          const configured = !!gw
          return (
            <div
              key={provider.code}
              className={`flex flex-col rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md ${
                configured ? (live ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-zinc-200 dark:border-zinc-800') : 'border-dashed border-zinc-300 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)' }}>
                  <Icon className="h-5 w-5" style={{ color: 'var(--brand-ink)' }} />
                </span>
                {configured ? (
                  live
                    ? <Badge className="border-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t('rfin.badgeLive')}</Badge>
                    : <Badge className="border-0 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">{t('rfin.badgePaused')}</Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-400 dark:text-zinc-500">{t('rfin.badgeNotConfigured')}</Badge>
                )}
              </div>
              <h3 className="mt-3 text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50">{provider.name}</h3>
              <p className="mt-0.5 flex-1 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">{provider.tagline}</p>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
                <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {t('rfin.commission')} {gw?.feePercent ? t('rfin.feeLabel').replace('{fee}', `${gw.feePercent}%`) : '—'}
                </span>
                <div className="flex items-center gap-1.5">
                  {configured && (
                    <>
                      <Switch checked={live} onCheckedChange={(c) => toggle(gw!, c)} aria-label={t('rfin.toggleAria').replace('{name}', provider.name)} />
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setConfirmDelete(gw!)} aria-label={t('rfin.disconnectAria').replace('{name}', provider.name)}>
                        <Unplug className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-[12px] font-bold" onClick={() => open(provider.code)}>
                    {configured ? t('rfin.credentialsCta') : t('rfin.connectCta')}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Credentials dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4" style={{ color: 'var(--brand-ink)' }} />
              {editing?.gateway ? t('rfin.updateNamed').replace('{name}', GATEWAY_PROVIDERS[editing.code]?.name ?? '') : t('rfin.connectNamed').replace('{name}', GATEWAY_PROVIDERS[editing?.code ?? '']?.name ?? '')}
            </DialogTitle>
            <DialogDescription>
              {editing?.gateway ? t('rfin.updateGwDesc') : t('rfin.connectGwDesc').replace('{name}', GATEWAY_PROVIDERS[editing?.code ?? '']?.name ?? '')}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {GATEWAY_PROVIDERS[editing.code].fields.map((f) => (
                <div key={f.key}>
                  <Label className="text-[12.5px] font-bold">{f.label}{f.secret && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">{t('rfin.secret')}</span>}</Label>
                  {f.kind === 'select' ? (
                    <Select value={values[f.key] ?? ''} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.secret ? 'password' : 'text'}
                      className="mt-1"
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ''}
                      autoComplete="off"
                      onChange={(e) => {
                        setValues({ ...values, [f.key]: e.target.value })
                        setTouched((t) => ({ ...t, [f.key]: true }))
                      }}
                    />
                  )}
                  {f.hint && <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{f.hint}</p>}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12.5px] font-bold">{t('rfin.commission')}</Label>
                  <Input type="number" step="0.1" min="0" className="mt-1" value={fee} onChange={(e) => setFee(e.target.value)} />
                  <p className="mt-1 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{t('rfin.commissionHint')}</p>
                </div>
                <div className="flex items-end gap-2 pb-1.5">
                  <Switch id="gw-live" checked={enabled} onCheckedChange={setEnabled} />
                  <Label htmlFor="gw-live" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('rfin.enabledCheckout')}</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={saving} style={{ background: 'var(--brand)', color: '#15180a' }}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing?.gateway ? t('rcat.saveChanges') : t('rfin.connectGatewayCta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rfin.disconnectQ').replace('{name}', confirmDelete?.name ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rfin.disconnectDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={disconnect}>{t('rfin.disconnectCta2')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SavedCards({ data, refresh }: { data?: { methods: Method[] } | null; refresh: () => void }) {
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ number: '', expMonth: '12', expYear: '2028' })
  const [deleteM, setDeleteM] = useState<Method | null>(null)

  const add = async () => {
    const res = await mutate(() => api.post('/api/funds/methods', form), { success: 'Card added 💳' })
    if (res) { setAddOpen(false); setForm({ number: '', expMonth: '12', expYear: '2028' }); refresh() }
  }

  const remove = async () => {
    if (!deleteM) return
    await fetch('/api/funds/methods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteM.id }) })
    setDeleteM(null)
    refresh()
    toast({ title: 'Card removed' })
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" className="font-bold" style={{ background: 'var(--brand)', color: '#15180a' }} onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add card
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.methods ?? []).map((m) => (
          <div key={m.id} className="group relative overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900 p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-zinc-50 dark:bg-zinc-900/60" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-12 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-extrabold tracking-widest text-white">
                  {m.brand.toUpperCase().slice(0, 4)}
                </span>
                {m.primary && <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">PRIMARY</Badge>}
              </div>
              <p className="mt-4 font-mono text-[15px] font-bold tracking-wider">•••• •••• •••• {m.last4}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Exp {String(m.expMonth).padStart(2, '0')}/{m.expYear}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 opacity-0 transition group-hover:opacity-100" onClick={() => setDeleteM(m)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!(data?.methods ?? []).length && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center">
            <WalletCards className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">No saved cards yet.</p>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add payment card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Card number</Label>
              <Input placeholder="4242 4242 4242 4242" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Exp month</Label><Input type="number" min={1} max={12} value={form.expMonth} onChange={(e) => setForm({ ...form, expMonth: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Exp year</Label><Input type="number" value={form.expYear} onChange={(e) => setForm({ ...form, expYear: e.target.value })} /></div>
            </div>
            <Button className="w-full font-bold" style={{ background: 'var(--brand)', color: '#15180a' }} onClick={add}>Save card</Button>
            <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">Demo only — no real charge, only last 4 digits stored.</p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteM} onOpenChange={(o) => !o && setDeleteM(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove card?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─────────────── Customer Deposits ───────────────

function Deposits() {
  const app = useApp()
  const { t } = useI18n()
  const [tab, setTab] = useState('PENDING')
  const { data, loading, refresh } = useApi<{ deposits: Deposit[] }>(`/api/reseller/deposits?status=${tab}`, [tab])
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)

  const act = async (id: string, action: 'approve' | 'reject') => {
    const res = await mutate(() => api.patch('/api/reseller/deposits', { id, action }), {
      success: action === 'approve' ? 'Deposit approved — client credited ✅' : 'Deposit rejected',
    })
    if (res) { refresh(); app.refresh() }
  }

  return (
    <>
      <PanelPageHeader title={t('reseller.deposits')} description={t('rfin.depDesc')} />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="divide-y">
          {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-12 w-full" /></div>)}
          {data?.deposits.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${d.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : d.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
                <BadgeDollarSign className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">{d.user.name} <span className="font-normal text-zinc-400 dark:text-zinc-500">wants to deposit</span> {money(d.amount)}</p>
                <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{d.method} {d.reference ? `· ref ${d.reference}` : ''} · {formatDateTime(d.createdAt, app.lang as Lang)} {d.note ? `· ${d.note}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.status === 'PENDING' ? (
                  <>
                    <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => act(d.id, 'approve')}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="font-bold text-rose-600 dark:text-rose-400" onClick={() => act(d.id, 'reject')}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                ) : (
                  <StatusBadge status={d.status} />
                )}
              </div>
            </div>
          ))}
          {data && !data.deposits.length && (
            <div className="p-10 text-center">
              <BadgeDollarSign className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">Nothing here — deposits from your clients will appear for approval.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────── Transactions ───────────────

function Transactions() {
  const app = useApp()
  const { t } = useI18n()
  const [type, setType] = useState('ALL')
  const { data, loading } = useApi<{ transactions: Tx[] }>('/api/funds')
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)
  const all = data?.transactions ?? []
  const filtered = type === 'ALL' ? all : all.filter((t) => t.type === type)
  const income = all.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const outcome = all.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <>
      <PanelPageHeader title={t('common.transactions')} description={t('rfin2.txDesc')} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('ctx.moneyIn')} value={money(income)} icon={ArrowLeftRight} accent="#10b981" />
        <StatCard label={t('ctx.moneyOut')} value={money(outcome)} icon={ArrowLeftRight} accent="#e11d48" />
        <StatCard label={t('rfin2.net')} value={money(income - outcome)} icon={ArrowLeftRight} />
      </div>
      <Tabs value={type} onValueChange={setType} className="mb-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="DEPOSIT">Deposits</TabsTrigger>
          <TabsTrigger value="ORDER">Orders</TabsTrigger>
          <TabsTrigger value="PLAN">Plan</TabsTrigger>
          <TabsTrigger value="ADDON">Add-ons</TabsTrigger>
          <TabsTrigger value="REFUND">Refunds</TabsTrigger>
          <TabsTrigger value="ADJUSTMENT">Adjustments</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Type</th>
                <th className="px-4 py-3 font-bold">Description</th>
                <th className="px-4 py-3 font-bold">Method</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>)}
              {filtered.map((t) => (
                <tr key={t.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-2.5 text-[12px] text-zinc-400 dark:text-zinc-500">{formatDateTime(t.createdAt, app.lang as Lang)}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] font-bold">{t.type}</Badge></td>
                  <td className="max-w-64 truncate px-4 py-2.5 font-semibold">{t.description}</td>
                  <td className="px-4 py-2.5 text-[12px] text-zinc-400 dark:text-zinc-500">{t.method ?? '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-extrabold ${t.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {t.amount > 0 ? '+' : '−'}{money(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No transactions.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ─────────────── Support (tickets to GrowthRush) ───────────────

function Support() {
  const app = useApp()
  const { t } = useI18n()
  const { data, refresh } = useApi<{ tickets: Ticket[] }>('/api/tickets')
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [form, setForm] = useState({ subject: '', category: 'general', priority: 'normal', message: '' })

  const sendReply = async () => {
    if (!openTicket || !reply.trim()) return
    const res = await mutate(() => api.post('/api/tickets/reply', { ticketId: openTicket.id, body: reply }), { success: 'Reply sent' })
    if (res) {
      setReply('')
      const fresh = await api.get<{ tickets: Ticket[] }>('/api/tickets')
      const updated = fresh.tickets.find((t) => t.id === openTicket.id)
      if (updated) setOpenTicket(updated)
      refresh()
    }
  }

  const create = async () => {
    const res = await mutate(() => api.post('/api/tickets', form), { success: 'Ticket created — our team will reply soon 🎫' })
    if (res) { setCreateOpen(false); setForm({ subject: '', category: 'general', priority: 'normal', message: '' }); refresh() }
  }

  return (
    <>
      <PanelPageHeader
        title={t('reseller.support')}
        description={t('rfin2.supportDesc')}
        actions={
          <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New ticket
          </Button>
        }
      />
      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="divide-y">
          {(data?.tickets ?? []).map((t) => (
            <button key={t.id} onClick={() => setOpenTicket(t)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400"><Headset className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{t.subject}</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t.messages.length} messages · {formatDateTime(t.updatedAt, app.lang as Lang)}</p>
              </div>
              <StatusBadge status={t.status} />
            </button>
          ))}
          {!(data?.tickets ?? []).length && (
            <div className="p-10 text-center">
              <Headset className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">No tickets yet.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!openTicket} onOpenChange={(o) => !o && setOpenTicket(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader><DialogTitle className="truncate">{openTicket?.subject}</DialogTitle></DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {openTicket?.messages.map((m) => (
              <div key={m.id} className={`flex ${m.isStaff ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.isStaff ? 'text-[var(--on-brand)]' : 'bg-zinc-100 dark:bg-zinc-800/60'}`} style={m.isStaff ? { background: 'var(--brand)' } : undefined}>
                  <p className="mb-0.5 text-[10px] font-bold opacity-70">{m.senderName}</p>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          {openTicket?.status !== 'CLOSED' && (
            <div className="border-t pt-3">
              <Textarea rows={2} placeholder={t('rfin2.typeMsg')} value={reply} onChange={(e) => setReply(e.target.value)} />
              <Button className="mt-2 w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!reply.trim()} onClick={sendReply}>Send</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New support ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>{t('client.ticketSubject')}</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t('rfin2.briefPh')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!form.subject.trim() || !form.message.trim()} onClick={create}>
              <Rocket className="mr-2 h-4 w-4" /> Send ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────── Promo Coupons (platform-scoped) ───────────────

type PlatformCoupon = {
  id: string
  code: string
  value: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  note: string | null
  active: boolean
  createdAt: string
  redemptions: { id: string; amount: number; createdAt: string; user: { id: string; name: string; email: string } }[]
}

type CouponStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'EXHAUSTED'

const COUPON_STATUS_STYLES: Record<CouponStatus, string> = {
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  PAUSED: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  EXPIRED: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  EXHAUSTED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
}

function couponStatusOf(c: PlatformCoupon): CouponStatus {
  if (!c.active) return 'PAUSED'
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return 'EXPIRED'
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return 'EXHAUSTED'
  return 'ACTIVE'
}

function randomCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `GR-${s}`
}

function ResellerCoupons() {
  const app = useApp()
  const { t } = useI18n()
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)
  const { data, loading, refresh } = useApi<{ items: PlatformCoupon[]; totalGiven: number; clients: number }>('/api/reseller/coupons')
  // Live refresh — the backend emits a `coupon` event over the panel websocket
  // every time a client redeems one of this platform's codes.
  useRealtimeEvents(['coupon'], () => { refresh() })
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ code: '', value: '', maxUses: '0', expiresAt: '', note: '' })
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PlatformCoupon | null>(null)
  const [viewing, setViewing] = useState<PlatformCoupon | null>(null)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')

  const items = data?.items ?? []
  const list = items.filter((c) => {
    if (filter !== 'ALL' && couponStatusOf(c) !== filter) return false
    if (query && !`${c.code} ${c.note ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })
  const activeCount = items.filter((c) => couponStatusOf(c) === 'ACTIVE').length
  const redemptions = items.reduce((acc, c) => acc + c.usedCount, 0)

  const create = async () => {
    setCreating(true)
    const ok = await mutate(
      () => api.post<{ item: { code: string }; message?: string }>('/api/reseller/coupons', {
        code: form.code,
        value: form.value,
        maxUses: form.maxUses,
        expiresAt: form.expiresAt || null,
        note: form.note.trim() || null,
      }),
      {},
    )
    setCreating(false)
    if (ok) {
      toast({ title: ok.message ?? `Coupon ${ok.item.code} created 🎟️` })
      setAdding(false)
      setForm({ code: '', value: '', maxUses: '0', expiresAt: '', note: '' })
      refresh()
    }
  }

  const toggle = async (c: PlatformCoupon) => {
    setToggling(c.id)
    const ok = await mutate(() => api.patch('/api/reseller/coupons', { id: c.id, active: !c.active }), {})
    setToggling(null)
    if (ok) refresh()
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => api.delBody('/api/reseller/coupons', { id: deleting.id }), {})
    if (ok) { setDeleting(null); refresh() }
  }

  const codeTaken = items.some((c) => c.code === form.code.trim().toUpperCase())
  const codeValid = form.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').length >= 3 && !codeTaken
  const valueValid = parseFloat(form.value) > 0

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('rfin2.couponTitle')}
        description={t('rfin2.couponDesc')}
        actions={
          <Button onClick={() => { setForm((f) => ({ ...f, code: randomCouponCode() })); setAdding(true) }} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> New coupon
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: TicketPercent, label: 'Coupons', value: String(items.length), sub: `${activeCount} active now`, tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40' },
          { icon: BadgePercent, label: 'Redemptions', value: String(redemptions), sub: 'all time', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
          { icon: Wallet, label: 'Total credited', value: money(data?.totalGiven ?? 0), sub: 'via promo codes', tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
          { icon: Users, label: 'Reach', value: String(data?.clients ?? 0), sub: 'clients can redeem', tone: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.tone}`}>
              <k.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{k.label}</p>
              <p className="text-[17px] font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">{k.value}</p>
              <p className="truncate text-[10.5px] text-zinc-400 dark:text-zinc-500">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Storefront tip */}
      {activeCount > 0 && (
        <div className="gr-coupon-shine relative flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-dashed p-4 text-sm" style={{ background: 'color-mix(in srgb, var(--brand) 6%, transparent)', borderColor: 'color-mix(in srgb, var(--brand) 50%, transparent)' }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>
            <Store className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 text-[13px] text-zinc-600 dark:text-zinc-300">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-50">Show it off.</span> Your storefront hero displays your best active coupon automatically — visitors see it before they sign up.
          </p>
          <Badge variant="outline" className="shrink-0 rounded-full text-[10px] font-extrabold" style={{ borderColor: 'var(--brand)', color: 'var(--brand-ink)' }}>
            {activeCount} LIVE
          </Badge>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {['ALL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'EXHAUSTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${filter === s ? 'text-[var(--on-brand)]' : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}
            style={filter === s ? { background: 'var(--brand)' } : undefined}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="ml-auto w-full sm:w-56">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.cpn.search')} className="h-9 rounded-full text-[12.5px]" />
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-500">
            <TicketPercent className="h-6 w-6" />
          </span>
          <p className="mt-3 text-[14px] font-extrabold">{items.length === 0 ? 'No coupons yet' : 'Nothing matches this filter'}</p>
          <p className="mt-1 text-[12.5px] text-zinc-400 dark:text-zinc-500">
            {items.length === 0 ? 'Create a code like KAYA10 and share it with your clients.' : 'Try another status or clear the search.'}
          </p>
        </div>
      ) : (
        <div className="gr-scroll overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ maxWidth: '100%' }}>
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Code</th>
                <th className="px-3 py-3 font-bold">Bonus</th>
                <th className="px-3 py-3 font-bold">Usage</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 font-bold">Expires</th>
                <th className="px-3 py-3 font-bold">Note</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {list.map((c) => {
                const st = couponStatusOf(c)
                const pct = c.maxUses > 0 ? Math.min(100, (c.usedCount / c.maxUses) * 100) : c.usedCount > 0 ? 100 : 0
                return (
                  <tr key={c.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewing(c)}
                        className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 px-2.5 py-1 font-mono text-[12px] font-extrabold tracking-wider text-zinc-800 dark:text-zinc-100 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                        title={t('admin.cpn.viewRedemptions')}
                      >
                        {c.code}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{money(c.value)}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => setViewing(c)} className="group min-w-[110px] text-left" title={t('admin.cpn.viewRedemptions')}>
                        <p className="text-[12px] font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
                          {c.usedCount}<span className="text-zinc-400 dark:text-zinc-500"> / {c.maxUses > 0 ? c.maxUses : '∞'} used</span>
                        </p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, c.usedCount > 0 ? 8 : 0)}%`, background: st === 'ACTIVE' ? 'var(--brand)' : '#a1a1aa' }} />
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${COUPON_STATUS_STYLES[st]}`}>{st}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">{c.expiresAt ? formatDateTime(c.expiresAt) : '—'}</td>
                    <td className="max-w-[200px] px-3 py-3"><p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">{c.note ?? '—'}</p></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={c.active}
                          disabled={toggling === c.id}
                          onCheckedChange={() => toggle(c)}
                          aria-label={`${c.active ? 'Pause' : 'Resume'} coupon ${c.code}`}
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(c)} aria-label={`Delete coupon ${c.code}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TicketPercent className="h-4 w-4" style={{ color: 'var(--brand-ink)' }} /> New promo coupon</DialogTitle>
            <DialogDescription>Your clients redeem it once in Add funds → the bonus lands in their wallet instantly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-[12px] font-bold">Code</Label>
                <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">A-Z, 0-9, dash</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  placeholder="KAYA10"
                  className="min-h-[40px] font-mono font-extrabold tracking-wider"
                />
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setForm({ ...form, code: randomCouponCode() })} aria-label={t('admin.cpn.ariaRandom')}>
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              {codeTaken && <p className="mt-1 text-[11px] font-bold text-rose-500">This code already exists — pick another.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="text-[12px] font-bold">Bonus amount</Label>
                  <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">USD</span>
                </div>
                <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} type="number" min={0.5} step="0.5" placeholder="10.00" className="min-h-[40px]" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="text-[12px] font-bold">Max uses</Label>
                  <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">0 = unlimited</span>
                </div>
                <Input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} type="number" min={0} step="1" placeholder="0" className="min-h-[40px]" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-[12px] font-bold">Expires on</Label>
                <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">optional</span>
              </div>
              <Input value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} type="date" className="min-h-[40px]" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-[12px] font-bold">Note</Label>
                <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500">optional</span>
              </div>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('admin.cpn.notePlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={create} disabled={!codeValid || !valueValid || creating} style={{ background: 'var(--brand)' }}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <TicketPercent className="mr-1.5 h-3.5 w-3.5" /> Create coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redemptions dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-0.5 font-mono text-[13px] font-extrabold tracking-wider">{viewing?.code}</span>
              redemptions
            </DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            {viewing ? `${viewing.usedCount} of ${viewing.maxUses > 0 ? viewing.maxUses : 'unlimited'} uses · ${money(viewing.value)} per redemption` : ''}
          </p>
          {!viewing || viewing.redemptions.length === 0 ? (
            <div className="py-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-500">
                <TicketPercent className="h-5 w-5" />
              </span>
              <p className="mt-2 text-[13px] font-extrabold">No redemptions yet</p>
              <p className="mt-0.5 text-[12px] text-zinc-400 dark:text-zinc-500">When a client redeems this code it will show up here.</p>
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto gr-scroll pr-1">
              {viewing.redemptions.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>
                    {r.user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-zinc-900 dark:text-zinc-50">{r.user.name}</p>
                    <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{r.user.email} · {formatDateTime(r.createdAt)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">{money(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon “{deleting?.code}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The code stops working immediately. Past redemptions stay in clients&apos; wallets and transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>
              <Ban className="mr-1.5 h-3.5 w-3.5" /> Delete coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

void Loader2
