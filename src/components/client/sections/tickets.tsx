'use client'

// Client portal — Support tickets (list + chat thread)

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, LifeBuoy, Loader2, MessageSquarePlus, Plus, Send,
} from 'lucide-react'
import { useI18n, type DictKey } from '@/lib/i18n'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClientData } from '../client-data'
import { Card, EmptyState, LoadingRows, Pill, BrandButton } from '../bits'
import type { TicketDetailData, TicketItem } from '../types'

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

const PRI_KEYS: Record<string, DictKey> = {
  low: 'ctix.pLow',
  normal: 'ctix.pNormal',
  high: 'ctix.pHigh',
  urgent: 'ctix.pUrgent',
}

const CAT_KEYS: Record<string, DictKey> = {
  general: 'ctix.catGeneral',
  orders: 'ctix.catOrders',
  payments: 'ctix.catPayments',
  api: 'ctix.catApi',
  other: 'ctix.catOther',
}

function priorityTone(p: string): 'zinc' | 'sky' | 'amber' | 'rose' {
  return p === 'urgent' ? 'rose' : p === 'high' ? 'amber' : p === 'low' ? 'zinc' : 'sky'
}

export default function TicketsSection() {
  const { t } = useI18n()
  const { tickets, ticketsLoading, reloadTickets } = useClientData()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)

  const openCount = useMemo(() => tickets.filter((tk) => tk.status !== 'CLOSED').length, [tickets])

  async function createTicket() {
    if (!subject.trim() || !message.trim()) return
    setCreating(true)
    const res = await mutate(
      () => api.post<{ ticket: TicketItem }>('/api/tickets', { subject, category, priority, message }),
      { success: t('ctix.created') },
    )
    setCreating(false)
    if (res) {
      setCreateOpen(false)
      setSubject('')
      setMessage('')
      setPriority('normal')
      setCategory('general')
      await reloadTickets()
      setSelectedId(res.ticket.id)
    }
  }

  if (selectedId) {
    return (
      <TicketThread
        id={selectedId}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('common.tickets')}
        description={t('ctix.desc').replace('{n}', String(openCount))}
        actions={
          <BrandButton className="min-h-[40px] gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('ctix.new')}
          </BrandButton>
        }
      />

      {ticketsLoading && tickets.length === 0 ? (
        <Card><LoadingRows rows={5} /></Card>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={t('ctix.noneTitle')}
          message={t('ctix.noneDesc')}
          action={
            <BrandButton onClick={() => setCreateOpen(true)}>
              <MessageSquarePlus className="mr-1.5 h-4 w-4" /> {t('ctix.first')}
            </BrandButton>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {tickets.map((tk) => {
            const last = tk.messages?.[0]
            return (
              <button
                key={tk.id}
                onClick={() => setSelectedId(tk.id)}
                className="flex w-full items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10">
                  <LifeBuoy className="h-4 w-4 text-[var(--brand)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-extrabold text-zinc-900 dark:text-zinc-50">{tk.subject}</p>
                    <StatusBadge status={tk.status} />
                    <Pill tone={priorityTone(tk.priority)}>{t(PRI_KEYS[tk.priority] ?? PRI_KEYS.normal)}</Pill>
                    <Pill tone="zinc">{t(CAT_KEYS[tk.category] ?? CAT_KEYS.general)}</Pill>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                    {last ? `${last.isStaff ? t('ctix.staff') : t('ctix.you')}: ${last.body}` : t('ctix.noMessages')}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{t('ctix.updated').replace('{d}', formatDateTime(tk.updatedAt))}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Create ticket dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('ctix.newTitle')}</DialogTitle>
            <DialogDescription>{t('ctix.newDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="tk-subject">{t('client.ticketSubject')}</Label>
              <Input
                id="tk-subject"
                className="min-h-[40px]"
                placeholder={t('ctix.subjectPh')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('common.category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="min-h-[40px] w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('ctix.catGeneral')}</SelectItem>
                    <SelectItem value="orders">{t('ctix.catOrders')}</SelectItem>
                    <SelectItem value="payments">{t('ctix.catPayments')}</SelectItem>
                    <SelectItem value="api">{t('ctix.catApi')}</SelectItem>
                    <SelectItem value="other">{t('ctix.catOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('ctix.priority')}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="min-h-[40px] w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(PRI_KEYS[p])}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-message">{t('ctix.message')}</Label>
              <Textarea
                id="tk-message"
                rows={5}
                placeholder={t('ctix.messagePh')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <BrandButton onClick={createTicket} disabled={creating || !subject.trim() || !message.trim()}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} {t('common.submit')}
            </BrandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<TicketDetailData>(id ? `/api/tickets?id=${id}` : null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [toggling, setToggling] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const ticket = data?.ticket
  const messages = ticket?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function send() {
    if (!reply.trim()) return
    setSending(true)
    const ok = await mutate(
      () => api.post('/api/tickets/reply', { ticketId: id, body: reply.trim() }),
      { silent: true },
    )
    setSending(false)
    if (ok) {
      setReply('')
      refresh()
    }
  }

  async function toggleStatus() {
    if (!ticket) return
    setToggling(true)
    const ok = await mutate(
      () => api.patch('/api/tickets/reply', { ticketId: id, status: ticket.status === 'CLOSED' ? 'OPEN' : 'CLOSED' }),
      { success: ticket.status === 'CLOSED' ? t('ctix.reopened') : t('ctix.closed') },
    )
    setToggling(false)
    if (ok) refresh()
  }

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title=""
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="min-h-[40px] gap-1.5" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" /> {t('ctix.all')}
            </Button>
            {ticket && (
              <Button
                variant="outline"
                className="min-h-[40px]"
                onClick={toggleStatus}
                disabled={toggling}
              >
                {toggling && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {ticket.status === 'CLOSED' ? t('ctix.reopen') : t('ctix.close')}
              </Button>
            )}
          </div>
        }
      />
      <div className="sr-only">{t('common.tickets')}</div>

      {loading && !ticket ? (
        <Card><LoadingRows rows={5} /></Card>
      ) : !ticket ? (
        <EmptyState icon={LifeBuoy} title={t('ctix.notFound')} />
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{ticket.subject}</h2>
              <StatusBadge status={ticket.status} />
              <Pill tone={priorityTone(ticket.priority)}>{ticket.priority}</Pill>
              <Pill tone="zinc">{ticket.category}</Pill>
              <span className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500">#{ticket.id.slice(0, 8)}</span>
            </div>
          </Card>

          <Card>
            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1 gr-scroll">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isStaff ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] ${msg.isStaff ? '' : 'items-end'}`}>
                    <p className={`mb-1 text-[11px] font-bold ${msg.isStaff ? 'text-zinc-500 dark:text-zinc-400' : 'text-right text-[var(--brand)]'}`}>
                      {msg.isStaff ? `🎧 ${msg.senderName}` : msg.senderName} · {formatDateTime(msg.createdAt)}
                    </p>
                    <div
                      className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                        msg.isStaff
                          ? 'rounded-tl-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100'
                          : 'rounded-tr-sm text-[var(--on-brand)]'
                      }`}
                      style={msg.isStaff ? undefined : { background: 'var(--brand)' }}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {ticket.status !== 'CLOSED' ? (
              <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <Textarea
                  rows={3}
                  placeholder={t('ctix.replyPh')}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
                  }}
                />
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('ctix.tip')}</p>
                  <BrandButton className="min-h-[40px]" onClick={send} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                    {t('ctix.send')}
                  </BrandButton>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3 text-center text-[12.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                {t('ctix.closedNote')}
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
