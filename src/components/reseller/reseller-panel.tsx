// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useCallback, useState } from 'react'
import {
  LayoutDashboard, Store, Percent, FolderTree, Layers, Server, Users, ShoppingCart, LifeBuoy,
  Inbox, Radio, Bot, Workflow, BookUser, Tags, MessageSquareText, ChartPie, SlidersHorizontal,
  CreditCard, Wallet, WalletCards, BadgeDollarSign, ArrowLeftRight, Headset, Ticket,
  Newspaper, HelpCircle, FileText, FileStack, UsersRound, Settings2, Blocks, ShieldBan,
  MonitorSmartphone, Globe, TrendingUp, UserPlus, Rocket, Sparkles, Gift,
  ChevronRight, Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PanelShell, PanelPageHeader, StatCard, StatusBadge, type NavSection } from '@/components/shared/panel-shell'
import { BalanceChip, CurrencyChip, LanguageChip } from '@/components/shared/chips'
import { useApp } from '@/components/shared/app-context'
import { useApi, mutate, api } from '@/lib/api'
import { SocialLogo } from '@/components/shared/social-logo'
import { formatMoney, formatDate } from '@/lib/format'
import { useGoto } from '@/lib/goto'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import CrmRouter from '@/components/reseller/crm'
import ResellerCatalog from '@/components/reseller/catalog'
import ResellerCustomers from '@/components/reseller/customers'
import ResellerFinance from '@/components/reseller/finance'
import ResellerContent from '@/components/reseller/content'
import ResellerAccount from '@/components/reseller/account'
import ResellerWebsite from '@/components/reseller/website'
import LaunchChecklist from '@/components/reseller/launch-checklist'
import ResellerEmail from '@/components/reseller/reseller-email'
import LandingStudio from '@/components/reseller/landing-studio'
import { useI18n, type Lang } from '@/lib/i18n'

type Stats = {
  platform: { id: string; name: string; slug: string; status: string; theme: string; monthlyFee: number; nextBilling: string | null; externalApi: boolean }
  checklist: { branding: boolean; landing: boolean; payment: boolean; coupon: boolean; clients: boolean; orders: boolean }
  stats: {
    clients: number; orders: number; orders30: number; revenue: number; revenue30: number
    depositsPending: number; ticketsOpen: number; unreadConvs: number; services: number; statusCounts: Record<string, number>
  }
  recentOrders: { id: string; serviceName: string; link: string; quantity: number; charge: number; status: string; createdAt: string; user: { name: string } }[]
  topServices: { name: string; count: number; revenue: number }[]
  chart: { date: string; orders: number; revenue: number }[]
}

