'use client'

// Super Admin — Master services: rates, limits, feature badges and full CRUD.

import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Star, Zap, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { SocialLogo } from '@/components/shared/social-logo'
import { api, mutate, useApi } from '@/lib/api'
import { apiDel } from './admin-ui'
import {
  AdminCard, EmptyState, FieldLabel, Money, TableShell, useDebounced,
  type AdminCategory, type AdminProvider, type AdminService,
} from './admin-ui'

const TYPES = ['DEFAULT', 'CUSTOM_COMMENTS', 'SUBSCRIPTION']

type SvcForm = {
  categoryId: string
  providerId: string
  name: string
  type: string
  rate: string
  min: string
  max: string
  description: string
  dripfeed: boolean
  refill: boolean
  cancel: boolean
  featured: boolean
  active: boolean
  sortOrder: string
}

const EMPTY: SvcForm = {
  categoryId: '', providerId: '', name: '', type: 'DEFAULT', rate: '1.00', min: '100',
  max: '100000', description: '', dripfeed: false, refill: true, cancel: true, featured: false, active: true, sortOrder: '0',
}

export function ServicesSection() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const dq = useDebounced(q)

  const { data: catData } = useApi<{ categories: AdminCategory[] }>('/api/admin/categories')
  const { data: provData } = useApi<{ providers: AdminProvider[] }>('/api/admin/providers')

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (dq.trim()) p.set('q', dq.trim())
    if (cat !== 'ALL') p.set('categoryId', cat)
    if (status !== 'ALL') p.set('status', status)
    return `/api/admin/services?${p.toString()}`
  }, [dq, cat, status])
  const { data, loading, refresh } = useApi<{ services: AdminService[] }>(url, [url])

  const [editing, setEditing] = useState<AdminService | 'new' | null>(null)
  const [form, setForm] = useState<SvcForm>(EMPTY)
  const [deleting, setDeleting] = useState<AdminService | null>(null)

  const openEdit = (s: AdminService) => {
    setForm({
      categoryId: s.categoryId,
      providerId: s.providerId ?? '',
      name: s.name,
      type: s.type,
      rate: String(s.rate),
      min: String(s.min),
      max: String(s.max),
      description: s.description ?? '',
      dripfeed: s.dripfeed,
      refill: s.refill,
      cancel: s.cancel,
      featured: s.featured,
      active: s.status === 'ACTIVE',
      sortOrder: String(s.sortOrder),
    })
    setEditing(s)
  }

  const save = async () => {
    if (!form.name.trim() || !form.categoryId) return
    const payload = {
      categoryId: form.categoryId,
      providerId: form.providerId || null,
      name: form.name.trim(),
      type: form.type,
      rate: parseFloat(form.rate) || 0,
      min: parseInt(form.min) || 1,
      max: parseInt(form.max) || 100000,
      description: form.description.trim() || null,
      dripfeed: form.dripfeed,
      refill: form.refill,
      cancel: form.cancel,
      featured: form.featured,
      status: form.active ? 'ACTIVE' : 'INACTIVE',
      sortOrder: parseInt(form.sortOrder) || 0,
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/services', payload) : api.patch('/api/admin/services', { id: (editing as AdminService).id, ...payload }),
      { success: editing === 'new' ? 'Service created' : 'Service updated' },
    )
    if (ok) { setEditing(null); refresh() }
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/services', { id: deleting.id }), { success: 'Service deleted' })
    if (ok) { setDeleting(null); refresh() }
  }

  const openCreate = () => {
    setForm({ ...EMPTY, categoryId: cat !== 'ALL' ? cat : catData?.categories[0]?.id ?? '' })
    setEditing('new')
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title="Master services"
        description="The catalog offered across every platform. Rates are per 1,000, in USD."
        actions={
          <Button onClick={openCreate} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> New service
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" className="h-9 rounded-full pl-9 text-[13px]" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-9 w-full rounded-full text-[12.5px] font-semibold lg:w-52"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="ALL">All categories</SelectItem>
            {catData?.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2"><SocialLogo icon={c.icon} size={13} /> {c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-full rounded-full text-[12.5px] font-semibold lg:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500 lg:ml-auto">{data?.services.length ?? 0} services</span>
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (data?.services.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title="No services found" hint="Adjust the filters or create a new service." /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Service</th>
                <th className="px-3 py-3 font-bold">Category</th>
                <th className="px-3 py-3 text-right font-bold">Rate /1k</th>
                <th className="px-3 py-3 text-right font-bold">Min–Max</th>
                <th className="px-3 py-3 font-bold">Type</th>
                <th className="px-3 py-3 font-bold">Features</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.services.map((s) => (
                <tr key={s.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {s.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                      <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{s.name}</p>
                    </div>
                    {s.description && <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{s.description}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex max-w-[150px] items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      <SocialLogo icon={s.category.icon} size={12} />
                      <span className="truncate">{s.category.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-zinc-800 dark:text-zinc-100"><Money usd={s.rate} /></td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">{s.min.toLocaleString()}–{s.max.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="rounded-full text-[10px] font-bold">{s.type.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.dripfeed && <Badge className="rounded-full bg-violet-50 dark:bg-violet-950/40 text-[9.5px] font-bold text-violet-600 dark:text-violet-400">DRIP</Badge>}
                      {s.refill && <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">REFILL</Badge>}
                      {s.cancel && <Badge className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-[9.5px] font-bold text-zinc-500 dark:text-zinc-400">CANCEL</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New service' : 'Edit service'}</DialogTitle>
            <DialogDescription>Rate is what a customer pays per 1,000 units.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel>Service name</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Instagram Followers — Real · 30 days refill" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Category</FieldLabel>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {catData?.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2"><SocialLogo icon={c.icon} size={13} /> {c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel hint="optional">Provider</FieldLabel>
                <Select value={form.providerId || 'NONE'} onValueChange={(v) => setForm({ ...form, providerId: v === 'NONE' ? '' : v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {provData?.providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Rate / 1000 (USD)</FieldLabel>
                <Input type="number" step="0.0001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
              <div><FieldLabel>Min quantity</FieldLabel><Input type="number" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
              <div><FieldLabel>Max quantity</FieldLabel><Input type="number" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
            </div>
            <div>
              <FieldLabel hint="optional">Description</FieldLabel>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:grid-cols-4">
              <div className="flex items-center gap-2"><Switch id="sv-drip" checked={form.dripfeed} onCheckedChange={(c) => setForm({ ...form, dripfeed: c })} /><Label htmlFor="sv-drip" className="text-[12px] font-semibold"><Zap className="mr-1 inline h-3 w-3" />Dripfeed</Label></div>
              <div className="flex items-center gap-2"><Switch id="sv-refill" checked={form.refill} onCheckedChange={(c) => setForm({ ...form, refill: c })} /><Label htmlFor="sv-refill" className="text-[12px] font-semibold"><RefreshCw className="mr-1 inline h-3 w-3" />Refill</Label></div>
              <div className="flex items-center gap-2"><Switch id="sv-cancel" checked={form.cancel} onCheckedChange={(c) => setForm({ ...form, cancel: c })} /><Label htmlFor="sv-cancel" className="text-[12px] font-semibold"><XCircle className="mr-1 inline h-3 w-3" />Cancel</Label></div>
              <div className="flex items-center gap-2"><Switch id="sv-feat" checked={form.featured} onCheckedChange={(c) => setForm({ ...form, featured: c })} /><Label htmlFor="sv-feat" className="text-[12px] font-semibold"><Star className="mr-1 inline h-3 w-3" />Featured</Label></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="sv-active" checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
                <Label htmlFor="sv-active" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sv-sort" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">Sort</Label>
                <Input id="sv-sort" type="number" className="h-8 w-20" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.categoryId} style={{ background: 'var(--brand)' }}>
              {editing === 'new' ? 'Create service' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Services with existing orders cannot be deleted — deactivate them instead.
            </AlertDialogDescription>
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
