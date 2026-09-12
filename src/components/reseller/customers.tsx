'use client'

import { useState } from 'react'
import {
  Search, Wallet, Send, Ban, CheckCircle2, XCircle, LifeBuoy, ChevronLeft, Plus, Download,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useApi, api, mutate } from '@/lib/api'
import { useRealtimeEvents } from '@/lib/realtime-client'
import { formatMoney, formatDateTime } from '@/lib/format'
import { downloadCsv, csvName } from '@/lib/csv'
import { useI18n, type Lang } from '@/lib/i18n'

type Client = { id: string; name: string; email: string; balance: number; status: string; createdAt: string; spent: number; _count: { orders: number } }
type Order = { id: string; serviceName: string; link: string; quantity: number; charge: number; status: string; remains: number; createdAt: string; user: { name: string; email: string } }
type Ticket = { id: string; subject: string; status: string; priority: string; createdAt: string; updatedAt: string; user: { name: string; email: string }; messages: { id: string; senderName: string; isStaff: boolean; body: string; createdAt: string }[] }

export default function ResellerCustomers({ section }: { section: string }) {
  switch (section) {
    case 'clients': return <Clients />
    case 'orders': return <Orders />
    case 'tickets': return <Tickets />
    default: return null
  }
}

// ─────────────── My Clients ───────────────

