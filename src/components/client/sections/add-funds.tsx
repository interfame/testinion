'use client'

// Client portal — Add Funds (gateways, deposits, saved cards)

import { useEffect, useMemo, useState } from 'react'
import {
  Bitcoin, CheckCircle2, CircleDollarSign, CreditCard, Clock3, Landmark,
  Loader2, Lock, Plus, RefreshCw, ShieldCheck, Sparkles, Ticket, Trash2, Wallet, XCircle,
} from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { api, mutate } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/format'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClientData } from '../client-data'
import { useMoney, Card, CardHead, EmptyState, LoadingRows, Pill, BrandButton } from '../bits'
import type { FundPostResult, Gateway, PaymentMethod } from '../types'

const QUICK = [10, 25, 50, 100, 250]

const GATEWAY_ICON: Record<string, typeof CreditCard> = {
  CARD: CreditCard,
  PAYPAL: Wallet,
  CRYPTO: Bitcoin,
  BANK: Landmark,
  MANUAL: CircleDollarSign,
}

// POST /api/funds result (real payment engine): either a gateway redirect
// (PayPal/MercadoPago checkout or crypto invoice), manual instructions for
// review, or the legacy instant shapes kept for compatibility.
type FundPost = FundPostResult & {
  redirect?: string
  manual?: boolean
  instructions?: string
  crypto?: boolean
}
type VerifyPost = { status: 'paid' | 'pending' | 'failed' | 'unknown'; credited?: boolean; balance?: number }

