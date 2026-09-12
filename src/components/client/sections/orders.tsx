'use client'

// Client portal — Orders history with actions

import { useMemo, useState } from 'react'
import {
  Ban, ChevronDown, Download, ExternalLink, ListOrdered, Loader2, RefreshCw, Repeat, ShoppingBag,
} from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { formatDateTime } from '@/lib/format'
import { api, mutate } from '@/lib/api'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClientData } from '../client-data'
import { useMoney, Card, EmptyState, LoadingRows, TableWrap, Pill } from '../bits'
import { downloadCsv, csvName } from '@/lib/csv'
import type { ClientOrder, OrderManageResult } from '../types'

const TAB_KEYS = ['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED'] as const
const TAB_LABEL_KEYS = {
  all: 'client.tabs.all',
  PENDING: 'client.tabs.pending',
  IN_PROGRESS: 'client.tabs.inProgress',
  COMPLETED: 'client.tabs.completed',
  PARTIAL: 'client.tabs.partial',
  CANCELED: 'client.tabs.canceled',
} as const

export default function OrdersSection({ onRefresh }: { onRefresh?: () => void }) {
  const { user, refresh } = useApp()
  const { t } = useI18n()
  const m = useMoney()
  const { orders, ordersLoading, reloadOrders, reloadFunds } = useClientData()

  const [tab, setTab] = useState('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ order: ClientOrder; action: 'cancel' | 'refill' } | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const filtered = useMemo(
    () => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab],
  )

  async function runAction() {
    if (!confirm) return
    const { order, action } = confirm
    setBusyId(order.id)
    const res = await mutate(
      () => api.patch<OrderManageResult>('/api/orders/manage', { id: order.id, action }),
      { success: action === 'cancel' ? t('corders.cancelOk') : t('corders.refillOk') },
    )
    setBusyId(null)
    setConfirm(null)
    if (res) {
      refresh()
      onRefresh?.()
      reloadOrders()
      reloadFunds()
    }
  }

  function canCancel(o: ClientOrder) {
    return ['PENDING', 'IN_PROGRESS'].includes(o.status) && o.service?.cancel
  }
  function canRefill(o: ClientOrder) {
    return o.status === 'COMPLETED' && o.service?.refill
  }

  function exportCsv() {
    downloadCsv(
      csvName('orders'),
      [t('common.date'), t('cord.orderId'), t('common.service'), t('common.link'), t('common.quantity'), t('client.startCount'), t('client.remains'), t('corders.chargeUsd'), t('common.status')],
      filtered.map((o) => [
        new Date(o.createdAt).toISOString(),
        o.id,
        o.serviceName,
        o.link,
        o.quantity,
        o.startCount,
        o.remains,
        o.charge.toFixed(2),
        o.status,
      ]),
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('client.orderHistory')}
        description={`${orders.length} ${t('client.ordersOnAccount')}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="min-h-[40px] gap-1.5" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5" /> {t('common.exportCsv')}
            </Button>
            <Button variant="outline" className="min-h-[40px] gap-1.5" onClick={() => reloadOrders()} disabled={ordersLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} /> {t('client.refresh')}
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-white dark:bg-zinc-900 p-1 shadow-sm">
          {TAB_KEYS.map((value) => (
            <TabsTrigger key={value} value={value} className="min-h-[32px] gap-1.5 rounded-lg text-[12px] font-bold data-[state=active]:text-[var(--on-brand)]" style={tab === value ? { background: 'var(--brand)' } : undefined}>
              {t(TAB_LABEL_KEYS[value])}
              {counts[value] ? (
                <span className={`rounded-full px-1.5 text-[10px] font-extrabold ${tab === value ? 'bg-white/25' : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400'}`}>
                  {counts[value]}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-0 sm:p-0">
        {ordersLoading && orders.length === 0 ? (
          <div className="p-4 sm:p-6"><LoadingRows rows={6} /></div>
        ) : filtered.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              icon={ShoppingBag}
              title={t('client.noOrders')}
              message={t('client.noOrders')}
            />
          </div>
        ) : (
          <TableWrap>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <th className="px-4 py-3">{t('common.date')}</th>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">{t('common.service')}</th>
                  <th className="hidden px-3 py-3 lg:table-cell">{t('common.link')}</th>
                  <th className="px-3 py-3 text-right">{t('common.quantity')}</th>
                  <th className="px-3 py-3 text-right">{t('common.charge')}</th>
                  <th className="px-3 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <OrderRow
                    key={o.id}
                    o={o}
                    m={m}
                    busy={busyId === o.id}
                    expanded={!!expanded[o.id]}
                    onToggle={() => setExpanded((p) => ({ ...p, [o.id]: !p[o.id] }))}
                    onCancel={canCancel(o) ? () => setConfirm({ order: o, action: 'cancel' }) : undefined}
                    onRefill={canRefill(o) ? () => setConfirm({ order: o, action: 'refill' }) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {/* Confirm cancel / refill */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === 'cancel' ? t('corders.cancelQ') : t('corders.refillQ')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'cancel'
                ? t('corders.cancelDesc').replace('{id}', confirm.order.id.slice(0, 8)).replace('{money}', m(confirm.order.charge))
                : confirm
                  ? t('corders.refillDesc').replace('{id}', confirm.order.id.slice(0, 8))
                  : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('corders.keepIt')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); runAction() }}
              className="text-white"
              style={{ background: confirm?.action === 'cancel' ? '#e11d48' : 'var(--brand)' }}
            >
              {busyId ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {confirm?.action === 'cancel' ? t('corders.cancelYes') : t('corders.refillYes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OrderRow({ o, m, busy, expanded, onToggle, onCancel, onRefill }: {
  o: ClientOrder
  m: (n: number) => string
  busy: boolean
  expanded: boolean
  onToggle: () => void
  onCancel?: () => void
  onRefill?: () => void
}) {
  const { t } = useI18n()
  return (
    <>
      <tr className="border-b border-zinc-100 dark:border-zinc-800/70 transition hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
        <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDateTime(o.createdAt)}</td>
        <td className="whitespace-nowrap px-3 py-3">
          <button onClick={onToggle} className="group flex items-center gap-1 font-mono text-[11.5px] font-bold text-zinc-600 dark:text-zinc-300" aria-expanded={expanded}>
            <ChevronDown className={`h-3 w-3 text-zinc-300 dark:text-zinc-600 transition-transform group-hover:text-[var(--brand)] ${expanded ? 'rotate-180 text-[var(--brand)]' : ''}`} />
            #{o.id.slice(0, 8)}
          </button>
        </td>
        <td className="max-w-[220px] px-3 py-3">
          <span className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-50">{o.serviceName}</span>
          {['IN_PROGRESS', 'PENDING'].includes(o.status) && (
            <div className="mt-1.5 flex items-center gap-2">
              <Progress value={deliveredPct(o)} className="h-1.5 w-24" />
              <span className="text-[10px] font-bold tabular-nums text-[var(--brand)]">{Math.floor(deliveredPct(o))}%</span>
            </div>
          )}
          {o.status === 'PARTIAL' && (
            <div className="mt-1.5 flex items-center gap-2">
              <Progress value={deliveredPct(o)} className="h-1.5 w-24" />
              <span className="text-[10px] font-bold tabular-nums text-orange-500">{Math.floor(deliveredPct(o))}%</span>
            </div>
          )}
        </td>
        <td className="hidden max-w-[180px] px-3 py-3 lg:table-cell">
          <a href={o.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-zinc-500 dark:text-zinc-400 underline-offset-2 hover:text-[var(--brand)] hover:underline">
            <span className="truncate">{o.link.replace(/^https?:\/\//, '')}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-200">{o.quantity.toLocaleString()}</td>
        <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(o.charge)}</td>
        <td className="whitespace-nowrap px-3 py-3"><StatusBadge status={o.status} /></td>
        <td className="whitespace-nowrap px-4 py-3 text-right">
          <div className="flex justify-end gap-1.5">
            {onCancel && (
              <Button
                size="icon" variant="outline"
                className="h-8 w-8 min-h-[32px] rounded-full border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                disabled={busy}
                onClick={onCancel}
                aria-label={t('common.cancel')}
                title={t('common.cancel')}
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRefill && (
              <Button
                size="icon" variant="outline"
                className="h-8 w-8 min-h-[32px] rounded-full border-[var(--brand)]/30 text-[var(--brand)] hover:bg-[var(--brand)]/10"
                disabled={busy}
                onClick={onRefill}
                aria-label={t('client.refill')}
                title={t('client.refill')}
              >
                <Repeat className="h-3.5 w-3.5" />
              </Button>
            )}
            {!onCancel && !onRefill && <span className="text-[11px] text-zinc-300 dark:text-zinc-600">—</span>}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/70 dark:bg-zinc-900/50">
          <td colSpan={8} className="px-4 py-3 sm:px-6">
            <div className="grid gap-3 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
              <Detail label={t('cord.orderId')} value={`#${o.id}`} mono />
              <Detail label={t('client.startCount')} value={o.startCount.toLocaleString()} />
              <Detail label={t('client.remains')} value={o.remains.toLocaleString()} />
              <Detail label={t('common.link')} value={o.link} mono truncate />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('client.delivered')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Progress value={deliveredPct(o)} className="h-2 w-32" />
                  <span className="text-[11px] font-extrabold tabular-nums text-zinc-700 dark:text-zinc-200">{Math.floor(deliveredPct(o))}%</span>
                </div>
              </div>
              {o.dripfeed && (
                <Detail label={t('cord.dripfeed')} value={t('corders.dripDesc').replace('{runs}', String(o.dripRuns)).replace('{min}', String(o.dripInterval))} />
              )}
              {o.comments && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('client.comments')}</p>
                  <p className="mt-0.5 whitespace-pre-line text-zinc-600 dark:text-zinc-300">{o.comments}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {o.service?.cancel && <Pill tone="amber">{t('client.cancellable')}</Pill>}
                {o.service?.refill && <Pill tone="emerald">{t('client.refillable')}</Pill>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function deliveredPct(o: ClientOrder) {
  const done = Math.max(0, o.quantity - o.remains)
  return Math.min(100, Math.max(0, (done / Math.max(1, o.quantity)) * 100))
}

function Detail({ label, value, mono, truncate }: { label: string; value: string; mono?: boolean; truncate?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className={`mt-0.5 font-semibold text-zinc-700 dark:text-zinc-200 ${mono ? 'font-mono text-[11.5px]' : ''} ${truncate ? 'truncate' : ''}`} title={value}>
        {value}
      </p>
    </div>
  )
}