function Clients() {
  const app = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ clients: Client[] }>('/api/reseller/clients')
  const [q, setQ] = useState('')
  const [adjust, setAdjust] = useState<Client | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  if (loading) return <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>

  const clients = (data?.clients ?? []).filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.includes(q.toLowerCase()))

  const doAdjust = async () => {
    if (!adjust) return
    const res = await mutate(
      () => api.patch('/api/reseller/clients', { id: adjust.id, action: 'adjust', amount: parseFloat(amount), note }),
      { success: t('rcus.balanceUpdated').replace('{name}', adjust.name) }
    )
    if (res) { setAdjust(null); setAmount(''); setNote(''); refresh() }
  }

  const setStatus = async (c: Client, status: string) => {
    const res = await mutate(() => api.patch('/api/reseller/clients', { id: c.id, action: 'status', status }), { success: t('rcus.clientUpdated') })
    if (res) refresh()
  }

  return (
    <>
      <PanelPageHeader title={t('reseller.myClients')} description={t('rcus.clientsDesc').replace('{x}', String(data?.clients.length ?? 0))} />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <Input className="pl-9" placeholder={t('rcus.searchClients')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.role.CLIENT')}</th>
                <th className="px-4 py-3 font-bold">{t('common.balance')}</th>
                <th className="px-4 py-3 font-bold">{t('common.orders')}</th>
                <th className="px-4 py-3 font-bold">{t('rcus.spent')}</th>
                <th className="px-4 py-3 font-bold">{t('common.status')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((c) => (
                <tr key={c.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                        {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-extrabold">{formatMoney(c.balance, app.currencyOf(app.user.currency), app.lang as Lang)}</td>
                  <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{c._count.orders}</td>
                  <td className="px-4 py-2.5 font-semibold">{formatMoney(c.spent, app.currencyOf(app.user.currency), app.lang as Lang)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold" onClick={() => setAdjust(c)}>
                        <Wallet className="mr-1 h-3 w-3" /> {t('rcus.adjust')}
                      </Button>
                      {c.status === 'ACTIVE' ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" title={t('rcus.suspend')} onClick={() => setStatus(c, 'SUSPENDED')}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" title={t('rcus.activate')} onClick={() => setStatus(c, 'ACTIVE')}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!clients.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">{t('rcus.noClients')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('rcus.adjustTitle').replace('{name}', adjust?.name ?? '')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 text-[12px] text-zinc-500 dark:text-zinc-400">
              {t('rcus.currentBalance')} <b className="text-zinc-800 dark:text-zinc-100">{adjust ? formatMoney(adjust.balance, app.currencyOf(app.user.currency), app.lang as Lang) : ''}</b>
            </p>
            <div className="space-y-1.5">
              <Label>{t('rcus.amountHint')}</Label>
              <Input type="number" step="0.01" placeholder={t('rcus.amountPh')} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('rcus.note')}</Label>
              <Input placeholder={t('rcus.notePh')} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-bold text-emerald-600 dark:text-emerald-400" onClick={() => setAmount('10')}>+10</Button>
              <Button variant="outline" className="flex-1 font-bold text-emerald-600 dark:text-emerald-400" onClick={() => setAmount('50')}>+50</Button>
              <Button variant="outline" className="flex-1 font-bold text-rose-600 dark:text-rose-400" onClick={() => setAmount('-10')}>-10</Button>
            </div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!amount || !parseFloat(amount)} onClick={doAdjust}>
              {t('rcus.apply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────── Orders ───────────────

function Orders() {
  const app = useApp()
  const { t } = useI18n()
  const [status, setStatus] = useState('ALL')
  const { data, loading, refresh } = useApi<{ orders: Order[] }>(`/api/reseller/orders?status=${status}`, [status])
  // Realtime: instant refresh when the delivery engine touches an order
  useRealtimeEvents(['order'], refresh)
  const money = (v: number) => formatMoney(v, app.currencyOf(app.user.currency), app.lang as Lang)

  const update = async (id: string, patch: Record<string, unknown>, msg: string) => {
    const res = await mutate(() => api.patch('/api/reseller/orders', { id, ...patch }), { success: msg })
    if (res) refresh()
  }

  return (
    <>
      <PanelPageHeader
        title={t('common.orders')}
        description={t('rcus.ordersDesc')}
        actions={
          <Button
            variant="outline" className="min-h-[40px] gap-1.5"
            onClick={() =>
              downloadCsv(
                csvName('storefront-orders'),
                [t('common.date'), t('admin.role.CLIENT'), t('auth.email'), t('common.service'), t('common.link'), t('common.quantity'), t('rcus.csvRemains'), t('corders.chargeUsd'), t('common.status')],
                (data?.orders ?? []).map((o) => [
                  new Date(o.createdAt).toISOString(),
                  o.user.name,
                  o.user.email,
                  o.serviceName,
                  o.link,
                  o.quantity,
                  o.remains,
                  o.charge.toFixed(2),
                  o.status,
                ]),
              )
            }
            disabled={!data?.orders.length}
          >
            <Download className="h-3.5 w-3.5" /> {t('common.exportCsv')}
          </Button>
        }
      />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">{t('common.all')}</TabsTrigger>
          <TabsTrigger value="PENDING">{t('status.PENDING')}</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">{t('status.IN_PROGRESS')}</TabsTrigger>
          <TabsTrigger value="COMPLETED">{t('status.COMPLETED')}</TabsTrigger>
          <TabsTrigger value="PARTIAL">{t('status.PARTIAL')}</TabsTrigger>
          <TabsTrigger value="CANCELED">{t('status.CANCELED')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('common.date')}</th>
                <th className="px-4 py-3 font-bold">{t('admin.role.CLIENT')}</th>
                <th className="px-4 py-3 font-bold">{t('common.service')}</th>
                <th className="px-4 py-3 font-bold">{t('admin.o.qty')}</th>
                <th className="px-4 py-3 font-bold">{t('common.charge')}</th>
                <th className="px-4 py-3 font-bold">{t('common.status')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
              ))}
              {data?.orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-2.5 text-[12px] text-zinc-400 dark:text-zinc-500">{formatDateTime(o.createdAt, app.lang as Lang)}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold">{o.user.name}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{o.user.email}</p>
                  </td>
                  <td className="max-w-56 px-4 py-2.5">
                    <p className="truncate font-semibold">{o.serviceName}</p>
                    <a href={o.link} target="_blank" rel="noreferrer" className="truncate text-[11px] text-sky-600 dark:text-sky-400 hover:underline">{o.link}</a>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold">{o.quantity.toLocaleString()}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('rcus.remains').replace('{x}', o.remains.toLocaleString())}</p>
                  </td>
                  <td className="px-4 py-2.5 font-extrabold">{money(o.charge)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={o.status}
                      onValueChange={(v) => update(o.id, { status: v }, t('rcus.orderTo').replace('{x}', v))}
                    >
                      <SelectTrigger className="h-8 w-36 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">{t('status.PENDING')}</SelectItem>
                        <SelectItem value="IN_PROGRESS">{t('status.IN_PROGRESS')}</SelectItem>
                        <SelectItem value="COMPLETED">{t('status.COMPLETED')}</SelectItem>
                        <SelectItem value="PARTIAL">{t('status.PARTIAL')}</SelectItem>
                        <SelectItem value="CANCELED">{t('status.CANCELED')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {data && !data.orders.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">{t('rcus.noOrders')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">{t('rcus.tip')}</p>
    </>
  )
}

// ─────────────── Tickets ───────────────

function Tickets() {
  const app = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ clientTickets: Ticket[]; myTickets: Ticket[] }>('/api/reseller/tickets')
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  if (loading) return <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>

  const tickets = data?.clientTickets ?? []

  const send = async () => {
    if (!openTicket || !reply.trim()) return
    setSending(true)
    try {
      await api.post('/api/tickets/reply', { ticketId: openTicket.id, body: reply })
      setReply('')
      const fresh = await api.get<{ clientTickets: Ticket[] }>('/api/reseller/tickets')
      const updated = fresh.clientTickets.find((t) => t.id === openTicket.id)
      if (updated) setOpenTicket(updated)
      refresh()
      toast({ title: t('rcus.replySent') })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t('rcus.error'), variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const closeTicket = async () => {
    if (!openTicket) return
    await mutate(() => api.patch('/api/tickets/reply', { ticketId: openTicket.id, status: 'CLOSED' }), { success: t('rcus.ticketClosed') })
    setOpenTicket(null)
    refresh()
  }

  return (
    <>
      <PanelPageHeader title={t('common.tickets')} description={t('rcus.ticketsDesc')} />
      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="divide-y">
          {tickets.map((tk) => (
            <button key={tk.id} onClick={() => setOpenTicket(tk)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)' }}>
                <LifeBuoy className="h-4 w-4" style={{ color: 'var(--brand)' }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{tk.subject}</p>
                <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{tk.user.name} · {t('rcus.messages').replace('{x}', String(tk.messages.length))} · {formatDateTime(tk.updatedAt, app.lang as Lang)}</p>
              </div>
              <div className="flex items-center gap-2">
                {tk.priority !== 'normal' && <Badge variant="outline" className="text-[10px] uppercase">{tk.priority}</Badge>}
                <StatusBadge status={tk.status} />
              </div>
            </button>
          ))}
          {!tickets.length && (
            <div className="p-10 text-center">
              <LifeBuoy className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">{t('rcus.noTickets')}</p>
            </div>
          )}
        </div>
      </div>

      {/* My tickets to GrowthRush support */}
      {!!data?.myTickets.length && (
        <>
          <p className="mb-2 mt-6 text-sm font-extrabold">{t('rcus.myTickets')}</p>
          <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
            <div className="divide-y">
              {data.myTickets.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.subject}</p>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDateTime(t.updatedAt, app.lang as Lang)}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Thread dialog */}
      <Dialog open={!!openTicket} onOpenChange={(o) => !o && setOpenTicket(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:hidden" onClick={() => setOpenTicket(null)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-0 truncate">{openTicket?.subject}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {openTicket?.messages.map((m) => (
              <div key={m.id} className={`flex ${m.isStaff ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.isStaff ? 'text-[var(--on-brand)]' : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-100'}`}
                  style={m.isStaff ? { background: 'var(--brand)' } : undefined}
                >
                  <p className="mb-0.5 text-[10px] font-bold opacity-70">{m.isStaff ? t('rcus.supportTeam') : m.senderName} · {formatDateTime(m.createdAt, app.lang as Lang)}</p>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          {openTicket?.status !== 'CLOSED' ? (
            <div className="border-t pt-3">
              <Textarea rows={2} placeholder={t('rcus.replyPh')} value={reply} onChange={(e) => setReply(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <Button className="flex-1 font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={sending || !reply.trim()} onClick={send}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> {t('rcus.sendReply')}
                </Button>
                <Button variant="outline" className="font-bold" onClick={closeTicket}>{t('rcus.closeTicket')}</Button>
              </div>
            </div>
          ) : (
            <p className="border-t pt-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500">{t('rcus.closed')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

void Plus
void XCircle