export default function AddFundsSection({ onRefresh }: { onRefresh?: () => void }) {
  const { user, setUser, refresh } = useApp()
  const { t } = useI18n()
  const m = useMoney()
  const { funds, fundsLoading, reloadFunds } = useClientData()

  const [gatewayId, setGatewayId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [awaitApproval, setAwaitApproval] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [manualInfo, setManualInfo] = useState<{ depositId: string; method: string; instructions: string } | null>(null)
  const [cryptoPendingId, setCryptoPendingId] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  // Saved methods state
  const [addOpen, setAddOpen] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardBrand, setCardBrand] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [addingCard, setAddingCard] = useState(false)
  const [deleteMethod, setDeleteMethod] = useState<PaymentMethod | null>(null)
  const [deletingCard, setDeletingCard] = useState(false)

  // Promo code state
  const [promo, setPromo] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoDone, setPromoDone] = useState<{ code: string; amount: number } | null>(null)

  const gateways = funds?.gateways ?? []
  const deposits = funds?.deposits ?? []
  const methods = funds?.methods ?? []
  const isPlatformUser = user.platformId != null

  const gateway: Gateway | undefined = useMemo(
    () => gateways.find((g) => g.id === gatewayId) ?? gateways[0],
    [gateways, gatewayId],
  )
  const amountNum = Math.round(parseFloat(amount) * 100) / 100 || 0
  const fee = gateway ? Math.round(amountNum * (gateway.feePercent / 100) * 100) / 100 : 0
  const total = Math.round((amountNum + fee) * 100) / 100

  // Re-check a deposit with the provider (PayPal order / MP payment / crypto invoice).
  async function verifyDeposit(depositId: string) {
    setChecking(true)
    const res = await mutate(
      () => api.post<VerifyPost>('/api/funds/verify', { depositId }),
      { silent: true },
    )
    setChecking(false)
    if (!res) {
      toast({ title: t('cfund.verifyFail'), variant: 'destructive' })
      return
    }
    if (res.status === 'paid') {
      setSuccessMsg(t('cfund.paidMsg'))
      setAwaitApproval(false)
      setCryptoPendingId(null)
      if (typeof res.balance === 'number') setUser({ ...user, balance: res.balance })
      toast({ title: t('cfund.paidToast') })
    } else if (res.status === 'failed') {
      toast({ title: t('cfund.notCompleted'), variant: 'destructive' })
    } else {
      setAwaitApproval(true)
      toast({ title: t('cfund.stillProcessing') })
    }
    reloadFunds()
    refresh()
    onRefresh?.()
  }

  async function submitDeposit() {
    if (!gateway || amountNum <= 0) {
      toast({ title: t('cfund.enterValid'), variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const res = await mutate(
      () => api.post<FundPost>('/api/funds', { gatewayId: gateway.id, amount: amountNum }),
      { silent: true },
    )
    setSubmitting(false)
    if (!res) return
    setAmount('')
    if (res.redirect) {
      // Real gateway checkout — full navigation away from the panel.
      setRedirecting(true)
      toast({ title: res.message ?? t('cfund.redirectToast') })
      window.location.href = res.redirect
      return
    }
    setManualInfo(null)
    setCryptoPendingId(null)
    if (res.manual) {
      // Manual method: show the payment instructions; credited after approval.
      setManualInfo({
        depositId: res.deposit?.id ?? '',
        method: res.deposit?.method ?? gateway.name,
        instructions: res.instructions ?? '',
      })
      setAwaitApproval(true)
      setSuccessMsg(null)
      toast({ title: res.message ?? t('cfund.depositCreated') })
    } else if (res.pending) {
      setAwaitApproval(true)
      setSuccessMsg(null)
      toast({ title: res.message ?? t('cfund.awaitToast') })
    } else {
      setSuccessMsg(res.message ?? t('cfund.fundsCredited'))
      setAwaitApproval(false)
      if (typeof res.balance === 'number') setUser({ ...user, balance: res.balance })
      toast({ title: res.message ?? t('cfund.fundsCredited') })
    }
    if (res.crypto && res.deposit?.id) setCryptoPendingId(res.deposit.id)
    reloadFunds()
    refresh()
    onRefresh?.()
  }

  // Auto-poll the newest pending crypto deposit (invoice paid check) every 12s, max 10 tries.
  useEffect(() => {
    if (!cryptoPendingId) return
    let tries = 0
    const id = setInterval(async () => {
      tries += 1
      if (tries > 10) {
        setCryptoPendingId(null)
        return
      }
      const res = await api
        .post<VerifyPost>('/api/funds/verify', { depositId: cryptoPendingId })
        .catch(() => null)
      if (!res || res.status !== 'paid') return
      setCryptoPendingId(null)
      setSuccessMsg(t('cfund.paidMsg'))
      setAwaitApproval(false)
      if (typeof res.balance === 'number') setUser({ ...user, balance: res.balance })
      toast({ title: t('cfund.paidToast') })
      reloadFunds()
      refresh()
      onRefresh?.()
    }, 12_000)
    return () => clearInterval(id)
  }, [cryptoPendingId])

  // Coming back from a gateway checkout (?funds=<depositId> | cancel) — verify + clean URL.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const f = sp.get('funds')
    if (!f) return
    window.history.replaceState(null, '', window.location.pathname)
    if (f === 'cancel') {
      toast({ title: t('cfund.canceledToast') })
      return
    }
    // Deferred so the mount render is not blocked (and set-state lands after paint).
    const timer = setTimeout(() => void verifyDeposit(f), 0)
    return () => clearTimeout(timer)
  }, [])

  async function redeemPromo() {
    if (!promo.trim()) return
    setPromoBusy(true)
    // No `silent` — API errors (invalid/expired/already used) must toast
    const res = await mutate(
      () => api.post<{ ok: boolean; amount: number; balance: number; message: string }>('/api/funds/coupon', { code: promo }),
      {},
    )
    setPromoBusy(false)
    if (res) {
      setPromoDone({ code: promo.trim().toUpperCase(), amount: res.amount })
      if (typeof res.balance === 'number') setUser({ ...user, balance: res.balance })
      toast({ title: res.message })
      setPromo('')
      reloadFunds()
      refresh()
      onRefresh?.()
    }
  }

  async function addCard() {
    setAddingCard(true)
    const [expMonth, expYear] = cardExp.split('/').map((p) => parseInt(p.trim()))
    const res = await mutate(
      () => api.post<{ method: PaymentMethod }>('/api/funds/methods', {
        number: cardNumber,
        brand: cardBrand || undefined,
        expMonth,
        expYear,
      }),
      { success: t('cfund.cardSaved') },
    )
    setAddingCard(false)
    if (res) {
      setAddOpen(false)
      setCardNumber('')
      setCardBrand('')
      setCardExp('')
      reloadFunds()
    }
  }

  async function removeCard() {
    if (!deleteMethod) return
    setDeletingCard(true)
    const res = await mutate(async () => {
      // DELETE with JSON body — use fetch directly (api.del has no body support)
      const r = await fetch('/api/funds/methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteMethod.id }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error((data as { error?: string }).error || t('cfund.cardRemoveFail'))
      return data as { ok: boolean }
    }, { success: t('cfund.cardRemoved') })
    setDeletingCard(false)
    if (res) {
      setDeleteMethod(null)
      reloadFunds()
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('client.fundWallet')}
        description={t('cfund.desc')}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: gateways + amount */}
        <div className="space-y-4 lg:col-span-3">
          {awaitApproval && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-[13.5px] font-extrabold text-amber-800">{t('cfund.awaitTitle')}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-400">
                  {t('cfund.awaitDesc')}
                </p>
              </div>
            </div>
          )}
          {manualInfo && (
            <Card>
              <CardHead icon={Landmark} title={t('cfund.manualTitle')} sub={manualInfo.method} />
              <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-sans text-[12.5px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200">
                {manualInfo.instructions}
              </pre>
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-amber-600 dark:text-amber-400">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t('cfund.manualNote')}
              </p>
            </Card>
          )}
          {cryptoPendingId && (
            <Card>
              <CardHead icon={Bitcoin} title={t('cfund.cryptoTitle')} sub={t('cfund.cryptoSub')} />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 min-h-[32px] gap-1 rounded-full text-[12px] font-bold"
                  disabled={checking}
                  onClick={() => verifyDeposit(cryptoPendingId)}
                >
                  {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {t('cfund.checkNow')}
                </Button>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('cfund.depositNo').replace('{n}', cryptoPendingId.slice(-6))}</span>
              </div>
            </Card>
          )}
          {successMsg && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-[13.5px] font-extrabold text-emerald-800">{t('cfund.successTitle')}</p>
                <p className="mt-0.5 text-[12.5px] text-emerald-700 dark:text-emerald-400">{successMsg}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHead icon={Wallet} title={t('cfund.chooseMethod')} sub={t('cfund.secureSub')} />
            {fundsLoading && !funds ? (
              <LoadingRows rows={3} />
            ) : gateways.length === 0 ? (
              <EmptyState icon={CreditCard} title={t('cfund.noMethodsTitle')} message={t('cfund.noMethodsDesc')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gateways.map((g) => {
                  const Icon = GATEWAY_ICON[g.type] ?? CreditCard
                  const selected = gateway?.id === g.id
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGatewayId(g.id)}
                      aria-pressed={selected}
                      className={`relative flex min-h-[76px] flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                        selected
                          ? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-[0_0_0_1px_var(--brand)]'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${selected ? 'bg-[var(--brand)]/15' : 'bg-zinc-100 dark:bg-zinc-800/60'}`}>
                          <Icon className={`h-4 w-4 ${selected ? 'text-[var(--brand)]' : 'text-zinc-500 dark:text-zinc-400'}`} />
                        </span>
                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-[13px] font-extrabold text-zinc-900 dark:text-zinc-50">{g.name}</p>
                        <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                          {g.type}{g.feePercent > 0 ? t('cfund.feeTag').replace('{n}', String(g.feePercent)) : t('cfund.noFeeTag')}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHead icon={CircleDollarSign} title={t('common.amount')} sub={t('cfund.amountSub')} />
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => setAmount(String(q))}
                    className={`min-h-[40px] min-w-[64px] rounded-full border px-4 text-[13px] font-extrabold tabular-nums transition ${
                      amount === String(q)
                        ? 'border-[var(--brand)] text-white'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                    style={amount === String(q) ? { background: 'var(--brand)' } : undefined}
                  >
                    ${q}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fund-amount">{t('cfund.amountUsd')}</Label>
                <Input
                  id="fund-amount"
                  className="min-h-[44px] text-[15px] font-bold"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="0.5"
                  placeholder="50.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 text-[13px]">
                <div className="flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">{t('common.amount')}</span><span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{m(amountNum)}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-zinc-500 dark:text-zinc-400">{t('cfund.gatewayFee').replace('{n}', gateway && gateway.feePercent > 0 ? `(${gateway.feePercent}%)` : '')}</span><span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{m(fee)}</span></div>
                <div className="mt-2 flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2">
                  <span className="font-bold text-zinc-700 dark:text-zinc-200">{t('cfund.youPay')}</span>
                  <span className="text-lg font-extrabold tabular-nums text-[var(--brand)]">{m(total)}</span>
                </div>
              </div>

              <BrandButton
                className="min-h-[44px] w-full text-[14px]"
                disabled={!gateway || amountNum <= 0 || submitting || redirecting}
                onClick={submitDeposit}
              >
                {submitting || redirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                {redirecting ? t('cfund.openingCheckout') : submitting ? t('cfund.processing') : t('cfund.depositCta').replace('{amount}', m(total))}
              </BrandButton>
              <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {isPlatformUser
                  ? t('cfund.platformNote')
                  : t('cfund.gatewayNote')}
              </p>
            </div>
          </Card>
        </div>

        {/* Right: methods + deposits */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHead
              icon={CreditCard}
              title={t('client.paymentMethod')}
              sub={t('cfund.savedSub')}
              right={
                <Button size="sm" variant="outline" className="h-8 min-h-[32px] gap-1 rounded-full text-[12px] font-bold" onClick={() => setAddOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> {t('cfund.add')}
                </Button>
              }
            />
            {methods.length === 0 ? (
              <EmptyState icon={CreditCard} title={t('cfund.noCardsTitle')} message={t('cfund.noCardsDesc')} />
            ) : (
              <div className="space-y-2">
                {methods.map((pm) => (
                  <div key={pm.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                    <span className="flex h-9 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 dark:from-zinc-800 to-zinc-900 dark:to-zinc-950 text-white">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-50">
                        {pm.brand} •••• {pm.last4}
                        {pm.primary && <Pill tone="emerald" className="ml-2">{t('cfund.default')}</Pill>}
                      </p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('cfund.exp').replace('{d}', `${String(pm.expMonth).padStart(2, '0')}/${pm.expYear}`)}</p>
                    </div>
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400"
                      aria-label={t('cfund.removeCardAria').replace('{brand}', pm.brand).replace('{last4}', pm.last4)}
                      onClick={() => setDeleteMethod(pm)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Promo code — ticket-styled card with side notches */}
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-[var(--brand)]/45 bg-gradient-to-br from-[var(--brand)]/[0.05] via-transparent to-[var(--brand)]/[0.09] p-4">
            <span aria-hidden className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-dashed border-[var(--brand)]/45 bg-background" />
            <span aria-hidden className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-dashed border-[var(--brand)]/45 bg-background" />
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/12 text-[var(--brand)]">
                <Ticket className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{t('client.promo.title')}</p>
                <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">{t('client.promo.sub')}</p>
              </div>
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--brand)]/60" />
            </div>
            {promoDone ? (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-extrabold text-emerald-800 dark:text-emerald-300">
                    +{m(promoDone.amount)} · {promoDone.code}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">{t('client.promo.success')}</p>
                </div>
                <button onClick={() => setPromoDone(null)} className="text-[11px] font-bold text-emerald-700/70 dark:text-emerald-400/70 underline-offset-2 hover:underline">
                  {t('client.promo.another')}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Input
                  aria-label={t('client.promo.title')}
                  className="min-h-[42px] flex-1 border-dashed font-mono text-[13px] font-extrabold uppercase tracking-wider placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  placeholder={t('client.promo.placeholder')}
                  value={promo}
                  onChange={(e) => setPromo(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') redeemPromo() }}
                />
                <BrandButton
                  className="min-h-[42px] shrink-0 px-5 text-[13px]"
                  disabled={!promo.trim() || promoBusy}
                  onClick={redeemPromo}
                >
                  {promoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('client.promo.apply')}
                </BrandButton>
              </div>
            )}
            {!promoDone && <p className="mt-2 text-[10.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">{t('client.promo.hint')}</p>}
          </div>

          <Card>
            <CardHead icon={Clock3} title={t('cfund.historyTitle')} sub={t('cfund.historySub')} />
            {deposits.length === 0 ? (
              <EmptyState icon={Wallet} title={t('cfund.noDepositsTitle')} message={t('cfund.noDepositsDesc')} />
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1 gr-scroll">
                {deposits.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{m(d.amount)}</p>
                      <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{d.method} · {formatDateTime(d.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${
                        d.status === 'APPROVED' ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        : d.status === 'REJECTED' ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                        : 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {d.status === 'APPROVED' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : d.status === 'REJECTED' ? <XCircle className="mr-1 h-3 w-3" /> : <Clock3 className="mr-1 h-3 w-3" />}
                      {d.status === 'APPROVED' ? t('cfund.credited') : d.status === 'REJECTED' ? t('status.REJECTED') : t('cfund.awaitingApproval')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add card dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('cfund.addCardTitle')}</DialogTitle>
            <DialogDescription>
              {t('cfund.addCardDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="card-number">{t('cfund.cardNumber')}</Label>
              <Input
                id="card-number"
                className="min-h-[40px]"
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="card-brand">{t('cfund.cardBrand')}</Label>
                <Input id="card-brand" className="min-h-[40px]" placeholder={t('cfund.cardBrandPh')} value={cardBrand} onChange={(e) => setCardBrand(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-exp">{t('cfund.cardExp')}</Label>
                <Input id="card-exp" className="min-h-[40px]" placeholder="12/28" value={cardExp} onChange={(e) => setCardExp(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
            <BrandButton onClick={addCard} disabled={addingCard || cardNumber.replace(/\D/g, '').length < 12}>
              {addingCard && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} {t('cfund.saveCard')}
            </BrandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete card confirm */}
      <AlertDialog open={!!deleteMethod} onOpenChange={(open) => !open && setDeleteMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cfund.removeCardQ')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cfund.removeCardDesc').replace('{brand}', deleteMethod?.brand ?? '').replace('{last4}', deleteMethod?.last4 ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cfund.keepCard')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); removeCard() }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deletingCard && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} {t('admin.removeCta')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
