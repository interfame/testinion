'use client'

// GrowthRush — Super Admin panel (Task 2-c). Command center for the whole SaaS:
// users, reseller platforms, plans, master catalog, orders, money, content, themes, settings.

import { useCallback, useMemo, useState } from 'react'
import {
  LayoutDashboard, BarChart3, Users, Store, Layers, Tags, Zap, Plug,
  ShoppingCart, ArrowLeftRight, CreditCard, LifeBuoy, Wallet, Coins,
  Newspaper, HelpCircle, FileText, BookOpen, Palette, UserCog, ShieldAlert,
  Settings, ShieldX, Ticket, Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelShell, type NavSection } from '@/components/shared/panel-shell'
import { CurrencyChip, LanguageChip } from '@/components/shared/chips'
import { useApp, type AppUser } from '@/components/shared/app-context'
import { useApi } from '@/lib/api'
import { useRealtimeEvents } from '@/lib/realtime-client'
import { useI18n } from '@/lib/i18n'
import { useGoto } from '@/lib/goto'
import { DashboardSection } from './admin-dashboard'
import { AnalyticsSection } from './admin-analytics'
import { UsersSection } from './admin-users'
import { PlatformsSection } from './admin-platforms'
import { PlansSection } from './admin-plans'
import { CategoriesSection } from './admin-categories'
import { ServicesSection } from './admin-services'
import { ProvidersSection } from './admin-providers'
import { OrdersSection } from './admin-orders'
import { TransactionsSection } from './admin-transactions'
import { DepositsSection } from './admin-deposits'
import { TicketsSection } from './admin-tickets'
import { GatewaysSection } from './admin-gateways'
import { CouponsSection } from './admin-coupons'
import { CurrenciesSection } from './admin-currencies'
import { NewsSection, FaqsSection, PostsSection, PagesSection } from './admin-content'
import { AppearanceSection } from './admin-appearance'
import { StaffSection } from './admin-staff'
import { BlacklistSection } from './admin-blacklist'
import { SettingsSection } from './admin-settings'
import EmailSection from './admin-email'
import type { AdminStats } from './admin-ui'

