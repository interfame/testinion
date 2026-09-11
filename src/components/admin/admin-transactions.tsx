'use client'

// Super Admin — Transactions ledger with type filter and colored amounts.

import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { useApi } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { downloadCsv, csvName } from '@/lib/csv'
import { Button } from '@/components/ui/button'
import { EmptyState, Money, TableShell, type AdminTransaction } from './admin-ui'

const TYPES = ['DEPOSIT', 'ORDER', 'REFUND', 'PLAN', 'ADDON', 'ADJUSTMENT', 'PAYOUT']

const TYPE_STYLES: Record<string, string> = {
  DEPOSIT: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  ORDER: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
  REFUND: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/60',
  PLAN: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  ADDON: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  ADJUSTMENT: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
  PAYOUT: 'bg-teal-50 text-teal-600 border-teal-200',
}

export function TransactionsSection() {
  const [type, setType] = useState('ALL')
  const url = useMemo(() => `/api/admin/transactions${type !== 'ALL' ? `?type=${type}` : ''}`, [type])
  const { data, loading } = useApi<{ transactions: AdminTransaction[] }>(url, [url])

  const list = data?.transactions ?? []
  const inflow = list.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const outflow = list.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title="Transactions"
        description="The global money ledger — latest 200 movements."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline" className="min-h-[40px] gap-1.5"
              onClick={() =>
                downloadCsv(
                  csvName('admin-transactions'),
                  ['Date', 'User', 'Email', 'Type', 'Description', 'Method', 'Reference', 'Amount (USD)', 'Status'],
                  list.map((t) => [
                    new Date(t.createdAt).toISOString(),
                    t.user?.name ?? '',
                    t.user?.email ?? '',
                    t.type,
                    t.description,
                    t.method ?? '',
                    t.reference ?? '',
                    t.amount.toFixed(2),
                    t.status,
                  ]),
                )
              }
              disabled={list.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-44 rounded-full text-[12.5px] font-semibold"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"><ArrowDownLeft className="h-3.5 w-3.5" /> Money in (page)</p>
          <p className="mt-0.5 text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400"><Money usd={inflow} /></p>
        </div>
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400"><ArrowUpRight className="h-3.5 w-3.5" /> Money out (page)</p>
          <p className="mt-0.5 text-lg font-extrabold tabular-nums text-rose-700 dark:text-rose-400"><Money usd={outflow} /></p>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <TableShell><EmptyState title="No transactions" hint="Nothing recorded for this filter yet." /></TableShell>
      ) : (
        <TableShell>
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-3 py-3 font-bold">User</th>
                <th className="px-3 py-3 font-bold">Type</th>
                <th className="px-3 py-3 font-bold">Description</th>
                <th className="px-3 py-3 font-bold">Ref</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {list.map((t) => (
                <tr key={t.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-zinc-500 dark:text-zinc-400">{formatDateTime(t.createdAt)}</td>
                  <td className="px-3 py-3">
                    <p className="max-w-[150px] truncate font-medium text-zinc-700 dark:text-zinc-200">{t.user?.name}</p>
                    <p className="max-w-[150px] truncate text-[11px] text-zinc-400 dark:text-zinc-500">{t.user?.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${TYPE_STYLES[t.type] ?? ''}`}>{t.type}</Badge>
                  </td>
                  <td className="max-w-[260px] px-3 py-3">
                    <p className="truncate text-zinc-700 dark:text-zinc-200">{t.description}</p>
                    {t.method && <p className="text-[11px] text-zinc-400 dark:text-zinc-500">via {t.method}</p>}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{t.reference ?? '—'}</td>
                  <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                  <td className={`px-4 py-3 text-right font-extrabold tabular-nums ${t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    <Money usd={t.amount} sign={t.amount > 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </div>
  )
}
