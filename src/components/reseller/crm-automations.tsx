'use client'

// Automations — trigger → action rules that run without human input.

import { useState } from 'react'
import { MessageSquare, Pencil, Plus, Tag, UserPlus, Workflow, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, mutate, useApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { PageWrap } from './crm-shared'
import { useI18n, type DictKey } from '@/lib/i18n'
import {
  CardsSkeleton,
  ConfirmDelete,
  EmptyState,
  parseRows,
  type CrmAutomation,
} from './crm-shared'

const TRIGGERS = ['KEYWORD', 'WELCOME', 'AWAY_HOURS', 'NO_REPLY', 'HANDOFF']

const TRIGGER_BADGE: Record<string, string> = {
  KEYWORD: 'bg-violet-100 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
  WELCOME: 'bg-emerald-100 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
  AWAY_HOURS: 'bg-amber-100 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  NO_REPLY: 'bg-orange-100 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/60',
  HANDOFF: 'bg-sky-100 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
}

const TRIGGER_LABEL: Record<string, DictKey> = {
  KEYWORD: 'crm.trgKeyword',
  WELCOME: 'crm.trgWelcome',
  AWAY_HOURS: 'crm.trgAway',
  NO_REPLY: 'crm.trgNoReply',
  HANDOFF: 'crm.trgHandoff',
}

const TRIGGER_HINT: Record<string, DictKey> = {
  KEYWORD: 'crm.hKeyword',
  WELCOME: 'crm.hWelcome',
  AWAY_HOURS: 'crm.hAway',
  NO_REPLY: 'crm.hNoReply',
  HANDOFF: 'crm.hHandoff',
}

const ACTION_TYPES = [
  { value: 'send_message', labelKey: 'crm.actSend' as DictKey },
  { value: 'add_label', labelKey: 'crm.actLabel' as DictKey },
  { value: 'assign', labelKey: 'crm.actAssign' as DictKey },
]

const ACTION_ICON: Record<string, typeof MessageSquare> = {
  send_message: MessageSquare,
  add_label: Tag,
  assign: UserPlus,
}

type ActionRow = { type: string; value: string }
type Form = { name: string; trigger: string; matchValue: string; actions: ActionRow[] }

const EMPTY_FORM: Form = {
  name: '',
  trigger: 'KEYWORD',
  matchValue: '',
  actions: [{ type: 'send_message', value: '' }],
}

export default function CrmAutomations({ platformId }: { platformId: string }) {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ automations: CrmAutomation[] }>(
    '/api/reseller/crm/automations',
    [platformId],
  )
  const automations = data?.automations ?? []

  const [editing, setEditing] = useState<CrmAutomation | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setOpen(true)
  }

  function openEdit(a: CrmAutomation) {
    setForm({
      name: a.name,
      trigger: a.trigger,
      matchValue: a.matchValue ?? '',
      actions: parseRows(a.actions).length ? parseRows(a.actions) : [{ type: 'send_message', value: '' }],
    })
    setEditing(a)
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const res = editing
      ? await mutate(() => api.patch('/api/reseller/crm/automations', { id: editing.id, ...form }), {
          success: t('crm.autoUpdated'),
        })
      : await mutate(() => api.post('/api/reseller/crm/automations', form), { success: t('crm.autoCreated') })
    setSaving(false)
    if (res) {
      setOpen(false)
      refresh()
    }
  }

  async function toggleActive(a: CrmAutomation, active: boolean) {
    await mutate(() => api.patch('/api/reseller/crm/automations', { id: a.id, active }))
    refresh()
  }

  async function remove(a: CrmAutomation) {
    await mutate(() => api.del(`/api/reseller/crm/automations?id=${a.id}`), { success: t('crm.deleted').replace('{name}', a.name) })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title={t('reseller.automations')}
        description={t('crm.autosDesc')}
        actions={
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> {t('crm.newAutomation')}
          </Button>
        }
      />

      {loading && !data ? (
        <CardsSkeleton n={4} height="h-44" />
      ) : automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title={t('crm.autosEmpty')}
          description={t('crm.autosEmptySub')}
        >
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> {t('crm.createAutomation')}
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {automations.map((a) => {
            const actions = parseRows(a.actions)
            return (
              <div
                key={a.id}
                className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-bold text-zinc-900 dark:text-zinc-50">{a.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          TRIGGER_BADGE[a.trigger] ?? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
                        )}
                      >
                        {t(TRIGGER_LABEL[a.trigger] ?? 'crm.trgKeyword')}
                      </span>
                      {a.matchValue && (
                        <code className="max-w-[180px] truncate rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400">
                          {a.matchValue}
                        </code>
                      )}
                    </div>
                  </div>
                  <Switch checked={a.active} onCheckedChange={(v) => toggleActive(a, v)} aria-label={t('crm.toggleAria').replace('{name}', a.name)} />
                </div>

                <div className="mt-3 space-y-1.5">
                  {actions.length === 0 ? (
                    <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">{t('crm.noActions')}</p>
                  ) : (
                    actions.map((act, i) => {
                      const Icon = ACTION_ICON[act.type] ?? Zap
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg border border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40 px-2.5 py-1.5 text-[12px]"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand)' }} />
                          <span className="truncate font-semibold text-zinc-700 dark:text-zinc-200">
                            {t(ACTION_TYPES.find((at) => at.value === act.type)?.labelKey ?? 'crm.actSend')}
                          </span>
                          {act.value && <span className="truncate text-zinc-500 dark:text-zinc-400">· {act.value}</span>}
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
                  <span className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {a.runs.toLocaleString('en-US')} {t('crm.runs')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                      onClick={() => openEdit(a)}
                      aria-label={t('crm.editAria').replace('{name}', a.name)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDelete
                      title={t('crm.delQ').replace('{name}', a.name)}
                      description={t('crm.delAutoDesc')}
                      onConfirm={() => remove(a)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70">
          <DialogHeader>
            <DialogTitle>{editing ? t('crm.editName').replace('{name}', editing.name) : t('crm.newAutomation')}</DialogTitle>
            <DialogDescription>{t('crm.autoFormDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="au-name">{t('rcat.name')}</Label>
              <Input
                id="au-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('crm.phAutoName')}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('crm.trigger')}</Label>
                <Select value={form.trigger} onValueChange={(v) => setForm((f) => ({ ...f, trigger: v }))}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((tr) => (
                      <SelectItem key={tr} value={tr}>
                        {t(TRIGGER_LABEL[tr] ?? 'crm.trgKeyword')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-match">{t('crm.matchValue')}</Label>
                <Input
                  id="au-match"
                  value={form.matchValue}
                  onChange={(e) => setForm((f) => ({ ...f, matchValue: e.target.value }))}
                  placeholder={TRIGGER_HINT[form.trigger] ? t(TRIGGER_HINT[form.trigger]) : t('admin.bl.value')}
                  className="rounded-xl"
                />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t(TRIGGER_HINT[form.trigger])}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('crm.actionsLabel')}</Label>
              <div className="space-y-2">
                {form.actions.map((act, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={act.type}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          actions: f.actions.map((a2, j) => (j === i ? { ...a2, type: v } : a2)),
                        }))
                      }
                    >
                      <SelectTrigger size="sm" className="w-[150px] shrink-0 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((at) => (
                          <SelectItem key={at.value} value={at.value} className="text-xs">
                            {t(at.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={act.value}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          actions: f.actions.map((a2, j) => (j === i ? { ...a2, value: e.target.value } : a2)),
                        }))
                      }
                      placeholder={
                        act.type === 'send_message'
                          ? t('crm.phMsg')
                          : act.type === 'add_label'
                            ? t('crm.phLabelName')
                            : t('crm.phTeammate')
                      }
                      className="h-8 flex-1 rounded-lg text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400"
                      onClick={() => setForm((f) => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))}
                      aria-label={t('crm.rmAction')}
                      disabled={form.actions.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs font-bold"
                onClick={() =>
                  setForm((f) => ({ ...f, actions: [...f.actions, { type: 'send_message', value: '' }] }))
                }
              >
                <Plus className="h-3.5 w-3.5" /> {t('crm.addAction')}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              {editing ? t('rcat.saveChanges') : t('crm.createAutomation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