export default function AdminPanel({ user, onRefresh, onLogout }: {
  user: AppUser
  onRefresh: () => void
  onLogout: () => void
}) {
  const { publicSettings } = useApp()
  const { t } = useI18n()
  const [section, setSection] = useState('dashboard')
  const isSuper = user.role === 'SUPER_ADMIN'

  // Deep-links from notification toasts ("View →") land directly on the section
  useGoto(useCallback((link: string) => setSection(link), []))

  const { data: stats, loading: statsLoading, refresh: refreshStats } = useApi<AdminStats>(
    isSuper ? '/api/admin/stats' : null,
  )
  // Realtime: KPIs react instantly to deposits, orders and signups
  useRealtimeEvents(['notification'], refreshStats)

  const nav: NavSection[] = useMemo(() => ([
    {
      title: t('nav.overview'),
      items: [
        { key: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
        { key: 'analytics', label: t('admin.analytics'), icon: BarChart3 },
      ],
    },
    {
      title: t('nav.marketplace'),
      items: [
        { key: 'users', label: t('admin.users'), icon: Users },
        { key: 'platforms', label: t('admin.platforms'), icon: Store },
        { key: 'plans', label: t('admin.plans'), icon: Layers },
      ],
    },
    {
      title: t('nav.catalog'),
      items: [
        { key: 'categories', label: t('admin.categories'), icon: Tags },
        { key: 'services', label: t('admin.services'), icon: Zap },
        { key: 'providers', label: t('admin.providers'), icon: Plug },
      ],
    },
    {
      title: t('nav.operations'),
      items: [
        { key: 'orders', label: t('common.orders'), icon: ShoppingCart },
        { key: 'transactions', label: t('common.transactions'), icon: ArrowLeftRight },
        { key: 'deposits', label: t('admin.deposits'), icon: CreditCard, badge: stats?.pendingDeposits ?? 0 },
        { key: 'tickets', label: t('common.tickets'), icon: LifeBuoy, badge: stats?.openTickets ?? 0 },
      ],
    },
    {
      title: t('nav.money'),
      items: [
        { key: 'gateways', label: t('admin.gateways'), icon: Wallet },
        { key: 'coupons', label: t('admin.coupons'), icon: Ticket },
        { key: 'currencies', label: t('admin.currencies'), icon: Coins },
      ],
    },
    {
      title: t('nav.content'),
      items: [
        { key: 'news', label: t('admin.news'), icon: Newspaper },
        { key: 'faqs', label: t('admin.faqs'), icon: HelpCircle },
        { key: 'posts', label: t('admin.posts'), icon: FileText },
        { key: 'pages', label: t('admin.pages'), icon: BookOpen },
      ],
    },
    {
      title: t('nav.system'),
      items: [
        { key: 'appearance', label: t('admin.appearance'), icon: Palette },
        { key: 'staff', label: t('admin.staff'), icon: UserCog },
        { key: 'blacklist', label: t('admin.blacklist'), icon: ShieldAlert },
        { key: 'email', label: 'Email & Notifications', icon: Mail },
        { key: 'settings', label: t('common.settings'), icon: Settings },
      ],
    },
  ]), [stats?.pendingDeposits, stats?.openTickets, t])

  // Access guard — this portal is for the platform owner only.
  if (!isSuper) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900/60 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40">
            <ShieldX className="h-7 w-7 text-rose-500" />
          </span>
          <h1 className="mt-4 text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Access denied</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            The super admin panel is restricted to platform owners. Your role: <b>{user.role.replace(/_/g, ' ')}</b>.
          </p>
          <Button onClick={onRefresh} className="mt-5 w-full rounded-full text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            Back to safety
          </Button>
        </div>
      </div>
    )
  }

  const brandName = publicSettings?.brand_name ? `${publicSettings.brand_name} Admin` : 'GrowthRush Admin'
  const currentLabel = nav.flatMap((s) => s.items).find((i) => i.key === section)?.label ?? 'Dashboard'

  return (
    <PanelShell
      nav={nav}
      active={section}
      onSelect={setSection}
      brandName={brandName}
      themeKey="rush"
      topbarLeft={
        <span className="hidden items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1 text-[11.5px] font-bold text-zinc-500 dark:text-zinc-400 sm:inline-flex">
          {currentLabel}
        </span>
      }
      topbarRight={<><CurrencyChip /><LanguageChip /></>}
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      onExit={() => window.dispatchEvent(new Event('gr:exit'))}
      onLogout={onLogout}
    >
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1300px]">
          {section === 'dashboard' && (
            <DashboardSection stats={stats ?? null} loading={statsLoading} onRefresh={refreshStats} onNavigate={setSection} />
          )}
          {section === 'analytics' && <AnalyticsSection stats={stats ?? null} loading={statsLoading} />}
          {section === 'users' && <UsersSection />}
          {section === 'platforms' && <PlatformsSection />}
          {section === 'plans' && <PlansSection />}
          {section === 'categories' && <CategoriesSection />}
          {section === 'services' && <ServicesSection />}
          {section === 'providers' && <ProvidersSection />}
          {section === 'orders' && <OrdersSection />}
          {section === 'transactions' && <TransactionsSection />}
          {section === 'deposits' && <DepositsSection />}
          {section === 'tickets' && <TicketsSection />}
          {section === 'gateways' && <GatewaysSection />}
          {section === 'coupons' && <CouponsSection stats={stats ?? null} />}
          {section === 'currencies' && <CurrenciesSection onNavigate={setSection} />}
          {section === 'news' && <NewsSection />}
          {section === 'faqs' && <FaqsSection />}
          {section === 'posts' && <PostsSection />}
          {section === 'pages' && <PagesSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'staff' && <StaffSection />}
          {section === 'blacklist' && <BlacklistSection />}
          {section === 'email' && <EmailSection />}
          {section === 'settings' && <SettingsSection />}
        </div>
      </div>
    </PanelShell>
  )
}
