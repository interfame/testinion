'use client'

// CRM Reports — KPIs, channel mix, status donut and 7-day contact growth.

import { Bot, Inbox, Send, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/lib/api'
import { useApp } from '@/components/shared/app-context'
import { PanelPageHeader, StatCard } from '@/components/shared/panel-shell'
import { PageWrap } from './crm-shared'
import { ChannelIcon, CardsSkeleton, channelMeta } from './crm-shared'

type Reports = {
  totals: {
    contacts: number
    conversations: number
    conversationsOpen: number
    conversationsClosed: number
    messages: number
    messagesIn: number
    messagesOut: number
    aiResolved: number
    avgMessagesPerConversation: number
  }
  byStatus: Record<string, number>
  byChannel: Record<string, number>
  last7Days: { date: string; label: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#10b981',
  AI: '#8b5cf6',
  HANDED: '#0ea5e9',
  CLOSED: '#a1a1aa',
}
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  AI: 'AI handled',
  HANDED: 'Handed to human',
  CLOSED: 'Closed',
}

export default function CrmReports({ platformId }: { platformId: string }) {
  const { lang } = useApp()
  const { data, loading } = useApi<Reports>('/api/reseller/crm/reports', [platformId])

  if (loading && !data) {
    return (
      <PageWrap>
        <PanelPageHeader title="CRM Reports" description="How your conversations, agents and customers are performing." />
        <CardsSkeleton n={4} height="h-32" />
      </PageWrap>
    )
  }
  if (!data) {
    return (
      <PageWrap>
        <PanelPageHeader title="CRM Reports" description="How your conversations, agents and customers are performing." />
        <p className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
          Could not load reports. Try refreshing the page.
        </p>
      </PageWrap>
    )
  }

  const { totals, byStatus, byChannel, last7Days } = data
  const totalConvs = totals.conversations
  const maxDay = Math.max(1, ...last7Days.map((d) => d.count))

  // Donut segments (conic-gradient)
  const statusOrder = ['OPEN', 'AI', 'HANDED', 'CLOSED'].filter((s) => (byStatus[s] ?? 0) > 0)
  let acc = 0
  const stops = statusOrder.map((s) => {
    const from = acc
    acc += ((byStatus[s] ?? 0) / Math.max(1, totalConvs)) * 100
    return `${STATUS_COLORS[s]} ${from}% ${acc}%`
  })
  const donutBg =
    statusOrder.length > 0 ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e4e4e7 0% 100%)'

  const channelRows = Object.entries(byChannel).sort((a, b) => b[1] - a[1])
  const maxChannel = Math.max(1, ...channelRows.map(([, n]) => n))

  return (
    <PageWrap>
      <PanelPageHeader
        title="CRM Reports"
        description="How your conversations, agents and customers are performing."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total contacts" value={totals.contacts.toLocaleString('en-US')} icon={Users} sub="Across all channels" />
        <StatCard
          label="Open conversations"
          value={totals.conversationsOpen.toLocaleString('en-US')}
          icon={Inbox}
          sub={`${totals.conversationsClosed} closed · avg ${totals.avgMessagesPerConversation} msgs/chat`}
        />
        <StatCard
          label="AI resolved"
          value={totals.aiResolved.toLocaleString('en-US')}
          icon={Bot}
          sub="Chats answered by your agents"
          accent="#8b5cf6"
        />
        <StatCard
          label="Messages sent"
          value={totals.messagesOut.toLocaleString('en-US')}
          icon={Send}
          sub={`${totals.messagesIn.toLocaleString('en-US')} received`}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {/* Channel breakdown */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:col-span-3">
          <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Conversations by channel</h2>
          <p className="mb-4 text-[12px] text-zinc-500 dark:text-zinc-400">Where your customers prefer to talk.</p>
          {channelRows.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-zinc-400 dark:text-zinc-500">No conversations yet.</p>
          ) : (
            <div className="space-y-3.5">
              {channelRows.map(([type, count]) => {
                const meta = channelMeta(type)
                const pct = Math.round((count / Math.max(1, totalConvs)) * 100)
                return (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-200">
                        <ChannelIcon type={type} size={15} />
                        {meta.label}
                      </span>
                      <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/60">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / maxChannel) * 100}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Status donut */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:col-span-2">
          <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Conversation status</h2>
          <p className="mb-4 text-[12px] text-zinc-500 dark:text-zinc-400">Live distribution right now.</p>
          <div className="flex items-center gap-5">
            <div
              className="relative h-36 w-36 shrink-0 rounded-full"
              style={{ background: donutBg }}
              role="img"
              aria-label="Conversations by status donut chart"
            >
              <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{totalConvs}</span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">chats</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {statusOrder.length === 0 && <li className="text-[12.5px] text-zinc-400 dark:text-zinc-500">No conversations yet.</li>}
              {statusOrder.map((s) => (
                <li key={s} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-zinc-600 dark:text-zinc-300">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                    <span className="truncate">{STATUS_LABELS[s] ?? s}</span>
                  </span>
                  <span className="shrink-0 font-bold text-zinc-800 dark:text-zinc-100">{byStatus[s] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* 7-day new contacts */}
      <section className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">New contacts — last 7 days</h2>
        <p className="mb-4 text-[12px] text-zinc-500 dark:text-zinc-400">Fresh leads added to your CRM each day.</p>
        <div className="flex h-36 items-end gap-2 sm:gap-3">
          {last7Days.map((d) => (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{d.count}</span>
              <div
                className={cn('w-full max-w-10 rounded-t-lg transition-all', d.count === 0 && 'bg-zinc-100 dark:bg-zinc-800/60')}
                style={{
                  height: `${Math.max(6, (d.count / maxDay) * 100)}%`,
                  background: d.count === 0 ? undefined : 'var(--brand)',
                }}
                title={`${d.count} new contacts · ${d.label}`}
              />
              <span className="text-[10.5px] font-semibold uppercase text-zinc-400 dark:text-zinc-500">{d.label}</span>
            </div>
          ))}
        </div>
      </section>
    </PageWrap>
  )
}
