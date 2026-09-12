'use client'

// Labels — color-coded tags used to segment contacts and conversations.

import { useState } from 'react'
import { Check, Pencil, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, mutate, useApi } from '@/lib/api'
import { useApp } from '@/components/shared/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { PageWrap } from './crm-shared'
import { useI18n } from '@/lib/i18n'
import { CardsSkeleton, ConfirmDelete, EmptyState, type CrmLabel } from './crm-shared'

const SWATCHES = [
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#64748b',
]

export default function CrmLabels({ platformId }: { platformId: string }) {
  const { lang } = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ labels: CrmLabel[] }>('/api/reseller/crm/labels', [platformId])
  const labels = data?.labels ?? []

  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [editing, setEditing] = useState<CrmLabel | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(SWATCHES[0])

  async function create() {
    if (!name.trim()) return
    const res = await mutate(() => api.post('/api/reseller/crm/labels', { name, color }), {
      success: t('crm.labelCreated'),
    })
    if (res) {
      setName('')
      setColor(SWATCHES[(SWATCHES.indexOf(color) + 1) % SWATCHES.length])
      refresh()
    }
  }

  function openEdit(l: CrmLabel) {
    setEditing(l)
    setEditName(l.name)
    setEditColor(l.color)
  }

  async function saveEdit() {
    if (!editing || !editName.trim()) return
    const res = await mutate(
      () => api.patch('/api/reseller/crm/labels', { id: editing.id, name: editName, color: editColor }),
      { success: t('crm.labelUpdated') },
    )
    if (res) {
      setEditing(null)
      refresh()
    }
  }

  async function remove(l: CrmLabel) {
    await mutate(() => api.del(`/api/reseller/crm/labels?id=${l.id}`), { success: t('crm.deleted').replace('{name}', l.name) })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title={t('reseller.labels')}
        description={t('crm.labelsDesc')}
      />

      {/* Create form */}
      <div className="mb-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="lb-name" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {t('crm.labelName')}
            </label>
            <Input
              id="lb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
              }}
              placeholder="VIP, Lead, Support…"
              className="rounded-xl"
            />
          </div>
          <div className="sm:w-auto">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{t('crm.color')}</p>
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`${t('crm.color')} ${c}`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition',
                    color === c ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={create}
            disabled={!name.trim()}
            className="h-9 shrink-0 rounded-xl text-[var(--on-brand)]"
            style={{ background: 'var(--brand)' }}
          >
            {t('crm.createLabel')}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <CardsSkeleton n={4} height="h-20" />
      ) : labels.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={t('crm.labelsEmpty')}
          description={t('crm.labelsEmptySub')}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {labels.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-zinc-900 dark:text-zinc-50">{l.name}</p>
                  <p className="font-mono text-[10.5px] uppercase text-zinc-400 dark:text-zinc-500">{l.color}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                  onClick={() => openEdit(l)}
                  aria-label={t('crm.renameAria').replace('{name}', l.name)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDelete
                  title={t('crm.delQ').replace('{name}', l.name)}
                  description={t('crm.delLabelDesc')}
                  onConfirm={() => remove(l)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('crm.renameLabel')}</DialogTitle>
            <DialogDescription>{t('crm.renameDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t('crm.labelName')}
              className="rounded-xl"
              aria-label={t('crm.labelName')}
            />
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  aria-label={`${t('crm.color')} ${c}`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition',
                    editColor === c ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                >
                  {editColor === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={saveEdit}
              disabled={!editName.trim()}
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
