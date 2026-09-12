'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Percent, RefreshCw, Search, Pencil, Trash2, Copy, FolderTree, Layers, Server,
  Lock, ArrowUpDown, CheckCircle2, XCircle, Rocket, ArrowRight, ListOrdered, Unlock,
  Wallet, ArrowDownToLine, PlugZap, Download,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { useApi, api, mutate } from '@/lib/api'
import { SocialLogo } from '@/components/shared/social-logo'
import { SOCIAL_ICONS } from '@/lib/social'
import { formatMoney } from '@/lib/format'
import type { Lang } from '@/lib/i18n'

type Cat = { id: string; name: string; slug: string; icon: string; color: string; status: string; sortOrder: number; services: Svc[] }
type Svc = {
  id: string; categoryId: string; name: string; type: string; rate: number; cost: number | null; min: number; max: number
  description: string | null; dripfeed: boolean; refill: boolean; cancel: boolean; status: string; sortOrder: number
}
type MasterCat = { id: string; name: string; slug: string; icon: string; color: string; services: Svc[] }
type Provider = { id: string; name: string; apiUrl: string; apiKey: string | null; markup: number; status: string; balance: number; _count?: { services: number } }

type CatalogData = { categories: Cat[]; masterCategories: MasterCat[] }

export default function ResellerCatalog({ section, onNavigate }: { section: string; onNavigate: (k: string) => void }) {
  const { data, loading, refresh } = useApi<CatalogData>('/api/reseller/catalog')
  if (loading) return <div className="grid gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>

  switch (section) {
    case 'margins': return <Margins data={data} refresh={refresh} onNavigate={onNavigate} />
    case 'categories': return <Categories data={data} refresh={refresh} />
    case 'services': return <Services data={data} refresh={refresh} />
    case 'providers': return <Providers data={data} refresh={refresh} onNavigate={onNavigate} />
    default: return null
  }
}

// ─────────────── Margins & Pricing ───────────────

