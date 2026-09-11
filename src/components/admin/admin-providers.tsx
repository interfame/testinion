'use client'

// Super Admin — Upstream providers: API endpoints, markup and balances.

import { useState } from 'react'
import { Plus, Pencil, Trash2, KeyRound, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { apiDel } from './admin-ui'
import { AdminCard, EmptyState, FieldLabel, Money, TableShell, type AdminProvider } from './admin-ui'

type ProvForm = { name: string; apiUrl: string; apiKey: string; markup: string; status: string; balance: string }
const EMPTY: ProvForm = { name: '', apiUrl: 'https://', apiKey: '', markup: '20', status: 'ACTIVE', balance: '0' }

export function ProvidersSection() {
  const { data, loading, refresh } = useApi<{ providers: AdminProvider[] }>('/api/admin/providers')
  const [editing, setEditing] = useState<AdminProvider | 'new' | null>(null)
  const [form, setForm] = useState<ProvForm>(EMPTY)
  const [deleting, setDeleting] = useState<AdminProvider | null>(null)

  const openEdit = (p: AdminProvider) => {
    setForm({ name: p.name, apiUrl: p.apiUrl, apiKey: p.apiKey ?? '', markup: String(p.markup), status: p.status, balance: String(p.balance) })
    setEditing(p)
  }

  const save = async () => {
    if (!form.name.trim() || !form.apiUrl.trim()) return
    const payload = {
      name: form.name.trim(),
      apiUrl: form.apiUrl.trim(),
      apiKey: form.apiKey.trim() || null,
      markup: parseFloat(form.markup) || 0,
      status: form.status,
      balance: parseFloat(form.balance) || 0,
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/providers', payload) : api.patch('/api/admin/providers', { id: (editing as AdminProvider).id, ...payload }),
      { success: editing === 'new' ? 'Provider created' : 'Provider updated' },
    )
    if (ok) { setEditing(null); refresh() }
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/providers', { id: deleting.id }), { success: 'Provider deleted' })
    if (ok) { setDeleting(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title="Providers"
        description="Upstream SMM APIs that feed your master catalog. Markup is added on top of provider prices."
        actions={
          <Button onClick={() => { setForm(EMPTY); setEditing('new') }} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> New provider
          </Button>
        }
      />

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (data?.providers.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title="No providers yet" hint="Connect your first upstream provider API." /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Provider</th>
                <th className="px-3 py-3 font-bold">API endpoint</th>
                <th className="px-3 py-3 text-right font-bold">Markup</th>
                <th className="px-3 py-3 text-right font-bold">Balance</th>
                <th className="px-3 py-3 text-right font-bold">Services</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.providers.map((p) => (
                <tr key={p.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{p.name}</td>
                  <td className="max-w-[240px] px-3 py-3">
                    <span className="flex items-center gap-1.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                      <Link2 className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
                      <span className="truncate">{p.apiUrl}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                      <KeyRound className="h-3 w-3" /> {p.apiKey ? `••••${p.apiKey.slice(-4)}` : 'no key'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Badge className="rounded-full text-[10.5px] font-bold" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand)' }}>
                      +{p.markup}%
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-zinc-800 dark:text-zinc-100"><Money usd={p.balance} /></td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">{p._count.services}</td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New provider' : `Edit ${editing === null ? '' : (editing as AdminProvider).name}`}</DialogTitle>
            <DialogDescription>Standard SMM API v2 endpoints are supported.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><FieldLabel>Name</FieldLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ProviderOne" /></div>
            <div><FieldLabel>API URL</FieldLabel><Input value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} placeholder="https://provider.com/api/v2" /></div>
            <div><FieldLabel hint="stored server-side">API key</FieldLabel><Input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="provider api key" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><FieldLabel>Markup %</FieldLabel><Input type="number" step="0.1" value={form.markup} onChange={(e) => setForm({ ...form, markup: e.target.value })} /></div>
              <div><FieldLabel>Balance</FieldLabel><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.apiUrl.trim()} style={{ background: 'var(--brand)' }}>
              {editing === 'new' ? 'Create' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete provider “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Providers referenced by services cannot be deleted.</AlertDialogDescription>
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
