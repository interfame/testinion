// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// GrowthRush — CLIENT PORTAL (Task 2-a)
// Full SPA-style panel: dashboard, new order, services, orders, add funds,
// transactions, tickets, API docs and account settings — rendered inside PanelShell.

import { useCallback, useState } from 'react'
import {
  Code2, Crown, LayoutDashboard, LayoutGrid, LifeBuoy, ListOrdered,
  ReceiptText, Rocket, ShoppingCart, Store, UserCog, Wallet, UserRound,
} from 'lucide-react'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { PanelShell, type NavSection } from '@/components/shared/panel-shell'
import { BalanceChip, CurrencyChip, LanguageChip } from '@/components/shared/chips'
import { Button } from '@/components/ui/button'
import type { PaletteService } from '@/components/shared/command-palette'
import { api } from '@/lib/api'
import { useGoto } from '@/lib/goto'
import { ClientDataProvider, useClientData } from './client-data'
import DashboardSection from './sections/dashboard'
import NewOrderSection, { type OrderSeed } from './sections/new-order'
import ServicesSection from './sections/services'
import OrdersSection from './sections/orders'
import AddFundsSection from './sections/add-funds'
import TransactionsSection from './sections/transactions'
import TicketsSection from './sections/tickets'
import ApiDocsSection from './sections/api-docs'
import AccountSection from './sections/account'
import type { AppUser } from '@/components/shared/app-context'

export default function ClientPanel({ user, onRefresh, onLogout }: {
  user: AppUser
  onRefresh: () => void
  onLogout: () => void
}) {
  return (
    <ClientDataProvider>
      <ClientPanelInner user={user} onRefresh={onRefresh} onLogout={onLogout} />
    </ClientDataProvider>
  )
}

function GrowBanner({ owned, onBuy, onReseller }: { owned: boolean; onBuy: () => void; onReseller: () => void }) {
  const { t } = useI18n()
  return (
    <div
      className="mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: 'linear-gradient(100deg, color-mix(in srgb, var(--brand) 14%, transparent), transparent 60%)',
        borderColor: 'color-mix(in srgb, var(--brand) 35%, transparent)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--brand)', color: '#15180a' }}>
          {owned ? <Store className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-[14px] font-extrabold tracking-tight">
            {owned ? t('client.resellerPanel') : t('client.buyPlatform')}
          </p>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
            {owned ? t('client.resellerDesc') : t('client.buyPlatformDesc')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={owned ? onReseller : onBuy}
        className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold transition hover:opacity-90"
        style={{ background: 'var(--brand)', color: '#15180a' }}
      >
        <Rocket className="h-4 w-4" />
        {owned ? t('client.resellerCta') : t('client.buyPlatformCta')}
      </button>
    </div>
  )
}

