// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Pure CSS/JSX product mock-ups for the landing showcase.
// No images, no network requests — every pixel is divs, SVG and Tailwind.

import {
  Bot, ChevronDown, Home, Inbox, LayoutGrid, Lock, Package,
  Rocket, Search, Send, Settings, ShoppingBag, Sparkles, Wallet,
} from 'lucide-react'
import { SocialLogo } from '@/components/shared/social-logo'
import { THEMES } from '@/lib/themes'

/* ---------------------------------- atoms --------------------------------- */

export function WindowDots() {
  return (
    <div className="flex shrink-0 gap-1.5" aria-hidden>
      <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
      <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
      <span className="h-2 w-2 rounded-full bg-[#28c840]" />
    </div>
  )
}

function UrlBar({ host }: { host: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-white/95 px-3 py-2">
      <WindowDots />
      <div className="mx-auto flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[9px] font-semibold text-zinc-500">
        <Lock className="h-2.5 w-2.5 text-emerald-500" />
        {host}
      </div>
      <span className="w-8" aria-hidden />
    </div>
  )
}

/* ------------------------- hero: SMM panel dashboard ----------------------- */

const HERO_NAV = [
  { icon: Home, label: 'Dashboard', active: true },
  { icon: ShoppingBag, label: 'New order' },
  { icon: LayoutGrid, label: 'Services' },
  { icon: Package, label: 'Orders' },
  { icon: Wallet, label: 'Add funds' },
  { icon: Inbox, label: 'CRM inbox' },
  { icon: Settings, label: 'Account' },
]

const HERO_BARS = [34, 52, 40, 66, 48, 72, 58, 84, 62, 92, 76, 100]

const HERO_ROWS = [
  { id: '#90412', service: 'IG Followers · Real', status: 'Completed', dot: 'bg-emerald-500', charge: '$12.40' },
  { id: '#90411', service: 'TikTok Views · Fast', status: 'In progress', dot: 'bg-amber-500', charge: '$3.10' },
  { id: '#90408', service: 'YouTube Subs · HQ', status: 'Pending', dot: 'bg-sky-500', charge: '$28.00' },
  { id: '#90402', service: 'IG Likes · Auto', status: 'Partial', dot: 'bg-rose-500', charge: '$1.90' },
]

