'use client'

// GrowthRush client portal — shared data context (catalog, orders, funds, news, tickets)

import { createContext, useContext, type ReactNode } from 'react'
import { useApi } from '@/lib/api'
import { useRealtimeEvents } from '@/lib/realtime-client'
import type {
  CatalogData,
  ClientOrder,
  FundsData,
  NewsItem,
  TicketItem,
} from './types'

type ClientDataCtx = {
  catalog: CatalogData
  catalogLoading: boolean
  reloadCatalog: () => Promise<void>
  orders: ClientOrder[]
  ordersLoading: boolean
  reloadOrders: () => Promise<void>
  funds: FundsData | null
  fundsLoading: boolean
  reloadFunds: () => Promise<void>
  news: NewsItem[]
  newsLoading: boolean
  tickets: TicketItem[]
  ticketsLoading: boolean
  reloadTickets: () => Promise<void>
}

const Ctx = createContext<ClientDataCtx | null>(null)

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const catalog = useApi<CatalogData>('/api/catalog')
  // Orders poll every 12s so live delivery progress (order engine) shows up —
  // realtime websocket events below make it instant when the tab is open.
  const orders = useApi<{ orders: ClientOrder[] }>('/api/orders', [], 12_000)
  const funds = useApi<FundsData>('/api/funds')
  const news = useApi<{ news: NewsItem[] }>('/api/news')
  const tickets = useApi<{ tickets: TicketItem[] }>('/api/tickets')

  // Server pushed an order update (progress / completion / partial) → refresh now
  useRealtimeEvents(['order'], () => {
    orders.refresh()
    funds.refresh()
  })

  const value: ClientDataCtx = {
    catalog: catalog.data ?? { categories: [], providers: [] },
    catalogLoading: catalog.loading,
    reloadCatalog: catalog.refresh,
    orders: orders.data?.orders ?? [],
    ordersLoading: orders.loading,
    reloadOrders: orders.refresh,
    funds: funds.data ?? null,
    fundsLoading: funds.loading,
    reloadFunds: funds.refresh,
    news: news.data?.news ?? [],
    newsLoading: news.loading,
    tickets: tickets.data?.tickets ?? [],
    ticketsLoading: tickets.loading,
    reloadTickets: tickets.refresh,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useClientData(): ClientDataCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useClientData must be used inside <ClientDataProvider>')
  return ctx
}