function Margins({ data, refresh, onNavigate }: { data: CatalogData | null; refresh: () => void; onNavigate: (k: string) => void }) {
  const app = useApp()
  const [margin, setMargin] = useState(25)
  const [catMargins, setCatMargins] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const myServices = useMemo(() => data?.categories.flatMap((c) => c.services) ?? [], [data])
  const avgRate = myServices.length ? myServices.reduce((s, x) => s + x.rate, 0) / myServices.length : 0

  const applyMargin = async (categoryId?: string) => {
    setBusy(categoryId ?? 'all')
    const res = await mutate(
      () => api.patch<{ updated: number }>('/api/reseller/catalog/services', {
        action: 'margin',
        percent: categoryId ? catMargins[categoryId] ?? margin : margin,
        categoryId,
      }),
      { success: 'Prices updated ✅' }
    )
    setBusy(null)
    if (res) refresh()
  }

  return (
    <>
      <PanelPageHeader
        title="Margins & Pricing"
        description="Set your markup over GrowthRush master prices — applied instantly across your catalog."
      />

      {/* Global margin */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand) 12%, white)' }}>
              <Percent className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            </span>
            <div>
              <p className="text-sm font-extrabold">Global margin</p>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Applied over the GrowthRush master catalog rates.</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-5">
            <Slider value={[margin]} onValueChange={(v) => setMargin(v[0])} min={0} max={200} step={5} className="flex-1" />
            <div className="flex items-center gap-2">
              <Input
                type="number" className="w-20 text-center font-extrabold" value={margin}
                onChange={(e) => setMargin(Math.max(0, Math.min(500, parseInt(e.target.value) || 0)))}
              />
              <span className="font-extrabold">%</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[10, 20, 25, 35, 50, 75, 100].map((m) => (
              <Button key={m} variant="outline" size="sm" className={`font-bold ${margin === m ? 'border-rose-600 text-rose-600 dark:text-rose-400' : ''}`} onClick={() => setMargin(m)}>
                +{m}%
              </Button>
            ))}
          </div>
          <Button
            className="mt-5 w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}
            disabled={busy === 'all'} onClick={() => applyMargin()}
          >
            {busy === 'all' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpDown className="mr-2 h-4 w-4" />}
            Apply +{margin}% to all services
          </Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
            <p className="text-[12px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Your catalog</p>
            <p className="mt-1 text-2xl font-black">{myServices.length}</p>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">services · avg rate {formatMoney(avgRate, app.currencyOf(app.user.currency), app.lang as Lang)}/1k</p>
          </div>
          <div className="rounded-2xl border border-dashed bg-white dark:bg-zinc-900 p-5">
            <p className="text-[13px] font-bold">Missing networks?</p>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">Clone more categories from the GrowthRush master catalog.</p>
            <Button variant="outline" size="sm" className="mt-3 w-full font-bold" onClick={() => onNavigate('categories')}>
              <FolderTree className="mr-1.5 h-3.5 w-3.5" /> Manage categories
            </Button>
          </div>
        </div>
      </div>

      {/* Per-category margins */}
      <p className="mb-3 mt-7 text-sm font-extrabold">Per-category margins</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.categories.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2.5">
              <SocialLogo icon={c.icon} size={22} />
              <p className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{c.name}</p>
              <Badge variant="outline" className="text-[10px]">{c.services.length} svcs</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number" className="pr-7 text-[13px] font-bold" placeholder="25"
                  value={catMargins[c.id] ?? ''}
                  onChange={(e) => setCatMargins({ ...catMargins, [c.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400 dark:text-zinc-500">%</span>
              </div>
              <Button
                size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}
                disabled={busy === c.id || !catMargins[c.id]}
                onClick={() => applyMargin(c.id)}
              >
                {busy === c.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─────────────── Categories ───────────────

function Categories({ data, refresh }: { data: CatalogData | null; refresh: () => void }) {
  const [addOpen, setAddOpen] = useState(false)
  const [editCat, setEditCat] = useState<Cat | null>(null)
  const [deleteCat, setDeleteCat] = useState<Cat | null>(null)
  const [form, setForm] = useState({ name: '', icon: 'globe', color: '#e11d48' })

  const availableMaster = (data?.masterCategories ?? []).filter(
    (m) => !data?.categories.some((c) => c.slug === m.slug)
  )

  const clone = async (categoryId: string) => {
    const res = await mutate(
      () => api.post('/api/reseller/catalog/categories', { action: 'clone', categoryId, margin: 25 }),
      { success: 'Category cloned with +25% margin ✅' }
    )
    if (res) { refresh(); setAddOpen(false) }
  }

  const create = async () => {
    const res = await mutate(
      () => api.post('/api/reseller/catalog/categories', form),
      { success: 'Category created ✅' }
    )
    if (res) { refresh(); setAddOpen(false); setForm({ name: '', icon: 'globe', color: '#e11d48' }) }
  }

  const toggle = async (c: Cat) => {
    await mutate(
      () => api.patch('/api/reseller/catalog/categories', { id: c.id, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      { success: 'Updated' }
    )
    refresh()
  }

  const remove = async () => {
    if (!deleteCat) return
    const res = await mutate(() => api.del(`/api/reseller/catalog/categories?id=${deleteCat.id}`), { success: 'Category removed' })
    if (res) { setDeleteCat(null); refresh() }
  }

  return (
    <>
      <PanelPageHeader
        title="Categories"
        description="Your service categories — clone from the master catalog or create custom ones."
        actions={
          <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add category
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.categories.map((c) => (
          <div key={c.id} className="group rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${c.color}18` }}>
                <SocialLogo icon={c.icon} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{c.name}</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{c.services.length} services</p>
              </div>
              <Switch checked={c.status === 'ACTIVE'} onCheckedChange={() => toggle(c)} />
            </div>
            <div className="mt-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
              <Button variant="outline" size="sm" className="h-7 flex-1 text-[11px]" onClick={() => setEditCat(c)}>
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="h-7 flex-1 text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-400" onClick={() => setDeleteCat(c)}>
                <Trash2 className="mr-1 h-3 w-3" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / clone dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
          </DialogHeader>
          <p className="-mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">Clone a network from the GrowthRush master catalog (services included at +25% margin) or create a custom one.</p>
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-xl border p-2 sm:grid-cols-3">
            {availableMaster.map((m) => (
              <button
                key={m.id}
                onClick={() => clone(m.id)}
                className="flex items-center gap-2 rounded-lg border p-2 text-left text-[12px] font-semibold transition hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <SocialLogo icon={m.icon} size={18} />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <Copy className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
              </button>
            ))}
            {!availableMaster.length && <p className="col-span-full p-3 text-center text-[12px] text-zinc-400 dark:text-zinc-500">All master categories are already in your catalog 🎉</p>}
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Or create custom</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Instagram" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Object.entries(SOCIAL_ICONS).map(([key, meta]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2"><SocialLogo icon={key} size={14} /> {meta.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Input type="color" className="h-9 cursor-pointer p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!form.name.trim()} onClick={create}>
                Create category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <EditCategoryDialog cat={editCat} onClose={() => setEditCat(null)} onSaved={() => { setEditCat(null); refresh() }} />

      <AlertDialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteCat?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Categories with services cannot be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function EditCategoryDialog({ cat, onClose, onSaved }: { cat: Cat | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', icon: 'globe', color: '#e11d48' })
  const [ready, setReady] = useState<string | null>(null)

  if (cat && ready !== cat.id) {
    setReady(cat.id)
    setForm({ name: cat.name, icon: cat.icon, color: cat.color })
  }

  const save = async () => {
    if (!cat) return
    const res = await mutate(() => api.patch('/api/reseller/catalog/categories', { id: cat.id, ...form }), { success: 'Saved ✅' })
    if (res) onSaved()
  }

  return (
    <Dialog open={!!cat} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {Object.entries(SOCIAL_ICONS).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2"><SocialLogo icon={key} size={14} /> {meta.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input type="color" className="h-9 cursor-pointer p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
          </div>
          <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={save}>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────── My Services ───────────────

function Services({ data, refresh }: { data: CatalogData | null; refresh: () => void }) {
  const app = useApp()
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('ALL')
  const [editSvc, setEditSvc] = useState<Svc | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)

  const all = useMemo(() => data?.categories.flatMap((c) => c.services.map((s) => ({ ...s, cat: c }))) ?? [], [data])
  const filtered = all.filter(
    (s) =>
      (catFilter === 'ALL' || s.categoryId === catFilter) &&
      (!q || s.name.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <>
      <PanelPageHeader
        title="My Services"
        description={`${all.length} services in your catalog`}
        actions={
          <>
            <Button variant="outline" size="sm" className="font-bold" onClick={() => setCloneOpen(true)}>
              <Copy className="mr-1.5 h-4 w-4" /> Import from GrowthRush
            </Button>
            <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New service
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input className="pl-9" placeholder="Search services…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="ALL">All categories</SelectItem>
            {data?.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead>
              <tr className="border-b bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">ID</th>
                <th className="px-4 py-3 font-bold">Service</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold" title="What YOU pay per 1,000 through your API (GrowthRush wholesale / provider price)">API cost /1k</th>
                <th className="px-4 py-3 font-bold" title="What YOUR customers pay per 1,000 on your storefront">Your price /1k</th>
                <th className="px-4 py-3 font-bold">Margin</th>
                <th className="px-4 py-3 font-bold">Min–Max</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map((s, i) => (
                <tr key={s.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{i + 1}</td>
                  <td className="max-w-64 px-4 py-2.5">
                    <p className="truncate font-semibold">{s.name}</p>
                    <div className="mt-0.5 flex gap-1">
                      {s.refill && <Badge variant="outline" className="px-1 py-0 text-[9px] text-emerald-600 dark:text-emerald-400">♻ Refill</Badge>}
                      {s.dripfeed && <Badge variant="outline" className="px-1 py-0 text-[9px] text-sky-600 dark:text-sky-400">⏳ Drip</Badge>}
                      {s.type === 'CUSTOM_COMMENTS' && <Badge variant="outline" className="px-1 py-0 text-[9px] text-violet-600 dark:text-violet-400">💬 Custom</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                      <SocialLogo icon={s.cat.icon} size={14} /> {s.cat.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.cost != null
                      ? <span className="font-semibold text-zinc-500 dark:text-zinc-400">{formatMoney(s.cost, app.currencyOf(app.user.currency), app.lang as Lang)}</span>
                      : <span className="text-zinc-300 dark:text-zinc-600" title="Custom service — no API cost matched">—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-extrabold">{formatMoney(s.rate, app.currencyOf(app.user.currency), app.lang as Lang)}</td>
                  <td className="px-4 py-2.5">
                    {s.cost != null && s.cost > 0 && s.rate > s.cost ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">+{Math.round(((s.rate - s.cost) / s.cost) * 100)}%</span>
                    ) : s.cost != null && s.rate <= s.cost ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" title="Your price does not cover the API cost">⚠ {s.rate === s.cost ? '0%' : '−' + Math.round(((s.cost - s.rate) / s.cost) * 100) + '%'}</span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-zinc-500 dark:text-zinc-400">{s.min.toLocaleString()}–{s.max.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    {s.status === 'ACTIVE'
                      ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                      : <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500"><XCircle className="h-3.5 w-3.5" /> Inactive</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSvc(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400"
                        onClick={async () => {
                          const res = await fetch('/api/reseller/catalog/services', {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }),
                          }).then((r) => r.json())
                          if (res?.ok) toast({ title: 'Service removed' })
                          refresh()
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No services match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <p className="border-t bg-zinc-50/60 dark:bg-zinc-900/40 px-4 py-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Showing 100 of {filtered.length} — refine your search.
          </p>
        )}
      </div>

      <ServiceDialog
        open={editSvc !== null || addOpen}
        service={editSvc}
        categories={data?.categories ?? []}
        onClose={() => { setEditSvc(null); setAddOpen(false) }}
        onSaved={() => { setEditSvc(null); setAddOpen(false); refresh() }}
      />
      <ImportServicesDialog
        open={cloneOpen}
        data={data}
        onClose={() => setCloneOpen(false)}
        onDone={() => { setCloneOpen(false); refresh() }}
      />
    </>
  )
}

function ServiceDialog({ open, service, categories, onClose, onSaved }: {
  open: boolean
  service: Svc | null
  categories: Cat[]
  onClose: () => void
  onSaved: () => void
}) {
  const empty = { name: '', categoryId: '', rate: '1', min: '100', max: '100000', type: 'DEFAULT', description: '', dripfeed: true, refill: true, cancel: true }
  const [form, setForm] = useState(empty)
  const [ready, setReady] = useState<string | null>(null)

  if (open && ((service && ready !== service.id) || (!service && ready !== 'new'))) {
    setReady(service?.id ?? 'new')
    setForm(service ? {
      name: service.name, categoryId: service.categoryId, rate: String(service.rate),
      min: String(service.min), max: String(service.max), type: service.type,
      description: service.description ?? '', dripfeed: service.dripfeed, refill: service.refill, cancel: service.cancel,
    } : empty)
  }

  const save = async () => {
    const res = service
      ? await mutate(() => api.patch('/api/reseller/catalog/services', { id: service.id, ...form, rate: parseFloat(form.rate), min: parseInt(form.min), max: parseInt(form.max) }), { success: 'Service updated ✅' })
      : await mutate(() => api.post('/api/reseller/catalog/services', { ...form, rate: parseFloat(form.rate), min: parseInt(form.min), max: parseInt(form.max) }), { success: 'Service created ✅' })
    if (res) onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{service ? 'Edit service' : 'New service'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} placeholder="Instagram Followers — Real HQ" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-52">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2"><SocialLogo icon={c.icon} size={13} /> {c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFAULT">Default</SelectItem>
                  <SelectItem value="CUSTOM_COMMENTS">Custom comments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Rate /1k ($)</Label>
              <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              {service?.cost != null && (
                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500">
                  API cost: <span className="font-bold text-zinc-500 dark:text-zinc-400">${service.cost.toFixed(2)}</span>
                  {parseFloat(form.rate) > service.cost
                    ? <> · margin <span className="font-bold text-emerald-600 dark:text-emerald-400">+{Math.round(((parseFloat(form.rate) - service.cost) / service.cost) * 100)}%</span></>
                    : <span className="font-bold text-amber-600 dark:text-amber-400"> · below cost ⚠</span>}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Min</Label>
              <Input type="number" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Max</Label>
              <Input type="number" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-5 rounded-xl border bg-zinc-50 dark:bg-zinc-900/60 p-3">
            {([['dripfeed', 'Drip-feed'], ['refill', 'Refill'], ['cancel', 'Cancelable']] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-[12px] font-semibold">
                <Switch checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} /> {label}
              </label>
            ))}
          </div>
          <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!form.name.trim() || !form.categoryId} onClick={save}>
            {service ? 'Save changes' : 'Create service'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImportServicesDialog({ open, data, onClose, onDone }: {
  open: boolean
  data: CatalogData | null
  onClose: () => void
  onDone: () => void
}) {
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const mine = new Set((data?.categories ?? []).flatMap((c) => c.services.map((s) => s.name)))
    return (data?.masterCategories ?? [])
      .filter((m) => data?.categories.some((c) => c.slug === m.slug))
      .flatMap((m) => m.services.filter((s) => !mine.has(s.name)).map((s) => ({ ...s, cat: m })))
      .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()))
  }, [data, q])

  const cloneOne = async (serviceId: string) => {
    setImporting(serviceId)
    await mutate(() => api.post('/api/reseller/catalog/services', { action: 'clone', serviceId, margin: 25 }), { success: 'Imported ✅' })
    setImporting(null)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader><DialogTitle>Import from GrowthRush master</DialogTitle></DialogHeader>
        <p className="-mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">Services are imported at +25% margin over master prices.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input className="pl-9" placeholder="Search master services…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {candidates.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border p-2">
              <SocialLogo icon={s.cat.icon} size={16} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold">{s.name}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{s.cat.name} · ${s.rate}/1k</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold" disabled={importing === s.id} onClick={() => cloneOne(s.id)}>
                {importing === s.id ? '…' : 'Import'}
              </Button>
            </div>
          ))}
          {!candidates.length && <p className="py-6 text-center text-[12px] text-zinc-400 dark:text-zinc-500">Nothing left to import — your catalog is complete 🎉</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────── Providers & API ───────────────

type UnlockInfo = { unlocked: boolean; price: number }
type ImportResult = { importedCategories: number; importedServices: number; skipped: number; capped: boolean }

const round2 = (n: number) => Math.round(n * 100) / 100

function Providers({ data, refresh, onNavigate }: { data: CatalogData | null; refresh: () => void; onNavigate?: (k: string) => void }) {
  const app = useApp()
  const { data: pData, loading, refresh: refreshProviders } = useApi<{ providers: Provider[]; externalApi: boolean }>('/api/reseller/providers')
  const { data: unlockInfo, refresh: refreshUnlock } = useApi<UnlockInfo>('/api/reseller/unlock-api')
  const [edit, setEdit] = useState<Provider | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const empty = { name: '', apiUrl: '', apiKey: '', markup: '20' }
  const [form, setForm] = useState(empty)
  const [ready, setReady] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [needFunds, setNeedFunds] = useState(false)

  // ── Provider test + sync (external SMM API v2) ──
  const [testId, setTestId] = useState<string | null>(null)
  const [syncProv, setSyncProv] = useState<Provider | null>(null)
  const [syncMarkup, setSyncMarkup] = useState('20')
  const [syncBusy, setSyncBusy] = useState(false)

  const testProvider = async (p: Provider) => {
    setTestId(p.id)
    try {
      const res = await api.post<{ balance: number; currency: string }>('/api/reseller/providers/test', { id: p.id })
      toast({ title: `${p.name} — balance $${res.balance} ${res.currency}` })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Connection failed', variant: 'destructive' })
    } finally {
      setTestId(null)
    }
  }

  const runSync = async () => {
    if (!syncProv) return
    setSyncBusy(true)
    try {
      const res = await api.post<{ created: number; updated: number; skipped: number; categoriesCreated: number; capped: boolean }>(
        '/api/reseller/providers/sync',
        { id: syncProv.id, markup: parseFloat(syncMarkup) || 0 },
      )
      toast({
        title: `Synced: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped (${res.categoriesCreated} categories created) ✅`,
        description: res.capped ? 'Provider returned more than 2000 services — import was capped.' : undefined,
      })
      setSyncProv(null)
      refreshProviders()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Sync failed', variant: 'destructive' })
    } finally {
      setSyncBusy(false)
    }
  }

  // ── Import wizard state machine (0 = closed, 1..3 = steps) ──
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set())
  const [catSearch, setCatSearch] = useState('')
  const [priceMode, setPriceMode] = useState<'percent' | 'manual'>('percent')
  const [percent, setPercent] = useState(20)
  const [manualPrices, setManualPrices] = useState<Record<string, string>>({})
  const [bulkPercent, setBulkPercent] = useState('20')
  const [importing, setImporting] = useState(false)

  const currency = app.currencyOf(app.user.currency)
  const lang = app.lang as Lang

  if (loading) return <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>

  const externalApi = Boolean(pData?.externalApi)

  const save = async () => {
    const res = edit
      ? await mutate(() => api.patch('/api/reseller/providers', { id: edit.id, ...form, markup: parseFloat(form.markup) }), { success: 'Provider saved ✅' })
      : await mutate(() => api.post('/api/reseller/providers', { ...form, markup: parseFloat(form.markup) }), { success: 'Provider connected ✅' })
    if (res) { setEdit(null); setAddOpen(false); setReady(null); refreshProviders() }
  }

  const openWizard = () => {
    setSelectedCats(new Set())
    setCatSearch('')
    setPriceMode('percent')
    setPercent(20)
    setManualPrices({})
    setBulkPercent('20')
    setWizardStep(1)
  }

  // ── Wizard derived data ──
  const masterCats = data?.masterCategories ?? []
  const filteredCats = catSearch.trim() ? masterCats.filter((c) => c.name.toLowerCase().includes(catSearch.trim().toLowerCase())) : masterCats
  const selectedMasterCats = masterCats.filter((c) => selectedCats.has(c.id))
  const selectedServices = selectedMasterCats.flatMap((c) => c.services)
  const mySlugs = new Set((data?.categories ?? []).map((c) => c.slug))

  // Mirror of the server's duplicate rule: master service name already exists in MY category with the same slug
  const myNamesBySlug = new Map((data?.categories ?? []).map((c) => [c.slug, new Set(c.services.map((s) => s.name.trim().toLowerCase()))]))
  const skippedEstimate = selectedMasterCats.reduce((acc, mc) => {
    const mine = myNamesBySlug.get(mc.slug)
    if (!mine) return acc
    return acc + mc.services.filter((ms) => mine.has(ms.name.trim().toLowerCase())).length
  }, 0)
  const newServicesEstimate = Math.max(0, selectedServices.length - skippedEstimate)

  /** Final price preview — mirrors the server contract exactly */
  const finalPrice = (ms: Svc) => {
    if (priceMode === 'percent') return round2(ms.rate * (1 + percent / 100))
    const v = parseFloat(manualPrices[ms.id] ?? '')
    return Number.isFinite(v) && v > 0 ? v : ms.rate // server: prices[serviceId] ?? master.rate
  }

  const toggleCat = (id: string) => setSelectedCats((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const allFilteredSelected = filteredCats.length > 0 && filteredCats.every((c) => selectedCats.has(c.id))
  const toggleAll = () => setSelectedCats((prev) => {
    const next = new Set(prev)
    if (allFilteredSelected) filteredCats.forEach((c) => next.delete(c.id))
    else filteredCats.forEach((c) => next.add(c.id))
    return next
  })

  const applyPercentToEmpty = () => {
    const p = parseFloat(bulkPercent)
    if (!Number.isFinite(p) || p < 0) { toast({ title: 'Enter a valid markup %', variant: 'destructive' }); return }
    setManualPrices((prev) => {
      const next = { ...prev }
      for (const ms of selectedServices) {
        const cur = parseFloat(next[ms.id] ?? '')
        if (!(Number.isFinite(cur) && cur > 0)) next[ms.id] = round2(ms.rate * (1 + p / 100)).toFixed(2)
      }
      return next
    })
  }

  /** Switch to one-by-one pricing, prefilling every field with master rate +20% (spec default) */
  const enterManualMode = () => {
    setPriceMode('manual')
    setManualPrices((prev) => {
      const next = { ...prev }
      for (const ms of selectedServices) {
        const cur = parseFloat(next[ms.id] ?? '')
        if (!(Number.isFinite(cur) && cur > 0)) next[ms.id] = round2(ms.rate * 1.2).toFixed(2)
      }
      return next
    })
  }

  const filledCount = selectedServices.filter((ms) => { const v = parseFloat(manualPrices[ms.id] ?? ''); return Number.isFinite(v) && v > 0 }).length

  const runImport = async () => {
    if (!selectedMasterCats.length) return
    setImporting(true)
    try {
      const prices: Record<string, number> = {}
      if (priceMode === 'manual') {
        for (const ms of selectedServices) {
          const v = parseFloat(manualPrices[ms.id] ?? '')
          if (Number.isFinite(v) && v > 0) prices[ms.id] = round2(v)
        }
      }
      const res = await api.post<ImportResult>('/api/reseller/master-import', {
        categoryIds: selectedMasterCats.map((c) => c.id),
        mode: priceMode,
        ...(priceMode === 'percent' ? { percent } : { prices }),
      })
      toast({
        title: `Imported ${res.importedServices} services across ${res.importedCategories} categories ✅${res.capped ? ' — plan service cap reached' : ''}`,
        description: res.skipped > 0 ? `${res.skipped} duplicate${res.skipped === 1 ? '' : 's'} skipped (already in your catalog)` : undefined,
      })
      refresh()
      refreshProviders()
      setWizardStep(0)
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Import failed', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const unlock = async () => {
    setUnlocking(true)
    try {
      await api.post<{ ok: boolean; externalApi: boolean; balance: number }>('/api/reseller/unlock-api')
      toast({ title: 'External API unlocked 🎉' })
      setNeedFunds(false)
      refreshProviders()
      refreshUnlock()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unlock failed'
      if (msg.toLowerCase().includes('insufficient')) setNeedFunds(true)
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setUnlocking(false)
    }
  }

  const dialogOpen = addOpen || edit !== null
  if (dialogOpen && ((edit && ready !== edit.id) || (!edit && ready !== 'new'))) {
    setReady(edit?.id ?? 'new')
    setForm(edit ? { name: edit.name, apiUrl: edit.apiUrl, apiKey: edit.apiKey ?? '', markup: String(edit.markup) } : empty)
  }

  return (
    <>
      <PanelPageHeader
        title="My Providers"
        description="Fulfill orders via the built-in GrowthRush API — or connect third-party providers with the External API add-on."
      />

      {/* ── GrowthRush API — built in ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-15 blur-3xl" style={{ background: 'var(--brand)' }} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Rocket className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-extrabold">GrowthRush API — built in</p>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">CONNECTED</Badge>
              </div>
              <p className="mt-1 max-w-xl text-[13px] text-zinc-500 dark:text-zinc-400">
                Your platform ships connected to the GrowthRush master API. Import the full catalog with your own prices — no keys, no setup.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {masterCats.length} master categories</span>
            <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5" /> {(data?.categories ?? []).reduce((s, c) => s + c.services.length, 0)} services live</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button className="h-11 px-6 text-[13px] font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={openWizard}>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Bulk import services
          </Button>
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400">Pick categories, set your prices, review &amp; publish.</span>
        </div>
      </div>

      {/* ── Third-party providers ── */}
      {!externalApi ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-zinc-50 dark:bg-zinc-900/60 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Lock className="h-7 w-7" />
          </span>
          <p className="mt-4 text-[15px] font-extrabold">Third-party API providers</p>
          <p className="mt-1 max-w-md text-[13px] text-zinc-500 dark:text-zinc-400">
            Connect any external SMM provider (JustAnotherPanel, SMMKings, etc.) via their API and sync their services into your catalog automatically.
          </p>
          <p className="mt-3 text-[13px] font-semibold">
            Unlock — {formatMoney(unlockInfo?.price ?? 25, currency, lang)} charged once from your wallet
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button className="font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={unlocking} onClick={unlock}>
              {unlocking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
              Unlock now
            </Button>
            {needFunds && (
              <Button variant="outline" className="font-bold" onClick={() => onNavigate?.('add-funds')}>
                <Wallet className="mr-2 h-4 w-4" /> Add funds
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold">Third-party providers</p>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">UNLOCKED</Badge>
            </div>
            <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Connect provider
            </Button>
          </div>
          {pData?.providers.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {pData.providers.map((p) => (
                <div key={p.id} className="group rounded-2xl border bg-white dark:bg-zinc-900 p-5 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300">
                      <Server className="h-5 w-5" />
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className={p.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400'}>{p.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">+{p.markup}%</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-extrabold">{p.name}</p>
                  <p className="truncate text-[12px] text-zinc-400 dark:text-zinc-500">{p.apiUrl}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{p._count?.services ?? 0} linked services</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline" size="sm" className="h-7 text-[11px] font-bold"
                        disabled={testId === p.id}
                        onClick={() => testProvider(p)}
                        aria-label={`Test connection ${p.name}`}
                      >
                        {testId === p.id ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <PlugZap className="mr-1 h-3 w-3" />} Test
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-[11px] font-bold"
                        onClick={() => { setSyncProv(p); setSyncMarkup(String(p.markup)) }}
                        aria-label={`Sync services ${p.name}`}
                      >
                        <Download className="mr-1 h-3 w-3" /> Sync
                      </Button>
                      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setEdit(p)}>
                          <Pencil className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="outline" size="sm" className="h-7 text-[11px] text-rose-600 dark:text-rose-400"
                          onClick={async () => {
                            const res = await mutate(() => fetch('/api/reseller/providers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) }).then((r) => r.json()), { success: 'Provider removed' })
                            if (res) refreshProviders()
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
              No external providers yet — connect one and sync its services automatically.
            </div>
          )}
        </>
      )}

      {/* ── Bulk import wizard ── */}
      <Dialog open={wizardStep > 0} onOpenChange={(o) => { if (!o) setWizardStep(0) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4" style={{ color: 'var(--brand)' }} /> Bulk import from GrowthRush API
            </DialogTitle>
            <div className="flex items-center gap-1.5 pt-1">
              {['Categories', 'Pricing', 'Review'].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${wizardStep === i + 1 ? 'text-[var(--on-brand)]' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}
                    style={wizardStep === i + 1 ? { background: 'var(--brand)' } : undefined}
                  >
                    {i + 1}. {label}
                  </span>
                  {i < 2 && <span className="h-px w-4 bg-zinc-200 dark:bg-zinc-700" />}
                </div>
              ))}
            </div>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input className="pl-9" placeholder="Search categories…" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} disabled={importing} />
                </div>
                <Button variant="outline" className="font-bold" onClick={toggleAll} disabled={importing || filteredCats.length === 0 || allFilteredSelected}>
                  Select all
                </Button>
                <Button variant="ghost" className="font-bold text-zinc-500 dark:text-zinc-400" disabled={importing || selectedCats.size === 0} onClick={() => setSelectedCats(new Set())}>
                  Clear
                </Button>
              </div>
              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                {filteredCats.map((mc) => {
                  const checked = selectedCats.has(mc.id)
                  return (
                    <div
                      key={mc.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition dark:bg-zinc-900 ${checked ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}`}
                      onClick={() => toggleCat(mc.id)}
                    >
                      <Checkbox aria-label={`Select ${mc.name}`} checked={checked} onClick={(e) => e.stopPropagation()} onCheckedChange={() => toggleCat(mc.id)} disabled={importing} />
                      <SocialLogo icon={mc.icon} size={18} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{mc.name}</span>
                      {mySlugs.has(mc.slug) && <span className="hidden text-[11px] text-zinc-400 sm:inline">merges with yours</span>}
                      <Badge variant="outline" className="text-[11px]">{mc.services.length} services</Badge>
                    </div>
                  )
                })}
                {filteredCats.length === 0 && <p className="py-6 text-center text-[13px] text-zinc-400">No categories match “{catSearch}”</p>}
              </div>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{selectedCats.size} categories · {selectedServices.length} services selected</p>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPriceMode('percent')}
                  disabled={importing}
                  className={`rounded-xl border p-3 text-left transition dark:bg-zinc-900 ${priceMode === 'percent' ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}`}
                >
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" style={{ color: 'var(--brand)' }} />
                    <span className="text-[13px] font-extrabold">Percentage markup — % over master rates</span>
                  </div>
                  <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">Set every price at master rate + X%.</p>
                </button>
                <button
                  type="button"
                  onClick={enterManualMode}
                  disabled={importing}
                  className={`rounded-xl border p-3 text-left transition dark:bg-zinc-900 ${priceMode === 'manual' ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}`}
                >
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" style={{ color: 'var(--brand)' }} />
                    <span className="text-[13px] font-extrabold">Set prices one by one</span>
                  </div>
                  <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">Type a final price for each service.</p>
                </button>
              </div>

              {priceMode === 'percent' ? (
                <div className="rounded-xl border p-4 dark:bg-zinc-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number" className="w-24 text-center font-extrabold" value={percent} disabled={importing}
                      onChange={(e) => setPercent(Math.max(0, Math.min(500, parseInt(e.target.value) || 0)))}
                    />
                    <span className="font-extrabold">%</span>
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400">markup over master rate — e.g. {formatMoney(1, currency, lang)} → {formatMoney(round2(1 * (1 + percent / 100)), currency, lang)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[10, 20, 25, 30, 50, 75, 100].map((m) => (
                      <Button
                        key={m} variant="outline" size="sm"
                        className={`font-bold ${percent === m ? 'border-[var(--brand)] text-[var(--on-brand)]' : ''}`}
                        style={percent === m ? { background: 'var(--brand)' } : undefined}
                        onClick={() => setPercent(m)} disabled={importing}
                      >
                        +{m}%
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="number" placeholder="%" className="w-20" value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} disabled={importing} />
                    <Button variant="outline" size="sm" className="font-bold" onClick={applyPercentToEmpty} disabled={importing}>Apply % to all empty</Button>
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{filledCount}/{selectedServices.length} set — empty fields keep the master rate</span>
                  </div>
                  <div className="gr-scroll max-h-96 divide-y overflow-y-auto rounded-xl border dark:bg-zinc-900">
                    {selectedServices.map((ms) => (
                      <div key={ms.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{ms.name}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">master {formatMoney(ms.rate, currency, lang)} / 1k</p>
                        </div>
                        <Input
                          type="number" step="0.01" min={0.01} inputMode="decimal"
                          className="w-28 text-right" placeholder={round2(ms.rate * 1.2).toFixed(2)}
                          value={manualPrices[ms.id] ?? ''}
                          onFocus={() => { if (!manualPrices[ms.id]) setManualPrices((p) => ({ ...p, [ms.id]: round2(ms.rate * 1.2).toFixed(2) })) }}
                          onChange={(e) => setManualPrices((p) => ({ ...p, [ms.id]: e.target.value }))}
                          disabled={importing}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border p-3 dark:bg-zinc-900">
                  <p className="text-lg font-extrabold">{selectedMasterCats.length}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">categories</p>
                </div>
                <div className="rounded-xl border p-3 dark:bg-zinc-900">
                  <p className="text-lg font-extrabold">{newServicesEstimate}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">new services</p>
                </div>
                <div className="rounded-xl border p-3 dark:bg-zinc-900">
                  <p className="text-lg font-extrabold">{priceMode === 'percent' ? `+${percent}%` : 'Custom'}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">pricing</p>
                </div>
              </div>
              {skippedEstimate > 0 && (
                <p className="rounded-xl border border-dashed p-2.5 text-center text-[12px] text-zinc-500 dark:text-zinc-400">
                  {skippedEstimate} service{skippedEstimate === 1 ? '' : 's'} will be skipped as duplicates (already in your catalog)
                </p>
              )}
              <div className="rounded-xl border p-3 dark:bg-zinc-900">
                <p className="text-[12px] font-bold text-zinc-500 dark:text-zinc-400">Price preview</p>
                <div className="mt-2 space-y-1.5">
                  {selectedServices.slice(0, 3).map((ms) => (
                    <div key={ms.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="truncate">{ms.name}</span>
                      <span className="shrink-0 font-mono text-[12px] text-zinc-500 dark:text-zinc-400">
                        {formatMoney(ms.rate, currency, lang)} → <b className="text-[13px]" style={{ color: 'var(--brand)' }}>{formatMoney(finalPrice(ms), currency, lang)}</b>
                      </span>
                    </div>
                  ))}
                  {selectedServices.length > 3 && <p className="text-[12px] text-zinc-400">+ {selectedServices.length - 3} more…</p>}
                </div>
              </div>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                Importing is free — you’re just setting your own prices over the built-in GrowthRush API. Nothing is charged. Duplicates are skipped automatically and the import stops at your plan’s service limit.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <Button variant="ghost" disabled={importing} onClick={() => (wizardStep === 1 ? setWizardStep(0) : setWizardStep((wizardStep - 1) as 1 | 2))}>
              {wizardStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            {wizardStep === 1 && (
              <Button className="font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={selectedCats.size === 0} onClick={() => setWizardStep(2)}>
                Next: pricing <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {wizardStep === 2 && (
              <Button className="font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={importing} onClick={() => setWizardStep(3)}>
                Next: review <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {wizardStep === 3 && (
              <Button className="font-extrabold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={importing || newServicesEstimate === 0} onClick={runImport}>
                {importing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                {importing ? 'Importing…' : `Import ${newServicesEstimate} services`}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Connect / edit provider (External API add-on required) ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setEdit(null); setAddOpen(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{edit ? 'Edit provider' : 'Connect external provider'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="BestSMM Panel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://provider.com/api/v2" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>API key</Label>
              <Input placeholder="provider api key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Default markup %</Label>
              <Input type="number" value={form.markup} onChange={(e) => setForm({ ...form, markup: e.target.value })} />
            </div>
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={!form.name.trim() || !form.apiUrl.trim()} onClick={save}>
              {edit ? 'Save changes' : 'Connect provider'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sync external provider services (compact) ── */}
      <Dialog open={!!syncProv} onOpenChange={(o) => { if (!o) setSyncProv(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sync services — {syncProv?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Markup % over provider prices</Label>
              <Input type="number" step="0.1" value={syncMarkup} onChange={(e) => setSyncMarkup(e.target.value)} />
            </div>
            <p className="rounded-xl border border-dashed p-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Prices = provider price + {syncMarkup || 0}%. Services update automatically by ID; existing keep their IDs.
            </p>
          </div>
          <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} disabled={syncBusy} onClick={runSync}>
            {syncBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {syncBusy ? 'Syncing…' : 'Sync now'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
