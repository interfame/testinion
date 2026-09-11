'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck, ShoppingCart, DollarSign, LifeBuoy, Wallet, Info, MessagesSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToastAction } from '@/components/ui/toast'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { useRealtimeEvents } from '@/lib/realtime-client'
import type { RealtimeEvent } from '@/lib/realtime-client'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

const ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  ORDER: { icon: ShoppingCart, color: '#0d9488', bg: 'bg-teal-50' },
  DEPOSIT: { icon: DollarSign, color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  MONEY: { icon: Wallet, color: '#7c3aed', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  TICKET: { icon: LifeBuoy, color: '#e11d48', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  CRM: { icon: MessagesSquare, color: '#0891b2', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
  SYSTEM: { icon: Info, color: '#64748b', bg: 'bg-zinc-100 dark:bg-zinc-800/60' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** Notification bell with realtime push + dropdown feed + unread badge (polling fallback). */
export function NotificationBell({ userId, onNavigate }: { userId?: string; onNavigate?: (section: string) => void }) {
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [justArrived, setJustArrived] = useState<string | null>(null)

  const load = async () => {
    try {
      const d = await api.get<{ notifications: Notification[]; unread: number }>('/api/notifications')
      setItems(d.notifications)
      setUnread(d.unread)
    } catch { /* silent */ }
  }

  useEffect(() => {
    const t = setInterval(load, 30000)
    const initial = setTimeout(load, 400)
    return () => {
      clearInterval(t)
      clearTimeout(initial)
    }
  }, [])

  // Realtime push (via the panel websocket mirrored on `gr:rt`) — no wait for the next poll
  useRealtimeEvents(userId ? ['notification'] : null, (e: RealtimeEvent) => {
    const n = e.notification as Notification | undefined
    if (!n?.id) return
    setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 30)))
    setUnread((u) => u + 1)
    setJustArrived(n.id)
    setTimeout(() => setJustArrived((id) => (id === n.id ? null : id)), 4000)
    if (n.link) {
      // Deep-linkable notification → toast with a "View" action that navigates
      toast({
        title: n.title,
        description: n.body ?? undefined,
        action: (
          <ToastAction
            altText="View"
            onClick={() => window.dispatchEvent(new CustomEvent('gr:goto', { detail: n.link }))}
          >
            View →
          </ToastAction>
        ),
      })
    } else {
      toast({ title: n.title, description: n.body ?? undefined })
    }
  })

  const markAll = async () => {
    await api.patch('/api/notifications', {})
    load()
  }

  const markOne = async (n: Notification) => {
    if (!n.read) {
      await api.patch('/api/notifications', { id: n.id })
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((u) => Math.max(0, u - 1))
    }
    if (n.link && onNavigate && open) {
      setOpen(false)
      onNavigate(n.link)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) load() }}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-8 w-8 rounded-full" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40">
            <Bell className="h-3.5 w-3.5 text-rose-500" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900" />}
          </span>
          <DropdownMenuLabel className="p-0 text-[13px] font-extrabold">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-black text-rose-600 dark:text-rose-400">
              {unread} NEW
            </span>
          )}
          <button
            onClick={markAll}
            disabled={unread === 0}
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-zinc-400 transition enabled:hover:text-zinc-700 dark:enabled:hover:text-zinc-200 disabled:opacity-40 dark:text-zinc-500"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-80 overflow-y-auto gr-scroll">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
              <Bell className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500">Nothing yet — activity will show up here.</p>
            </div>
          )}
          {items.map((n) => {
            const meta = ICONS[n.type] ?? ICONS.SYSTEM
            const Icon = meta.icon
            const fresh = justArrived === n.id
            return (
              <button
                key={n.id}
                onClick={() => markOne(n)}
                className={`flex w-full items-start gap-2.5 border-b border-zinc-100 dark:border-zinc-800/70 px-3 py-2.5 text-left transition last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${!n.read ? 'bg-zinc-50/60 dark:bg-zinc-900/40' : ''} ${fresh ? 'gr-flash' : ''}`}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`truncate text-[12px] ${n.read ? 'font-semibold text-zinc-600 dark:text-zinc-300' : 'font-extrabold text-zinc-900 dark:text-zinc-50'}`}>{n.title}</span>
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
                    <span className="ml-auto shrink-0 text-[10px] text-zinc-300 dark:text-zinc-600">{timeAgo(n.createdAt)}</span>
                  </span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{n.body}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
