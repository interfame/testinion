'use client'

// Super Admin — Staff team for the master platform: roles, granular permissions, status.

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { apiDel } from './admin-ui'
import { AdminCard, EmptyState, FieldLabel, InitialAvatar, TableShell, type AdminTeamMember } from './admin-ui'

const ROLES = ['ADMIN', 'SUPPORT', 'FINANCE', 'CONTENT']
const PERMISSIONS = [
  { key: 'inbox', label: 'Inbox / CRM' },
  { key: 'tickets', label: 'Support tickets' },
  { key: 'deposits', label: 'Deposits & finance' },
  { key: 'content', label: 'Content & CMS' },
  { key: 'catalog', label: 'Catalog management' },
]

type StaffForm = { name: string; email: string; role: string; permissions: string[]; active: boolean }
const EMPTY: StaffForm = { name: '', email: '', role: 'SUPPORT', permissions: ['tickets'], active: true }

function parsePerms(s: string): string[] {
  try {
    const arr = JSON.parse(s || '[]')
    return Array.isArray(arr) ? arr.map(String) : []
  } catch { return [] }
}

export function StaffSection() {
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ staff: AdminTeamMember[] }>('/api/admin/staff')
  const [editing, setEditing] = useState<AdminTeamMember | 'new' | null>(null)
  const [form, setForm] = useState<StaffForm>(EMPTY)
  const [deleting, setDeleting] = useState<AdminTeamMember | null>(null)

  const open = (m: AdminTeamMember | 'new') => {
    if (m === 'new') setForm(EMPTY)
    else setForm({ name: m.name, email: m.email, role: m.role, permissions: parsePerms(m.permissions), active: m.status === 'ACTIVE' })
    setEditing(m)
  }

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    const payload = {
      name: form.name.trim(), email: form.email.trim(), role: form.role,
      permissions: form.permissions, status: form.active ? 'ACTIVE' : 'SUSPENDED',
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/staff', payload) : api.patch('/api/admin/staff', { id: (editing as AdminTeamMember).id, ...payload }),
      { success: editing === 'new' ? 'Team member added' : 'Team member updated' },
    )
    if (ok) { setEditing(null); refresh() }
  }

  const toggleStatus = async (m: AdminTeamMember, active: boolean) => {
    const ok = await mutate(
      () => api.patch('/api/admin/staff', { id: m.id, status: active ? 'ACTIVE' : 'SUSPENDED' }),
      { success: active ? 'Member activated' : 'Member suspended' },
    )
    if (ok) refresh()
  }

  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/staff', { id: deleting.id }), { success: 'Team member removed' })
    if (ok) { setDeleting(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.staff.title')}
        description={t('admin.staff.desc')}
        actions={
          <Button onClick={() => open('new')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Plus className="mr-1 h-4 w-4" /> Add member
          </Button>
        }
      />

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (data?.staff.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.staff.noneTitle')} hint={t('admin.staff.noneHint')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">Member</th>
                <th className="px-3 py-3 font-bold">Role</th>
                <th className="px-3 py-3 font-bold">Permissions</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.staff.map((m) => (
                <tr key={m.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <InitialAvatar name={m.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{m.name}</p>
                        <p className="truncate text-[11.5px] text-zinc-400 dark:text-zinc-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className="rounded-full text-[10.5px] font-bold" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand)' }}>{m.role}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {parsePerms(m.permissions).map((p) => (
                        <Badge key={p} variant="outline" className="rounded-full text-[9.5px] font-bold capitalize">{p}</Badge>
                      ))}
                      {parsePerms(m.permissions).length === 0 && <span className="text-[11.5px] text-zinc-300 dark:text-zinc-600">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={m.status === 'ACTIVE'} onCheckedChange={(v) => toggleStatus(m, v)} aria-label={`Toggle ${m.name}`} />
                      <StatusBadge status={m.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => open(m)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting(m)} aria-label={t('admin.deleteCta')}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <DialogTitle>{editing === 'new' ? 'Add team member' : 'Edit team member'}</DialogTitle>
            <DialogDescription>Staff get restricted panel access based on their permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><FieldLabel>Name</FieldLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><FieldLabel>Email</FieldLabel><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint="module access">Permissions</FieldLabel>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                {PERMISSIONS.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${p.key}`}
                      checked={form.permissions.includes(p.key)}
                      onCheckedChange={(c) =>
                        setForm({ ...form, permissions: c ? [...form.permissions, p.key] : form.permissions.filter((x) => x !== p.key) })
                      }
                    />
                    <Label htmlFor={`perm-${p.key}`} className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200">{p.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="staff-active" checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
              <Label htmlFor="staff-active" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.email.trim()} style={{ background: 'var(--brand)' }}>
              {editing === 'new' ? 'Add member' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access to the staff panel immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
