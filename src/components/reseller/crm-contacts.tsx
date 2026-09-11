'use client'

// Contacts — searchable CRM address book with labels, LTV and channel filter.

import { useState } from 'react'
import { Pencil, Plus, Search, Users } from 'lucide-react'
import { api, mutate, useApi } from '@/lib/api'
import { useApp } from '@/components/shared/app-context'
import { formatDateTime, formatMoney } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { PageWrap } from './crm-shared'
import {
  CHANNEL_TYPES,
  ChannelIcon,
  ConfirmDelete,
  ContactAvatar,
  EmptyState,
  LabelChips,
  RowsSkeleton,
  channelMeta,
  type CrmContact,
  type CrmLabel,
} from './crm-shared'

type Form = {
  name: string
  phone: string
  email: string
  channel: string
  totalSpent: string
  notes: string
  labels: string[]
}

const EMPTY_FORM: Form = {
  name: '',
  phone: '',
  email: '',
  channel: 'WHATSAPP',
  totalSpent: '0',
  notes: '',
  labels: [],
}

export default function CrmContacts({ platformId }: { platformId: string }) {
  const { lang, currencyOf, user } = useApp()
  const currency = currencyOf(user.platform?.currency ?? 'USD')

  const { data, loading, refresh } = useApi<{ contacts: CrmContact[] }>('/api/reseller/crm/contacts', [platformId])
  const { data: labelData } = useApi<{ labels: CrmLabel[] }>('/api/reseller/crm/labels')
  const labels = labelData?.labels ?? []
  const contacts = data?.contacts ?? []

  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [editing, setEditing] = useState<CrmContact | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const filtered = contacts.filter((c) => {
    if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  })

  const channelCounts: Record<string, number> = {}
  for (const c of contacts) channelCounts[c.channel] = (channelCounts[c.channel] ?? 0) + 1

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setOpen(true)
  }

  function openEdit(c: CrmContact) {
    let current: string[] = []
    try {
      const parsed = JSON.parse(c.labels ?? '[]')
      current = Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      current = []
    }
    setForm({
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      channel: c.channel,
      totalSpent: String(c.totalSpent ?? 0),
      notes: c.notes ?? '',
      labels: current,
    })
    setEditing(c)
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      totalSpent: Number(form.totalSpent) || 0,
      labels: JSON.stringify(form.labels),
    }
    const res = editing
      ? await mutate(() => api.patch('/api/reseller/crm/contacts', { id: editing.id, ...payload }), {
          success: 'Contact updated',
        })
      : await mutate(() => api.post('/api/reseller/crm/contacts', payload), { success: 'Contact created' })
    setSaving(false)
    if (res) {
      setOpen(false)
      refresh()
    }
  }

  async function remove(c: CrmContact) {
    await mutate(() => api.del(`/api/reseller/crm/contacts?id=${c.id}`), {
      success: `${c.name} deleted`,
    })
    refresh()
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title="Contacts"
        description="Every customer across every channel, with labels, lifetime value and history."
        actions={
          <Button onClick={openCreate} className="rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="h-4 w-4" /> New contact
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or email…"
            className="h-9 rounded-xl bg-white dark:bg-zinc-900 pl-8 text-[13px]"
            aria-label="Search contacts"
          />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger size="sm" className="w-full rounded-xl text-xs sm:w-[190px]" aria-label="Filter by channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All channels ({contacts.length})
            </SelectItem>
            {CHANNEL_TYPES.filter((t) => channelCounts[t]).map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {channelMeta(t).label} ({channelCounts[t]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && !data ? (
        <RowsSkeleton n={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={contacts.length === 0 ? 'No contacts yet' : 'No contacts match your filters'}
          description="Contacts are created automatically when customers message you — or add them manually."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Contact</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Phone</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Labels</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Total spent
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Last seen</TableHead>
                  <TableHead className="w-20 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="border-zinc-100 dark:border-zinc-800/70">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <ContactAvatar name={c.name} channel={c.channel} size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-zinc-900 dark:text-zinc-50">{c.name}</p>
                          <p className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                            <ChannelIcon type={c.channel} size={11} />
                            {channelMeta(c.channel).label}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[12.5px] text-zinc-600 dark:text-zinc-300">{c.phone ?? '—'}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-[12.5px] text-zinc-600 dark:text-zinc-300">{c.email ?? '—'}</TableCell>
                    <TableCell>
                      <LabelChips labelsJson={c.labels} labels={labels} empty="—" />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-[13px] font-bold text-zinc-900 dark:text-zinc-50">
                      {formatMoney(c.totalSpent ?? 0, currency, lang)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[12px] text-zinc-500 dark:text-zinc-400">
                      {c.lastSeen ? formatDateTime(c.lastSeen, lang) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete
                          title={`Delete ${c.name}?`}
                          description="Their conversations and messages will be removed too. This cannot be undone."
                          onConfirm={() => remove(c)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'New contact'}</DialogTitle>
            <DialogDescription>Labels help you segment campaigns and automations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="ct-name">Name</Label>
              <Input
                id="ct-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Camila Torres"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ct-phone">Phone</Label>
                <Input
                  id="ct-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+54 9 11 …"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-email">Email</Label>
                <Input
                  id="ct-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@mail.com"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="flex items-center gap-2">
                          <ChannelIcon type={t} size={14} /> {channelMeta(t).label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-spent">Total spent (USD)</Label>
                <Input
                  id="ct-spent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalSpent}
                  onChange={(e) => setForm((f) => ({ ...f, totalSpent: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Labels</Label>
              {labels.length === 0 ? (
                <p className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-2.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                  No labels yet — create some in the Labels section.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5">
                  {labels.map((l) => {
                    const checked = form.labels.includes(l.name)
                    return (
                      <label
                        key={l.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition"
                        style={{
                          borderColor: checked ? l.color : undefined,
                          backgroundColor: checked ? `${l.color}14` : undefined,
                          color: checked ? l.color : '#52525b',
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              labels: v ? [...f.labels, l.name] : f.labels.filter((n) => n !== l.name),
                            }))
                          }
                          aria-label={l.name}
                        />
                        {l.name}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-notes">Notes</Label>
              <Textarea
                id="ct-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Agency owner — buys weekly bundles…"
                className="rounded-xl text-[13px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="rounded-xl text-[var(--on-brand)]"
              style={{ background: 'var(--brand)' }}
            >
              {editing ? 'Save changes' : 'Create contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrap>
  )
}
