'use client'

// Super Admin — Payment gateways: the 6 platform providers (PayPal, MercadoPago,
// Pix, Cryptomus, CoinPayments, Payoneer) with API credential configuration +
// generic methods (card/bank/manual). Secrets are masked by the API and only
// edited fields are ever sent back, so masked values never overwrite real keys.

import { useState } from 'react'
import {
  Plus, Pencil, Trash2, CreditCard, Wallet, Bitcoin, Landmark, PenLine,
  QrCode, Coins, KeyRound, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { GATEWAY_PROVIDERS, PROVIDER_CODES } from '@/lib/gateways'
import { apiDel } from './admin-ui'
import { FieldLabel, type AdminGateway } from './admin-ui'

const TYPE_ICONS: Record<string, typeof CreditCard> = {
  CARD: CreditCard, PAYPAL: Wallet, CRYPTO: Bitcoin, BANK: Landmark, MANUAL: PenLine,
  PIX: QrCode, COINPAYMENT: Coins,
}
const GATEWAY_TYPES = ['CARD', 'PAYPAL', 'CRYPTO', 'BANK', 'MANUAL']

type GwForm = {
  name: string
  type: string
  code: string // provider code or 'CUSTOM'
  feePercent: string
  instructions: string
  enabled: boolean
  sortOrder: string
  values: Record<string, string>
  touched: Record<string, boolean>
}

const EMPTY: GwForm = {
  name: '', type: 'CARD', code: 'CUSTOM', feePercent: '0', instructions: '', enabled: true, sortOrder: '0',
  values: {}, touched: {},
}

export function GatewaysSection() {
  const { data, loading, refresh } = useApi<{ gateways: AdminGateway[] }>('/api/admin/gateways')
  const [editing, setEditing] = useState<AdminGateway | 'new' | null>(null)
  const [form, setForm] = useState<GwForm>(EMPTY)
  const [deleting, setDeleting] = useState<AdminGateway | null>(null)
  const [saving, setSaving] = useState(false)

  const toggle = async (g: AdminGateway, enabled: boolean) => {
    const ok = await mutate(() => api.patch('/api/admin/gateways', { id: g.id, enabled }), { success: enabled ? 'Gateway enabled' : 'Gateway disabled' })
    if (ok) refresh()
  }

  const openEdit = (g: AdminGateway) => {
    const provider = g.code ? GATEWAY_PROVIDERS[g.code] : null
    const values: Record<string, string> = {}
    const touched: Record<string, boolean> = {}
    if (provider) {
      for (const f of provider.fields) {
        values[f.key] = g.config?.[f.key] ?? (f.kind === 'select' ? f.options?.[0] ?? '' : '')
        if (f.kind === 'select') touched[f.key] = true
      }
    }
    setForm({
      name: g.name, type: g.type, code: g.code ?? 'CUSTOM', feePercent: String(g.feePercent),
      instructions: g.instructions ?? '', enabled: g.enabled, sortOrder: String(g.sortOrder), values, touched,
    })
    setEditing(g)
  }

  const pickProvider = (code: string) => {
    if (code === 'CUSTOM') { setForm({ ...EMPTY, code }); return }
    const provider = GATEWAY_PROVIDERS[code]
    const values: Record<string, string> = {}
    const touched: Record<string, boolean> = {}
    for (const f of provider.fields) {
      values[f.key] = f.kind === 'select' ? f.options?.[0] ?? '' : ''
      if (f.kind === 'select') touched[f.key] = true
    }
    setForm({ ...EMPTY, code, name: provider.name, type: code === 'CRYPTOMUS' || code === 'COINPAYMENT' ? 'CRYPTO' : code === 'PAYPAL' ? 'PAYPAL' : code === 'PIX' ? 'BANK' : 'CARD', values, touched })
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      code: form.code === 'CUSTOM' ? null : form.code,
      feePercent: parseFloat(form.feePercent) || 0,
      instructions: form.instructions.trim() || null,
      enabled: form.enabled,
      sortOrder: parseInt(form.sortOrder) || 0,
    }
    if (form.code !== 'CUSTOM') {
      // only send touched fields (+ selects) so masked values never overwrite real credentials
      const config: Record<string, string> = {}
      for (const f of GATEWAY_PROVIDERS[form.code].fields) {
        if (form.touched[f.key]) config[f.key] = form.values[f.key] ?? ''
      }
      payload.config = config
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/gateways', payload) : api.patch('/api/admin/gateways', { id: (editing as AdminGateway).id, ...payload }),
      { success: editing === 'new' ? 'Gateway created' : 'Gateway updated' },
    )
    setSaving(false)
    if (ok) { setEditing(null); refresh() }
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/gateways', { id: deleting.id }), { success: 'Gateway deleted' })
    if (ok) { setDeleting(null); refresh() }
  }

  const providerOfForm = form.code !== 'CUSTOM' ? GATEWAY_PROVIDERS[form.code] : null

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title="Payment gateways"
        description="Methods users see when adding funds. Configure provider API credentials here; resellers configure their own in their panel. Gateways with credentials run real provider checkout (redirect + webhook auto-credit); those without work as manual review deposits."
        actions={
          <Button onClick={() => { setForm(EMPTY); setEditing('new') }} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> New gateway
          </Button>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.gateways.map((g) => {
            const Icon = TYPE_ICONS[g.type] ?? CreditCard
            const provider = g.code ? GATEWAY_PROVIDERS[g.code] : null
            const configured = provider ? Object.keys(g.config ?? {}).length > 0 : true
            return (
              <div key={g.id} className={`flex flex-col rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md ${g.enabled ? 'border-zinc-200 dark:border-zinc-800' : 'border-dashed border-zinc-300 dark:border-zinc-700 opacity-75'}`}>
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)' }}>
                    <Icon className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch checked={g.enabled} onCheckedChange={(c) => toggle(g, c)} aria-label={`Toggle ${g.name}`} />
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(g)} aria-label={`Edit ${g.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(g)} aria-label={`Delete ${g.name}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="mt-3 flex items-center gap-2 text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50">
                  {g.name}
                  {provider && (
                    <Badge variant="outline" className={`gap-1 px-1.5 py-0 text-[9.5px] font-black ${configured ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400' : 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400'}`}>
                      <KeyRound className="h-2.5 w-2.5" /> {configured ? 'API OK' : 'NO API'}
                    </Badge>
                  )}
                </h3>
                <p className="text-[11.5px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{g.type.replace(/_/g, ' ')}{provider ? ` · ${provider.tagline}` : ''}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {g.instructions || (provider && !configured ? 'Configure the provider API credentials to accept payments.' : 'No payment instructions yet.')}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/70 pt-3 text-[12px]">
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400">Fee</span>
                  <span className="font-extrabold text-zinc-800 dark:text-zinc-100">{g.feePercent}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New gateway' : `Edit ${editing === null ? '' : (editing as AdminGateway).name}`}</DialogTitle>
            <DialogDescription>
              {providerOfForm ? `Configure the ${providerOfForm.name} API credentials (stored encrypted, shown masked).` : 'Instructions are shown to users on the Add Funds screen.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel hint="provider or custom">Provider</FieldLabel>
              <Select value={form.code} onValueChange={pickProvider} disabled={editing !== 'new'}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_CODES.map((c) => <SelectItem key={c} value={c}>{GATEWAY_PROVIDERS[c].name}</SelectItem>)}
                  <SelectItem value="CUSTOM">Custom / manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><FieldLabel>Name</FieldLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. USDT (TRC20)" /></div>

            {/* Provider credential fields */}
            {providerOfForm && (
              <div className="space-y-3 rounded-xl border border-dashed p-3">
                {providerOfForm.fields.map((f) => (
                  <div key={f.key}>
                    <Label className="text-[12.5px] font-bold">{f.label}{f.secret && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">secret</span>}</Label>
                    {f.kind === 'select' ? (
                      <Select value={form.values[f.key] ?? ''} onValueChange={(v) => setForm({ ...form, values: { ...form.values, [f.key]: v }, touched: { ...form.touched, [f.key]: true } })}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={f.secret ? 'password' : 'text'}
                        className="mt-1" autoComplete="off"
                        placeholder={f.placeholder}
                        value={form.values[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, values: { ...form.values, [f.key]: e.target.value }, touched: { ...form.touched, [f.key]: true } })}
                      />
                    )}
                    {f.hint && <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{f.hint}</p>}
                  </div>
                ))}
              </div>
            )}

            {form.code === 'CUSTOM' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GATEWAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><FieldLabel>Fee %</FieldLabel><Input type="number" step="0.1" value={form.feePercent} onChange={(e) => setForm({ ...form, feePercent: e.target.value })} /></div>
                <div><FieldLabel>Sort</FieldLabel><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></div>
              </div>
            )}
            <div>
              <FieldLabel hint="shown at checkout">Instructions</FieldLabel>
              <Textarea rows={4} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Send USDT to TVh7x… then paste your TXID as reference." />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="gw-enabled" checked={form.enabled} onCheckedChange={(c) => setForm({ ...form, enabled: c })} />
              <Label htmlFor="gw-enabled" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim() || saving} style={{ background: 'var(--brand)' }}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing === 'new' ? 'Create' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Users will no longer see this payment method.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
