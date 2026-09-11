'use client'

import { useEffect, useState } from 'react'
import {
  UsersRound, Plus, Trash2, Blocks, Check, Zap, ShieldBan, Settings2, Loader2, Lock,
  Mail, MessageCircle, Send, Globe, Sparkles, Bot, Gift, Trophy, Users, HandCoins,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { CopyField } from '@/components/shared/chips'
import { useApp } from '@/components/shared/app-context'
import { useApi, api, mutate } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatMoney, formatDate } from '@/lib/format'
import type { Lang } from '@/lib/i18n'

type Member = { id: string; name: string; email: string; role: string; status: string; permissions: string; lastLogin: string | null }
type BlItem = { id: string; type: string; value: string; note: string | null }
type LeaderRow = { id: string; name: string; email: string; refCount: number; earned: number; status: string }
type RecentRow = { id: string; name: string; createdAt: string; referrerName: string }
type ReferralsData = {
  leaderboard: LeaderRow[]
  recent: RecentRow[]
  totals: { referred: number; bonusPaid: number; ambassadors: number }
}

export default function ResellerAccount({ section, onRefresh }: { section: string; onRefresh: () => void }) {
  switch (section) {
    case 'team': return <Team />
    case 'referrals': return <Referrals />
    case 'settings': return <PlatformSettings onRefresh={onRefresh} />
    case 'integrations': return <Integrations />
    case 'blacklist': return <Blacklist />
    default: return null
  }
}

// ─────────────── Referrals (ambassador leaderboard) ───────────────

const MEDALS = ['#f59e0b', '#94a3b8', '#b45309'] // gold · silver · bronze

function Referrals() {
  const { t } = useI18n()
  const app = useApp()
  const currency = app.currencyOf(app.user.currency)
  const money = (v: number) => formatMoney(v, currency, app.lang as Lang)
  const { data, loading } = useApi<ReferralsData>('/api/reseller/referrals')

  // Live bonus amount from Admin → Settings → Referral program (falls back to $1)
  const bonusLabel = (() => {
    const raw = Number.parseFloat(app.publicSettings?.ref_bonus_amount ?? '1')
    const n = Number.isFinite(raw) && raw >= 0 ? raw : 1
    return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
  })()
  const howBody = t('reseller.ref.howBody').split('$1').join(bonusLabel)

  const maxRefs = Math.max(1, ...(data?.leaderboard.map((l) => l.refCount) ?? [1]))

  return (
    <>
      <PanelPageHeader
        title={t('reseller.ref.title')}
        description={t('reseller.ref.sub')}
        actions={
          <Badge variant="outline" className="gap-1 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
            <Zap className="h-3 w-3" /> {bonusLabel} {t('reseller.ref.earned')}
          </Badge>
        }
      />

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        {([
          { icon: Users, label: t('reseller.ref.referredUsers'), value: (data?.totals.referred ?? 0).toLocaleString(), tone: '#0d9488' },
          { icon: HandCoins, label: t('reseller.ref.bonusPaid'), value: money(data?.totals.bonusPaid ?? 0), tone: '#7c3aed' },
          { icon: Trophy, label: t('reseller.ref.activeReferrers'), value: String(data?.totals.ambassadors ?? 0), tone: '#e11d48' },
        ] as { icon: LucideIcon; label: string; value: string; tone: string }[]).map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-3 rounded-2xl border bg-white dark:bg-zinc-900 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${s.tone} 12%, transparent)` }}>
                <Icon className="h-4.5 w-4.5" style={{ color: s.tone }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{s.label}</p>
                <p className="text-xl font-black tracking-tight">{loading ? '…' : s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Leaderboard */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 lg:col-span-3">
          <div className="border-b p-4">
            <p className="flex items-center gap-1.5 text-sm font-extrabold"><Trophy className="h-4 w-4" style={{ color: 'var(--brand)' }} /> {t('reseller.ref.topReferrers')}</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('reseller.ref.topReferrersSub')}</p>
          </div>
          <div className="divide-y">
            {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="m-3 h-12 rounded-xl" />)}
            {!loading && (data?.leaderboard ?? []).length === 0 && (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800"><Gift className="h-5 w-5 text-zinc-400 dark:text-zinc-500" /></span>
                <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{t('reseller.ref.empty')}</p>
              </div>
            )}
            {(data?.leaderboard ?? []).map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
                  style={{ background: i < 3 ? MEDALS[i] : 'color-mix(in srgb, var(--brand) 14%, transparent)', color: i < 3 ? 'white' : 'var(--brand)' }}
                >
                  {i + 1}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                  {l.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{l.name}</p>
                  <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{l.email}</p>
                </div>
                <div className="hidden min-w-0 flex-1 sm:block">
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(8, (l.refCount / maxRefs) * 100)}%`, background: 'var(--brand)' }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="whitespace-nowrap text-[13px] font-extrabold">{l.refCount} {t('reseller.ref.referrals')}</p>
                  <p className="whitespace-nowrap text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{money(l.earned)} {t('reseller.ref.earned')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Recent signups */}
          <div className="rounded-2xl border bg-white dark:bg-zinc-900">
            <div className="border-b p-4">
              <p className="text-sm font-extrabold">{t('reseller.ref.recent')}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('reseller.ref.recentSub')}</p>
            </div>
            <div className="max-h-72 divide-y overflow-y-auto gr-scroll">
              {(data?.recent ?? []).map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400">
                    {r.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold">{r.name}</p>
                    <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{t('reseller.ref.joinedVia')} {r.referrerName}</p>
                  </div>
                  <span className="shrink-0 text-[10.5px] text-zinc-400 dark:text-zinc-500">{formatDate(r.createdAt, app.lang as Lang)}</span>
                </div>
              ))}
              {!loading && (data?.recent ?? []).length === 0 && (
                <p className="p-6 text-center text-[12.5px] text-zinc-400 dark:text-zinc-500">{t('reseller.ref.empty')}</p>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-dark, var(--brand)))' }}>
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <p className="flex items-center gap-1.5 text-sm font-extrabold"><Sparkles className="h-4 w-4" /> {t('reseller.ref.howTitle')}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/85">{howBody}</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────── Team ───────────────

