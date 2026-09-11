'use client'

// Omnichannel inbox — flagship 3-pane CRM view (list / thread / contact context).

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Copy,
  Inbox,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Search,
  Send,
  SendHorizonal,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, mutate, useApi } from '@/lib/api'
import { useApp } from '@/components/shared/app-context'
import { useRealtimeEvents } from '@/lib/realtime-client'
import { formatDateTime, formatMoney } from '@/lib/format'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CHANNEL_TYPES,
  CONV_STATUSES,
  ContactAvatar,
  ChannelIcon,
  LabelChips,
  channelMeta,
  convDot,
  convDotLabel,
  type CrmConversation,
  type CrmMessage,
} from './crm-shared'

type Thread = CrmConversation & { messages: CrmMessage[] }

function hhmm(d: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))
}

function timeShort(d: string, lang: string): string {
  const date = new Date(d)
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 24 * 60) return `${Math.floor(mins / 60)}h`
  if (mins < 7 * 24 * 60) return `${Math.floor(mins / (24 * 60))}d`
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

const scrollClasses =
  'overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 [&::-webkit-scrollbar-track]:bg-transparent'

export default function CrmInbox({
  platformId,
  onOpenInbox,
  focusConversationId,
  onFocusConsumed,
}: {
  platformId: string
  onOpenInbox?: () => void
  focusConversationId?: string | null
  onFocusConsumed?: () => void
}) {
  const { user, currencyOf, lang } = useApp()
  const platform = user.platform

  // ── data ───────────────────────────────
  const {
    data: listData,
    loading: listLoading,
    refresh: refreshList,
    setData: setListData,
  } = useApi<{ conversations: CrmConversation[] }>('/api/reseller/crm/conversations', [platformId])

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      setTick((v) => v + 1)
      refreshList()
    }, 15000)
    return () => clearInterval(t)
  }, [refreshList])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const {
    data: threadData,
    loading: threadLoading,
    refresh: refreshThread,
    setData: setThreadData,
  } = useApi<{ conversation: Thread }>(
    selectedId ? `/api/reseller/crm/conversations?id=${selectedId}` : null,
    [selectedId, tick],
  )

  const { data: agentData } = useApi<{ agents: { id: string; active: boolean }[] }>(
    '/api/reseller/crm/agents',
  )
  const hasActiveAgent = !!agentData?.agents?.some((a) => a.active)

  const { data: qrData } = useApi<{ quickReplies: { id: string; title: string; body: string; shortcut: string | null }[] }>(
    '/api/reseller/crm/quick-replies',
  )
  const { data: labelData } = useApi<{ labels: { id: string; name: string; color: string }[] }>(
    '/api/reseller/crm/labels',
  )
  const labels = labelData?.labels ?? []

  const conversations = useMemo(() => listData?.conversations ?? [], [listData])
  const totalUnread = conversations.reduce((s, c) => s + (c.unread ?? 0), 0)
  const conv = threadData?.conversation

  // Deep-link: a notification/toast asked us to open a specific conversation
  useEffect(() => {
    if (!focusConversationId || listLoading) return
    const id = focusConversationId
    const consume = onFocusConsumed
    // Scheduled (not synchronous) so the effect pass doesn't cascade renders
    queueMicrotask(() => {
      setSelectedId(id)
      consume?.()
    })
  }, [focusConversationId, listLoading, onFocusConsumed])

  // ── realtime inbox (websocket) ──────────
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const selectedRef = useRef<string | null>(null)
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  useRealtimeEvents(['crm'], (e) => {
    if (e.action !== 'message') return
    const cid = String(e.conversationId ?? '')
    if (!cid) return
    const incoming = e.direction === 'IN'
    const msg = e.message as { id: string; body: string; direction: string; aiGenerated?: boolean; createdAt: string } | undefined
    const isOpen = selectedRef.current === cid

    // 1) conversation list: preview + unread badge
    setListData((prev) =>
      prev
        ? {
            conversations: prev.conversations.some((c) => c.id === cid)
              ? prev.conversations.map((c) =>
                  c.id === cid
                    ? {
                        ...c,
                        lastMessage: String(e.lastMessage ?? c.lastMessage),
                        lastMessageAt: String(e.lastMessageAt ?? c.lastMessageAt),
                        unread: incoming && !isOpen ? (c.unread ?? 0) + 1 : isOpen ? 0 : c.unread ?? 0,
                      }
                    : c,
                )
              : prev.conversations,
          }
        : prev,
    )

    // 2) open thread: append the bubble live (and keep it read)
    if (isOpen && msg) {
      const crmMsg: CrmMessage = {
        id: msg.id,
        body: msg.body,
        direction: msg.direction,
        aiGenerated: !!msg.aiGenerated,
        createdAt: msg.createdAt,
      }
      setThreadData((prev) => {
        if (!prev || prev.conversation.messages.some((m) => m.id === crmMsg.id)) return prev
        return {
          conversation: {
            ...prev.conversation,
            messages: [...prev.conversation.messages, crmMsg],
          },
        }
      })
      setFlashIds((s) => new Set(s).add(crmMsg.id))
      setTimeout(() => {
        setFlashIds((s) => {
          const next = new Set(s)
          next.delete(crmMsg.id)
          return next
        })
      }, 2200)
      if (incoming) api.patch('/api/reseller/crm/conversations', { id: cid, markRead: true }).catch(() => {})
      return
    }

    // 3) background conversation: toast nudge
    if (incoming) {
      const meta = channelMeta(String(e.channel ?? 'WHATSAPP'))
      toast({
        title: `${e.contactName ?? 'Customer'} · ${meta.label}`,
        description: String(e.preview ?? '').slice(0, 110),
      })
    }
  })

  // ── ui state ───────────────────────────
  const [filter, setFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [assignDraft, setAssignDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const msgs = conv?.messages ?? []
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, selectedId])

  const channelTypes = useMemo(() => {
    const present = new Set(conversations.map((c) => c.channel))
    return CHANNEL_TYPES.filter((t) => present.has(t))
  }, [conversations])

  // Channel chips overflow → show a right-edge fade as scroll affordance
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const [chipsScrollable, setChipsScrollable] = useState(false)
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const update = () => setChipsScrollable(el.scrollWidth - el.clientWidth > 4)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [conversations.length])

  const filtered = conversations.filter((c) => {
    if (filter !== 'ALL' && c.channel !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.contact.name.toLowerCase().includes(q) || (c.contact.phone ?? '').toLowerCase().includes(q)
    )
  })

  // ── actions ────────────────────────────
  function openConversation(id: string) {
    setSelectedId(id)
    setDraft('')
    const row = conversations.find((c) => c.id === id)
    setAssignDraft(row?.assignedName ?? '')
    setListData((prev) =>
      prev ? { conversations: prev.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) } : prev,
    )
    api.patch('/api/reseller/crm/conversations', { id, markRead: true }).catch(() => {})
  }

  async function send() {
    const body = draft.trim()
    if (!body || !selectedId || sending) return
    setSending(true)
    const res = await mutate(() => api.post('/api/reseller/crm/conversations', { id: selectedId, body }))
    setSending(false)
    if (res) {
      setDraft('')
      refreshThread()
      refreshList()
    }
  }

  async function aiReply() {
    if (!selectedId || aiBusy) return
    setAiBusy(true)
    const res = await mutate(() => api.post('/api/reseller/crm/ai-reply', { conversationId: selectedId }), {
      success: 'AI reply sent',
    })
    setAiBusy(false)
    if (res) {
      refreshThread()
      refreshList()
    }
  }

  async function patchConv(fields: Record<string, unknown>) {
    if (!selectedId) return
    const res = await mutate(() => api.patch('/api/reseller/crm/conversations', { id: selectedId, ...fields }))
    if (res) {
      refreshThread()
      refreshList()
    }
  }

  function saveAssign() {
    if (!conv) return
    const next = assignDraft.trim()
    if (next === (conv.assignedName ?? '')) return
    patchConv({ assignedName: next })
  }

  function copyText(text: string, label: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast({ title: `${label} copied to clipboard` }))
      .catch(() => {})
  }

  // ── render ─────────────────────────────
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-white dark:bg-zinc-900">
      {/* ── Left: conversation list ── */}
      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 md:flex md:w-[320px] lg:w-[350px]',
          selectedId ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="border-b border-zinc-100 dark:border-zinc-800/70 px-3 pb-2.5 pt-3">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              <Inbox className="h-4 w-4" style={{ color: 'var(--brand)' }} />
              Inbox
              {!!totalUnread && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-bold text-[var(--on-brand)]"
                  style={{ background: 'var(--brand)' }}
                >
                  {totalUnread}
                </span>
              )}
            </h2>
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{conversations.length} chats</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 pl-8 text-[13px]"
              aria-label="Search conversations"
            />
          </div>
          <div className="relative mt-2">
            <div ref={chipsRef} className={cn('flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70 [&::-webkit-scrollbar-track]:bg-transparent')}>
              <button
                onClick={() => setFilter('ALL')}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
                  filter === 'ALL' ? 'border-transparent text-[var(--on-brand)]' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                )}
                style={filter === 'ALL' ? { background: 'var(--brand)' } : undefined}
              >
                All
                <span className={cn('rounded-full px-1.5 text-[9.5px] font-black', filter === 'ALL' ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400')}>
                  {conversations.length}
                </span>
              </button>
              {channelTypes.map((t) => {
                const meta = channelMeta(t)
                const count = conversations.filter((c) => c.channel === t).length
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    title={`${meta.label} · ${count}`}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
                      filter === t ? 'border-transparent text-[var(--on-brand)]' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                    )}
                    style={filter === t ? { background: 'var(--brand)' } : undefined}
                  >
                    <ChannelIcon type={t} size={13} />
                    {meta.label}
                    <span className={cn('rounded-full px-1.5 text-[9.5px] font-black', filter === t ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* edge fades — horizontal scroll affordance (right only while overflowing) */}
            {chipsScrollable && <div className="pointer-events-none absolute inset-y-0 right-0 w-4 rounded-br-xl bg-gradient-to-l from-white to-transparent dark:from-zinc-900" />}
          </div>
        </div>

        <div className={cn('min-h-0 flex-1', scrollClasses)}>
          {listLoading && !listData ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <MessagesSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">No conversations found</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">New customer chats will appear here in real time.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {filtered.map((c) => {
                const active = c.id === selectedId
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => openConversation(c.id)}
                      className={cn(
                        'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition',
                        active ? 'bg-zinc-100/80' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                      )}
                    >
                      <span className="relative shrink-0">
                        <ContactAvatar name={c.contact.name} channel={c.channel} size={42} />
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
                            convDot[c.status] ?? 'bg-zinc-400',
                          )}
                          title={convDotLabel[c.status] ?? c.status}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13.5px] font-bold text-zinc-900 dark:text-zinc-50">{c.contact.name}</span>
                          <span
                            className="shrink-0 text-[10.5px] font-medium text-zinc-400 dark:text-zinc-500"
                            title={formatDateTime(c.lastMessageAt, lang)}
                          >
                            {timeShort(c.lastMessageAt, lang)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <ChannelIcon type={c.channel} size={12} />
                          <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                            {c.lastMessage ?? '—'}
                          </span>
                          {!!c.unread && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-[var(--on-brand)]"
                              style={{ background: 'var(--brand)' }}
                            >
                              {c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Center: chat thread ── */}
      <section
        className={cn(
          'min-w-0 flex-1 flex-col bg-[#f7f6f3] dark:bg-zinc-950 md:flex',
          selectedId ? 'flex' : 'hidden',
        )}
      >
        {!selectedId ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white dark:bg-zinc-900 shadow-sm">
              <MessageSquare className="h-7 w-7" style={{ color: 'var(--brand)' }} />
            </span>
            <p className="text-[15px] font-bold text-zinc-700 dark:text-zinc-200">Your omnichannel inbox</p>
            <p className="max-w-xs text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Select a conversation to reply, assign an agent or let the AI bot handle it.
            </p>
          </div>
        ) : threadLoading && !threadData ? (
          <div className="flex h-full flex-col gap-3 p-4">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-20 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-14 w-1/2 rounded-2xl" />
            <Skeleton className="h-20 w-2/3 rounded-2xl" />
          </div>
        ) : !conv ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            Conversation not found.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 sm:px-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 md:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="shrink-0">
                <ContactAvatar name={conv.contact.name} channel={conv.channel} size={36} />
              </span>
              <div className="min-w-[110px] flex-1">
                <p className="truncate text-[13.5px] font-bold leading-tight text-zinc-900 dark:text-zinc-50">
                  {conv.contact.name}
                </p>
                <p className="flex items-center gap-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  <ChannelIcon type={conv.channel} size={12} />
                  {channelMeta(conv.channel).label}
                  {conv.assignedName && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                  {conv.assignedName && <span className="truncate">{conv.assignedName}</span>}
                </p>
              </div>
              <Select value={conv.status} onValueChange={(v) => patchConv({ status: v })}>
                <SelectTrigger size="sm" className="w-[86px] shrink-0 text-xs lg:w-[98px]" aria-label="Conversation status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONV_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', convDot[s])} />
                        {convDotLabel[s] ?? s}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={assignDraft}
                onChange={(e) => setAssignDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveAssign()
                }}
                onBlur={saveAssign}
                placeholder="Assign to…"
                aria-label="Assign conversation to teammate"
                className="ml-auto hidden h-8 w-[110px] shrink text-xs 2xl:w-[130px] 2xl:shrink-0 xl:block"
              />
            </header>

            <div ref={scrollRef} className={cn('gr-chat-dots min-h-0 flex-1 space-y-2 p-3 sm:p-4', scrollClasses)}>
              {msgs.map((m) => {
                const out = m.direction === 'OUT'
                return (
                  <div key={m.id} className={cn('flex', out ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm transition-shadow sm:max-w-[70%]',
                        out ? 'rounded-br-md text-white' : 'rounded-bl-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100',
                        flashIds.has(m.id) && 'gr-flash',
                      )}
                      style={out ? { background: 'var(--brand)' } : undefined}
                    >
                      <span className="whitespace-pre-wrap break-words">{m.body}</span>
                      <span
                        className={cn(
                          'ml-2 inline-flex translate-y-0.5 items-center gap-1 align-baseline text-[10px]',
                          out ? 'text-white/70' : 'text-zinc-400 dark:text-zinc-500',
                        )}
                        title={formatDateTime(m.createdAt, lang)}
                      >
                        {m.aiGenerated && <Sparkles className="h-3 w-3" aria-label="Generated by AI" />}
                        {hhmm(m.createdAt, lang)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {msgs.length === 0 && (
                <p className="pt-10 text-center text-xs text-zinc-400 dark:text-zinc-500">No messages yet — say hi 👋</p>
              )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 sm:p-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Type a message… (Enter to send)"
                aria-label="Message"
                className="max-h-32 min-h-[42px] w-full resize-none rounded-xl bg-zinc-50 dark:bg-zinc-900/60 py-2.5 text-[13px]"
                rows={1}
              />

              <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-xl"
                      aria-label="Quick replies"
                      title="Quick replies"
                    >
                      <Zap className="h-4 w-4" style={{ color: 'var(--brand)' }} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" side="top" className="w-80 p-2">
                    <p className="px-1.5 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Quick replies
                    </p>
                    <div className={cn('max-h-72 space-y-1', scrollClasses)}>
                      {(qrData?.quickReplies ?? []).length === 0 && (
                        <p className="px-1.5 py-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
                          No quick replies yet — create them under Quick Replies.
                        </p>
                      )}
                      {(qrData?.quickReplies ?? []).map((q) => (
                        <button
                          key={q.id}
                          onClick={() => setDraft(q.body)}
                          className="w-full rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[12.5px] font-bold text-zinc-800 dark:text-zinc-100">{q.title}</span>
                            {q.shortcut && (
                              <code className="shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                {q.shortcut}
                              </code>
                            )}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-zinc-500 dark:text-zinc-400">
                            {q.body}
                          </span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={aiReply}
                  disabled={aiBusy || !hasActiveAgent}
                  title={hasActiveAgent ? 'Generate an AI reply' : 'No active AI agent — create one under AI Agents'}
                  aria-label="Generate an AI reply"
                  className="h-9 w-9 shrink-0 rounded-xl"
                >
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> : <Sparkles className="h-4 w-4 text-violet-500" />}
                </Button>

                <span className="ml-auto hidden shrink-0 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 md:block">
                  Enter ↵ to send · Shift+Enter newline
                </span>

                <Button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="h-9 shrink-0 gap-1.5 rounded-xl px-3 text-[var(--on-brand)]"
                  style={{ background: 'var(--brand)' }}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                  <span className="hidden text-xs font-bold sm:inline">Send</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Right: contact context ── */}
      {conv && (
        <aside className={cn('hidden w-[300px] shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 xl:flex', scrollClasses)}>
          <div className="flex flex-col items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/70 px-5 py-5 text-center">
            <ContactAvatar name={conv.contact.name} channel={conv.channel} size={64} />
            <div>
              <p className="text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50">{conv.contact.name}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                <ChannelIcon type={conv.contact.channel} size={13} />
                {channelMeta(conv.contact.channel).label} contact
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-zinc-50 dark:bg-zinc-900/60 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <span className={cn('h-1.5 w-1.5 rounded-full', convDot[conv.status] ?? 'bg-zinc-400')} />
              {convDotLabel[conv.status] ?? conv.status}
            </div>
          </div>

          <div className="space-y-4 px-5 py-4 text-[13px]">
            <section>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Contact details</p>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">{conv.contact.phone ?? 'No phone'}</span>
                  {conv.contact.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                      onClick={() => copyText(conv.contact.phone!, 'Phone')}
                      aria-label="Copy phone"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">{conv.contact.email ?? 'No email'}</span>
                  {conv.contact.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                      onClick={() => copyText(conv.contact.email!, 'Email')}
                      aria-label="Copy email"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400 dark:text-zinc-500">Last seen</span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                    {conv.contact.lastSeen ? formatDateTime(conv.contact.lastSeen, lang) : '—'}
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Labels</p>
              <LabelChips labelsJson={conv.contact.labels} labels={labels} empty="No labels yet" />
            </section>

            <section>
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Lifetime value</p>
              <p className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--brand)' }}>
                {formatMoney(conv.contact.totalSpent ?? 0, currencyOf(platform?.currency ?? 'USD'), lang)}
              </p>
            </section>

            {conv.contact.notes && (
              <section>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Notes</p>
                <p className="whitespace-pre-wrap rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[12px] leading-relaxed text-amber-900">
                  {conv.contact.notes}
                </p>
              </section>
            )}

            {onOpenInbox && (
              <Button
                variant="outline"
                className="w-full rounded-xl text-xs font-bold"
                onClick={() => onOpenInbox()}
              >
                View orders
              </Button>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
