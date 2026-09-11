'use client'

// AI Agents — manage the bots that answer conversations per channel.

import { useState } from 'react'
import { Bot, Pencil, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, mutate, useApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  CHANNEL_TYPES,
  CardsSkeleton,
  ChannelIcon,
  ConfirmDelete,
  EmptyState,
  channelMeta,
  parseArr,
  type CrmAgent,
} from './crm-shared'

const PROVIDER_BADGE: Record<string, string> = {
  OPENAI: 'bg-violet-100 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
  CLAUDE: 'bg-orange-100 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/60',
  GEMINI: 'bg-sky-100 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
}

const DEFAULT_MODELS: Record<string, string> = {
  OPENAI: 'gpt-4o-mini',
  CLAUDE: 'claude-3-5-sonnet-latest',
  GEMINI: 'gemini-1.5-flash',
}

type AgentForm = {
  name: string
  provider: string
  model: string
  prompt: string
  knowledge: string
  temperature: number
  channels: string[]
}

const EMPTY_FORM: AgentForm = {
  name: '',
  provider: 'OPENAI',
  model: DEFAULT_MODELS.OPENAI,
  prompt: '',
  knowledge: '',
  temperature: 0.7,
  channels: ['WHATSAPP'],
}

export default function CrmAgents({ platformId }: { platformId: string }) {
  const { data, loading, refresh } = useApi<{ agents: CrmAgent[] }>('/api/reseller/crm/agents', [platformId])
  const agents = data?.agents ?? []

  const [editing, setEditing] = useState<CrmAgent | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setCreateOpen(true)
  }

  function openEdit(a: CrmAgent) {
    setForm({
      name: a.name,
      provider: a.provider,
      model: a.model,
      prompt: a.prompt ?? '',
      knowledge: a.knowledge ?? '',
      temperature: a.temperature,
      channels: parseArr(a.channels),
    })
    setEditing(a)
    setCreateOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { ...form }
    const res = editing
      ? await mutate(() => api.patch('/api/reseller/crm/agents', { id: editing.id, ...payload }), {
          success: 'Agent updated',
        })
      : await mutate(() => api.post('/api/reseller/crm/agents', payload), { success: 'Agent created' })
    setSaving(false)
    if (res) {
      setCreateOpen(false)
      refresh()
    }
  }

  async function toggleActive(a: CrmAgent, active: boolean) {
    await mutate(() => api.patch('/api/reseller/crm/agents', { id: a.id, active }))
    refresh()
  }

  async function remove(a: CrmAgent) {
    await mutate(() => api.del(`/api/reseller/crm/agents?id=${a.id}`), { success: `${a.name} deleted` })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title="AI Agents"
        description="Autonomous bots that sell and support across your channels. Assign them to specific channels or let them cover everything."
        actions={
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> New agent
          </Button>
        }
      />

      {loading && !data ? (
        <CardsSkeleton n={3} height="h-44" />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No AI agents yet"
          description="Create your first agent, give it a prompt and knowledge base, and it will start answering customers on its assigned channels."
        >
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> Create agent
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md',
                a.active ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800 opacity-75',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-bold text-zinc-900 dark:text-zinc-50">{a.name}</h3>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                        PROVIDER_BADGE[a.provider] ?? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800',
                      )}
                    >
                      {a.provider}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11.5px] text-zinc-500 dark:text-zinc-400">{a.model}</p>
                </div>
                <Switch checked={a.active} onCheckedChange={(v) => toggleActive(a, v)} aria-label={`Toggle ${a.name}`} />
              </div>

              <p className="mt-3 line-clamp-2 min-h-[32px] text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {a.prompt || 'No prompt set.'}
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {parseArr(a.channels).length === 0 ? (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">All channels</span>
                ) : (
                  parseArr(a.channels).map((ch) => (
                    <span
                      key={ch}
                      className="flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 text-[10.5px] font-bold text-zinc-600 dark:text-zinc-300"
                    >
                      <ChannelIcon type={ch} size={12} /> {channelMeta(ch).label}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/70 pt-3">
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  {a.resolved.toLocaleString('en-US')} chats resolved
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                    onClick={() => openEdit(a)}
                    aria-label={`Edit ${a.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDelete
                    title={`Delete ${a.name}?`}
                    description="Conversations stay, but this agent stops answering immediately."
                    onConfirm={() => remove(a)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'New AI agent'}</DialogTitle>
            <DialogDescription>
              Prompt + knowledge base drive answers. Assign channels to control where it replies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ag-name">Name</Label>
                <Input
                  id="ag-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Sales Nova"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => setForm((f) => ({ ...f, provider: v, model: DEFAULT_MODELS[v] ?? f.model }))}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['OPENAI', 'CLAUDE', 'GEMINI'].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-model">Model</Label>
              <Input
                id="ag-model"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className="rounded-xl font-mono text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-prompt">System prompt</Label>
              <Textarea
                id="ag-prompt"
                rows={4}
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="You are Nova, the friendly sales agent for {{brand}}. Recommend services, quote prices and upsell bundles…"
                className="rounded-xl text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-knowledge">Knowledge base</Label>
              <Textarea
                id="ag-knowledge"
                rows={3}
                value={form.knowledge}
                onChange={(e) => setForm((f) => ({ ...f, knowledge: e.target.value }))}
                placeholder="Instagram followers $1.8/k · TikTok views $0.03/k · Refunds automatic on failure…"
                className="rounded-xl text-[13px]"
              />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                  {form.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[form.temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([v]) => setForm((f) => ({ ...f, temperature: v }))}
                aria-label="Temperature"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Channels</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 sm:grid-cols-3">
                {CHANNEL_TYPES.map((t) => {
                  const checked = form.channels.includes(t)
                  return (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            channels: v ? [...f.channels, t] : f.channels.filter((c) => c !== t),
                          }))
                        }
                        aria-label={channelMeta(t).label}
                      />
                      <ChannelIcon type={t} size={13} />
                      {channelMeta(t).label}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              {editing ? 'Save changes' : 'Create agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
