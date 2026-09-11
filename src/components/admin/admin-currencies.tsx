'use client'

// Super Admin — Currencies: inline rate editing, auto flags, FX API sync.

import { useMemo, useState } from 'react'
import { RefreshCw, Star, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { AdminCard, TableShell, type AdminCurrency } from './admin-ui'

type CurrenciesResponse = {
  currencies: AdminCurrency[]
  settings: { conversion_mode: string; conversion_api_url: string }
}

export function CurrenciesSection({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { data, loading, refresh } = useApi<CurrenciesResponse>('/api/admin/currencies')
  const [rateEdits, setRateEdits] = useState<Record<string, string>>({})
  const [syncing, setSyncing] = useState(false)

  // Displayed rates = server value unless the admin has typed an override
  const rates = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of data?.currencies ?? []) map[c.code] = rateEdits[c.code] ?? String(c.rate)
    return map
  }, [data, rateEdits])

  const saveRate = async (c: AdminCurrency) => {
    const raw = rates[c.code]
    if (raw === undefined || parseFloat(raw) === c.rate) {
      setRateEdits((prev) => {
        const next = { ...prev }
        delete next[c.code]
        return next
      })
      return
    }
    const ok = await mutate(
      () => api.patch('/api/admin/currencies', { code: c.code, rate: parseFloat(raw) }),
      { success: `${c.code} rate updated` },
    )
    if (ok) {
      setRateEdits((prev) => {
        const next = { ...prev }
        delete next[c.code]
        return next
      })
      refresh()
    }
  }

  const toggleAuto = async (c: AdminCurrency, auto: boolean) => {
    const ok = await mutate(() => api.patch('/api/admin/currencies', { code: c.code, auto }), { success: `${c.code} auto-sync ${auto ? 'on' : 'off'}` })
    if (ok) refresh()
  }

  const syncRates = async () => {
    setSyncing(true)
    const ok = await mutate(() => api.post('/api/admin/currencies/refresh'), { success: 'Rates synced from API' })
    setSyncing(false)
    if (ok) refresh()
  }

  const mode = data?.settings.conversion_mode ?? 'manual'
  const apiUrl = data?.settings.conversion_api_url ?? ''

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title="Currencies"
        description="Display conversion for balances and prices. Base currency is always USD."
        actions={
          <Button onClick={syncRates} disabled={syncing || mode !== 'api' || !apiUrl} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> Sync rates from API
          </Button>
        }
      />

      {/* Conversion API status */}
      <AdminCard title="Conversion source" description="How exchange rates are kept up to date">
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-300">
            Mode: <b className="capitalize" style={{ color: 'var(--brand)' }}>{mode}</b>
          </span>
          {apiUrl ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-500 dark:text-zinc-400">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span className="truncate font-mono text-[11.5px]">{apiUrl}</span>
            </span>
          ) : (
            <span className="text-[12.5px] text-zinc-400 dark:text-zinc-500">No API URL configured yet.</span>
          )}
          <Button variant="outline" size="sm" className="ml-auto h-8 rounded-full px-3 text-[12px] font-bold" onClick={() => onNavigate('settings')}>
            Configure in Settings →
          </Button>
        </div>
      </AdminCard>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : (
        <TableShell>
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Base</th>
                <th className="px-3 py-3 font-bold">Code</th>
                <th className="px-3 py-3 font-bold">Name</th>
                <th className="px-3 py-3 font-bold">Symbol</th>
                <th className="px-3 py-3 font-bold">Rate (per 1 USD)</th>
                <th className="px-4 py-3 text-right font-bold">Auto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.currencies.map((c) => (
                <tr key={c.code} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3">
                    {c.isBase ? (
                      <span title="Base currency" className="inline-flex">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </span>
                    ) : <span className="block h-4 w-4" />}
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] font-extrabold text-zinc-800 dark:text-zinc-100">{c.code}</td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{c.name}</td>
                  <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">{c.symbol}</td>
                  <td className="px-3 py-3">
                    {c.isBase ? (
                      <span className="text-[12px] font-bold text-zinc-400 dark:text-zinc-500">1.00 (base)</span>
                    ) : (
                      <Input
                        type="number"
                        step="0.000001"
                        value={rates[c.code] ?? ''}
                        onChange={(e) => setRateEdits({ ...rateEdits, [c.code]: e.target.value })}
                        onBlur={() => saveRate(c)}
                        className="h-8 w-36 rounded-lg text-[12.5px] font-semibold"
                        aria-label={`Rate for ${c.code}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.isBase ? <span className="text-[11px] text-zinc-300 dark:text-zinc-600">—</span> : (
                      <div className="flex items-center justify-end gap-2">
                        <Switch checked={c.auto} onCheckedChange={(v) => toggleAuto(c, v)} aria-label={`Auto rate for ${c.code}`} />
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">{c.auto ? 'API' : 'manual'}</span>
                      </div>
                    )}
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
