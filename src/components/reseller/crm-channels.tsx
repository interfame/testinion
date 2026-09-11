'use client'

// Channels — grid of omnichannel cards with simulated connect flow + setup guide.

import { useState } from 'react'
import { BookOpen, Plus, Radio, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, mutate, useApi } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useApp } from '@/components/shared/app-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { PageWrap } from './crm-shared'
import {
  CHANNEL_TYPES,
  CardsSkeleton,
  ChannelIcon,
  ConfirmDelete,
  EmptyState,
  channelMeta,
  type CrmChannel,
} from './crm-shared'

const GUIDE_STEPS: Record<string, string[]> = {
  WHATSAPP: [
    'Open WhatsApp Business on your phone',
    'Go to Settings → Linked devices → Link a device',
    'Scan the QR code shown in the connection modal',
    'Wait for the Connected badge (up to 30 seconds)',
  ],
  INSTAGRAM: [
    'Switch your account to a Professional / Business account',
    'Settings → Business → Connected tools',
    'Authorize your @handle to receive DMs',
    'Send a test DM to confirm the channel is live',
  ],
  TELEGRAM: [
    'Talk to @BotFather and run /newbot',
    'Paste the bot token in the channel config',
    'Set the webhook URL to your panel domain',
    'Send /start to your bot to verify',
  ],
  MESSENGER: [
    'Open Meta Business Suite → Inbox settings',
    'Connect the Facebook Page you want to receive messages from',
    'Grant the messages permission',
    'Submit the app for review and approve the test user',
  ],
  EMAIL: [
    'Create an IMAP/SMTP credential for your support inbox',
    'Paste host, user and password in the channel config',
    'Verify the forwarding address',
    'Send a test email to confirm two-way sync',
  ],
  WEBCHAT: [
    'Copy the live-chat widget snippet',
    'Paste it before the closing body tag of your site',
    'Match the widget colors to your brand',
    'Open the widget and send a test chat',
  ],
}

export default function CrmChannels({ platformId }: { platformId: string }) {
  const { lang } = useApp()
  const { data, loading, refresh } = useApi<{ channels: CrmChannel[] }>('/api/reseller/crm/channels', [platformId])
  const channels = data?.channels ?? []

  const [busyId, setBusyId] = useState<string | null>(null)
  const [guide, setGuide] = useState<CrmChannel | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ type: 'WHATSAPP', name: '', handle: '' })

  async function toggle(c: CrmChannel) {
    const next = c.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED'
    setBusyId(c.id)
    await mutate(
      () => api.patch('/api/reseller/crm/channels', { id: c.id, status: next }),
      { success: next === 'CONNECTED' ? `${c.name} connected (simulated)` : `${c.name} disconnected` },
    )
    setBusyId(null)
    refresh()
  }

  async function create() {
    if (!form.name.trim()) return
    const res = await mutate(() => api.post('/api/reseller/crm/channels', form), {
      success: 'Channel created — connect it to go live',
    })
    if (res) {
      setCreateOpen(false)
      setForm({ type: 'WHATSAPP', name: '', handle: '' })
      refresh()
    }
  }

  async function remove(c: CrmChannel) {
    await mutate(() => api.del(`/api/reseller/crm/channels?id=${c.id}`), { success: `${c.name} deleted` })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title="Channels"
        description="Connect WhatsApp, Instagram, Telegram and more — every chat lands in one inbox."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> Add channel
          </Button>
        }
      />

      {loading && !data ? (
        <CardsSkeleton n={6} />
      ) : channels.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No channels connected"
          description="Add your first channel to start receiving customer conversations from every platform in a single inbox."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((c) => {
            const meta = channelMeta(c.type)
            const connected = c.status === 'CONNECTED'
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${meta.color}1a` }}
                  >
                    <ChannelIcon type={c.type} size={24} />
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-zinc-900 dark:text-zinc-50">{c.name}</h3>
                <p className="truncate text-[12.5px] text-zinc-500 dark:text-zinc-400">{c.handle ?? meta.label}</p>
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">Added {formatDate(c.createdAt, lang)}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
                  <Button
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => toggle(c)}
                    className={cn(
                      'h-8 flex-1 rounded-lg text-xs font-bold',
                      connected
                        ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                        : 'border-transparent text-[var(--on-brand)]',
                    )}
                    style={connected ? undefined : { background: 'var(--brand)' }}
                  >
                    {connected ? 'Disconnect' : 'Connect'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs font-bold"
                    onClick={() => setGuide(c)}
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Guide
                  </Button>
                  <ConfirmDelete
                    title={`Delete ${c.name}?`}
                    description="The channel will be removed from your workspace. Past conversations are kept."
                    onConfirm={() => remove(c)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Setup guide dialog */}
      <Dialog open={!!guide} onOpenChange={(o) => !o && setGuide(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              {guide && <ChannelIcon type={guide.type} size={20} />}
              {guide?.name} — setup guide
            </DialogTitle>
            <DialogDescription className="text-left">
              Follow these steps to link the channel. The demo environment simulates the handshake.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 py-1">
            {guide &&
              (GUIDE_STEPS[guide.type] ?? []).map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--on-brand)]"
                    style={{ background: 'var(--brand)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200">{step}</span>
                </li>
              ))}
          </ol>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setGuide(null)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a channel</DialogTitle>
            <DialogDescription>New channels start disconnected until you complete the handshake.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="ch-type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger id="ch-type" className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <ChannelIcon type={t} size={15} /> {channelMeta(t).label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-name">Name</Label>
              <Input
                id="ch-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="WhatsApp Business"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-handle">Handle</Label>
              <Input
                id="ch-handle"
                value={form.handle}
                onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                placeholder="+54 9 11 …  or @brand"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
              onClick={create}
              disabled={!form.name.trim()}
            >
              <Settings2 className="h-4 w-4" /> Create channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
