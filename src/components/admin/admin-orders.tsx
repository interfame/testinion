// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Super Admin — Orders: status tabs, search, manual status control and details.

import { useMemo, useState } from 'react'
import { Download, Search, Eye, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { PanelPageHeader, StatusBadge, useEnumLabel } from '@/components/shared/panel-shell'
import { SocialLogo } from '@/components/shared/social-logo'
import { api, mutate, useApi } from '@/lib/api'
import { useRealtimeEvents } from '@/lib/realtime-client'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/format'
import { downloadCsv, csvName } from '@/lib/csv'
import { AdminCard, EmptyState, Money, TableShell, useDebounced, type AdminOrder } from './admin-ui'

const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED'] as const

export function OrdersSection() {
  const { t } = useI18n()
  const statusLabel = useEnumLabel()
  const [tab, setTab] = useState('ALL')
  const [q, setQ] = useState('')
  const dq = useDebounced(q)

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (tab !== 'ALL') p.set('status', tab)
    if (dq.trim()) p.set('q', dq.trim())
    return `/api/admin/orders?${p.toString()}`
  }, [tab, dq])
  const { data, loading, refresh } = useApi<{ orders: AdminOrder[] }>(url, [url])
  // Realtime: refresh the table instantly when the engine pushes an order update
  useRealtimeEvents(['order'], refresh)

  const [viewing, setViewing] = useState<AdminOrder | null>(null)
  const [viewStatus, setViewStatus] = useState('PENDING')
  const [viewRemains, setViewRemains] = useState('0')

  const openView = (o: AdminOrder) => {
    setViewing(o)
    setViewStatus(o.status)
    setViewRemains(String(o.remains))
  }

  const setOrderStatus = async (o: AdminOrder, status: string) => {
    const ok = await mutate(
      () => api.patch('/api/admin/orders', { id: o.id, status }),
      { success: t('admin.o.toastMarkedAs').replace('{status}', statusLabel(status)) },
    )
    if (ok) refresh()
  }

  const saveView = async () => {
    if (!viewing) return
    const ok = await mutate(
      () => api.patch('/api/admin/orders', { id: viewing.id, status: viewStatus, remains: viewRemains }),
      { success: t('admin.o.toastUpdated') },
    )
    if (ok) { setViewing(null); refresh() }
  }

  const counts = data?.orders.length ?? 0

  const exportCsv = () =>
    downloadCsv(
      csvName('admin-orders'),
      [t('common.date'), t('admin.o.order'), t('admin.o.user'), t('auth.email'), t('common.service'), t('common.category'), t('common.link'), t('common.quantity'), t('admin.o.remains'), t('admin.o.charge'), t('common.status')],
      (data?.orders ?? []).map((o) => [
        new Date(o.createdAt).toISOString(),
        o.id,
        o.user?.name ?? '',
        o.user?.email ?? '',
        o.serviceName,
        o.service?.category?.name ?? '',
        o.link,
        o.quantity,
        o.remains,
        o.charge.toFixed(2),
        o.status,
      ]),
    )

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('common.orders')}
        description={t('admin.o.desc')}
        actions={
          <Button variant="outline" className="min-h-[40px] gap-1.5" onClick={exportCsv} disabled={counts === 0}>
            <Download className="h-3.5 w-3.5" /> {t('admin.o.export')}
          </Button>
        }
      />

      {/* Tabs + search */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/60 p-1">
            <TabsTrigger value="ALL" className="h-7 rounded-full px-3 text-[12px] font-bold">{t('admin.o.all')}</TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="h-7 rounded-full px-3 text-[12px] font-bold">{statusLabel(s)}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.o.search')} className="h-9 rounded-full pl-9 text-[13px]" />
          </div>
          <span className="whitespace-nowrap text-[12px] font-medium text-zinc-400 dark:text-zinc-500">{t('admin.o.count').replace('{n}', String(counts))}</span>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : counts === 0 ? (
        <AdminCard><EmptyState title={t('admin.o.none')} hint={t('admin.o.noneHint')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.o.order')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.o.user')}</th>
                <th className="px-3 py-3 font-bold">{t('common.service')}</th>
                <th className="px-3 py-3 font-bold">{t('common.link')}</th>
                <th className="px-3 py-3 text-right font-bold">{t('admin.o.qty')}</th>
                <th className="px-3 py-3 text-right font-bold">{t('admin.o.charge')}</th>
                <th className="px-3 py-3 text-right font-bold">{t('admin.o.remains')}</th>
                <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3">
                    <p className="font-mono text-[11.5px] font-bold text-zinc-700 dark:text-zinc-200">#{o.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-[140px] truncate font-medium text-zinc-700 dark:text-zinc-200">{o.user?.name}</p>
                    <p className="max-w-[140px] truncate text-[11px] text-zinc-400 dark:text-zinc-500">{o.user?.email}</p>
                  </td>
                  <td className="max-w-[200px] px-3 py-3">
                    <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{o.serviceName}</p>
                    {o.service?.category && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                        <SocialLogo icon={o.service.category.icon} size={11} /> {o.service.category.name}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[180px] px-3 py-3">
                    <a href={o.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-[12px] text-zinc-500 dark:text-zinc-400 underline-offset-2 hover:underline" style={{ color: 'var(--brand-ink)' }}>
                      <span className="truncate">{o.link}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">{o.quantity.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-bold text-zinc-800 dark:text-zinc-100"><Money usd={o.charge} /></td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">{o.remains.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <Select value={o.status} onValueChange={(v) => setOrderStatus(o, v)}>
                      <SelectTrigger className="h-7 w-[120px] rounded-full border-zinc-200 dark:border-zinc-800 px-2 text-[10.5px] font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => openView(o)} aria-label={t('admin.o.view')}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {/* Order details dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.o.order')} #{viewing?.id.slice(-6).toUpperCase()}</DialogTitle>
            <DialogDescription>{t('admin.o.manual')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div className="grid grid-cols-2 gap-2">
              <Info label={t('common.service')} value={viewing?.serviceName ?? '—'} />
              <Info label={t('common.category')} value={viewing?.service?.category?.name ?? '—'} />
              <Info label={t('admin.o.user')} value={`${viewing?.user?.name ?? ''} (${viewing?.user?.email ?? ''})`} />
              <Info label={t('admin.o.placed')} value={viewing ? formatDateTime(viewing.createdAt) : '—'} />
              <Info label={t('common.quantity')} value={viewing?.quantity.toLocaleString() ?? '—'} />
              <Info label={t('admin.o.charge')} value={viewing ? <Money usd={viewing.charge} /> : '—'} />
              <Info label={t('admin.o.startCount')} value={viewing?.startCount.toLocaleString() ?? '—'} />
              <Info label={t('admin.o.dripfeed')} value={viewing?.dripfeed ? `${viewing.dripRuns} ${t('admin.o.runs')} / ${viewing.dripInterval}m` : t('admin.o.no')} />
            </div>
            {viewing?.comments && (
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('admin.o.comments')}</p>
                <p className="mt-0.5 text-[12.5px] text-zinc-700 dark:text-zinc-200">{viewing.comments}</p>
              </div>
            )}
            {viewing?.link && (
              <a href={viewing.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 break-all text-[12.5px] underline-offset-2 hover:underline" style={{ color: 'var(--brand-ink)' }}>
                {viewing.link} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
              <div>
                <Label className="mb-1.5 block text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{t('common.status')}</Label>
                <Select value={viewStatus} onValueChange={setViewStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{t('admin.o.remains')}</Label>
                <Input type="number" value={viewRemains} onChange={(e) => setViewRemains(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={viewStatus} />
              <Badge variant="outline" className="rounded-full text-[10px] font-bold">{t('admin.o.currentRemains')} {viewRemains}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>{t('common.cancel')}</Button>
            <Button onClick={saveView} style={{ background: 'var(--brand)' }}>{t('admin.o.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-zinc-800 dark:text-zinc-100">{value}</p>
    </div>
  )
}
