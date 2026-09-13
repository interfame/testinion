// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Super Admin — Promo coupons: create codes, credit wallets, track redemptions.

import { useMemo, useState } from 'react'
import {
  BadgePercent, Ban, Dices, Loader2, Plus, Ticket, Trash2, Users, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { useI18n } from '@/lib/i18n'
import { useEnumLabel } from '@/components/shared/panel-shell'
import {
  AdminCard, apiDel, EmptyState, FieldLabel, Money, TableShell,
  useDebounced, type AdminStats,
} from './admin-ui'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useApp } from '@/components/shared/app-context'

type AdminCoupon = {
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

type Status = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'EXHAUSTED'

const STATUS_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  PAUSED: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  EXPIRED: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  EXHAUSTED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
}

function statusOf(c: AdminCoupon): Status {
  if (!c.active) return 'PAUSED'
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return 'EXPIRED'
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return 'EXHAUSTED'
  return 'ACTIVE'
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `GR-${s}`
}

export function CouponsSection({ stats }: { stats?: AdminStats | null }) {
  const { currencyOf, user, lang } = useApp()
  const { t } = useI18n()
  const statusLabel = useEnumLabel()
  const { data, loading, refresh } = useApi<{ items: AdminCoupon[]; totalGiven: number }>('/api/admin/coupons')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ code: '', value: '', maxUses: '0', expiresAt: '', note: '' })
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null)
  const [viewing, setViewing] = useState<AdminCoupon | null>(null)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const q = useDebounced(query).toLowerCase()

  const list = useMemo(() => {
    const items = data?.items ?? []
    return items.filter((c) => {
      if (filter !== 'ALL' && statusOf(c) !== filter) return false
      if (q && !`${c.code} ${c.note ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, filter, q])

  const items = data?.items ?? []
  const activeCount = items.filter((c) => statusOf(c) === 'ACTIVE').length
  const redemptions = items.reduce((acc, c) => acc + c.usedCount, 0)

  const create = async () => {
    setCreating(true)
    // No `silent` — API errors (duplicate code, invalid amount) must toast
    const ok = await mutate(
      () => api.post<{ item: { code: string }; message?: string }>('/api/admin/coupons', {
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
      toast({ title: ok.message ?? t('admin.cpn.toastCreated').replace('{code}', ok.item.code) })
      setAdding(false)
      setForm({ code: '', value: '', maxUses: '0', expiresAt: '', note: '' })
      refresh()
    }
  }

  const toggle = async (c: AdminCoupon) => {
    setToggling(c.id)
    const ok = await mutate(
      () => api.patch('/api/admin/coupons', { id: c.id, active: !c.active }),
      {},
    )
    setToggling(null)
    if (ok) refresh()
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/coupons', { id: deleting.id }), {})
    if (ok) { setDeleting(null); refresh() }
  }

  const codeTaken = (data?.items ?? []).some((c) => c.code === form.code.trim().toUpperCase())
  const codeValid = form.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').length >= 3 && !codeTaken
  const valueValid = parseFloat(form.value) > 0

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.coupons')}
        description={t('admin.cpn.desc')}
        actions={
          <Button onClick={() => { setForm((f) => ({ ...f, code: randomCode() })); setAdding(true) }} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> {t('admin.cpn.new')}
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Ticket, label: t('admin.cpn.kpiCoupons'), value: String(items.length), sub: t('admin.cpn.kpiActiveSub').replace('{n}', String(activeCount)), tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40' },
          { icon: BadgePercent, label: t('admin.cpn.kpiRedemptions'), value: String(redemptions), sub: t('admin.cpn.kpiAllTime'), tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
          { icon: Wallet, label: t('admin.cpn.kpiTotal'), value: formatMoney(data?.totalGiven ?? 0, currencyOf(user.currency), lang), sub: t('admin.cpn.kpiViaCodes'), tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
          { icon: Users, label: t('admin.cpn.kpiReach'), value: String(stats?.totalUsers ?? 0), sub: t('admin.cpn.kpiReachSub'), tone: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {['ALL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'EXHAUSTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${filter === s ? 'text-[var(--on-brand)]' : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}
            style={filter === s ? { background: 'var(--brand)' } : undefined}
          >
            {s === 'ALL' ? t('common.all') : statusLabel(s)}
          </button>
        ))}
        <div className="ml-auto w-full sm:w-56">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.cpn.search')} className="h-9 rounded-full text-[12.5px]" />
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={Ticket}
            title={items.length === 0 ? t('admin.cpn.none') : t('admin.cpn.noMatch')}
            hint={items.length === 0 ? t('admin.cpn.noneHint') : t('admin.cpn.noMatchHint')}
          />
        </AdminCard>
      ) : (
        <TableShell>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.cpn.code')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.cpn.bonus')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.cpn.usage')}</th>
                <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.cpn.expires')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.u.note')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {list.map((c) => {
                const st = statusOf(c)
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
                    <td className="px-3 py-3 font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400"><Money usd={c.value} /></td>
                    <td className="px-3 py-3">
                      <button onClick={() => setViewing(c)} className="group min-w-[110px] text-left" title={t('admin.cpn.viewRedemptions')}>
                        <p className="text-[12px] font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
                          {c.usedCount}<span className="text-zinc-400 dark:text-zinc-500"> / {c.maxUses > 0 ? c.maxUses : '∞'} {t('admin.cpn.used')}</span>
                        </p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, c.usedCount > 0 ? 8 : 0)}%`, background: st === 'ACTIVE' ? 'var(--brand)' : '#a1a1aa' }} />
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${STATUS_STYLES[st]}`}>{st}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">{c.expiresAt ? formatDateTime(c.expiresAt) : '—'}</td>
                    <td className="max-w-[200px] px-3 py-3"><p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">{c.note ?? '—'}</p></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={c.active}
                          disabled={toggling === c.id}
                          onCheckedChange={() => toggle(c)}
                          aria-label={c.active ? t('admin.cpn.ariaPause').replace('{code}', c.code) : t('admin.cpn.ariaResume').replace('{code}', c.code)}
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(c)} aria-label={t('admin.cpn.ariaDelete').replace('{code}', c.code)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableShell>
      )}

      {/* Create dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ticket className="h-4 w-4" style={{ color: 'var(--brand-ink)' }} /> {t('admin.cpn.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('admin.cpn.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div>
              <FieldLabel hint="A-Z, 0-9, dash">{t('admin.cpn.code')}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  placeholder="WELCOME10"
                  className="min-h-[40px] font-mono font-extrabold tracking-wider"
                />
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setForm({ ...form, code: randomCode() })} aria-label={t('admin.cpn.ariaRandom')}>
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              {codeTaken && <p className="mt-1 text-[11px] font-bold text-rose-500">{t('admin.cpn.codeTaken')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel hint="USD">{t('admin.cpn.bonusAmount')}</FieldLabel>
                <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} type="number" min={0.5} step="0.5" placeholder="10.00" className="min-h-[40px]" />
              </div>
              <div>
                <FieldLabel hint={t('admin.cpn.unlimitedHint')}>{t('admin.cpn.maxUses')}</FieldLabel>
                <Input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} type="number" min={0} step="1" placeholder="0" className="min-h-[40px]" />
              </div>
            </div>
            <div>
              <FieldLabel hint={t('admin.u.noteHint')}>{t('admin.cpn.expiresOn')}</FieldLabel>
              <Input value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} type="date" className="min-h-[40px]" />
            </div>
            <div>
              <FieldLabel hint={t('admin.u.noteHint')}>{t('admin.u.note')}</FieldLabel>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('admin.cpn.notePlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            <Button onClick={create} disabled={!codeValid || !valueValid || creating} style={{ background: 'var(--brand)' }}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <Ticket className="mr-1.5 h-3.5 w-3.5" /> {t('admin.cpn.createCta')}
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
              {t('admin.cpn.redemptionsWord')}
            </DialogTitle>
            <DialogDescription>
              {viewing ? t('admin.cpn.redemptionsDesc')
                .replace('{n}', String(viewing.usedCount))
                .replace('{max}', viewing.maxUses > 0 ? String(viewing.maxUses) : t('admin.cpn.unlimited'))
                .replace('{money}', formatMoney(viewing.value, currencyOf(user.currency), lang)) : ''}
            </DialogDescription>
          </DialogHeader>
          {!viewing || viewing.redemptions.length === 0 ? (
            <EmptyState icon={Ticket} title={t('admin.cpn.noRedemptions')} hint={t('admin.cpn.noRedemptionsHint')} />
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
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Money usd={r.amount} /></span>
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
            <AlertDialogTitle>{t('admin.cpn.deleteQ').replace('{code}', deleting?.code ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.cpn.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>
              <Ban className="mr-1.5 h-3.5 w-3.5" /> {t('admin.cpn.deleteCta')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