export default function ResellerPanel({ user, onRefresh, onLogout }: {
  user: { id: string; name: string; email: string; role: string; balance: number; currency: string; platform?: unknown }
  onRefresh: () => void
  onLogout: () => void
}) {
  const app = useApp()
  const { t } = useI18n()
  const platform = app.user.platform
  const [active, setActive] = useState('dashboard')
  // Deep-linked conversation from notifications/toasts ("crm-inbox:<convId>")
  const [focusConv, setFocusConv] = useState<string | null>(null)

  /** Normalize notification links into nav keys (legacy 'inbox' → 'crm-inbox'). */
  const handleNavKey = useCallback((key: string) => {
    if (key === 'inbox') {
      setActive('crm-inbox')
      return
    }
    if (key.startsWith('crm-inbox:')) {
      setActive('crm-inbox')
      setFocusConv(key.slice('crm-inbox:'.length))
      return
    }
    setActive(key)
  }, [])

  // Global deep-link events ("View" action on realtime notification toasts)
  useGoto(handleNavKey)

  const { data: statsData, loading: statsLoading, refresh: refreshStats } = useApi<Stats>(
    platform ? '/api/reseller/stats' : null
  )

  // No platform yet → upsell
  if (!platform) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] dark:bg-zinc-950 p-4" style={{ ['--brand' as string]: '#7c3aed' }}>
        <div className="max-w-md rounded-3xl border bg-white dark:bg-zinc-900 p-8 text-center shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
            <Rocket className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">{t('rpanel.noPlatformTitle')}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('rpanel.noPlatformDesc')}</p>
          <Button className="mt-5 w-full font-bold text-[var(--on-brand)]" onClick={() => app.setView('buy')} style={{ background: 'var(--brand)' }}>
            {t('rpanel.buyPlatform')} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const s = statsData?.stats

  const nav: NavSection[] = [
    {
      items: [
        { key: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
        { key: 'storefront', label: t('rpanel.storefrontLanding'), icon: Store },
      ],
    },
    {
      title: t('nav.catalog'),
      items: [
        { key: 'margins', label: t('reseller.margins'), icon: Percent },
        { key: 'categories', label: t('reseller.categories'), icon: FolderTree },
        { key: 'services', label: t('reseller.myServices'), icon: Layers },
        { key: 'providers', label: t('reseller.myProviders'), icon: Server },
      ],
    },
    {
      title: t('nav.customers'),
      items: [
        { key: 'clients', label: t('reseller.myClients'), icon: Users },
        { key: 'orders', label: t('common.orders'), icon: ShoppingCart },
        { key: 'tickets', label: t('common.tickets'), icon: LifeBuoy, badge: s?.ticketsOpen },
      ],
    },
    {
      title: t('nav.crm'),
      items: [
        { key: 'crm-inbox', label: t('reseller.inbox'), icon: Inbox, badge: s?.unreadConvs },
        { key: 'crm-channels', label: t('reseller.channels'), icon: Radio },
        { key: 'crm-agents', label: t('reseller.aiAgents'), icon: Bot },
        { key: 'crm-automations', label: t('reseller.automations'), icon: Workflow },
        { key: 'crm-contacts', label: t('reseller.contacts'), icon: BookUser },
        { key: 'crm-labels', label: t('reseller.labels'), icon: Tags },
        { key: 'crm-quick-replies', label: t('reseller.quickReplies'), icon: MessageSquareText },
        { key: 'crm-reports', label: t('reseller.crmReports'), icon: ChartPie },
        { key: 'crm-settings', label: t('reseller.crmSettings'), icon: SlidersHorizontal },
      ],
    },
    {
      title: t('nav.finance'),
      items: [
        { key: 'plan-billing', label: t('reseller.planBilling'), icon: CreditCard },
        { key: 'add-funds', label: t('reseller.addFunds'), icon: Wallet },
        { key: 'payment-methods', label: t('reseller.paymentMethods'), icon: WalletCards },
        { key: 'deposits', label: t('reseller.deposits'), icon: BadgeDollarSign, badge: s?.depositsPending },
        { key: 'transactions', label: t('reseller.transactions'), icon: ArrowLeftRight },
        { key: 'coupons', label: t('reseller.coupons'), icon: Ticket },
        { key: 'support', label: t('reseller.support'), icon: Headset },
      ],
    },
    {
      title: t('nav.content'),
      items: [
        { key: 'news', label: t('reseller.news'), icon: Newspaper },
        { key: 'faqs', label: t('reseller.faqs'), icon: HelpCircle },
        { key: 'posts', label: t('reseller.blog'), icon: FileText },
        { key: 'pages', label: t('reseller.pages'), icon: FileStack },
        { key: 'email', label: t('auth.email'), icon: Mail },
      ],
    },
    {
      title: t('nav.account'),
      items: [
        { key: 'team', label: t('reseller.team'), icon: UsersRound },
        { key: 'referrals', label: t('reseller.referrals'), icon: Gift },
        { key: 'settings', label: t('common.settings'), icon: Settings2 },
        { key: 'integrations', label: t('reseller.integrations'), icon: Blocks },
        { key: 'blacklist', label: t('reseller.blacklist'), icon: ShieldBan },
      ],
    },
    {
      title: t('nav.website'),
      items: [
        { key: 'w-portal', label: t('reseller.clientPortal'), icon: MonitorSmartphone },
        { key: 'w-domains', label: t('reseller.domains'), icon: Globe },
      ],
    },
  ]

  const renderSection = () => {
    if (active.startsWith('crm-')) {
      return (
        <CrmRouter
          section={active.replace('crm-', '')}
          onOpenInbox={() => setActive('crm-inbox')}
          focusConversationId={focusConv}
          onFocusConsumed={() => setFocusConv(null)}
        />
      )
    }
    switch (active) {
      case 'dashboard':
        return <ResellerDashboard stats={statsData} loading={statsLoading} onNavigate={setActive} />
      case 'margins':
      case 'categories':
      case 'services':
      case 'providers':
        return <ResellerCatalog section={active} onNavigate={setActive} />
      case 'clients':
      case 'orders':
      case 'tickets':
        return <ResellerCustomers section={active} />
      case 'plan-billing':
      case 'add-funds':
      case 'payment-methods':
      case 'deposits':
      case 'transactions':
      case 'coupons':
      case 'support':
        return <ResellerFinance section={active} onNavigate={setActive} />
      case 'news':
      case 'faqs':
      case 'posts':
      case 'pages':
        return <ResellerContent section={active} />
      case 'email':
        return <ResellerEmail />
      case 'team':
      case 'referrals':
      case 'settings':
      case 'integrations':
      case 'blacklist':
        return <ResellerAccount section={active} onRefresh={onRefresh} />
      case 'w-portal':
      case 'w-domains':
        return <ResellerWebsite key={`${platform?.domainType}-${platform?.customDomain ?? ''}`} section={active as 'w-portal' | 'w-domains'} onNavigate={setActive} />
      default:
        return <ResellerDashboard stats={statsData} loading={statsLoading} onNavigate={setActive} />
    }
  }

  return (
    <PanelShell
      nav={nav}
      active={active}
      onSelect={handleNavKey}
      brandName={platform.name}
      themeKey={platform.theme}
      accent={platform.accent}
      user={{ id: app.user.id, name: app.user.name, email: app.user.email, role: 'Reseller' }}
      onExit={() => window.dispatchEvent(new Event('gr:exit'))}
      onLogout={onLogout}
      topbarRight={
        <>
          <BalanceChip onAddFunds={() => setActive('add-funds')} />
          <CurrencyChip />
          <LanguageChip />
        </>
      }
    >
      {active === 'storefront' ? (
        /* The Storefront IS the Landing Studio — a full-screen editor that renders
           without the padded page wrapper. Back → dashboard. */
        <LandingStudio onBack={() => setActive('dashboard')} />
      ) : (
        <div className="mx-auto max-w-[1300px] p-4 sm:p-6 lg:p-8">{renderSection()}</div>
      )}
    </PanelShell>
  )
}

