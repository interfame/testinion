// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Super Admin — Analytics: revenue bars, orders by category, top services, reseller leaderboard.

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Crown, Medal, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useApi } from '@/lib/api'
import { ChartTip } from '@/components/shared/chart-tip'
import { useI18n } from '@/lib/i18n'
import { formatMoney } from '@/lib/format'
import { themeOf } from '@/lib/themes'
import {
  AdminCard, TableShell, Money, compactNumber, shortDay,
  type AdminStats, type AdminOrder, type AdminPlatform,
} from './admin-ui'

const CATEGORY_BAR_COLORS = ['#e11d48', '#f59e0b', '#10b981', '#14b8a6', '#f97316', '#a855f7', '#84cc16', '#64748b']

export function AnalyticsSection({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  const { t } = useI18n()
  const { currencyOf, user } = useApp()
  const cur = currencyOf(user.currency)

  const { data: ordersData, loading: ordersLoading } = useApi<{ orders: AdminOrder[] }>('/api/admin/orders')
  const { data: platformsData, loading: platformsLoading } = useApi<{ platforms: AdminPlatform[] }>('/api/admin/platforms')

  // Orders by category (aggregate from recent orders incl. category)
  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; color: string; orders: number; revenue: number }>()
    for (const o of ordersData?.orders ?? []) {
      const cat = o.service?.category
      const key = cat?.name ?? 'Uncategorized'
      const entry = map.get(key) ?? { name: key, icon: cat?.icon ?? 'globe', color: cat?.color ?? '#a1a1aa', orders: 0, revenue: 0 }
      entry.orders += 1
      entry.revenue += o.charge
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.orders - a.orders).slice(0, 8)
      .map((c) => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }))
  }, [ordersData])

  // Reseller leaderboard
  const leaderboard = useMemo(() => {
    return [...(platformsData?.platforms ?? [])]
      .map((p) => ({ ...p, score: p.clientsCount + p.ordersCount }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [platformsData])

  const ordersInScope = ordersData?.orders?.length ?? 0

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading && !stats ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)
        ) : (
          <>
            <StatCard label={t('admin.an.revenue30')} value={formatMoney(stats?.revenue30d ?? 0, cur)} icon={TrendingUp} sub={t('admin.an.revenueSub')} />
            <StatCard label={t('admin.an.ordersTotal')} value={compactNumber(stats?.ordersTotal ?? 0)} icon={Crown} sub={t('admin.an.ordersToday').replace('{n}', String(stats?.ordersToday ?? 0))} accent="#f59e0b" />
            <StatCard label={t('admin.an.resellers')} value={compactNumber(stats?.resellers ?? 0)} icon={Medal} sub={t('admin.an.activePlatforms').replace('{n}', String(stats?.platformsActive ?? 0))} accent="#10b981" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Revenue by day */}
        <AdminCard title={t('admin.an.revenueByDay')} description={t('admin.an.revenueByDaySub')}>
          <div className="gr-chart h-[280px] w-full text-zinc-400 dark:text-zinc-500">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.revenueSeries ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={46} tickFormatter={(v: number) => compactNumber(v)} />
                <Tooltip
                  cursor={{ fill: 'color-mix(in srgb, var(--brand) 6%, transparent)' }}
                  content={
                    <ChartTip
                      formatLabel={(l) => shortDay(String(l))}
                      format={(v) => formatMoney(v, cur)}
                    />
                  }
                />
                <Bar dataKey="revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* Orders by category */}
        <AdminCard title={t('admin.an.ordersByCat')} description={t('admin.an.ordersScope').replace('{n}', String(ordersInScope))} >
          {ordersLoading ? (
            <Skeleton className="h-[280px] rounded-xl" />
          ) : byCategory.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-zinc-400 dark:text-zinc-500">{t('admin.an.noOrders')}</p>
          ) : (
            <div className="gr-chart h-[280px] w-full text-zinc-400 dark:text-zinc-500">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={byCategory} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} className="dark:[&_.recharts-cartesian-axis-tick_text]:fill-zinc-300" />
                  <Tooltip
                    cursor={{ fill: 'color-mix(in srgb, var(--brand) 6%, transparent)' }}
                    content={
                      <ChartTip
                        title={t('common.orders')}
                        format={(v, e) => t('admin.an.tipOrders').replace('{v}', String(v)).replace('{money}', formatMoney(Number(e.payload?.revenue ?? 0), cur))}
                      />
                    }
                  />
                  <Bar dataKey="orders" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {byCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Top services */}
        <AdminCard title={t('admin.an.topServices')} description={t('admin.an.topServicesSub')}>
          <TableShell className="border-0 shadow-none">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <th className="px-3 py-2 font-bold">{t('common.service')}</th>
                  <th className="px-3 py-2 text-right font-bold">{t('admin.an.rate1k')}</th>
                  <th className="px-3 py-2 text-right font-bold">{t('common.orders')}</th>
                  <th className="px-3 py-2 text-right font-bold">{t('admin.an.volume')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                {(stats?.topServices ?? []).map((s, i) => (
                  <tr key={s.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-extrabold" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand-ink)' }}>{i + 1}</span>
                        <span className="max-w-[220px] truncate font-semibold text-zinc-800 dark:text-zinc-100">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-500 dark:text-zinc-400"><Money usd={s.rate} /></td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{s.orders}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400"><Money usd={s.revenue} /></td>
                  </tr>
                ))}
                {!stats?.topServices.length && (
                  <tr><td colSpan={4} className="py-8 text-center text-[13px] text-zinc-400 dark:text-zinc-500">{t('admin.an.noServiceOrders')}</td></tr>
                )}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>

        {/* Reseller leaderboard */}
        <AdminCard title={t('admin.an.leaderboard')} description={t('admin.an.leaderboardSub')}>
          <ol className="space-y-2">
            {platformsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
            ) : leaderboard.length === 0 ? (
              <li className="py-10 text-center text-[13px] text-zinc-400 dark:text-zinc-500">{t('admin.p.none')}</li>
            ) : (
              leaderboard.map((p, i) => {
                const th = themeOf(p.theme)
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800/70 px-3 py-2.5 transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-600 dark:text-amber-400' : i === 1 ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400' : i === 2 ? 'bg-orange-100 text-orange-600 dark:text-orange-400' : 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-500'}`}>
                      {i + 1}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.accent2})` }}>
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-zinc-800 dark:text-zinc-100">{p.name}</p>
                      <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{p.owner?.email} · {t('admin.an.themeSuffix').replace('{theme}', p.theme)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{t('admin.an.clients').replace('{n}', String(p.clientsCount))}</p>
                      <p className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{t('admin.an.orders').replace('{n}', String(p.ordersCount))}</p>
                    </div>
                    <span className="hidden h-8 w-1.5 rounded-full sm:block" style={{ background: `linear-gradient(${th.accent}, ${th.accent2})` }} />
                  </li>
                )
              })
            )}
          </ol>
        </AdminCard>
      </div>
    </div>
  )
}
