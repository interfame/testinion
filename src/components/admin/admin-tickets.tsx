'use client'

// Super Admin — Support tickets: table, thread view with reply box, close/reopen.

import { useMemo, useState } from 'react'
import { LifeBuoy, Send, Search, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { api, mutate, useApi } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { AdminCard, EmptyState, InitialAvatar, TableShell, useDebounced, type AdminTicket } from './admin-ui'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  high: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  normal: 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  low: 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800',
}

export function TicketsSection() {
  const { lang } = useApp()
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const { data, loading, refresh } = useApi<{ tickets: AdminTicket[] }>('/api/admin/tickets')

  const [openTicket, setOpenTicket] = useState<AdminTicket | null>(null)
  const [thread, setThread] = useState<AdminTicket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const list = useMemo(() => {
    const tickets = data?.tickets ?? []
    if (!dq.trim()) return tickets
    const needle = dq.toLowerCase()
    return tickets.filter((t) =>
      t.subject.toLowerCase().includes(needle) ||
      t.user?.email?.toLowerCase().includes(needle) ||
      t.user?.name?.toLowerCase().includes(needle))
  }, [data, dq])

  const openThread = (t: AdminTicket) => {
    setThread(t)
    setOpenTicket(t)
    setReply('')
  }

  const sendReply = async () => {
    if (!openTicket || !reply.trim()) return
    setSending(true)
    const ok = await mutate(
      () => api.post('/api/tickets/reply', { ticketId: openTicket.id, body: reply.trim() }),
      { success: 'Reply sent' },
    )
    setSending(false)
    if (ok) {
      setReply('')
      const fresh = await api.get<{ tickets: AdminTicket[] }>('/api/admin/tickets')
      const updated = fresh.tickets.find((t) => t.id === openTicket.id) ?? null
      setThread(updated)
      setOpenTicket(updated)
      refresh()
    }
  }

  const setStatus = async (t: AdminTicket, status: 'OPEN' | 'ANSWERED' | 'CLOSED') => {
    const ok = await mutate(
      () => api.patch('/api/admin/tickets', { id: t.id, status }),
      { success: `Ticket ${status.toLowerCase()}` },
    )
    if (ok) {
      const updated = { ...t, status }
      setThread(updated)
      setOpenTicket(updated)
      refresh()
    }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader title="Support tickets" description="Answer users from every platform. Replies are sent as the Support Team." />

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject or user…" className="h-9 rounded-full pl-9 text-[13px]" />
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <AdminCard><EmptyState icon={LifeBuoy} title="No tickets" hint="Inbox zero — nice." /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Subject</th>
                <th className="px-3 py-3 font-bold">User</th>
                <th className="px-3 py-3 font-bold">Priority</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 font-bold">Last message</th>
                <th className="px-4 py-3 text-right font-bold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {list.map((t) => {
                const last = t.messages?.[0]
                return (
                  <tr key={t.id} onClick={() => openThread(t)} className="cursor-pointer transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100">{t.subject}</p>
                      <p className="text-[11px] capitalize text-zinc-400 dark:text-zinc-500">{t.category}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <InitialAvatar name={t.user?.name ?? '?'} className="h-6 w-6 text-[9px]" />
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-zinc-700 dark:text-zinc-200">{t.user?.name}</p>
                          <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{t.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`rounded-full text-[10px] font-bold capitalize ${PRIORITY_STYLES[t.priority] ?? ''}`}>{t.priority}</Badge>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                    <td className="max-w-[220px] px-3 py-3">
                      {last ? (
                        <p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                          <span className={last.isStaff ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-zinc-600 dark:text-zinc-300'}>{last.isStaff ? 'You: ' : ''}</span>
                          {last.body}
                        </p>
                      ) : <span className="text-[12px] text-zinc-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12px] text-zinc-400 dark:text-zinc-500">{formatDateTime(t.updatedAt, lang)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableShell>
      )}

      {/* Thread dialog */}
      <Dialog open={!!openTicket} onOpenChange={(o) => !o && setOpenTicket(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              <span className="min-w-0 truncate">{thread?.subject}</span>
              <StatusBadge status={thread?.status ?? 'OPEN'} />
            </DialogTitle>
            <DialogDescription>
              {thread?.user?.name} · {thread?.user?.email} · {thread?.category} · priority {thread?.priority}
            </DialogDescription>
          </DialogHeader>

          <div className="gr-scroll max-h-[340px] flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3">
            {(thread?.messages ?? []).slice().reverse().map((m) => (
              <div key={m.id} className={`flex ${m.isStaff ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${m.isStaff ? 'text-[var(--on-brand)]' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800'}`}
                  style={m.isStaff ? { background: 'var(--brand)' } : undefined}>
                  <p className="mb-0.5 text-[10.5px] font-bold opacity-75">{m.isStaff ? m.senderName : thread?.user?.name} · {formatDateTime(m.createdAt, lang)}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
            {(thread?.messages?.length ?? 0) === 0 && (
              <p className="py-8 text-center text-[12px] text-zinc-400 dark:text-zinc-500">No messages yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your reply as Support Team…"
              disabled={thread?.status === 'CLOSED'}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {thread?.status === 'CLOSED' ? (
                <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[12px] font-bold" onClick={() => thread && setStatus(thread, 'OPEN')}>
                  <Unlock className="mr-1 h-3.5 w-3.5" /> Reopen ticket
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[12px] font-bold" onClick={() => thread && setStatus(thread, 'CLOSED')}>
                  <Lock className="mr-1 h-3.5 w-3.5" /> Close ticket
                </Button>
              )}
              <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim() || thread?.status === 'CLOSED'} className="h-8 rounded-full px-4 text-[12px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                <Send className="mr-1 h-3.5 w-3.5" /> Send reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
