// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Channels — real omnichannel connection flow.
//
// · TELEGRAM: paste the BotFather token → validated live via Bot API getMe,
//   then install the webhook URL (copied from the connect dialog).
// · WHATSAPP: WhatsApp Cloud API credentials (access token + phone number ID)
//   → validated live against the Meta Graph API; webhook URL goes into the
//   Meta App dashboard. (A WhatsApp-Web QR link is not possible on serverless
//   hosting — the official Cloud API is the supported, ToS-compliant way.)
// · WEBCHAT: instant — the storefront gets a floating chat widget, messages
//   land in the Inbox automatically.
// · INSTAGRAM / MESSENGER / EMAIL: credentials stored, marked PENDING until
//   the provider review completes.

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Copy, Loader2, Plus, QrCode, Radio, RefreshCw, Settings2, ShieldAlert } from 'lucide-react'
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
import { useI18n } from '@/lib/i18n'
import {
  CHANNEL_TYPES,
  CardsSkeleton,
  ChannelIcon,
  ConfirmDelete,
  EmptyState,
  channelMeta,
  type CrmChannel,
} from './crm-shared'

/** Extended channel shape returned by the API (masked credentials + webhook URL). */
type ChannelView = CrmChannel & {
  configPreview?: Record<string, string | null>
  webhookUrl?: string | null
  webhookSecret?: string | null
}

// Which credentials each channel type asks for in the connect dialog.
const CRED_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  TELEGRAM: [{ key: 'botToken', label: 'Bot token', placeholder: '123456789:AAH…', secret: true }],
  WHATSAPP: [
    { key: 'accessToken', label: 'Access token (Meta)', placeholder: 'EAAG…', secret: true },
    { key: 'phoneNumberId', label: 'Phone number ID', placeholder: '106540352…' },
  ],
  MESSENGER: [{ key: 'accessToken', label: 'Page access token', placeholder: 'EAAG…', secret: true }],
  INSTAGRAM: [{ key: 'accessToken', label: 'Access token (Meta)', placeholder: 'EAAG…', secret: true }],
  EMAIL: [
    { key: 'email', label: 'Support inbox (IMAP)', placeholder: 'support@yourbrand.com' },
    { key: 'password', label: 'App password', placeholder: '••••••••', secret: true },
  ],
  WEBCHAT: [],
}

const GUIDE_STEPS: Record<string, string[]> = {
  WHATSAPP: [
    'Option A — Cloud API (business numbers): create a Meta developer app, add the "WhatsApp" product, then paste the access token + Phone Number ID here. Everything is validated live.',
    'Option B — QR link (any personal/business number): deploy your WhatsApp bridge once (Railway free tier, see Admin guide) and paste its URL in the QR tab.',
    'QR flow: press "Generate QR" → WhatsApp → Settings → Linked devices → scan.',
    'Both options deliver incoming chats straight into your Inbox; replies go out through the same channel.',
  ],
  INSTAGRAM: [
    'Switch your account to a Professional / Business account.',
    'Link the account to a Facebook Page and create a Meta app with the Instagram messaging permission.',
    'Paste the access token here and press Connect — it stays PENDING until Meta approves the app review.',
    'Once approved, set the webhook URL in the Meta dashboard and DMs land in your Inbox.',
  ],
  TELEGRAM: [
    'Talk to @BotFather on Telegram and run /newbot to create your bot.',
    'Paste the bot token here and press Connect — it is verified instantly with the Bot API.',
    'Copy the Webhook URL from the connect dialog.',
    'Send it to @BotFather with /setWebhook (or call setWebhook via API) — messages arrive in your Inbox right away.',
  ],
  MESSENGER: [
    'Open Meta Business Suite → Inbox settings and connect your Facebook Page.',
    'Create a Meta app and generate a Page access token with the messages permission.',
    'Paste the token here and press Connect (PENDING until app review).',
    'Point the app webhook to the URL in the connect dialog and Messenger chats reach your Inbox.',
  ],
  EMAIL: [
    'Create an app password for your support inbox (Gmail/Outlook → security settings).',
    'Paste the inbox address and the app password here, then press Connect.',
    'Configure forwarding (or an IMAP fetcher) so inbound mail is pushed to the webhook URL shown in the connect dialog.',
    'Every email becomes a contact + conversation in the Inbox.',
  ],
  WEBCHAT: [
    'Press Connect — no external credentials needed, the widget is built in.',
    'Open your storefront: a floating chat bubble appears automatically.',
    'Visitors write from the widget and the messages arrive in your Inbox as a conversation.',
    'Reply from the Inbox — answers are stored in the visitor thread.',
  ],
}

