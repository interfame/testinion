'use client'

// Super Admin — Upstream providers: API endpoints, markup and balances.

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, KeyRound, Link2, PlugZap, RefreshCw, AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { toast } from '@/hooks/use-toast'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { apiDel } from './admin-ui'
import { AdminCard, EmptyState, FieldLabel, Money, TableShell, type AdminCategory, type AdminProvider } from './admin-ui'

type ProvForm = { name: string; apiUrl: string; apiKey: string; markup: string; status: string; balance: string }
const EMPTY: ProvForm = { name: '', apiUrl: 'https://', apiKey: '', markup: '20', status: 'ACTIVE', balance: '0' }

type TestResult = { ok: boolean; balance?: number; currency?: string; error?: string }

export function ProvidersSection() {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ providers: AdminProvider[] }>('/api/admin/providers')
  const { data: catData } = useApi<{ categories: AdminCategory[] }>('/api/admin/categories')
  const [editing, setEditing] = useState<AdminProvider | 'new' | null>(null)
  const [form, setForm] = useState<ProvForm>(EMPTY)
  const [deleting, setDeleting] = useState<AdminProvider | null>(null)

  // test connection
  const [testing, setTesting] = useState<'form' | string | null>(null)
  const [formTest, setFormTest] = useState<TestResult | null>(null)

  // sync dialog
  const [syncing, setSyncing] = useState<AdminProvider | null>(null)
  const [syncMarkup, setSyncMarkup] = useState('20')
  const [syncCategory, setSyncCategory] = useState('auto')
  const [syncBusy, setSyncBusy] = useState(false)
  // provider-side category filter (loaded when the dialog opens)
  const [syncProvCat, setSyncProvCat] = useState('__all__')
  const [provCats, setProvCats] = useState<{ name: string; count: number }[]>([])
  const [catsLoading, setCatsLoading] = useState(false)
  const [catsError, setCatsError] = useState<string | null>(null)

  // reset catalog
  const [resetOpen, setResetOpen] = useState(false)
  const [purgeOrders, setPurgeOrders] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)

  const openEdit = (p: AdminProvider) => {
    setForm({ name: p.name, apiUrl: p.apiUrl, apiKey: p.apiKey ?? '', markup: String(p.markup), status: p.status, balance: String(p.balance) })
    setFormTest(null)
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

  /** Test with stored credentials (provider row) or with current form values (unsaved) */
  const testConnection = async (target: { id: string } | { apiUrl: string; apiKey: string }, tag: 'form' | string) => {
    setTesting(tag)
    try {
      const res = await api.post<TestResult>('/api/admin/providers/test', target)
      const msg = `Balance: $${res.balance} ${res.currency}`
      if (tag === 'form') setFormTest({ ok: true, balance: res.balance, currency: res.currency })
      else toast({ title: `${(tag && data?.providers.find((p) => p.id === tag)?.name) || 'Provider'} — ${msg}` })
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Connection failed'
      if (tag === 'form') setFormTest({ ok: false, error })
      else toast({ title: error, variant: 'destructive' })
    } finally {
      setTesting(null)
    }
  }

  const runSync = async () => {
    if (!syncing) return
    setSyncBusy(true)
    try {
      const res = await api.post<{ created: number; updated: number; skipped: number; categoriesCreated: number; capped: boolean }>(
        '/api/admin/providers/sync',
        {
          id: syncing.id,
          markup: parseFloat(syncMarkup) || 0,
          ...(syncCategory !== 'auto' ? { categoryId: syncCategory } : {}),
          ...(syncProvCat !== '__all__' ? { providerCategory: syncProvCat } : {}),
        },
      )
      toast({
        title: `Synced: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped (${res.categoriesCreated} categories created)`,
        description: res.capped ? 'Provider returned more than 2000 services — import was capped.' : undefined,
      })
      setSyncing(null)
      refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Sync failed', variant: 'destructive' })
    } finally {
      setSyncBusy(false)
    }
  }

  /** Load the provider's own category list every time the sync dialog opens */
  useEffect(() => {
    if (!syncing) return
    setSyncProvCat('__all__')
    setProvCats([])
    setCatsError(null)
    setCatsLoading(true)
    let dead = false
    api
      .get<{ categories: { name: string; count: number }[] }>(`/api/admin/providers/categories?id=${syncing.id}`)
      .then((d) => {
        if (dead) return
        // dedupe by name (some providers repeat category names) and keep a stable list
        const seen = new Set<string>()
        const list: { name: string; count: number }[] = []
        for (const c of d.categories ?? []) {
          const name = String(c.name ?? '').trim()
          if (!name || seen.has(name)) continue
          seen.add(name)
          list.push({ name, count: Number(c.count) || 0 })
        }
        setProvCats(list)
      })
      .catch((e) => {
        if (dead) return
        const msg = e instanceof Error ? e.message : 'Failed to load categories'
        setCatsError(
          msg.includes('timed out') || msg.toLowerCase().includes('timeout')
            ? 'The provider took too long to answer. Large catalogs can exceed the serverless time limit — try "All categories", or sync one category at a time.'
            : msg,
        )
      })
      .finally(() => { if (!dead) setCatsLoading(false) })
    return () => { dead = true }
  }, [syncing?.id])

  const runReset = async () => {
    setResetBusy(true)
    try {
      const res = await api.post<{ deleted: number; kept: number; ordersDeleted: number }>('/api/admin/catalog/reset', {
        mode: 'services',
        purgeOrders,
      })
      toast({
        title: `Catalog reset: ${res.deleted} services deleted${res.kept ? `, ${res.kept} kept (have orders)` : ''}${purgeOrders ? `, ${res.ordersDeleted} orders purged` : ''}`,
      })
      setResetOpen(false)
      setPurgeOrders(false)
      refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Reset failed', variant: 'destructive' })
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.prov.title')}
        description={t('admin.prov.desc')}
        actions={
          <Button onClick={() => { setForm(EMPTY); setFormTest(null); setEditing('new') }} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> New provider
          </Button>
        }
      />

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (data?.providers.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.prov.noneTitle')} hint={t('admin.prov.noneHint')} /></AdminCard>
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
                      <Button
                        variant="outline" size="sm"
                        className="h-8 rounded-full px-2.5 text-[11px] font-bold"
                        disabled={testing === p.id}
                        onClick={() => testConnection({ id: p.id }, p.id)}
                        aria-label={`Test connection ${p.name}`}
                      >
                        {testing === p.id ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <PlugZap className="mr-1 h-3 w-3" />}
                        Test
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 rounded-full px-2.5 text-[11px] font-bold"
                        onClick={() => { setSyncing(p); setSyncMarkup(String(p.markup)); setSyncCategory('auto') }}
                        aria-label={`Sync services ${p.name}`}
                      >
                        <Download className="mr-1 h-3 w-3" /> Sync
                      </Button>
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
            <div className="rounded-xl border border-dashed p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">Connection</span>
                <Button
                  variant="outline" size="sm" className="h-7 text-[11px] font-bold"
                  disabled={testing === 'form' || !form.apiUrl.trim()}
                  onClick={() => testConnection({ apiUrl: form.apiUrl.trim(), apiKey: form.apiKey.trim() }, 'form')}
                >
                  {testing === 'form' ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <PlugZap className="mr-1 h-3 w-3" />}
                  Test connection
                </Button>
              </div>
              {formTest && (
                <p className={`mt-2 text-[12px] font-semibold ${formTest.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formTest.ok ? `✓ Connected — balance $${formTest.balance} ${formTest.currency}` : `✕ ${formTest.error}`}
                </p>
              )}
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

      {/* Sync services dialog */}
      <Dialog open={!!syncing} onOpenChange={(o) => !o && setSyncing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sync services — {syncing?.name}</DialogTitle>
            <DialogDescription>Import or refresh this provider&apos;s full service list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel hint="applied over provider prices">Markup %</FieldLabel>
              <Input type="number" step="0.1" value={syncMarkup} onChange={(e) => setSyncMarkup(e.target.value)} />
            </div>
            <div>
              <FieldLabel hint="from the provider API">Provider category</FieldLabel>
              {catsLoading ? (
                <div className="space-y-1.5"><Skeleton className="h-9 w-full" /><Skeleton className="h-3 w-32" /></div>
              ) : (
                <Select value={syncProvCat} onValueChange={setSyncProvCat}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="__all__">All categories</SelectItem>
                    {provCats.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name} ({c.count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {catsError && <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">✕ {catsError}</p>}
            </div>
            <div>
              <FieldLabel hint="new services only">Target category</FieldLabel>
              <Select value={syncCategory} onValueChange={setSyncCategory}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="auto">Auto — one category per API category</SelectItem>
                  {catData?.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                Target category for new services — existing services are never moved.
              </p>
            </div>
            <p className="rounded-xl border border-dashed p-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Prices = provider price + {syncMarkup || 0}%. Services update automatically by ID; existing keep their IDs.
              {syncProvCat !== '__all__' && <> Only the <b>{syncProvCat}</b> provider category is imported.</>}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncing(null)}>Cancel</Button>
            <Button onClick={runSync} disabled={syncBusy} style={{ background: 'var(--brand)' }} className="text-[var(--on-brand)]">
              {syncBusy ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
              {syncBusy ? 'Syncing…' : 'Sync now'}
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

      {/* Danger zone — reset catalog */}
      <AdminCard
        title={t('admin.set.danger')}
        description={t('admin.prov.dangerDesc')}
        className="border-rose-200 dark:border-rose-900/60"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100">Reset catalog</p>
            <p className="mt-0.5 max-w-lg text-[12px] text-zinc-500 dark:text-zinc-400">
              Deletes <b>all services</b> from the master catalog <b>and every reseller&apos;s catalog</b>, returning the platform to zero. Categories are kept.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 border-rose-300 font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40" onClick={() => setResetOpen(true)}>
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Reset catalog
          </Button>
        </div>
      </AdminCard>

      <AlertDialog open={resetOpen} onOpenChange={(o) => !o && setResetOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the entire catalog?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes ALL services — the master catalog and every reseller&apos;s imported services. Your catalog starts from zero; services only come back via provider sync or imports. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed p-3" onClick={() => setPurgeOrders((v) => !v)}>
            <Checkbox checked={purgeOrders} onCheckedChange={(v) => setPurgeOrders(v === true)} aria-label={t('admin.prov.purgeAria')} />
            <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
              Also delete all orders <span className="font-normal text-zinc-500 dark:text-zinc-400">(purge order history)</span>
            </span>
          </label>
          {!purgeOrders && (
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Services linked to existing orders will be kept and reported.</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={resetBusy}
              onClick={(e) => { e.preventDefault(); runReset() }}
            >
              {resetBusy ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-1.5 h-4 w-4" />}
              {resetBusy ? 'Resetting…' : purgeOrders ? 'Delete everything' : 'Reset catalog'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
