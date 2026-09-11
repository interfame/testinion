'use client'

// Client portal — Dashboard

import {
  ArrowRight, BadgeCheck, Coins, LifeBuoy, Megaphone, Newspaper,
  Pin, Plus, Receipt, ShoppingBag, Ticket, Wallet, Zap, TrendingUp,
} from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { PanelPageHeader, StatCard, StatusBadge } from '@/components/shared/panel-shell'
import { formatDate, formatDateTime } from '@/lib/format'
import { useClientData } from '../client-data'
import { useMoney, Card, CardHead, Pill, EmptyState, LoadingRows, BrandButton } from '../bits'
import type { LucideIcon } from 'lucide-react'

const QUICK_ACTIONS: { key: string; icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { key: 'new-order', icon: Zap, titleKey: 'client.quick.newOrder', descKey: 'client.quick.newOrderSub' },
  { key: 'add-funds', icon: Wallet, titleKey: 'client.quick.addFunds', descKey: 'client.quick.addFundsSub' },
  { key: 'tickets', icon: LifeBuoy, titleKey: 'client.quick.tickets', descKey: 'client.quick.ticketsSub' },
  { key: 'api', icon: Receipt, titleKey: 'client.quick.api', descKey: 'client.quick.apiSub' },
]

export default function DashboardSection({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { user } = useApp()
  const { t } = useI18n()
  const m = useMoney()
  const { orders, ordersLoading, funds, news, newsLoading, tickets } = useClientData()

  const firstName = user.name.split(' ')[0]
  const totalSpent = (funds?.transactions ?? [])
    .filter((tx) => tx.amount < 0)
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const openTickets = tickets.filter((tk) => tk.status !== 'CLOSED').length
  const completed = orders.filter((o) => o.status === 'COMPLETED').length
  const latest = orders.slice(0, 5)

  // Activity sparkline — orders + spend per day over the last 14 days
  const activity = useMemo(() => {
    const days: { key: string; label: string; orders: number; spend: number }[] = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), orders: 0, spend: 0 })
    }
    const byKey = new Map(days.map((d) => [d.key, d]))
    for (const o of orders) {
      const d = byKey.get(new Date(o.createdAt).toISOString().slice(0, 10))
      if (d) { d.orders += 1; d.spend += o.charge }
    }
    return days
  }, [orders])
  const maxDayOrders = Math.max(1, ...activity.map((a) => a.orders))
  const activityOrders = activity.reduce((s, a) => s + a.orders, 0)
  const activitySpend = activity.reduce((s, a) => s + a.spend, 0)

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('common.dashboard')}
        description={t('client.growthAtGlance')}
      />

      {/* Welcome banner */}
      <div
        className="relative mb-5 overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-8"
        style={{ background: 'linear-gradient(120deg, var(--brand-dark) 0%, var(--brand) 65%, var(--brand-2) 100%)' }}
      >
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">{t('client.welcomeBack')}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{firstName}{t('client.readyToGrow')}</h2>
            <div className="mt-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-white/80" />
              <span className="text-[12px] font-semibold uppercase tracking-wide text-white/70">{t('common.balance')}</span>
            </div>
            <p className="mt-0.5 text-3xl font-extrabold tabular-nums sm:text-4xl">{m(user.balance)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('new-order')}
              className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-white dark:bg-zinc-900 px-4 py-2 text-[13px] font-extrabold shadow-md transition hover:opacity-90"
              style={{ color: 'var(--brand)' }}
            >
              <Plus className="h-4 w-4" /> {t('common.newOrder')}
            </button>
            <button
              onClick={() => onNavigate('add-funds')}
              className="flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-[13px] font-extrabold text-[var(--brand-dark)] backdrop-blur transition hover:bg-white/20"
            >
              <Coins className="h-4 w-4" /> {t('common.addFunds')}
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label={t('client.stat.totalOrders')} value={String(orders.length)} sub={t('client.stat.totalOrdersSub')} />
        <StatCard icon={Coins} label={t('client.stat.totalSpent')} value={m(totalSpent)} sub={t('client.stat.totalSpentSub')} accent="#10b981" />
        <StatCard icon={BadgeCheck} label={t('client.stat.completed')} value={String(completed)} sub={t('client.stat.completedSub')} accent="#f59e0b" />
        <StatCard icon={LifeBuoy} label={t('client.stat.openTickets')} value={String(openTickets)} sub={openTickets > 0 ? t('client.stat.onIt') : t('client.stat.allClear')} accent="#8b5cf6" />
      </div>

      {/* 14-day activity sparkline */}
      <Card className="mb-5">
        <CardHead
          icon={TrendingUp}
          title={t('client.activity')}
          sub={`${activityOrders} ${t('client.activityOrders')} · ${m(activitySpend)} ${t('client.activitySpent')}`}
        />
        <div className="flex h-24 items-end gap-1.5 sm:gap-2">
          {activity.map((a) => {
            const pct = a.orders === 0 ? 0 : Math.max(12, Math.round((a.orders / maxDayOrders) * 100))
            return (
              <div key={a.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${a.label} — ${a.orders} ${a.orders === 1 ? 'order' : 'orders'}${a.spend ? ` · ${m(a.spend)}` : ''}`}>
                <div
                  className={`w-full rounded-t-md transition-all duration-300 group-hover:opacity-100 ${a.orders === 0 ? 'h-[4px] bg-zinc-200 dark:bg-zinc-800' : 'bg-gradient-to-t from-[var(--brand-dark)] to-[var(--brand)] opacity-85'}`}
                  style={a.orders > 0 ? { height: `${pct}%` } : undefined}
                />
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-200 opacity-0 shadow-md transition group-hover:opacity-100">
                  {a.label} · {a.orders}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          <span>{activity[0]?.label}</span>
          <span>{activity[activity.length - 1]?.label}</span>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.key}
              onClick={() => onNavigate(a.key)}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/10">
                  <Icon className="h-4 w-4 text-[var(--brand)]" />
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" />
              </div>
              <p className="mt-3 text-[14px] font-extrabold text-zinc-900 dark:text-zinc-50">{t(a.titleKey as 'client.quick.newOrder')}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">{t(a.descKey as 'client.quick.newOrder')}</p>
            </button>
          )
        })}
      </div>

      {/* News + latest orders */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHead icon={Newspaper} title={t('client.news')} sub={t('client.newsSub')} />
          {newsLoading ? (
            <LoadingRows rows={3} />
          ) : news.length === 0 ? (
            <EmptyState icon={Megaphone} title={t('client.noNews')} message={t('client.noNewsSub')} />
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1 gr-scroll">
              {news.map((n) => (
                <article key={n.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 transition hover:border-zinc-300 dark:hover:border-zinc-700">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.pinned && <Pill tone="brand"><Pin className="h-3 w-3" /> {t('client.pinned')}</Pill>}
                    <h3 className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-50">{n.title}</h3>
                    <span className="ml-auto text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">{n.body}</p>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5">
          <CardHead
            icon={ShoppingBag}
            title={t('client.orderHistory')}
            sub={t('client.latestOrders')}
            right={
              <button
                onClick={() => onNavigate('orders')}
                className="flex min-h-[32px] items-center gap-1 text-[12px] font-bold text-[var(--brand)] transition hover:opacity-80"
              >
                {t('client.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          {ordersLoading ? (
            <LoadingRows rows={4} />
          ) : latest.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              message={t('client.noOrders')}
              action={<BrandButton size="sm" onClick={() => onNavigate('new-order')}><Zap className="mr-1 h-3.5 w-3.5" /> {t('common.newOrder')}</BrandButton>}
            />
          ) : (
            <div className="space-y-2">
              {latest.map((o) => (
                <button
                  key={o.id}
                  onClick={() => onNavigate('orders')}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-left transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-zinc-900 dark:text-zinc-50">{o.serviceName}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                      #{o.id.slice(0, 8)} · {formatDateTime(o.createdAt)} · {o.quantity.toLocaleString()} qty
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[12.5px] font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">{m(o.charge)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Support strip */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)]/10">
              <Ticket className="h-5 w-5 text-[var(--brand)]" />
            </span>
            <div>
              <p className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-50">{t('client.needHelp')}</p>
              <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">{t('client.needHelpSub')}</p>
            </div>
          </div>
          <BrandButton variant="outline" className="border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)]/10" onClick={() => onNavigate('tickets')}>
            {t('common.support')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </BrandButton>
        </div>
      </Card>
    </div>
  )
}