export default function CrmChannels({ platformId }: { platformId: string }) {
  const { lang } = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ channels: ChannelView[] }>('/api/reseller/crm/channels', [platformId])
  const channels = data?.channels ?? []

  const [busyId, setBusyId] = useState<string | null>(null)
  const [guide, setGuide] = useState<ChannelView | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ type: 'WHATSAPP', name: '', handle: '' })

  // connect dialog state
  const [connectTarget, setConnectTarget] = useState<ChannelView | null>(null)
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [connectError, setConnectError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // WhatsApp QR linking state (bridge mode)
  const [waMode, setWaMode] = useState<'cloud' | 'qr'>('cloud')
  const [bridgeUrl, setBridgeUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrState, setQrState] = useState<'idle' | 'loading' | 'waiting' | 'connected' | 'error'>('idle')
  const [qrError, setQrError] = useState<string | null>(null)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gr_wa_bridge')
      if (saved) setBridgeUrl(saved)
    } catch { /* ignore */ }
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
    }
  }, [])

  /** Ask the reseller's bridge for a fresh WhatsApp QR and poll until scanned. */
  async function generateQr() {
    if (!connectTarget) return
    const base = bridgeUrl.trim().replace(/\/+$/, '')
    if (!base) {
      setQrState('error')
      setQrError('Paste your bridge URL first (it must be public, e.g. https://your-bridge.up.railway.app)')
      return
    }
    try {
      localStorage.setItem('gr_wa_bridge', base)
    } catch { /* ignore */ }
    setQrState('loading')
    setQrError(null)
    setQrDataUrl(null)
    try {
      const res = await fetch(`${base}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: `wa-${connectTarget.id}` }),
      })
      const d = (await res.json().catch(() => ({}))) as { status?: string; qr?: string | null }
      if (d.qr) {
        setQrDataUrl(d.qr)
        setQrState('waiting')
      } else {
        setQrState('waiting')
      }
      // Poll until the phone scans it (or the dialog closes)
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      qrPollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${base}/session/wa-${connectTarget.id}`)
          const s = (await r.json().catch(() => ({}))) as { status?: string; qr?: string | null; user?: string }
          if (s.qr && s.status === 'qr') {
            setQrDataUrl(s.qr)
            setQrState('waiting')
          }
          if (s.status === 'connected') {
            setQrState('connected')
            if (qrPollRef.current) clearInterval(qrPollRef.current)
            // Auto-link the channel now that the bridge session is live
            await mutate(
              () => api.patch('/api/reseller/crm/channels', {
                id: connectTarget.id,
                action: 'connect',
                config: { mode: 'qr', bridgeUrl: base, bridgeSession: `wa-${connectTarget.id}` },
              }),
              { success: 'WhatsApp linked — incoming chats now land in your Inbox' },
            )
            refresh()
            setConnectTarget(null)
          }
        } catch { /* transient poll failure — keep trying */ }
      }, 2500)
    } catch {
      setQrState('error')
      setQrError('Could not reach the bridge — check the URL and that the service is online')
    }
  }

  /** Open the connect dialog (or connect instantly for WEBCHAT). */
  function openConnect(c: ChannelView) {
    if (c.status === 'CONNECTED') {
      // Disconnect instantly
      setBusyId(c.id)
      void mutate(
        () => api.patch('/api/reseller/crm/channels', { id: c.id, action: 'disconnect' }),
        { success: t('crm.disconnected').replace('{name}', c.name) },
      ).then(() => {
        setBusyId(null)
        refresh()
      })
      return
    }
    setConnectError(null)
    setCopied(false)
    setCreds({})
    setWaMode('cloud')
    setQrDataUrl(null)
    setQrState('idle')
    setQrError(null)
    setConnectTarget(c)
  }

  async function confirmConnect() {
    if (!connectTarget) return
    setBusyId(connectTarget.id)
    setConnectError(null)
    try {
      await api.patch('/api/reseller/crm/channels', {
        id: connectTarget.id,
        action: 'connect',
        config: creds,
      })
      refresh()
      setConnectTarget(null)
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setBusyId(null)
    }
  }

  async function create() {
    if (!form.name.trim()) return
    const res = await mutate(() => api.post('/api/reseller/crm/channels', form), {
      success: t('crm.chanCreated'),
    })
    if (res) {
      setCreateOpen(false)
      setForm({ type: 'WHATSAPP', name: '', handle: '' })
      refresh()
    }
  }

  async function remove(c: ChannelView) {
    await mutate(() => api.del(`/api/reseller/crm/channels?id=${c.id}`), { success: t('crm.deleted').replace('{name}', c.name) })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title={t('reseller.channels')}
        description={t('crm.chanDesc')}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> {t('crm.addChannel')}
          </Button>
        }
      />

      {loading && !data ? (
        <CardsSkeleton n={6} />
      ) : channels.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={t('crm.chanEmpty')}
          description={t('crm.chanEmptySub')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((c) => {
            const meta = channelMeta(c.type)
            const connected = c.status === 'CONNECTED'
            const pending = c.status === 'PENDING'
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
                {pending && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-3 w-3" /> {t('crm.pendingReview')}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{t('crm.added').replace('{x}', formatDate(c.createdAt, lang))}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
                  <Button
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => openConnect(c)}
                    className={cn(
                      'h-8 flex-1 rounded-lg text-xs font-bold',
                      connected
                        ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                        : 'border-transparent text-[var(--on-brand)]',
                    )}
                    style={connected ? undefined : { background: 'var(--brand)' }}
                  >
                    {busyId === c.id ? t('crm.connecting') : connected ? t('rfin.disconnectCta2') : t('rfin.connectCta')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs font-bold"
                    onClick={() => { setGuide(c); setConnectError(null) }}
                  >
                    <BookOpen className="h-3.5 w-3.5" /> {t('crm.guide')}
                  </Button>
                  <ConfirmDelete
                    title={t('crm.delQ').replace('{name}', c.name)}
                    description={t('crm.delChanDesc')}
                    onConfirm={() => remove(c)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Setup guide dialog — real provider steps, no fake QR promises */}
      <Dialog open={!!guide} onOpenChange={(o) => !o && setGuide(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              {guide && <ChannelIcon type={guide.type} size={20} />}
              {guide?.name} — {t('crm.guideWord')}
            </DialogTitle>
            <DialogDescription className="text-left">
              {t('crm.guideDesc')}
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
              {t('crm.gotIt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real connect dialog — credentials + live validation + webhook URL */}
      <Dialog open={!!connectTarget} onOpenChange={(o) => !o && setConnectTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              {connectTarget && <ChannelIcon type={connectTarget.type} size={20} />}
              {connectTarget?.name} — {t('crm.connectCtaTitle')}
            </DialogTitle>
            <DialogDescription className="text-left">
              {connectTarget?.type === 'WEBCHAT' ? t('crm.webchatConnectDesc') : t('crm.connectDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* WhatsApp: two real linking modes — Meta Cloud API or QR via the reseller's bridge */}
            {connectTarget?.type === 'WHATSAPP' && (
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 p-1">
                <button
                  type="button"
                  onClick={() => setWaMode('cloud')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
                    waMode === 'cloud' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  Cloud API (Meta)
                </button>
                <button
                  type="button"
                  onClick={() => setWaMode('qr')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[12px] font-bold transition flex items-center justify-center gap-1.5',
                    waMode === 'qr' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  <QrCode className="h-3.5 w-3.5" /> QR (WhatsApp Web)
                </button>
              </div>
            )}

            {connectTarget?.type === 'WHATSAPP' && waMode === 'qr' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-bridge">Bridge URL</Label>
                  <Input
                    id="wa-bridge"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="https://your-whatsapp-bridge.up.railway.app"
                    className="rounded-xl"
                    autoComplete="off"
                  />
                  <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                    Your own always-on WhatsApp bridge (free on Railway). It pairs the phone by QR and relays chats — the panel never stores your session.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-4">
                  {qrState === 'loading' && (
                    <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900/60">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  )}
                  {qrState === 'waiting' && qrDataUrl && (
                    <>
                      <img src={qrDataUrl} alt="WhatsApp QR — scan with Linked devices" className="h-48 w-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white" />
                      <p className="text-center text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
                        WhatsApp → Settings → Linked devices → scan. Linking automatically when connected…
                      </p>
                    </>
                  )}
                  {qrState === 'connected' && (
                    <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                      <Check className="h-8 w-8 text-emerald-500" />
                      <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">Phone linked!</p>
                    </div>
                  )}
                  {(qrState === 'idle' || qrState === 'error') && (
                    <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900/60">
                      <QrCode className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    </div>
                  )}
                  <Button
                    type="button"
                    className="rounded-xl text-[var(--on-brand)]"
                    style={{ background: 'var(--brand)' }}
                    onClick={generateQr}
                    disabled={qrState === 'loading'}
                  >
                    <RefreshCw className="h-4 w-4" /> {qrState === 'waiting' || qrState === 'connected' ? 'Generate new QR' : 'Generate QR'}
                  </Button>
                  {qrError && <p className="text-center text-[12px] font-semibold text-rose-500">{qrError}</p>}
                </div>
              </div>
            ) : (
            <>
            {(connectTarget ? CRED_FIELDS[connectTarget.type] ?? [] : []).map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`cred-${field.key}`}>{field.label}</Label>
                <Input
                  id={`cred-${field.key}`}
                  type={field.secret ? 'password' : 'text'}
                  value={creds[field.key] ?? ''}
                  onChange={(e) => setCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="rounded-xl"
                  autoComplete="off"
                />
              </div>
            ))}
            </>
            )}

            {/* Webhook URL — shown once credentials validate or already exist */}
            {connectTarget?.webhookUrl && connectTarget.type !== 'WEBCHAT' && (
              <div className="space-y-1.5 rounded-xl border border-dashed bg-zinc-50 dark:bg-zinc-900/60 p-3">
                <Label className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-white dark:bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                    {connectTarget.webhookUrl}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0 rounded-lg"
                    aria-label="Copy webhook URL"
                    onClick={() => {
                      void navigator.clipboard?.writeText(connectTarget.webhookUrl ?? '')
                      setCopied(true)
                    }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">{t('crm.webhookHint')}</p>
              </div>
            )}

            {connectError && (
              <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                {connectError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setConnectTarget(null)}>
              {t('common.cancel')}
            </Button>
            {!(connectTarget?.type === 'WHATSAPP' && waMode === 'qr') && (
              <Button
                className="rounded-xl text-[var(--on-brand)]"
                style={{ background: 'var(--brand)' }}
                onClick={confirmConnect}
                disabled={busyId === connectTarget?.id}
              >
                <Settings2 className="h-4 w-4" /> {busyId === connectTarget?.id ? t('crm.connecting') : t('crm.connectValidate')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('crm.addChan')}</DialogTitle>
            <DialogDescription>{t('crm.addChanDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="ch-type">{t('rcat.type')}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger id="ch-type" className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      <span className="flex items-center gap-2">
                        <ChannelIcon type={ct} size={15} /> {channelMeta(ct).label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-name">{t('rcat.name')}</Label>
              <Input
                id="ch-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="WhatsApp Business"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-handle">{t('crm.handle')}</Label>
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
              {t('common.cancel')}
            </Button>
            <Button
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
              onClick={create}
              disabled={!form.name.trim()}
            >
              <Settings2 className="h-4 w-4" /> {t('crm.createChan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
