// GrowthRush — client portal shared types (scope: src/components/client/**)

import type { AppPlatform } from '@/components/shared/app-context'

export type CatalogService = {
  id: string
  name: string
  type: string // DEFAULT | CUSTOM_COMMENTS | SUBSCRIPTION
  rate: number // per 1000, USD
  min: number
  max: number
  description: string | null
  dripfeed: boolean
  refill: boolean
  cancel: boolean
  featured: boolean
  categoryId: string
}

export type CatalogCategory = {
  id: string
  name: string
  slug: string
  icon: string // social icon key
  color: string
  services: CatalogService[]
}

export type CatalogData = {
  categories: CatalogCategory[]
  providers: { id: string; name: string }[]
}

export type ClientOrder = {
  id: string
  serviceName: string
  link: string
  quantity: number
  charge: number
  startCount: number
  remains: number
  status: string // PENDING | IN_PROGRESS | COMPLETED | PARTIAL | CANCELED
  dripfeed: boolean
  dripRuns: number
  dripInterval: number
  comments: string | null
  createdAt: string
  service: {
    cancel: boolean
    refill: boolean
    type: string
    category: { icon: string; name: string }
  }
}

export type Gateway = {
  id: string
  name: string
  type: string // CARD | PAYPAL | CRYPTO | BANK | MANUAL
  instructions: string | null
  feePercent: number
  enabled: boolean
}

export type Tx = {
  id: string
  type: string // DEPOSIT | ORDER | REFUND | PLAN | ADDON | ADJUSTMENT | PAYOUT
  amount: number
  description: string
  status: string // COMPLETED | PENDING | FAILED
  method: string | null
  createdAt: string
}

export type Deposit = {
  id: string
  amount: number
  method: string
  status: string // PENDING | APPROVED | REJECTED
  note: string | null
  reference: string | null
  createdAt: string
}

export type PaymentMethod = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  primary: boolean
}

export type FundsData = {
  gateways: Gateway[]
  transactions: Tx[]
  deposits: Deposit[]
  methods: PaymentMethod[]
}

export type NewsItem = {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
}

export type TicketMsg = {
  id: string
  senderName: string
  isStaff: boolean
  body: string
  fileUrl?: string | null
  fileName?: string | null
  fileMime?: string | null
  fileSize?: number | null
  createdAt: string
}

export type TicketItem = {
  id: string
  subject: string
  category: string
  priority: string // low | normal | high | urgent
  status: string // OPEN | ANSWERED | CLOSED
  createdAt: string
  updatedAt: string
  messages: TicketMsg[] // list view: only last message
}

export type TicketDetailData = {
  ticket: TicketItem & { messages: TicketMsg[] }
}

export type NewOrderResult = {
  order: ClientOrder
  balance: number
}

export type OrderManageResult = { ok: boolean }

export type FundPostResult = {
  ok: boolean
  deposit?: Deposit
  transaction?: Tx
  balance?: number
  pending?: boolean
  message?: string
}

export type MePatchResult = { user: AppUserLike }

export type AppUserLike = {
  id: string
  name: string
  email: string
  role: string
  balance: number
  currency: string
  language: string
  apiKey: string
  twoFactorEnabled: boolean
  status: string
  platformId: string | null
  platform?: AppPlatform | null
  createdAt?: string
}
