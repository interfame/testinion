'use client'

// Client portal — Transactions (wallet activity)

import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock3, Download, ReceiptText } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { downloadCsv, csvName } from '@/lib/csv'
import { useClientData } from '../client-data'
import { useMoney, Card, EmptyState, LoadingRows, Pill, TableWrap } from '../bits'
import type { Tx } from '../types'

const TYPE_TONE: Record<string, 'emerald' | 'rose' | 'sky' | 'amber' | 'violet' | 'zinc'> = {
  DEPOSIT: 'emerald',
  REFUND: 'sky',
  ORDER: 'zinc',
  PLAN: 'amber',
  ADDON: 'violet',
  ADJUSTMENT: 'violet',
  PAYOUT: 'amber',
}

export default function TransactionsSection() {
  const { t } = useI18n()
  const m = useMoney()
  const { funds, fundsLoading } = useClientData()

  const transactions = funds?.transactions ?? []
  const totals = useMemo(() => {
    let inSum = 0
    let outSum = 0
    for (const tx of transactions) {
      if (tx.amount >= 0) inSum += tx.amount
      else outSum += Math.abs(tx.amount)
    }
    return { inSum, outSum }
  }, [transactions])

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('common.transactions')}
        description="Every credit and charge on your wallet, in USD."
        actions={
          <Button
            variant="outline" className="min-h-[40px] gap-1.5"
            onClick={() =>
              downloadCsv(
                csvName('transactions'),
                ['Date', 'Type', 'Description', 'Method', 'Amount (USD)', 'Status'],
                transactions.map((tx) => [
                  new Date(tx.createdAt).toISOString(),
                  tx.type,
                  tx.description,
                  tx.method ?? '',
                  tx.amount.toFixed(2),
                  tx.status,
                ]),
              )
            }
            disabled={transactions.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> {t('common.exportCsv')}
          </Button>
        }
      />

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <Card className="p-4 sm:p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wide">Money in</p>
          </div>
          <p className="mt-1.5 text-xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(totals.inSum)}</p>
        </Card>
        <Card className="p-4 sm:p-4">
          <div className="flex items-center gap-2 text-rose-500">
            <ArrowUpRight className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wide">Money out</p>
          </div>
          <p className="mt-1.5 text-xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(totals.outSum)}</p>
        </Card>
      </div>

      <Card className="p-0 sm:p-0">
        {fundsLoading && !funds ? (
          <div className="p-4 sm:p-6"><LoadingRows rows={6} /></div>
        ) : transactions.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState icon={ReceiptText} title="No transactions yet" message="Deposits, orders and refunds will appear here." />
          </div>
        ) : (
          <TableWrap>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <th className="px-4 py-3 sm:px-6">{t('common.date')}</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="hidden px-3 py-3 md:table-cell">Method</th>
                  <th className="px-4 py-3 text-right sm:px-6">{t('common.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => <TxRow key={tx.id} tx={tx} m={m} />)}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  )
}

function TxRow({ tx, m }: { tx: Tx; m: (n: number) => string }) {
  const positive = tx.amount >= 0
  const tone = TYPE_TONE[tx.type] ?? 'zinc'
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800/70 transition hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
      <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400 sm:px-6">{formatDateTime(tx.createdAt)}</td>
      <td className="whitespace-nowrap px-3 py-3"><Pill tone={tone}>{tx.type}</Pill></td>
      <td className="max-w-[280px] px-3 py-3">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{tx.description}</span>
          {tx.status === 'PENDING' && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              <Clock3 className="h-2.5 w-2.5" /> Pending
            </span>
          )}
        </span>
      </td>
      <td className="hidden whitespace-nowrap px-3 py-3 text-zinc-500 dark:text-zinc-400 md:table-cell">{tx.method ?? '—'}</td>
      <td className={`whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums sm:px-6 ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
        {positive ? '+' : '−'}{m(Math.abs(tx.amount))}
      </td>
    </tr>
  )
}
