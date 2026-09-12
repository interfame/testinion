'use client'

// Super Admin — Plans: SaaS pricing CRUD with features, limits and portal designs.

import { useMemo, useState } from 'react'
import { Plus, Star, Pencil, Trash2, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { apiDel, parseFeatures, parseList, FieldLabel, Money, type AdminPlan } from './admin-ui'

const DESIGN_OPTIONS = ['nova', 'horizon', 'boost']

type PlanForm = {
  name: string
  description: string
  monthlyPrice: string
  annualPrice: string
  setupPrice: string
  customDomainPrice: string
  externalApiPrice: string
  maxServices: string
  maxOrders: string
  designs: string[]
  featuresText: string
  popular: boolean
  active: boolean
  sortOrder: string
}

const EMPTY_FORM: PlanForm = {
  name: '', description: '', monthlyPrice: '29', annualPrice: '290', setupPrice: '0', customDomainPrice: '9.99',
  externalApiPrice: '19.99', maxServices: '500', maxOrders: '100000',
  designs: ['nova', 'horizon', 'boost'], featuresText: '', popular: false, active: true, sortOrder: '0',
}

function planToForm(p: AdminPlan): PlanForm {
  return {
    name: p.name,
    description: p.description ?? '',
    monthlyPrice: String(p.monthlyPrice),
    annualPrice: p.annualPrice == null ? '' : String(p.annualPrice),
    setupPrice: String(p.setupPrice),
    customDomainPrice: String(p.customDomainPrice),
    externalApiPrice: String(p.externalApiPrice),
    maxServices: String(p.maxServices),
    maxOrders: String(p.maxOrders),
    designs: parseList(p.portalDesigns),
    featuresText: parseFeatures(p.features).join('\n'),
    popular: p.popular,
    active: p.active,
    sortOrder: String(p.sortOrder),
  }
}

export function PlansSection() {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ plans: AdminPlan[] }>('/api/admin/plans')
  const [editing, setEditing] = useState<AdminPlan | 'new' | null>(null)
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<AdminPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = () => { setForm(EMPTY_FORM); setEditing('new') }
  const openEdit = (p: AdminPlan) => { setForm(planToForm(p)); setEditing(p) }

  const toggleFlag = async (p: AdminPlan, key: 'popular' | 'active') => {
    const ok = await mutate(
      () => api.patch('/api/admin/plans', { id: p.id, [key]: !p[key] }),
      { success: key === 'popular' ? (p.popular ? t('admin.plans.toastUnpopular') : t('admin.plans.toastPopular')) : (p.active ? t('admin.plans.toastDisabled') : t('admin.plans.toastEnabled')) },
    )
    if (ok) refresh()
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthlyPrice: parseFloat(form.monthlyPrice) || 0,
      annualPrice: form.annualPrice.trim() === '' ? null : parseFloat(form.annualPrice) || null,
      setupPrice: parseFloat(form.setupPrice) || 0,
      customDomainPrice: parseFloat(form.customDomainPrice) || 0,
      externalApiPrice: parseFloat(form.externalApiPrice) || 0,
      maxServices: parseInt(form.maxServices) || 500,
      maxOrders: parseInt(form.maxOrders) || 100000,
      portalDesigns: form.designs.join(','),
      features: JSON.stringify(form.featuresText.split('\n').map((s) => s.trim()).filter(Boolean)),
      popular: form.popular,
      active: form.active,
      sortOrder: parseInt(form.sortOrder) || 0,
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/plans', payload) : api.patch('/api/admin/plans', { id: (editing as AdminPlan).id, ...payload }),
      { success: editing === 'new' ? t('admin.plans.toastCreated') : t('admin.plans.toastUpdated') },
    )
    setSaving(false)
    if (ok) { setEditing(null); refresh() }
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/plans', { id: deleting.id }), { success: t('admin.plans.toastDeleted') })
    if (ok) { setDeleting(null); refresh() }
  }

  const sorted = useMemo(() => [...(data?.plans ?? [])], [data])

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.plans')}
        description={t('admin.plans.desc')}
        actions={
          <Button onClick={openCreate} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> {t('admin.plans.new')}
          </Button>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center text-[13px] text-zinc-400 dark:text-zinc-500">
          {t('admin.plans.none')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md ${p.popular ? 'border-[var(--brand)] ring-1 ring-[var(--brand)]' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{p.name}</h3>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{p.slug}</p>
                </div>
                <button
                  onClick={() => toggleFlag(p, 'popular')}
                  title={p.popular ? t('admin.plans.unmarkPopular') : t('admin.plans.markPopular')}
                  aria-label={t('admin.plans.togglePopular')}
                  className="rounded-full p-1.5 transition hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <Star className={`h-4.5 w-4.5 ${p.popular ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
                </button>
              </div>

              <p className="mt-2 line-clamp-2 min-h-[32px] text-[12px] text-zinc-500 dark:text-zinc-400">{p.description || '—'}</p>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50"><Money usd={p.monthlyPrice} /></span>
                <span className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500">{t('landing.pricing.month')}</span>
                {p.setupPrice > 0 && <span className="ml-2 text-[11px] text-zinc-400 dark:text-zinc-500">+ <Money usd={p.setupPrice} /> {t('admin.plans.setupWord')}</span>}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {parseList(p.portalDesigns).map((d) => (
                  <Badge key={d} variant="outline" className="rounded-full text-[10px] font-bold capitalize">{d}</Badge>
                ))}
                {!p.active && <Badge className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{t('admin.plans.inactive')}</Badge>}
              </div>

              <ul className="mt-3 flex-1 space-y-1">
                {parseFeatures(p.features).slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--brand)' }} /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 text-center text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span>{t('admin.plans.maxServices').replace('{n}', p.maxServices.toLocaleString())}</span>
                <span>{t('admin.plans.maxOrders').replace('{n}', p.maxOrders.toLocaleString())}</span>
                <span className="flex items-center justify-center gap-1"><Store className="h-3 w-3" /> {p._count?.platforms ?? 0}</span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
                <div className="flex items-center gap-1.5">
                  <Switch checked={p.active} onCheckedChange={() => toggleFlag(p, 'active')} aria-label={t('admin.plans.toggleActive')} />
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{p.active ? t('status.ACTIVE') : t('admin.u.disabled')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(p)} aria-label={t('admin.plans.editAria')}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(p)} aria-label={t('admin.plans.deleteAria')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? t('admin.plans.create') : t('admin.plans.edit').replace('{name}', editing === null ? '' : (editing as AdminPlan).name)}</DialogTitle>
            <DialogDescription>{t('admin.plans.formDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel>{t('admin.plans.name')}</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.plans.namePlaceholder')} />
            </div>
            <div>
              <FieldLabel hint={t('admin.u.noteHint')}>{t('admin.tx.description')}</FieldLabel>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('admin.plans.pitchPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><FieldLabel>{t('admin.plans.monthlyPrice')}</FieldLabel><Input type="number" step="0.01" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })} /></div>
              <div><FieldLabel hint={t('buy.cycleSave')}>{t('admin.plans.annualPrice')}</FieldLabel><Input type="number" step="0.01" value={form.annualPrice} onChange={(e) => setForm({ ...form, annualPrice: e.target.value })} placeholder={t('admin.plans.annualPlaceholder')} /></div>
              <div><FieldLabel>{t('admin.plans.setupPrice')}</FieldLabel><Input type="number" step="0.01" value={form.setupPrice} onChange={(e) => setForm({ ...form, setupPrice: e.target.value })} /></div>
              <div><FieldLabel>{t('admin.plans.domainFee')}</FieldLabel><Input type="number" step="0.01" value={form.customDomainPrice} onChange={(e) => setForm({ ...form, customDomainPrice: e.target.value })} /></div>
              <div><FieldLabel>{t('admin.plans.apiFee')}</FieldLabel><Input type="number" step="0.01" value={form.externalApiPrice} onChange={(e) => setForm({ ...form, externalApiPrice: e.target.value })} /></div>
              <div><FieldLabel>{t('admin.plans.maxServicesLabel')}</FieldLabel><Input type="number" value={form.maxServices} onChange={(e) => setForm({ ...form, maxServices: e.target.value })} /></div>
              <div><FieldLabel>{t('admin.plans.maxOrdersLabel')}</FieldLabel><Input type="number" value={form.maxOrders} onChange={(e) => setForm({ ...form, maxOrders: e.target.value })} /></div>
            </div>
            <div>
              <FieldLabel hint={t('admin.plans.designsHint')}>{t('admin.plans.designs')}</FieldLabel>
              <div className="flex flex-wrap gap-4 pt-1">
                {DESIGN_OPTIONS.map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <Checkbox
                      id={`design-${d}`}
                      checked={form.designs.includes(d)}
                      onCheckedChange={(c) =>
                        setForm({ ...form, designs: c ? [...form.designs, d] : form.designs.filter((x) => x !== d) })
                      }
                    />
                    <Label htmlFor={`design-${d}`} className="text-[12.5px] font-semibold capitalize text-zinc-700 dark:text-zinc-200">{d}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel hint={t('admin.plans.onePerLine')}>{t('admin.plans.features')}</FieldLabel>
              <Textarea rows={4} value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} placeholder={t('admin.plans.featuresPlaceholder')} />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="plan-popular" checked={form.popular} onCheckedChange={(c) => setForm({ ...form, popular: c })} />
                <Label htmlFor="plan-popular" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('admin.plans.popular')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="plan-active" checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
                <Label htmlFor="plan-active" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('status.ACTIVE')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="plan-sort" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('admin.plans.sort')}</Label>
                <Input id="plan-sort" type="number" className="h-8 w-20" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()} style={{ background: 'var(--brand)' }}>
              {editing === 'new' ? t('admin.plans.create') : t('admin.o.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.plans.deleteQ').replace('{name}', deleting?.name ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.plans.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>{t('admin.plans.deleteCta')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