function ClientPanelInner({ user, onRefresh, onLogout }: {
  user: AppUser
  onRefresh: () => void
  onLogout: () => void
}) {
  const app = useApp()
  const { publicSettings } = app
  const { t } = useI18n()
  const { tickets } = useClientData()

  const [active, setActive] = useState('dashboard')
  const [orderSeed, setOrderSeed] = useState<{ seed: OrderSeed; nonce: number } | null>(null)

  // Deep-links from notification toasts ("View →") land directly on the section
  useGoto(useCallback((link: string) => setActive(link), []))

  const openTickets = tickets.filter((tk) => tk.status !== 'CLOSED').length
  const ownsPlatform = !!user.platform

  // "Buy Platform" and "Reseller" jump between app views (same account, same data)
  const handleSelect = useCallback((key: string) => {
    if (key === 'buy-platform') {
      window.dispatchEvent(new CustomEvent('gr:go', { detail: 'buy' }))
      return
    }
    if (key === 'reseller') {
      window.dispatchEvent(new CustomEvent('gr:go', { detail: 'reseller' }))
      return
    }
    setActive(key)
  }, [])
  // White-label: owned platform > storefront the user belongs to > GrowthRush
  const brandTheme = user.platform?.theme ?? user.storefront?.theme ?? 'rush'
  const brandAccent = user.platform?.accent ?? user.storefront?.accent
  const brandLabel = user.platform?.name ?? user.storefront?.name ?? publicSettings?.brand_name ?? 'GrowthRush'

  const nav: NavSection[] = [
    {
      items: [
        { key: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
        { key: 'new-order', label: t('common.newOrder'), icon: ShoppingCart },
        { key: 'services', label: t('common.services'), icon: LayoutGrid },
        { key: 'orders', label: t('common.orders'), icon: ListOrdered },
        { key: 'add-funds', label: t('common.addFunds'), icon: Wallet },
      ],
    },
    {
      title: t('client.grow'),
      items: [
        ...(ownsPlatform
          ? [{ key: 'reseller', label: t('client.resellerPanel'), icon: Store }]
          : [{ key: 'buy-platform', label: t('client.buyPlatform'), icon: Crown }]),
      ],
    },
    {
      title: t('common.support'),
      items: [
        { key: 'transactions', label: t('common.transactions'), icon: ReceiptText },
        { key: 'tickets', label: t('common.tickets'), icon: LifeBuoy, badge: openTickets || undefined },
        { key: 'api', label: t('common.api'), icon: Code2 },
        { key: 'account', label: t('common.account'), icon: UserCog },
      ],
    },
  ]

  const sectionLabels: Record<string, string> = {
    dashboard: t('common.dashboard'),
    'new-order': t('common.newOrder'),
    services: t('common.services'),
    orders: t('common.orders'),
    'add-funds': t('common.addFunds'),
    transactions: t('common.transactions'),
    tickets: t('common.tickets'),
    api: t('common.api'),
    account: t('common.account'),
  }

  function orderService(categoryId: string, serviceId: string) {
    setOrderSeed({ seed: { categoryId, serviceId }, nonce: Date.now() })
    setActive('new-order')
  }

  // ⌘K palette: search the catalog and jump straight into a prefilled order
  const serviceSearch = {
    load: async (): Promise<PaletteService[]> => {
      const d = await api.get<{ categories: Array<{ id: string; name: string; icon: string | null; services: Array<{ id: string; name: string; rate: number }> }> }>('/api/catalog')
      return d.categories.flatMap((c) =>
        c.services.map((s) => ({ id: s.id, name: s.name, category: c.name, categoryId: c.id, icon: c.icon, rate: s.rate })),
      )
    },
    pick: (s: PaletteService) => orderService(s.categoryId, s.id),
  }

  function renderSection() {
    switch (active) {
      case 'dashboard':
        return (
          <>
            <GrowBanner owned={ownsPlatform} onBuy={() => handleSelect('buy-platform')} onReseller={() => handleSelect('reseller')} />
            <DashboardSection onNavigate={handleSelect} />
          </>
        )
      case 'new-order':
        return (
          <NewOrderSection
            key={orderSeed?.nonce ?? 'blank'}
            seed={orderSeed?.seed ?? null}
            onRefresh={onRefresh}
            onGoOrders={() => setActive('orders')}
            onGoFunds={() => setActive('add-funds')}
            onGoTickets={() => setActive('tickets')}
          />
        )
      case 'services':
        return <ServicesSection onOrder={orderService} />
      case 'orders':
        return <OrdersSection onRefresh={onRefresh} />
      case 'add-funds':
        return <AddFundsSection onRefresh={onRefresh} />
      case 'transactions':
        return <TransactionsSection />
      case 'tickets':
        return <TicketsSection />
      case 'api':
        return <ApiDocsSection onRegenerateKey={() => setActive('account')} />
      case 'account':
        return <AccountSection onLogout={onLogout} />
      default:
        return <DashboardSection onNavigate={setActive} />
    }
  }

  return (
    <PanelShell
      nav={nav}
      active={active}
      onSelect={handleSelect}
      themeKey={brandTheme}
      accent={brandAccent}
      brandName={brandLabel}
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      topbarLeft={
        <span className="hidden truncate text-[13px] font-bold text-zinc-500 dark:text-zinc-400 sm:block">
          {sectionLabels[active] ?? t('client.title')}
        </span>
      }
      topbarRight={
        <>
          {/* Resellers can jump back to their panel — same account, same wallet */}
          {user.role === 'RESELLER' && user.platform && (
            <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[12px] font-bold" onClick={() => app.setView('reseller')}>
              <UserRound className="mr-1.5 h-3.5 w-3.5" /> {t('rpanel.resellerVersion')}
            </Button>
          )}
          <BalanceChip onAddFunds={() => setActive('add-funds')} />
          <CurrencyChip />
          <LanguageChip />
        </>
      }
      onExit={() => window.dispatchEvent(new Event('gr:exit'))}
      onLogout={onLogout}
      serviceSearch={serviceSearch}
    >
      {renderSection()}
    </PanelShell>
  )
}
