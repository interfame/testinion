'use client'

// Super Admin — Global blacklist: blocked emails, domains, IPs and keywords.

import { useMemo, useState } from 'react'
import { Plus, Trash2, ShieldBan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { apiDel } from './admin-ui'
import { formatDateTime } from '@/lib/format'
import { AdminCard, EmptyState, FieldLabel, TableShell, type AdminBlacklist } from './admin-ui'

const TYPES = ['EMAIL', 'DOMAIN', 'IP', 'KEYWORD']

const TYPE_STYLES: Record<string, string> = {
  EMAIL: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
  DOMAIN: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  IP: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
  KEYWORD: 'bg-teal-50 text-teal-600 border-teal-200',
}

export function BlacklistSection() {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ items: AdminBlacklist[] }>('/api/admin/blacklist')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'EMAIL', value: '', note: '' })
  const [deleting, setDeleting] = useState<AdminBlacklist | null>(null)
  const [filter, setFilter] = useState('ALL')

  const list = useMemo(() => {
    const items = data?.items ?? []
    return filter === 'ALL' ? items : items.filter((i) => i.type === filter)
  }, [data, filter])

  const add = async () => {
    if (!form.value.trim()) return
    const ok = await mutate(
      () => api.post('/api/admin/blacklist', { type: form.type, value: form.value.trim(), note: form.note.trim() || null }),
      { success: t('admin.bl.added') },
    )
    if (ok) { setAdding(false); setForm({ type: 'EMAIL', value: '', note: '' }); refresh() }
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/blacklist', { id: deleting.id }), { success: t('admin.bl.removed') })
    if (ok) { setDeleting(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.blacklist')}
        description={t('admin.bl.desc')}
        actions={
          <Button onClick={() => setAdding(true)} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> {t('admin.bl.addEntry')}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {['ALL', ...TYPES].map((ty) => (
          <button
            key={ty}
            onClick={() => setFilter(ty)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${filter === ty ? 'text-[var(--on-brand)]' : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}
            style={filter === ty ? { background: 'var(--brand)' } : undefined}
          >
            {ty === 'ALL' ? t('common.all') : ty}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <AdminCard><EmptyState icon={ShieldBan} title={t('admin.bl.none')} hint={t('admin.bl.noneHint')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.tx.type')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.bl.value')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.u.note')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.bl.added')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {list.map((i) => (
                <tr key={i.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${TYPE_STYLES[i.type] ?? ''}`}>{i.type}</Badge>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] font-semibold text-zinc-800 dark:text-zinc-100">{i.value}</td>
                  <td className="max-w-[280px] px-3 py-3"><p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">{i.note ?? '—'}</p></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">{formatDateTime(i.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(i)} aria-label={t('admin.bl.removeAria').replace('{value}', i.value)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {/* Add dialog */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.bl.addTitle')}</DialogTitle>
            <DialogDescription>{t('admin.bl.addDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel>{t('admin.tx.type')}</FieldLabel>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint={form.type === 'DOMAIN' ? 'e.g. spam-site.com' : form.type === 'IP' ? 'e.g. 203.0.113.9' : undefined}>{t('admin.bl.value')}</FieldLabel>
              <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'EMAIL' ? 'bad*@spam.com' : '…'} />
            </div>
            <div>
              <FieldLabel hint={t('admin.u.noteHint')}>{t('admin.u.note')}</FieldLabel>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('admin.bl.notePlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            <Button onClick={add} disabled={!form.value.trim()} style={{ background: 'var(--brand)' }}>{t('admin.bl.addCta')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.bl.removeQ').replace('{value}', deleting?.value ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.bl.removeDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>{t('admin.removeCta')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