// ─────────────────────── Dashboard ───────────────────────

function ResellerDashboard({ stats, loading, onNavigate }: { stats: Stats | null; loading: boolean; onNavigate: (k: string) => void }) {
  const app = useApp()
  const { t } = useI18n()
  const platform = app.user.platform
  const { data: platformInfo } = useApi<{ platform: { plan: { name: string; maxServices: number; monthlyPrice: number; nextBilling: string | null } } }>('/api/platform/mine')
  const currency = app.currencyOf(app.user.currency)
  const money = (v: number) => formatMoney(v, currency, app.lang as Lang)

  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    )
  }

  const s = stats.stats
  const maxOrders = Math.max(...stats.chart.map((c) => c.orders), 1)
  const plan = platformInfo?.platform?.plan
  const usage = plan ? Math.min(100, Math.round((s.services / plan.maxServices) * 100)) : 0

  return (
    <>
      <PanelPageHeader
        title={`${t('reseller.dash.welcome')}, ${app.user.name.split(' ')[0]} 👋`}
        description={`${platform?.name} · ${platform?.slug}.growthrush.io`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate('storefront')}>
              <Store className="mr-1.5 h-4 w-4" /> {t('reseller.dash.viewStorefront')}
            </Button>
            <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => onNavigate('crm-inbox')}>
              <Inbox className="mr-1.5 h-4 w-4" /> {t('reseller.dash.openInbox')}
              {!!s.unreadConvs && <Badge className="ml-1.5 bg-white/20 text-[var(--on-brand)]">{s.unreadConvs}</Badge>}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('reseller.dash.revenue')} value={money(s.revenue)} icon={TrendingUp} trend={`${t('reseller.dash.trend30')}: ${money(s.revenue30)}`} />
        <StatCard label={t('reseller.dash.orders')} value={s.orders.toLocaleString()} sub={`${s.orders30} ${t('reseller.dash.ordersSub')}`} icon={ShoppingCart} />
        <StatCard label={t('reseller.dash.clients')} value={String(s.clients)} icon={Users} />
        <StatCard label={t('reseller.dash.activeServices')} value={String(s.services)} icon={Layers} />
      </div>

      {/* Pending attention strip */}
      {(s.depositsPending > 0 || s.ticketsOpen > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800">
          <Sparkles className="h-4 w-4" />
          <span className="font-bold">{t('reseller.dash.attention')}</span>
          {s.depositsPending > 0 && (
            <button className="flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 px-3 py-1 text-[12px] font-bold shadow-sm hover:bg-amber-100" onClick={() => onNavigate('deposits')}>
              <BadgeDollarSign className="h-3.5 w-3.5" /> {s.depositsPending} {t('reseller.dash.depositsPending')} <ChevronRight className="h-3 w-3" />
            </button>
          )}
          {s.ticketsOpen > 0 && (
            <button className="flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 px-3 py-1 text-[12px] font-bold shadow-sm hover:bg-amber-100" onClick={() => onNavigate('tickets')}>
              <LifeBuoy className="h-3.5 w-3.5" /> {s.ticketsOpen} {t('reseller.dash.ticketsOpen')} <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Launch checklist — onboarding progress */}
      {stats.checklist && (
        <LaunchChecklist checklist={stats.checklist} platformId={stats.platform.id} onNavigate={onNavigate} />
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Orders chart */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold">{t('reseller.dash.chartTitle')}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('reseller.dash.chartSub')}</p>
            </div>
            <Badge variant="outline" className="font-bold">{s.orders30} {t('reseller.dash.thisMonth')}</Badge>
          </div>
          <div className="flex h-44 items-end gap-1.5">
            {stats.chart.map((c) => (
              <div key={c.date} className="group relative flex-1">
                <div
                  className="w-full rounded-t-md transition-all group-hover:opacity-80"
                  style={{ height: `${Math.max(6, (c.orders / maxOrders) * 160)}px`, background: 'var(--brand)', opacity: 0.85 }}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  {c.orders} {t('reseller.dash.ordersWord')} · {money(c.revenue)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
            <span>{stats.chart[0]?.date.slice(5)}</span>
            <span>{t('reseller.dash.today')}</span>
          </div>
        </div>

        {/* Plan usage */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
          <p className="text-sm font-extrabold">{t('reseller.dash.planUsage')}</p>
          {plan && (
            <>
              <div className="mt-3 flex items-center justify-between">
                <Badge style={{ background: 'var(--brand)', color: 'white' }} className="font-extrabold">{plan.name} {t('reseller.dash.plan')}</Badge>
                <span className="text-[12px] text-zinc-400 dark:text-zinc-500">{money(plan.monthlyPrice)}{t('buy.perMonth')}</span>
              </div>
              <p className="mt-4 flex justify-between text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span>{t('reseller.dash.services')}</span><span>{s.services} / {plan.maxServices.toLocaleString()}</span>
              </p>
              <Progress value={usage} className="mt-1.5 h-2" style={{ ['--progress-bg' as string]: 'var(--brand)' }} />
              <div className="mt-4 space-y-2 text-[12px] text-zinc-500 dark:text-zinc-400">
                <p className="flex justify-between"><span>{t('reseller.dash.nextBilling')}</span><span className="font-bold text-zinc-700 dark:text-zinc-200">{plan.nextBilling ? formatDate(plan.nextBilling, app.lang as Lang) : '—'}</span></p>
                <p className="flex justify-between"><span>{t('reseller.dash.externalApi')}</span><span className="font-bold">{platform?.externalApi ? `✅ ${t('reseller.dash.apiOn')}` : `— ${t('reseller.dash.apiOff')}`}</span></p>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full font-bold" onClick={() => onNavigate('plan-billing')}>
                {t('reseller.dash.managePlan')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b p-4">
            <p className="text-sm font-extrabold">{t('reseller.dash.latestOrders')}</p>
            <Button variant="ghost" size="sm" className="text-[12px] font-bold" style={{ color: 'var(--brand-ink)' }} onClick={() => onNavigate('orders')}>
              {t('reseller.dash.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y">
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400">
                  {o.user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{o.serviceName}</p>
                  <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{o.user.name} · {o.quantity.toLocaleString()} {t('reseller.dash.units')} · {formatDate(o.createdAt, app.lang as Lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-extrabold">{money(o.charge)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
            {!stats.recentOrders.length && <p className="p-6 text-center text-sm text-zinc-400 dark:text-zinc-500">{t('reseller.dash.noOrders')}</p>}
          </div>
        </div>

        {/* Top services */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b p-4">
            <p className="text-sm font-extrabold">{t('reseller.dash.topServices')}</p>
            <Button variant="ghost" size="sm" className="text-[12px] font-bold" style={{ color: 'var(--brand-ink)' }} onClick={() => onNavigate('services')}>
              {t('reseller.dash.manage')} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y">
            {stats.topServices.map((svc, i) => (
              <div key={svc.name} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-extrabold" style={{ background: 'color-mix(in srgb, var(--brand) 12%, white)', color: 'var(--brand-ink)' }}>
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{svc.name}</p>
                <div className="text-right">
                  <p className="text-[13px] font-extrabold">{money(svc.revenue)}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{svc.count} {t('reseller.dash.ordersWord')}</p>
                </div>
              </div>
            ))}
            {!stats.topServices.length && <p className="p-6 text-center text-sm text-zinc-400 dark:text-zinc-500">{t('reseller.dash.noSales')}</p>}
          </div>
        </div>
      </div>
    </>
  )
}


