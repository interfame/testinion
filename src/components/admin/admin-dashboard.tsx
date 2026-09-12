'use client'

// Super Admin — Overview dashboard: KPIs, revenue chart, orders donut, signups, quick actions.

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  DollarSign, ShoppingCart, Users, Store, ArrowUpRight, TriangleAlert,
  Ticket, Wallet, Tags, Zap, Newspaper, Settings2, UserPlus, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, StatusBadge, useEnumLabel, ROLE_KEYS } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { ChartTip } from '@/components/shared/chart-tip'
import { useI18n, type DictKey } from '@/lib/i18n'
import { formatMoney } from '@/lib/format'
import { AdminCard, InitialAvatar, compactNumber, shortDay, type AdminStats } from './admin-ui'

const DONUT_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  IN_PROGRESS: '#14b8a6',
  PENDING: '#f59e0b',
  PARTIAL: '#f97316',
  CANCELED: '#a1a1aa',
}

const QUICK_ACTIONS: { key: string; labelKey: DictKey; icon: typeof Zap }[] = [
  { key: 'deposits', labelKey: 'admin.qa.reviewDeposits', icon: Wallet },
  { key: 'tickets', labelKey: 'admin.qa.answerTickets', icon: Ticket },
  { key: 'services', labelKey: 'admin.qa.newService', icon: Zap },
  { key: 'categories', labelKey: 'admin.qa.newCategory', icon: Tags },
  { key: 'news', labelKey: 'admin.qa.publishNews', icon: Newspaper },
  { key: 'users', labelKey: 'admin.qa.manageUsers', icon: UserPlus },
  { key: 'appearance', labelKey: 'admin.qa.landingBuilder', icon: Settings2 },
  { key: 'platforms', labelKey: 'admin.qa.resellerStores', icon: Store },
]

