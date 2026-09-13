// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Quick replies — canned responses one click away inside the inbox composer.

import { useState } from 'react'
import { Pencil, Plus, Zap } from 'lucide-react'
import { api, mutate, useApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { CardsSkeleton, ConfirmDelete, EmptyState, type CrmQuickReply } from './crm-shared'

type Form = { title: string; body: string; shortcut: string }
const EMPTY_FORM: Form = { title: '', body: '', shortcut: '' }

export default function CrmQuickReplies({ platformId }: { platformId: string }) {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ quickReplies: CrmQuickReply[] }>(
    '/api/reseller/crm/quick-replies',
    [platformId],
  )
  const quickReplies = data?.quickReplies ?? []

  const [editing, setEditing] = useState<CrmQuickReply | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setOpen(true)
  }

  function openEdit(q: CrmQuickReply) {
    setForm({ title: q.title, body: q.body, shortcut: q.shortcut ?? '' })
    setEditing(q)
    setOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    const res = editing
      ? await mutate(() => api.patch('/api/reseller/crm/quick-replies', { id: editing.id, ...form }), {
          success: t('crm.qrUpdated'),
        })
      : await mutate(() => api.post('/api/reseller/crm/quick-replies', form), { success: t('crm.qrCreated') })
    setSaving(false)
    if (res) {
      setOpen(false)
      refresh()
    }
  }

  async function remove(q: CrmQuickReply) {
    await mutate(() => api.del(`/api/reseller/crm/quick-replies?id=${q.id}`), {
      success: t('crm.deleted').replace('{name}', q.title),
    })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title={t('reseller.quickReplies')}
        description={t('crm.qrDesc')}
        actions={
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> {t('crm.newQr')}
          </Button>
        }
      />

      {loading && !data ? (
        <CardsSkeleton n={4} height="h-24" />
      ) : quickReplies.length === 0 ? (
        <EmptyState
          icon={Zap}
          title={t('crm.qrEmpty')}
          description={t('crm.qrEmptySub')}
        >
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> {t('crm.createOne')}
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickReplies.map((q) => (
            <div
              key={q.id}
              className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-bold text-zinc-900 dark:text-zinc-50">{q.title}</h3>
                  {q.shortcut && (
                    <code className="mt-1 inline-block rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400">
                      {q.shortcut}
                    </code>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                    onClick={() => openEdit(q)}
                    aria-label={t('crm.editAria').replace('{name}', q.title)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDelete
                    title={t('crm.delQ').replace('{name}', q.title)}
                    description={t('crm.delQrDesc')}
                    onConfirm={() => remove(q)}
                  />
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">{q.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t('crm.editName').replace('{name}', editing.title) : t('crm.newQr')}</DialogTitle>
            <DialogDescription>{t('crm.qrFormDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="qr-title">{t('rst.titleLabel')}</Label>
              <Input
                id="qr-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('crm.phTitle')}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-shortcut">{t('crm.shortcutOpt')}</Label>
              <Input
                id="qr-shortcut"
                value={form.shortcut}
                onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value }))}
                placeholder="/prices"
                className="rounded-xl font-mono text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-body">{t('admin.content.body')}</Label>
              <Textarea
                id="qr-body"
                rows={5}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder={t('crm.phBody')}
                className="rounded-xl text-[13px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={save}
              disabled={saving || !form.title.trim() || !form.body.trim()}
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              {editing ? t('rcat.saveChanges') : t('crm.createQr')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
