'use client'

// Super Admin — Deposits: pending approval queue (approve credits user balance atomically) + history.

import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelPageHeader, StatusBadge, useEnumLabel } from '@/components/shared/panel-shell'
import { InitialAvatar } from './admin-ui'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/format'
import { AdminCard, EmptyState, Money, TableShell, type AdminDeposit } from './admin-ui'

export function DepositsSection() {
  const { t } = useI18n()
  const statusLabel = useEnumLabel()
  const { data, loading, refresh } = useApi<{ deposits: AdminDeposit[] }>('/api/admin/deposits')
  const [tab, setTab] = useState('PENDING')
  const [confirm, setConfirm] = useState<{ d: AdminDeposit; action: 'approve' | 'reject' } | null>(null)

  const list = data?.deposits ?? []
  const pending = useMemo(() => list.filter((d) => d.status === 'PENDING'), [list])
  const filtered = tab === 'ALL' ? list : list.filter((d) => d.status === tab)

  const act = async () => {
    if (!confirm) return
    const ok = await mutate(
      () => api.patch('/api/admin/deposits', { id: confirm.d.id, action: confirm.action }),
      { success: confirm.action === 'approve' ? t('admin.dep.toastApproved').replace('{x}', `$${confirm.d.amount.toFixed(2)}`) : t('admin.dep.toastRejected') },
    )
    setConfirm(null)
    if (ok) refresh()
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.deposits')}
        description={pending.length > 0 ? t('admin.dep.pendingDesc').replace('{n}', String(pending.length)) : t('admin.dep.allDone')}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/60 p-1">
          <TabsTrigger value="PENDING" className="h-7 rounded-full px-3 text-[12px] font-bold">
            {statusLabel('PENDING')} {pending.length > 0 && <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="h-7 rounded-full px-3 text-[12px] font-bold">{statusLabel('APPROVED')}</TabsTrigger>
          <TabsTrigger value="REJECTED" className="h-7 rounded-full px-3 text-[12px] font-bold">{statusLabel('REJECTED')}</TabsTrigger>
          <TabsTrigger value="ALL" className="h-7 rounded-full px-3 text-[12px] font-bold">{t('common.all')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <AdminCard><EmptyState icon={Clock} title={t('admin.dep.none')} hint={t('admin.dep.noneHint')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.o.user')}</th>
                <th className="px-3 py-3 text-right font-bold">{t('common.amount')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.tx.method')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.tx.reference')}</th>
                <th className="px-3 py-3 font-bold">{t('common.date')}</th>
                <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                {tab === 'PENDING' && <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {filtered.map((d) => (
                <tr key={d.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <InitialAvatar name={d.user?.name ?? '?'} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{d.user?.name}</p>
                        <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{d.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold text-zinc-900 dark:text-zinc-50"><Money usd={d.amount} /></td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{d.method}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{d.reference ?? d.note ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-500 dark:text-zinc-400">{formatDateTime(d.createdAt)}</td>
                  <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                  {tab === 'PENDING' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" className="h-7 rounded-full bg-emerald-600 px-3 text-[11.5px] font-bold hover:bg-emerald-700" onClick={() => setConfirm({ d, action: 'approve' })}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> {t('admin.dep.approve')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-full border-rose-200 dark:border-rose-900/60 px-3 text-[11.5px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setConfirm({ d, action: 'reject' })}>
                          <XCircle className="mr-1 h-3 w-3" /> {t('admin.dep.reject')}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {/* Confirm approve/reject */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === 'approve' ? t('admin.dep.approveQ') : t('admin.dep.rejectQ')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'approve'
                ? t('admin.dep.approveDesc').replace('{name}', confirm?.d.user?.name ?? '').replace('{x}', confirm ? `$${confirm.d.amount.toFixed(2)}` : '')
                : t('admin.dep.rejectDesc').replace('{name}', confirm?.d.user?.name ?? '').replace('{x}', confirm ? `$${confirm.d.amount.toFixed(2)}` : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
              onClick={act}
            >
              {confirm?.action === 'approve' ? t('admin.dep.approveCta') : t('admin.dep.rejectCta')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
