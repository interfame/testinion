// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Super Admin — Master catalog categories with social logo preview, icon + color.

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { SOCIAL_ICONS } from '@/lib/social'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { apiDel } from './admin-ui'
import { FieldLabel, type AdminCategory } from './admin-ui'

type CatForm = { name: string; icon: string; color: string; active: boolean; sortOrder: string }

const EMPTY: CatForm = { name: '', icon: 'instagram', color: '#e11d48', active: true, sortOrder: '0' }

export function CategoriesSection() {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ categories: AdminCategory[] }>('/api/admin/categories')
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null)
  const [form, setForm] = useState<CatForm>(EMPTY)
  const [deleting, setDeleting] = useState<AdminCategory | null>(null)

  const openEdit = (c: AdminCategory) => {
    setForm({ name: c.name, icon: c.icon, color: c.color, active: c.status === 'ACTIVE', sortOrder: String(c.sortOrder) })
    setEditing(c)
  }

  const save = async () => {
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      status: form.active ? 'ACTIVE' : 'INACTIVE',
      sortOrder: parseInt(form.sortOrder) || 0,
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/categories', payload) : api.patch('/api/admin/categories', { id: (editing as AdminCategory).id, ...payload }),
      { success: editing === 'new' ? t('admin.cat.toastCreated') : t('admin.cat.toastUpdated') },
    )
    if (ok) { setEditing(null); refresh() }
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/categories', { id: deleting.id }), { success: t('admin.cat.toastDeleted') })
    if (ok) { setDeleting(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.cat.title')}
        description={t('admin.cat.desc')}
        actions={
          <Button onClick={() => { setForm(EMPTY); setEditing('new') }} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> {t('admin.cat.new')}
          </Button>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
        </div>
      ) : (data?.categories.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center text-[13px] text-zinc-400 dark:text-zinc-500">
          {t('admin.cat.none')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.categories.map((c) => (
            <div key={c.id} className="group flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.color} 12%, white)` }}>
                <SocialLogo icon={c.icon} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-bold text-zinc-800 dark:text-zinc-100">{c.name}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="truncate text-[11.5px] text-zinc-400 dark:text-zinc-500">
                  {t('admin.cat.servicesCount').replace('{n}', String(c._count.services)).replace('{s}', String(c.sortOrder))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(c)} aria-label={t('admin.editNamed').replace('{name}', c.name)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(c)} aria-label={t('admin.deleteNamed').replace('{name}', c.name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? t('admin.cat.new') : t('admin.cat.edit')}</DialogTitle>
            <DialogDescription>{t('admin.cat.formDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${form.color} 12%, white)` }}>
                <SocialLogo icon={form.icon} size={24} />
              </span>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{t('admin.cat.previewNote')}</p>
            </div>
            <div>
              <FieldLabel>{t('admin.cat.name')}</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.cat.namePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{t('admin.cat.icon')}</FieldLabel>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Object.keys(SOCIAL_ICONS).map((key) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <SocialLogo icon={key} size={14} />
                          <span className="capitalize">{SOCIAL_ICONS[key].label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>{t('admin.cat.color')}</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    aria-label={t('admin.cat.colorAria')}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1"
                  />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 font-mono text-[12px]" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{t('admin.cat.sort')}</FieldLabel>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch id="cat-active" checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
                <Label htmlFor="cat-active" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('status.ACTIVE')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={!form.name.trim()} style={{ background: 'var(--brand)' }}>
              {editing === 'new' ? t('admin.cat.create') : t('admin.o.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteQ').replace('{name}', deleting?.name ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.cat.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>{t('admin.deleteCta')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