export function PanelDashboardMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-white text-left shadow-[0_40px_90px_-24px_rgba(0,0,0,0.65)]">
      <UrlBar host="panel.growthrush.io/dashboard" />
      <div className="flex">
        {/* Sidebar */}
        <div className="flex w-10 shrink-0 flex-col gap-0.5 border-r border-white/10 bg-[#17141a] p-1.5 sm:w-32 sm:gap-1 sm:p-3">
          <div className="mb-1.5 flex items-center gap-1.5 px-1 sm:mb-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] bg-[var(--brand)]">
              <Rocket className="h-2.5 w-2.5 text-[var(--on-brand)]" />
            </span>
            <span className="hidden text-[9px] font-extrabold tracking-tight text-white sm:block">GrowthRush</span>
          </div>
          {HERO_NAV.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 rounded-md px-1 py-1 sm:px-1.5 ${
                item.active ? 'bg-[var(--brand)] text-[var(--on-brand)]' : 'text-white/45'
              }`}
            >
              <item.icon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
              <span className="hidden text-[9px] font-semibold sm:block">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1 bg-[#faf7f3] p-2.5 sm:p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold tracking-tight text-zinc-900 sm:text-xs">Good morning, Alex 👋</p>
              <p className="text-[7px] text-zinc-400 sm:text-[8px]">Tuesday, 12 March · Master panel</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1">
              <Wallet className="h-2.5 w-2.5 text-emerald-600" />
              <span className="text-[8px] font-extrabold tabular-nums text-zinc-900">$1,248.90</span>
            </div>
          </div>

          {/* KPI cards */}
          <div className="mb-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              { label: 'Balance', value: '$1,248', delta: '+12%', up: true },
              { label: 'Orders', value: '1,284', delta: '+8%', up: true },
              { label: 'Revenue', value: '$8,940', delta: '+23%', up: true },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-zinc-200/80 bg-white p-1.5 sm:p-2">
                <p className="text-[6.5px] font-bold uppercase tracking-wider text-zinc-400 sm:text-[7px]">{k.label}</p>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[10px] font-extrabold tabular-nums text-zinc-900 sm:text-[12px]">{k.value}</span>
                  <span className="rounded-full bg-emerald-50 px-1 text-[6.5px] font-bold text-emerald-600 sm:text-[7px]">{k.delta}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="mb-2.5 rounded-lg border border-zinc-200/80 bg-white p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[7px] font-bold uppercase tracking-wider text-zinc-400">Revenue · last 12 days</span>
              <span className="text-[9px] font-extrabold text-zinc-900">$8,940</span>
            </div>
            <div className="flex h-12 items-end gap-1 sm:h-14">
              {HERO_BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-[var(--brand)] to-[var(--brand-2)]"
                  style={{ height: `${h}%`, opacity: i >= 9 ? 1 : 0.32 }}
                />
              ))}
            </div>
          </div>

          {/* Orders table */}
          <div className="rounded-lg border border-zinc-200/80 bg-white p-2">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 border-b border-zinc-100 pb-1 text-[6.5px] font-bold uppercase tracking-wider text-zinc-400">
              <span>ID</span><span>Service</span><span>Status</span><span>Charge</span>
            </div>
            {HERO_ROWS.map((r) => (
              <div key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-b border-zinc-50 py-1 text-[7.5px] sm:text-[8px] last:border-0">
                <span className="font-bold tabular-nums text-zinc-500">{r.id}</span>
                <span className="truncate font-semibold text-zinc-800">{r.service}</span>
                <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-zinc-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />{r.status}
                </span>
                <span className="font-extrabold tabular-nums text-zinc-900">{r.charge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------- showcase: admin command ------------------------- */

function AdminAreaChart() {
  return (
    <svg viewBox="0 0 320 92" className="mt-2 w-full" aria-hidden>
      <defs>
        <linearGradient id="grAdminRev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 44, 68].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <path
        d="M0,74 C28,66 44,52 70,55 C96,58 108,38 138,40 C168,42 184,26 214,22 C244,18 266,30 292,16 L320,10 L320,92 L0,92 Z"
        fill="url(#grAdminRev)"
      />
      <path
        d="M0,74 C28,66 44,52 70,55 C96,58 108,38 138,40 C168,42 184,26 214,22 C244,18 266,30 292,16 L320,10"
        fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"
      />
      <circle cx="292" cy="16" r="3.5" fill="var(--brand)" stroke="#17141a" strokeWidth="2" />
    </svg>
  )
}

const ADMIN_QUEUE = [
  { name: 'Lucas M.', method: 'Crypto · USDT', amount: '$250.00' },
  { name: 'Sofia C.', method: 'Card · Stripe', amount: '$80.00' },
]

export function AdminCommandMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#17141a] text-left shadow-[0_40px_90px_-24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
          <span className="text-[10px] font-extrabold tracking-tight text-white">Command center</span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-semibold text-white/60">Last 30 days</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-bold uppercase tracking-wider text-white/40">Revenue</span>
            <span className="text-[11px] font-extrabold text-white">
              $28,412 <em className="ml-0.5 rounded bg-emerald-500/15 px-1 text-[7px] not-italic font-bold text-emerald-400">+18%</em>
            </span>
          </div>
          <AdminAreaChart />
        </div>
        <div className="grid grid-rows-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <p className="text-[7px] font-bold uppercase tracking-wider text-white/40">Orders</p>
            <p className="text-sm font-extrabold tabular-nums text-white">9,204</p>
            <p className="text-[7px] font-bold text-emerald-400">+12% vs prev.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <p className="text-[7px] font-bold uppercase tracking-wider text-white/40">Open tickets</p>
            <p className="text-sm font-extrabold tabular-nums text-white">3</p>
            <p className="text-[7px] font-bold text-[var(--brand-2)]">1 awaiting reply</p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 px-3 pb-3">
        <p className="text-[7px] font-bold uppercase tracking-wider text-white/40">Deposits awaiting approval</p>
        {ADMIN_QUEUE.map((d) => (
          <div key={d.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-[7px] font-black text-white">
              {d.name[0]}
            </span>
            <span className="text-[8px] font-bold text-white">{d.name}</span>
            <span className="hidden rounded-full bg-white/10 px-1.5 py-0.5 text-[6.5px] font-semibold text-white/60 sm:block">{d.method}</span>
            <span className="ml-auto text-[8px] font-extrabold tabular-nums text-white">{d.amount}</span>
            <span className="rounded-md bg-[var(--brand)] px-2 py-0.5 text-[7px] font-bold text-[var(--on-brand)]">Approve</span>
            <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[7px] font-bold text-white/50">Reject</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------- showcase: client portal ------------------------- */

export function ClientPortalMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white text-left shadow-[0_40px_90px_-24px_rgba(23,20,26,0.4)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-[8px] font-black text-white">M</span>
          <div>
            <p className="text-[9px] font-extrabold leading-tight text-zinc-900">Hola, María</p>
            <p className="text-[7px] leading-tight text-zinc-400">Client portal</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1">
          <Wallet className="h-2.5 w-2.5 text-emerald-600" />
          <span className="text-[8px] font-extrabold tabular-nums text-zinc-900">$84.20</span>
        </div>
      </div>
      <div className="grid gap-2 p-2.5 sm:grid-cols-[1fr_1.25fr]">
        <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>
          <p className="text-[7px] font-bold uppercase tracking-wider text-white/70">Available balance</p>
          <p className="mt-0.5 text-lg font-black tracking-tight text-white">$84.20</p>
          <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-bold text-white">＋ Add funds</span>
          <p className="mt-2.5 border-t border-white/20 pt-1.5 text-[7px] font-semibold text-white/80">＋ $25.00 deposited · 2h ago</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-2.5">
          <p className="mb-1.5 text-[9px] font-extrabold text-zinc-900">New order</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <SocialLogo icon="instagram" size={11} />
              <span className="text-[8px] font-bold text-zinc-800">Instagram · Followers</span>
              <ChevronDown className="ml-auto h-2.5 w-2.5 text-zinc-400" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <span className="truncate text-[8px] font-semibold text-zinc-600">Followers — Real · $0.85 / 1k</span>
              <ChevronDown className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[8px] text-zinc-400">
              https://instagram.com/yourprofile
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2 py-1.5">
              <span className="text-[8px] font-semibold text-zinc-600">Quantity</span>
              <span className="text-[8px] font-extrabold tabular-nums text-zinc-900">1,000</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
            <span className="text-[8px] text-zinc-500">Charge <b className="text-zinc-900">$0.85</b></span>
            <span className="rounded-full px-2.5 py-1 text-[8px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>Place order</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------- showcase: omnichannel inbox --------------------- */

const INBOX_CONVS = [
  { name: 'Camila Ríos', initials: 'C', snippet: '¿Tiene garantía?', time: '2m', unread: 2, active: true },
  { name: 'Diego P.', initials: 'D', snippet: 'Perfecto, ¡gracias!', time: '1h', unread: 0, active: false },
  { name: 'Ana Belén', initials: 'A', snippet: 'Necesito 10k views para…', time: '3h', unread: 1, active: false },
]

export function InboxMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white text-left shadow-[0_40px_90px_-24px_rgba(23,20,26,0.4)]">
      <div className="flex">
        {/* Conversation list */}
        <div className="w-[38%] shrink-0 border-r border-zinc-100 bg-[#faf7f3]">
          <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-2">
            <span className="text-[9px] font-extrabold text-zinc-900">Inbox</span>
            <span className="rounded-full px-1.5 text-[7px] font-black text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>6</span>
          </div>
          <div className="p-1.5">
            <div className="mb-1.5 flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-1">
              <Search className="h-2.5 w-2.5 text-zinc-300" />
              <span className="text-[7px] text-zinc-400">Search chats…</span>
            </div>
            {INBOX_CONVS.map((c) => (
              <div key={c.name} className={`mb-1 flex items-start gap-1.5 rounded-lg px-1.5 py-1.5 ${c.active ? 'bg-white shadow-sm ring-1 ring-zinc-100' : ''}`}>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-[7px] font-black text-white">{c.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[7.5px] font-bold text-zinc-900">{c.name}</span>
                    <span className="text-[6px] text-zinc-400">{c.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[7px] text-zinc-400">{c.snippet}</span>
                    {c.unread > 0 && (
                      <span className="rounded-full px-1 text-[6px] font-black text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>{c.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 px-2 py-1.5">
            <SocialLogo icon="whatsapp" size={10} />
            <span className="text-[8.5px] font-extrabold text-zinc-900">Camila Ríos</span>
            <span className="flex items-center gap-0.5 text-[7px] font-semibold text-emerald-600">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />WhatsApp
            </span>
            <span className="ml-auto flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[6.5px] font-bold text-violet-600">
              <Bot className="h-2 w-2" />AI on
            </span>
          </div>
          <div className="flex-1 space-y-1.5 bg-[#ece5dd]/50 p-2">
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-white px-2 py-1 text-[7.5px] font-medium text-zinc-800 shadow-sm">
              Hola! Quiero 5k seguidores para mi cuenta 🙌
            </div>
            <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm px-2 py-1 text-[7.5px] font-medium text-[var(--on-brand)] shadow-sm" style={{ background: 'var(--brand)' }}>
              ¡Claro Camila! Ya te armo el pedido ✨
            </div>
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-white px-2 py-1 text-[7.5px] font-medium text-zinc-800 shadow-sm">
              ¿Tiene garantía?
            </div>
          </div>
          <div className="flex items-center gap-1 border-t border-zinc-100 px-2 py-1.5">
            <div className="flex-1 rounded-full bg-zinc-100 px-2 py-1 text-[7px] text-zinc-400">Type a message…</div>
            <span className="flex items-center gap-0.5 rounded-full border px-1.5 py-1 text-[6.5px] font-bold" style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
              <Sparkles className="h-2 w-2" />AI reply
            </span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Send className="h-2 w-2" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------- showcase: reseller storefront ------------------- */

const STORE_ITEMS = [
  { icon: 'instagram', name: 'IG Followers', price: '$0.90 / 1k' },
  { icon: 'tiktok', name: 'TikTok Views', price: '$0.12 / 1k' },
  { icon: 'youtube', name: 'YT Subscribers', price: '$12.50 / 1k' },
]

export function StorefrontMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white text-left shadow-[0_40px_90px_-24px_rgba(23,20,26,0.4)]">
      <UrlBar host="kayasocial.growthrush.io" />
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-md text-[8px] font-black text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>K</span>
        <span className="text-[9px] font-extrabold tracking-tight text-zinc-900">Kaya Social</span>
        <nav className="ml-3 hidden gap-2 text-[7.5px] font-semibold text-zinc-400 sm:flex" aria-hidden>
          <span>Services</span><span>Orders</span><span>FAQ</span>
        </nav>
        <span className="ml-auto rounded-full px-2 py-0.5 text-[7px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>Sign in</span>
      </div>
      <div className="flex items-center justify-between gap-2 bg-[#17141a] px-3 py-2.5">
        <div>
          <p className="text-[10px] font-black tracking-tight text-white">Grow your socials. Today.</p>
          <p className="text-[7px] text-white/50">Instant delivery · 24/7 support · refill guarantee</p>
        </div>
        <span className="shrink-0 rounded-full px-2 py-1 text-[7.5px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>Get started</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2.5">
        {STORE_ITEMS.map((s) => (
          <div key={s.name} className="rounded-lg border border-zinc-200 p-1.5">
            <div className="mb-1 flex h-5 w-5 items-center justify-center rounded-md bg-zinc-50">
              <SocialLogo icon={s.icon} size={12} />
            </div>
            <p className="truncate text-[7.5px] font-bold text-zinc-900">{s.name}</p>
            <p className="text-[7px] font-semibold text-zinc-400">{s.price}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[6.5px] font-bold uppercase tracking-wide text-emerald-600">Active</span>
              <span className="rounded-full px-1.5 py-0.5 text-[6.5px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>Order</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------- showcase: portal theme swatches ----------------- */

const SWATCHES: { key: 'nova' | 'horizon' | 'boost' | 'rush'; plan: string }[] = [
  { key: 'nova', plan: 'Pro plan' },
  { key: 'horizon', plan: 'Pro plan' },
  { key: 'boost', plan: 'Agency plan' },
  { key: 'rush', plan: 'All plans' },
]

export function ThemeSwatches() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SWATCHES.map(({ key, plan }) => {
        const th = THEMES[key]
        return (
          <div key={key} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <div className="p-2.5" style={{ background: th.dark }}>
              <div className="overflow-hidden rounded-lg">
                <div className="flex h-4 items-center gap-1 px-1.5" style={{ background: th.accent }}>
                  <span className="h-1 w-1 rounded-full bg-white/80" />
                  <span className="h-1 w-1 rounded-full bg-white/50" />
                  <span className="ml-auto h-1 w-6 rounded-full bg-white/40" />
                </div>
                <div className="flex h-16" style={{ background: th.dark }}>
                  <div className="w-6 space-y-1 border-r border-white/10 p-1" aria-hidden>
                    <div className="h-1 rounded-full" style={{ background: th.accent }} />
                    <div className="h-1 rounded-full bg-white/15" />
                    <div className="h-1 rounded-full bg-white/15" />
                    <div className="h-1 rounded-full bg-white/15" />
                  </div>
                  <div className="flex-1 space-y-1.5 p-1.5">
                    <div className="h-1.5 w-1/2 rounded-full bg-white/25" />
                    <div className="flex h-8 items-end gap-0.5" aria-hidden>
                      {[40, 65, 50, 85, 60, 100, 75].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{ height: `${h}%`, background: i % 2 ? th.accent2 : th.accent, opacity: i > 4 ? 1 : 0.45 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-xs font-extrabold tracking-tight text-zinc-900">{th.name}</p>
                <p className="text-[10px] font-semibold text-zinc-400">{plan}</p>
              </div>
              <div className="flex gap-1" aria-hidden>
                <span className="h-3 w-3 rounded-full" style={{ background: th.accent }} />
                <span className="h-3 w-3 rounded-full" style={{ background: th.accent2 }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