const ROLES = ['ADMIN', 'SUPPORT', 'FINANCE', 'CONTENT', 'CRM'] as const

function Team() {
  const { data, loading, refresh } = useApi<{ team: Member[] }>('/api/reseller/team')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'SUPPORT' })
  const [deleteM, setDeleteM] = useState<Member | null>(null)

  const add = async () => {
    const res = await mutate(() => api.post('/api/reseller/team', form), { success: 'Team member invited ✅' })
    if (res) { setAddOpen(false); setForm({ name: '', email: '', role: 'SUPPORT' }); refresh() }
  }

  const toggle = async (m: Member) => {
    await mutate(() => api.patch('/api/reseller/team', { id: m.id, status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }), { success: 'Updated' })
    refresh()
  }

  return (
    <>
      <PanelPageHeader
        title="Team"
        description="Hire help without handing over the keys — each role only sees what it should."
        actions={
          <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add member
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        {(data?.team ?? []).map((m) => (
          <div key={m.id} className="group rounded-2xl border bg-white dark:bg-zinc-900 p-5 transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                {m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <Switch checked={m.status === 'ACTIVE'} onCheckedChange={() => toggle(m)} />
            </div>
            <p className="mt-3 text-sm font-extrabold">{m.name}</p>
            <p className="truncate text-[12px] text-zinc-400 dark:text-zinc-500">{m.email}</p>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-extrabold">{m.role}</Badge>
              <span className={`text-[10px] font-bold ${m.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {m.status === 'ACTIVE' ? '● Active' : '○ Suspended'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(JSON.parse(m.permissions || '[]') as string[]).map((p) => (
                <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 h-7 w-full text-[11px] text-rose-500 opacity-0 transition group-hover:opacity-100" onClick={() => setDeleteM(m)}>
              <Trash2 className="mr-1 h-3 w-3" /> Remove
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Role determines what sections this member can access.</p>
            </div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!form.name.trim() || !form.email.trim()} onClick={add}>
              Send invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteM} onOpenChange={(o) => !o && setDeleteM(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove {deleteM?.name}?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                if (!deleteM) return
                await fetch('/api/reseller/team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteM.id }) })
                setDeleteM(null); refresh()
              }}
            >Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─────────────── Platform Settings ───────────────

function PlatformSettings({ onRefresh }: { onRefresh: () => void }) {
  const app = useApp()
  const platform = app.user.platform
  const [name, setName] = useState(platform?.name ?? '')
  const [currency, setCurrency] = useState(platform?.currency ?? 'USD')
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwBusy, setPwBusy] = useState(false)

  const saveBranding = async () => {
    setSaving(true)
    const res = await mutate(() => api.patch('/api/platform/mine', { name, currency }), { success: 'Settings saved ✅' })
    setSaving(false)
    if (res) { app.refresh(); onRefresh() }
  }

  const changePassword = async () => {
    setPwBusy(true)
    const res = await mutate(() => api.patch('/api/me', { currentPassword: pw.current, newPassword: pw.next }), { success: 'Password changed 🔒' })
    setPwBusy(false)
    if (res) setPw({ current: '', next: '' })
  }

  return (
    <>
      <PanelPageHeader title="Settings" description="Platform and account preferences" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
          <p className="flex items-center gap-2 text-sm font-extrabold"><Settings2 className="h-4 w-4" style={{ color: 'var(--brand)' }} /> Platform</p>
          <div className="mt-4 space-y-3.5">
            <div className="space-y-1.5">
              <Label>Platform name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Storefront currency (base)</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {app.currencies.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Clients can still view prices in their own currency (multi-currency conversion).</p>
            </div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={saving} onClick={saveBranding}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save platform settings
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm font-extrabold">Security</p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
              <Button variant="outline" className="w-full font-bold" disabled={pwBusy || !pw.current || pw.next.length < 6} onClick={changePassword}>
                {pwBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '🔒'} Change password
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm font-extrabold">Two-factor authentication</p>
            <div className="mt-3 flex items-center justify-between rounded-xl border bg-zinc-50 dark:bg-zinc-900/60 p-3.5">
              <div>
                <p className="text-[13px] font-bold">2FA (email codes)</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Extra security layer at login</p>
              </div>
              <Switch
                checked={app.user.twoFactorEnabled}
                onCheckedChange={async (v) => {
                  const res = await mutate(() => api.patch('/api/me', { twoFactorEnabled: v }), { success: v ? '2FA enabled 🔐' : '2FA disabled' })
                  if (res) app.refresh()
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────── Integrations ───────────────

type Integ = { connected: boolean; keyMasked?: string }

function Integrations() {
  const app = useApp()
  const { data, loading, refresh } = useApi<{ integrations: Record<string, Integ>; meta: Record<string, { name: string; desc: string; requiresExternalApi?: boolean }>; externalApi: boolean }>('/api/reseller/integrations')
  const [connectKey, setConnectKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')

  if (loading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>

  const meta = data?.meta ?? {}
  const integrations = data?.integrations ?? {}

  const icons: Record<string, React.ReactNode> = {
    meta: <Globe className="h-5 w-5" />, telegram: <Send className="h-5 w-5" />, smtp: <Mail className="h-5 w-5" />,
    openai: <Sparkles className="h-5 w-5" />, claude: <Bot className="h-5 w-5" />, gemini: <Zap className="h-5 w-5" />,
    customProvider: <Blocks className="h-5 w-5" />, conversionApi: <Globe className="h-5 w-5" />,
  }

  const toggle = async (key: string, connected: boolean, apiKey?: string) => {
    const res = await mutate(() => api.patch('/api/reseller/integrations', { key, connected, apiKey }), {
      success: connected ? `${meta[key]?.name} connected ✅` : `${meta[key]?.name} disconnected`,
    })
    if (res) { refresh(); setConnectKey(null); setApiKeyInput('') }
  }

  return (
    <>
      <PanelPageHeader title="Integrations" description="Connect the APIs your panel needs — each with its own step-by-step guide." />
      {!data?.externalApi && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50 dark:bg-violet-950/40 p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <p className="text-[13px] font-extrabold text-violet-900">External API add-on required for some integrations</p>
            <p className="mt-0.5 text-[12px] text-violet-700 dark:text-violet-400">Custom SMM providers and conversion APIs cost extra per month. Enable the add-on from Plan & Billing.</p>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(meta).map(([key, m]) => {
          const integ = integrations[key]
          const locked = m.requiresExternalApi && !data?.externalApi
          return (
            <div key={key} className={`rounded-2xl border bg-white dark:bg-zinc-900 p-5 ${locked ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300">{icons[key] ?? <Blocks className="h-5 w-5" />}</span>
                {locked ? (
                  <Badge variant="outline" className="text-[10px]"><Lock className="mr-1 h-2.5 w-2.5" />ADD-ON</Badge>
                ) : integ?.connected ? (
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">CONNECTED</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-zinc-400 dark:text-zinc-500">NOT CONNECTED</Badge>
                )}
              </div>
              <p className="mt-3 text-sm font-extrabold">{m.name}</p>
              <p className="mt-0.5 min-h-8 text-[12px] text-zinc-500 dark:text-zinc-400">{m.desc}</p>
              {integ?.connected && integ.keyMasked && (
                <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">Key: {integ.keyMasked}</p>
              )}
              <div className="mt-3">
                {locked ? (
                  <Button variant="outline" size="sm" className="w-full font-bold" disabled>Requires add-on</Button>
                ) : integ?.connected ? (
                  <Button variant="outline" size="sm" className="w-full font-bold text-rose-600 dark:text-rose-400" onClick={() => toggle(key, false)}>Disconnect</Button>
                ) : (
                  <Button size="sm" className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => setConnectKey(key)}>Connect</Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!connectKey} onOpenChange={(o) => !o && setConnectKey(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Connect {connectKey ? meta[connectKey]?.name : ''}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <ol className="space-y-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              <li>1. Create an API key in the provider dashboard.</li>
              <li>2. Paste it below — we store it encrypted.</li>
              <li>3. Toggle the integration to start using it.</li>
            </ol>
            <div className="space-y-1.5"><Label>API key</Label><Input placeholder="paste your key" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} /></div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!apiKeyInput.trim()} onClick={() => connectKey && toggle(connectKey, true, apiKeyInput)}>
              <Check className="mr-1.5 h-4 w-4" /> Connect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────── Blacklist ───────────────

function Blacklist() {
  const { data, loading, refresh } = useApi<{ blacklist: BlItem[] }>('/api/reseller/blacklist')
  const [form, setForm] = useState({ type: 'EMAIL', value: '', note: '' })

  const add = async () => {
    const res = await mutate(() => api.post('/api/reseller/blacklist', form), { success: 'Added to blacklist 🚫' })
    if (res) { setForm({ type: 'EMAIL', value: '', note: '' }); refresh() }
  }

  const remove = async (id: string) => {
    await fetch('/api/reseller/blacklist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    refresh()
  }

  return (
    <>
      <PanelPageHeader title="Blacklist" description="Block abusive emails, domains, IPs or chat keywords." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
          <p className="text-sm font-extrabold">Add entry</p>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email / domain pattern</SelectItem>
                  <SelectItem value="DOMAIN">Domain</SelectItem>
                  <SelectItem value="IP">IP address</SelectItem>
                  <SelectItem value="KEYWORD">Chat keyword</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Value</Label><Input placeholder="*@spam.com or 1.2.3.4" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Note (optional)</Label><Input placeholder="reason" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!form.value.trim()} onClick={add}>
              <ShieldBan className="mr-1.5 h-4 w-4" /> Blacklist
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900 lg:col-span-2">
          <div className="divide-y">
            {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>)}
            {(data?.blacklist ?? []).map((b) => (
              <div key={b.id} className="group flex items-center gap-3 px-4 py-3">
                <Badge variant="outline" className="w-20 justify-center text-[10px] font-extrabold">{b.type}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12px] font-bold">{b.value}</p>
                  {b.note && <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{b.note}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 opacity-0 transition group-hover:opacity-100" onClick={() => remove(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!(data?.blacklist ?? []).length && (
              <div className="p-10 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">Blacklist empty — add patterns to auto-flag abuse.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

void UsersRound
