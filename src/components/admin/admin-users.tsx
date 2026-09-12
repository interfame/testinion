'use client'

// Super Admin — Users: search, role/status filters, inline role change, balance adjustments, moderation.

import { useMemo, useState } from 'react'
import { MoreHorizontal, Search, Eye, PauseCircle, PlayCircle, Ban, Scale, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { PanelPageHeader, StatusBadge, useEnumLabel, ROLE_KEYS } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import {
  AdminCard, AdminDate, EmptyState, FieldLabel, InitialAvatar, Money, TableShell,
  useDebounced, type AdminUser,
} from './admin-ui'

const ROLES = ['CLIENT', 'RESELLER', 'SUPER_ADMIN'] as const

export function UsersSection() {
  const { t } = useI18n()
  const roleLabel = useEnumLabel(ROLE_KEYS)
  const statusLabel = useEnumLabel()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const dq = useDebounced(q)

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (dq.trim()) p.set('q', dq.trim())
    if (role !== 'ALL') p.set('role', role)
    if (status !== 'ALL') p.set('status', status)
    return `/api/admin/users?${p.toString()}`
  }, [dq, role, status])

  const { data, loading, refresh } = useApi<{ users: AdminUser[] }>(url, [url])

  const [adjustFor, setAdjustFor] = useState<AdminUser | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [viewing, setViewing] = useState<AdminUser | null>(null)
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)

  const setStatusFor = async (u: AdminUser, action: 'suspend' | 'activate' | 'ban') => {
    const ok = await mutate(
      () => api.patch('/api/admin/users', { id: u.id, action }),
      { success: action === 'ban' ? t('admin.u.toastBanned') : action === 'suspend' ? t('admin.u.toastSuspended') : t('admin.u.toastActivated') },
    )
    if (ok) refresh()
  }

  const setRoleFor = async (u: AdminUser, nextRole: string) => {
    const ok = await mutate(
      () => api.patch('/api/admin/users', { id: u.id, action: 'set_role', role: nextRole }),
      { success: t('admin.u.toastRoleSet').replace('{role}', roleLabel(nextRole)) },
    )
    if (ok) refresh()
  }

  const adjustBalance = async () => {
    if (!adjustFor) return
    const ok = await mutate(
      () => api.patch('/api/admin/users', { id: adjustFor.id, action: 'adjust_balance', amount, note }),
      { success: t('admin.u.toastAdjusted') },
    )
    if (ok) {
      setAdjustFor(null)
      setAmount('')
      setNote('')
      refresh()
    }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.users')}
        description={t('admin.u.desc')}
      />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.u.search')} className="h-9 rounded-full pl-9 text-[13px]" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-9 w-full rounded-full text-[12.5px] font-semibold sm:w-40"><SelectValue placeholder={t('admin.u.role')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.u.allRoles')}</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-full rounded-full text-[12.5px] font-semibold sm:w-40"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.u.allStatuses')}</SelectItem>
            {['ACTIVE', 'SUSPENDED', 'BANNED'].map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500 sm:ml-auto">{t('admin.u.count').replace('{n}', String(data?.users.length ?? 0))}</span>
      </div>

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (data?.users.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.u.none')} hint={t('admin.u.noneHint')} /></AdminCard>
      ) : (
        <>
          {/* Desktop table */}
          <TableShell className="hidden md:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <th className="px-4 py-3 font-bold">{t('admin.u.user')}</th>
                  <th className="px-3 py-3 font-bold">{t('admin.u.role')}</th>
                  <th className="px-3 py-3 text-right font-bold">{t('admin.u.balance')}</th>
                  <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                  <th className="px-3 py-3 font-bold">{t('admin.u.joined')}</th>
                  <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                {data?.users.map((u) => (
                  <tr key={u.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <InitialAvatar name={u.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{u.name}</p>
                          <p className="truncate text-[12px] text-zinc-400 dark:text-zinc-500">{u.email}</p>
                        </div>
                        {u.platform && (
                          <Badge variant="outline" className="hidden shrink-0 rounded-full text-[10px] font-bold lg:inline-flex">
                            {u.platform.name}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Select value={u.role} onValueChange={(v) => setRoleFor(u, v)}>
                        <SelectTrigger className="h-7 w-[130px] rounded-full border-zinc-200 dark:border-zinc-800 text-[11.5px] font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-zinc-800 dark:text-zinc-100"><Money usd={u.balance} /></td>
                    <td className="px-3 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-3 py-3"><AdminDate d={u.createdAt} /></td>
                    <td className="px-4 py-3 text-right">
                      <UserActions
                        user={u}
                        onView={() => setViewing(u)}
                        onAdjust={() => { setAdjustFor(u); setAmount(''); setNote('') }}
                        onSuspend={() => setStatusFor(u, 'suspend')}
                        onActivate={() => setStatusFor(u, 'activate')}
                        onBan={() => setBanTarget(u)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {data?.users.map((u) => (
              <AdminCard key={u.id} bodyClass="p-4">
                <div className="flex items-start gap-3">
                  <InitialAvatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-zinc-800 dark:text-zinc-100">{u.name}</p>
                    <p className="truncate text-[12px] text-zinc-400 dark:text-zinc-500">{u.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="rounded-full text-[10px] font-bold">{roleLabel(u.role)}</Badge>
                      <StatusBadge status={u.status} />
                      <span className="text-[12px] font-bold text-zinc-700 dark:text-zinc-200"><Money usd={u.balance} /></span>
                    </div>
                  </div>
                  <UserActions
                    user={u}
                    onView={() => setViewing(u)}
                    onAdjust={() => { setAdjustFor(u); setAmount(''); setNote('') }}
                    onSuspend={() => setStatusFor(u, 'suspend')}
                    onActivate={() => setStatusFor(u, 'activate')}
                    onBan={() => setBanTarget(u)}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">{t('admin.u.joined')} <AdminDate d={u.createdAt} /></p>
              </AdminCard>
            ))}
          </div>
        </>
      )}

      {/* Adjust balance dialog */}
      <Dialog open={!!adjustFor} onOpenChange={(o) => !o && setAdjustFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.u.adjust')}</DialogTitle>
            <DialogDescription>
              {adjustFor?.name} · {t('admin.u.currentBalance')} <Money usd={adjustFor?.balance ?? 0} />. {t('admin.u.negativeHint')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel hint={t('admin.u.amountHint')}>{t('common.amount')}</FieldLabel>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('admin.u.amountPlaceholder')} />
            </div>
            <div>
              <FieldLabel hint={t('admin.u.noteHint')}>{t('admin.u.note')}</FieldLabel>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('admin.u.notePlaceholder')} />
            </div>
            <p className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2 text-[11.5px] text-zinc-500 dark:text-zinc-400">
              {t('admin.u.adjustNote')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustFor(null)}>{t('common.cancel')}</Button>
            <Button style={{ background: 'var(--brand)' }} onClick={adjustBalance} disabled={!amount}>{t('admin.u.apply')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban confirm */}
      <AlertDialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.u.banQ')}</AlertDialogTitle>
            <AlertDialogDescription>
              {banTarget?.name} · {t('admin.u.banDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => { if (banTarget) setStatusFor(banTarget, 'ban'); setBanTarget(null) }}
            >
              {t('admin.u.banConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View user dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <InitialAvatar name={viewing?.name ?? '?'} /> {viewing?.name}
            </DialogTitle>
            <DialogDescription>{viewing?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Detail label={t('admin.u.role')} value={viewing ? roleLabel(viewing.role) : '—'} />
            <Detail label={t('common.status')} value={viewing ? statusLabel(viewing.status) : '—'} />
            <Detail label={t('admin.u.balance')} value={viewing ? <Money usd={viewing.balance} /> : '—'} />
            <Detail label={t('admin.u.currency')} value={viewing?.currency ?? '—'} />
            <Detail label={t('admin.u.platform')} value={viewing?.platform?.name ?? t('admin.u.master')} />
            <Detail label={t('admin.u.2fa')} value={viewing?.twoFactorEnabled ? t('admin.u.enabled') : t('admin.u.disabled')} />
            <div className="col-span-2">
              <Detail label={t('admin.u.joined')} value={viewing ? <AdminDate d={viewing.createdAt} /> : '—'} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserActions({ user, onView, onAdjust, onSuspend, onActivate, onBan }: {
  user: AdminUser
  onView: () => void
  onAdjust: () => void
  onSuspend: () => void
  onActivate: () => void
  onBan: () => void
}) {
  const { t } = useI18n()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label={t('admin.u.actionsFor').replace('{name}', user.name)}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('admin.u.userActions')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-3.5 w-3.5" /> {t('admin.u.details')}</DropdownMenuItem>
        <DropdownMenuItem onClick={onAdjust}><Scale className="mr-2 h-3.5 w-3.5" /> {t('admin.u.adjust')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status === 'ACTIVE' && (
          <DropdownMenuItem onClick={onSuspend}><PauseCircle className="mr-2 h-3.5 w-3.5 text-amber-500" /> {t('admin.u.suspend')}</DropdownMenuItem>
        )}
        {user.status !== 'ACTIVE' && (
          <DropdownMenuItem onClick={onActivate}><PlayCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" /> {t('admin.u.activate')}</DropdownMenuItem>
        )}
        {user.status !== 'BANNED' && (
          <DropdownMenuItem onClick={onBan} className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400">
            <Ban className="mr-2 h-3.5 w-3.5" /> {t('admin.u.ban')}
          </DropdownMenuItem>
        )}
        {user.status === 'ACTIVE' && (
          <DropdownMenuItem disabled><ShieldCheck className="mr-2 h-3.5 w-3.5" /> {t('admin.u.goodStanding')}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 font-semibold capitalize text-zinc-800 dark:text-zinc-100">{value}</p>
    </div>
  )
}
