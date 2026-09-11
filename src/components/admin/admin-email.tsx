'use client'

// GrowthRush — Super Admin → Email & Notifications (Task 2-d)
// Provider (outbox demo / SMTP), templates editor with live preview, and delivery logs.

import { useMemo, useState } from 'react'
import {
  Mail, Save, Send, RefreshCw, RotateCcw, Eye, Inbox, Server, ShieldCheck,
  CheckCircle2, XCircle, CircleDashed, FileCode2,
} from 'lucide-react'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { useApi, api, mutate } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/format'

type MailConfigDTO = {
  mode: 'outbox' | 'smtp'
  host: string; port: string; user: string; pass: string
  secure: string; from: string; fromName: string
}
type StatsDTO = { sent: number; failed: number; outbox: number; last7d: { date: string; sent: number; failed: number; outbox: number }[] }
type TemplateDTO = { key: string; label: string; subject: string; body: string; updatedAt: string | null; overridden: boolean }
type LogDTO = { id: string; to: string; subject: string; template: string | null; status: string; error: string | null; createdAt: string }

const EMPTY_CFG: MailConfigDTO = { mode: 'outbox', host: '', port: '587', user: '', pass: '', secure: '0', from: '', fromName: '' }

/** PUT helper (src/lib/api.ts has no put) */
async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  return data as T
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
    SENT: { cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60', Icon: CheckCircle2 },
    FAILED: { cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60', Icon: XCircle },
    OUTBOX: { cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60', Icon: CircleDashed },
  }
  const it = map[status] ?? map.OUTBOX
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${it.cls}`}>
      <it.Icon className="h-3 w-3" /> {status}
    </span>
  )
}

export default function EmailSection() {
  const [tab, setTab] = useState('provider')

  return (
    <>
      <PanelPageHeader
        title="Email & Notifications"
        description="Provider setup, automated email templates and delivery logs for GrowthRush."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="provider" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Provider</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileCode2 className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="provider"><ProviderTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </>
  )
}

// ─────────────────────────── Provider ───────────────────────────

function ProviderTab() {
  const { data, loading, refresh } = useApi<{ config: MailConfigDTO; verificationRequired: boolean; stats: StatsDTO }>('/api/admin/email')
  const [ov, setOv] = useState<{ cfg?: Partial<MailConfigDTO>; verify?: boolean }>({})
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [sending, setSending] = useState(false)

  const cfg = data?.config
  const form: MailConfigDTO = { ...EMPTY_CFG, ...(cfg ?? {}), ...(ov.cfg ?? {}) }
  const setForm = (patch: Partial<MailConfigDTO>) => setOv((o) => ({ ...o, cfg: { ...(o.cfg ?? {}), ...patch } }))
  const verify = ov.verify ?? data?.verificationRequired ?? false

  const save = async () => {
    setSaving(true)
    const res = await mutate(
      () => api.patch('/api/admin/email', { config: form }),
      { success: 'Email settings saved' },
    )
    setSaving(false)
    if (res) refresh()
  }

  const toggleVerify = async (v: boolean) => {
    setOv((o) => ({ ...o, verify: v }))
    await mutate(
      () => api.patch('/api/admin/email', { verification_required: v ? '1' : '0' }),
      { success: v ? 'Email verification enabled for new signups' : 'Email verification disabled' },
    )
    refresh()
  }

  const sendTest = async () => {
    if (!testTo.trim()) { toast({ title: 'Enter a destination email', variant: 'destructive' }); return }
    setSending(true)
    const res = await mutate(
      () => api.post<{ status: string; message: string }>('/api/admin/email', { to: testTo.trim() }),
      {},
    )
    setSending(false)
    if (res) {
      toast({ title: res.status === 'FAILED' ? 'SMTP send failed' : `Test email — ${res.status}`, description: res.message, variant: res.status === 'FAILED' ? 'destructive' : 'default' })
      refresh()
    }
  }

  if (loading && !data) {
    return <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Mode cards */}
      <div className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button" onClick={() => setForm({ mode: 'outbox' })}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${form.mode === 'outbox' ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,white)] dark:bg-[color-mix(in_srgb,var(--brand)_10%,#18181b)]' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"><Inbox className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" /></span>
            <p className="mt-2.5 text-[14px] font-extrabold">Outbox demo</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">Emails are recorded in Logs — perfect for testing without a mail server.</p>
          </button>
          <button
            type="button" onClick={() => setForm({ mode: 'smtp' })}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${form.mode === 'smtp' ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,white)] dark:bg-[color-mix(in_srgb,var(--brand)_10%,#18181b)]' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"><Server className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" /></span>
            <p className="mt-2.5 text-[14px] font-extrabold">SMTP server</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">Send real emails through your own provider (Gmail, Resend, SendGrid…).</p>
          </button>
        </div>

        {form.mode === 'smtp' && (
          <div className="mt-3 rounded-2xl border bg-white dark:bg-zinc-900 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold">SMTP host</Label>
                <Input value={form.host} onChange={(e) => setForm({ host: e.target.value })} placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold">Port</Label>
                <Input value={form.port} onChange={(e) => setForm({ port: e.target.value })} placeholder="587" inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold">Username</Label>
                <Input value={form.user} onChange={(e) => setForm({ user: e.target.value })} placeholder="you@gmail.com" autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold">Password / app key</Label>
                <Input type="password" value={form.pass} onChange={(e) => setForm({ pass: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Use port 465 with TLS below (or 587 for STARTTLS).</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold">From name</Label>
                <Input value={form.fromName} onChange={(e) => setForm({ fromName: e.target.value })} placeholder="GrowthRush" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold">From address</Label>
                <Input value={form.from} onChange={(e) => setForm({ from: e.target.value })} placeholder="hello@growthrush.io" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border bg-zinc-50 dark:bg-zinc-900/60 px-3.5 py-3">
              <div>
                <p className="text-[13px] font-bold">Use TLS (implicit, port 465)</p>
                <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">Turn off if your provider uses STARTTLS on 587.</p>
              </div>
              <Switch checked={form.secure === '1'} onCheckedChange={(v) => setForm({ secure: v ? '1' : '0' })} />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={saving} className="text-[var(--on-brand)] font-bold" style={{ background: 'var(--brand)' }}>
            <Save className="mr-1.5 h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
          </Button>
          <div className="flex flex-1 items-center gap-2 sm:min-w-[320px]">
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send a test email to…" type="email" className="flex-1" />
            <Button variant="outline" onClick={sendTest} disabled={sending} className="font-bold">
              <Send className="mr-1.5 h-4 w-4" /> {sending ? 'Sending…' : 'Send test'}
            </Button>
          </div>
        </div>
      </div>

      {/* Verification + quick stats */}
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-[var(--brand)]/60 bg-[color-mix(in_srgb,var(--brand)_7%,white)] dark:bg-[color-mix(in_srgb,var(--brand)_10%,#18181b)] p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <ShieldCheck className="h-4.5 w-4.5 text-black" />
          </span>
          <p className="mt-2.5 text-[14px] font-extrabold">Require email verification for new signups</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">New accounts receive a 6-digit code and must confirm it before their first login. Codes expire after 15 minutes.</p>
          <div className="mt-3 flex items-center justify-between rounded-xl border bg-white/70 dark:bg-zinc-900/70 px-3.5 py-2.5">
            <span className="text-[13px] font-bold">{verify ? 'Verification is ON' : 'Verification is OFF'}</span>
            <Switch checked={verify} onCheckedChange={toggleVerify} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sent', value: data?.stats.sent ?? 0, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Failed', value: data?.stats.failed ?? 0, cls: 'text-rose-600 dark:text-rose-400' },
            { label: 'Outbox', value: data?.stats.outbox ?? 0, cls: 'text-amber-600 dark:text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-white dark:bg-zinc-900 p-3 text-center">
              <p className={`text-xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────── Templates ───────────────────────────

function TemplatesTab() {
  const { data, loading, refresh } = useApi<{ templates: TemplateDTO[] }>('/api/admin/email/templates')
  const [editing, setEditing] = useState<TemplateDTO | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)

  const openEdit = (t: TemplateDTO) => {
    setEditing(t)
    setSubject(t.subject)
    setBody(t.body)
    setPreview(false)
  }

  const save = async () => {
    if (!editing) return
    setBusy(true)
    const res = await mutate(
      () => apiPut('/api/admin/email/templates', { key: editing.key, subject, body }),
      { success: 'Template saved' },
    )
    setBusy(false)
    if (res) { setEditing(null); refresh() }
  }

  const reset = async (t: TemplateDTO) => {
    setBusy(true)
    const res = await mutate(
      () => apiPut('/api/admin/email/templates', { key: t.key, reset: true }),
      { success: 'Template reset to default' },
    )
    setBusy(false)
    if (res) { setEditing(null); refresh() }
  }

  const list = data?.templates ?? []

  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-[14px] font-extrabold">Email templates</p>
          <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">Personalize the automated emails. Variables: {'{{name}} {{email}} {{code}} {{platform}} {{service}} {{quantity}} {{amount}} {{link}}'}</p>
        </div>
      </div>
      <div className="divide-y">
        {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="m-3 h-12 rounded-xl" />)}
        {list.map((t) => (
          <div key={t.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <FileCode2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-extrabold">
                {t.label}
                <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{t.key}</code>
                {t.overridden && <Badge className="bg-[color-mix(in_srgb,var(--brand)_18%,transparent)] text-[10px] font-extrabold" style={{ color: 'var(--brand)' }}>CUSTOM</Badge>}
              </p>
              <p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">{t.subject}</p>
            </div>
            <span className="hidden text-[11.5px] text-zinc-400 dark:text-zinc-500 sm:block">{t.updatedAt ? `Updated ${formatDateTime(t.updatedAt)}` : 'Default'}</span>
            {t.overridden && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-[12px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => reset(t)} disabled={busy}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 font-bold" onClick={() => openEdit(t)}>
              Edit
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Edit template — {editing?.label}</DialogTitle>
            <DialogDescription>
              HTML body with inline styles. Variables: {'{{name}} {{email}} {{code}} {{platform}} {{service}} {{quantity}} {{amount}} {{link}}'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-bold">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            {preview ? (
              <iframe title="Email preview" srcDoc={body} sandbox="" className="h-72 w-full rounded-xl border bg-white" />
            ) : (
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-mono text-[12px]" />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" size="sm" className="font-bold" onClick={() => setPreview((p) => !p)}>
                <Eye className="mr-1.5 h-3.5 w-3.5" /> {preview ? 'Edit HTML' : 'Preview'}
              </Button>
              <div className="flex items-center gap-2">
                {editing?.overridden && (
                  <Button variant="ghost" size="sm" className="font-bold text-zinc-500" onClick={() => editing && reset(editing)} disabled={busy}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to default
                  </Button>
                )}
                <Button onClick={save} disabled={busy} className="text-[var(--on-brand)] font-bold" style={{ background: 'var(--brand)' }}>
                  <Save className="mr-1.5 h-4 w-4" /> {busy ? 'Saving…' : 'Save template'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────── Logs ───────────────────────────

function LogsTab() {
  const { data, loading, refresh } = useApi<{ logs: LogDTO[] }>('/api/admin/email/logs?take=150')
  const stats = useMemo(() => {
    const s = { sent: 0, failed: 0, outbox: 0 }
    for (const l of data?.logs ?? []) {
      if (l.status === 'SENT') s.sent++
      else if (l.status === 'FAILED') s.failed++
      else s.outbox++
    }
    return s
  }, [data])

  const logs = data?.logs ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Sent (loaded)', value: stats.sent, cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Failed (loaded)', value: stats.failed, cls: 'text-rose-600 dark:text-rose-400' },
          { label: 'Outbox (loaded)', value: stats.outbox, cls: 'text-amber-600 dark:text-amber-400' },
          { label: 'Total (loaded)', value: logs.length, cls: 'text-zinc-800 dark:text-zinc-100' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border bg-white dark:bg-zinc-900 p-4">
            <p className={`text-2xl font-extrabold ${c.cls}`}>{c.value}</p>
            <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-[14px] font-extrabold">Delivery logs</p>
          <Button variant="outline" size="sm" className="h-8 font-bold" onClick={() => refresh()}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        <div className="gr-scroll max-h-96 overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-bold">Time</th>
                <th className="px-4 py-2.5 font-bold">To</th>
                <th className="px-4 py-2.5 font-bold">Subject</th>
                <th className="px-4 py-2.5 font-bold">Template</th>
                <th className="px-4 py-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && !logs.length && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-2"><Skeleton className="h-6 rounded-md" /></td></tr>
                ))
              )}
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-zinc-500 dark:text-zinc-400">{formatDateTime(l.createdAt)}</td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 font-semibold">{l.to}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-zinc-600 dark:text-zinc-300">{l.subject}</td>
                  <td className="px-4 py-2.5"><code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400">{l.template ?? '—'}</code></td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={l.status} />
                    {l.error && <p className="mt-1 max-w-[220px] truncate text-[10.5px] text-rose-500" title={l.error}>{l.error}</p>}
                  </td>
                </tr>
              ))}
              {!loading && !logs.length && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px] text-zinc-400 dark:text-zinc-500">No emails yet — they will appear here as your panel sends them.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