export function DashboardSection({ stats, loading, onRefresh, onNavigate }: {
  stats: AdminStats | null
  loading: boolean
  onRefresh: () => void
  onNavigate: (key: string) => void
}) {
  const { t } = useI18n()
  const statusLabel = useEnumLabel()
  const roleLabel = useEnumLabel(ROLE_KEYS)
  const { currencyOf, user } = useApp()
  const cur = currencyOf(user.currency)

  const donutData = (stats?.ordersByStatus ?? []).filter((d) => d.count > 0)
  const donutTotal = donutData.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-5">
      {/* Pending items alert strip */}
      {(!!stats?.pendingDeposits || !!stats?.openTickets) && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <TriangleAlert className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <p className="flex-1 text-[13px] font-semibold text-amber-800">
            {t('admin.dash.alert').replace('{n}', String(stats?.pendingDeposits ?? 0)).replace('{m}', String(stats?.openTickets ?? 0))}
          </p>
          {!!stats?.pendingDeposits && (
            <Button size="sm" className="h-8 rounded-full px-3 text-[12px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => onNavigate('deposits')}>
              {t('admin.qa.reviewDeposits')}
            </Button>
          )}
          {!!stats?.openTickets && (
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-[12px] font-bold border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 text-amber-800 hover:bg-amber-100" onClick={() => onNavigate('tickets')}>
              {t('admin.dash.openTickets')}
            </Button>
          )}
        </div>
      )}

      {/* KPI hero row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)
        ) : (
          <>
            <StatCard label={t('admin.an.revenue30')} value={formatMoney(stats?.revenue30d ?? 0, cur)} icon={DollarSign} sub={t('admin.dash.revenueSub')} />
            <StatCard label={t('admin.dash.totalOrders')} value={compactNumber(stats?.ordersTotal ?? 0)} icon={ShoppingCart} sub={t('admin.dash.ordersToday').replace('{n}', String(stats?.ordersToday ?? 0))} accent="#f59e0b" />
            <StatCard label={t('admin.users')} value={compactNumber(stats?.totalUsers ?? 0)} icon={Users} sub={t('admin.dash.newUsers').replace('{n}', String(stats?.newUsers7d ?? 0))} accent="#10b981" />
            <StatCard label={t('admin.dash.activePlatforms')} value={compactNumber(stats?.platformsActive ?? 0)} icon={Store} sub={t('admin.dash.resellersOnBoard').replace('{n}', String(stats?.resellers ?? 0))} accent="#f97316" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminCard
          title={t('admin.dash.chartTitle')}
          description={t('admin.dash.chartSub')}
          className="xl:col-span-2"
          actions={
            <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[12px] font-semibold" onClick={onRefresh}>
              {t('client.refresh')}
            </Button>
          }
        >
          <div className="gr-chart h-[260px] w-full text-zinc-400 dark:text-zinc-500">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueSeries ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={46} tickFormatter={(v: number) => compactNumber(v)} />
                <Tooltip
                  cursor={{ stroke: 'var(--brand)', strokeOpacity: 0.35, strokeDasharray: '4 4' }}
                  content={
                    <ChartTip
                      formatLabel={(l) => shortDay(String(l))}
                      format={(v) => formatMoney(v, cur)}
                    />
                  }
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={2.5} fill="url(#revGrad)" activeDot={{ r: 4, fill: 'var(--brand)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title={t('admin.dash.ordersByStatus')} description={t('admin.dash.ordersTotalCount').replace('{n}', String(donutTotal))}>
          {donutData.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-zinc-400 dark:text-zinc-500">{t('admin.dash.noOrdersYet')}</p>
          ) : (
            <div>
              <div className="relative h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="count" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                      {donutData.map((d) => (
                        <Cell key={d.status} fill={DONUT_COLORS[d.status] ?? '#d4d4d8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTip
                          title={t('common.orders')}
                          format={(v, e) => `${v} · ${statusLabel(String(e.name ?? ''))}`}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold tracking-tight">{compactNumber(donutTotal)}</span>
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{t('admin.dash.ordersWord')}</span>
                </div>
              </div>
              <ul className="mt-2 space-y-1.5">
                {donutData.map((d) => (
                  <li key={d.status} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[d.status] ?? '#d4d4d8' }} />
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{statusLabel(d.status)}</span>
                    <span className="ml-auto font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AdminCard>
      </div>

      {/* Recent signups + quick actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminCard
          title={t('admin.dash.recentSignups')}
          description={t('admin.dash.recentSignupsSub')}
          className="xl:col-span-2"
          actions={
            <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[12px] font-semibold" onClick={() => onNavigate('users')}>
              {t('client.viewAll')} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          }
        >
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {(stats?.recentSignups ?? []).map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <InitialAvatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{u.name}</p>
                  <p className="truncate text-[12px] text-zinc-400 dark:text-zinc-500">{u.email}</p>
                </div>
                <span className="hidden rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 sm:inline">{roleLabel(u.role)}</span>
                <StatusBadge status={u.status} />
              </li>
            ))}
            {!stats?.recentSignups.length && <li className="py-8 text-center text-[13px] text-zinc-400 dark:text-zinc-500">{t('admin.dash.noSignups')}</li>}
          </ul>
        </AdminCard>

        <AdminCard title={t('admin.dash.quickActions')} description={t('admin.dash.quickActionsSub')}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.key}
                  onClick={() => onNavigate(a.key)}
                  className="group flex items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-left transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)' }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
                  </span>
                  <span className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-50">{t(a.labelKey)}</span>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600 transition group-hover:text-zinc-500 dark:group-hover:text-zinc-400" />
                </button>
              )
            })}
          </div>
        </AdminCard>
      </div>

      {/* Trust strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">{t('admin.dash.health')}</p>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">{t('admin.dash.healthSub').replace('{a}', String(stats?.platformsActive ?? 0)).replace('{b}', String(stats?.platformsTotal ?? 0))}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 font-extrabold text-zinc-800 dark:text-zinc-100">{stats?.ordersToday ?? 0}</span> {t('admin.dash.ordersTodayWord')}
          </span>
          <span className="flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 font-extrabold text-zinc-800 dark:text-zinc-100">+{stats?.newUsers7d ?? 0}</span> {t('admin.dash.thisWeek')}
          </span>
        </div>
      </div>
    </div>
  )
}
