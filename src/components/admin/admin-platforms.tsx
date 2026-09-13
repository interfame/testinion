// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Super Admin — Reseller platforms: status moderation + custom domain approvals.

import { Globe, MoreHorizontal, PauseCircle, PlayCircle, CheckCircle2, XCircle, ExternalLink, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import { api, mutate, useApi } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { themeOf } from '@/lib/themes'
import { AdminCard, AdminDate, EmptyState, Money, TableShell, type AdminPlatform } from './admin-ui'

export function PlatformsSection() {
  const { t } = useI18n()
  const { publicSettings } = useApp()
  // Real domain the platform is installed on (detected from the request server-side)
  const base = publicSettings?.app_host || publicSettings?.subdomain_base || 'growthrush.io'
  const { data, loading, refresh } = useApi<{ platforms: AdminPlatform[] }>('/api/admin/platforms')

  const act = async (p: AdminPlatform, action: 'suspend' | 'activate' | 'approve_domain' | 'reject_domain') => {
    const ok = await mutate(
      () => api.patch('/api/admin/platforms', { id: p.id, action }),
      {
        success:
          action === 'suspend' ? t('admin.p.toastSuspended') :
          action === 'activate' ? t('admin.p.toastActivated') :
          action === 'approve_domain' ? t('admin.p.toastDomainOk') : t('admin.p.toastDomainNo'),
      },
    )
    if (ok) refresh()
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={t('admin.p.title')}
        description={t('admin.p.desc')}
        actions={
          <Button variant="outline" className="min-h-[40px] gap-1.5" onClick={() => window.open('/?storefront=kayasocial', '_blank')} title={t('admin.p.viewStorefront')}>
            <Store className="h-3.5 w-3.5" /> {t('admin.p.demo')}
          </Button>
        }
      />

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (data?.platforms.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.p.none')} hint={t('admin.p.noneHint')} /></AdminCard>
      ) : (
        <>
          {/* Desktop table */}
          <TableShell className="hidden lg:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <th className="px-4 py-3 font-bold">{t('admin.p.platform')}</th>
                  <th className="px-3 py-3 font-bold">{t('admin.p.owner')}</th>
                  <th className="px-3 py-3 font-bold">{t('admin.p.plan')}</th>
                  <th className="px-3 py-3 text-right font-bold">{t('admin.p.clients')}</th>
                  <th className="px-3 py-3 text-right font-bold">{t('admin.p.orders')}</th>
                  <th className="px-3 py-3 font-bold">{t('admin.p.theme')}</th>
                  <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                  <th className="px-3 py-3 font-bold">{t('admin.p.domain')}</th>
                  <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
                {data?.platforms.map((p) => {
                  const th = themeOf(p.theme)
                  return (
                    <tr key={p.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.accent2})` }}>
                            {p.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{p.name}</p>
                            <p className="truncate text-[11.5px] text-zinc-400 dark:text-zinc-500">
                              {p.domainType === 'CUSTOM' && p.customDomain ? p.customDomain : `${p.slug}.${base}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-zinc-700 dark:text-zinc-200">{p.owner?.name}</p>
                        <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">{p.owner?.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className="rounded-full text-[10.5px] font-bold" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand-ink)' }}>
                          {p.plan?.name}
                        </Badge>
                        <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500"><Money usd={p.plan?.monthlyPrice ?? 0} />/mo</p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{p.clientsCount}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{p.ordersCount}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[11px] font-bold capitalize text-zinc-600 dark:text-zinc-300">
                          <span className="h-2 w-2 rounded-full" style={{ background: th.accent }} /> {p.theme}
                        </span>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-3 py-3">
                        {p.domainType === 'CUSTOM' ? (
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                            <StatusBadge status={p.domainStatus} />
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-zinc-400 dark:text-zinc-500">{t('admin.p.subdomain')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline" size="icon"
                            className="h-8 w-8 rounded-full"
                            title={`${t('admin.p.viewStorefront')} (${p.slug}.${base})`}
                            aria-label={`${t('admin.p.viewStorefront')} · ${p.name}`}
                            onClick={() => window.open(`/?storefront=${p.slug}`, '_blank')}
                          >
                            <Store className="h-3.5 w-3.5" />
                          </Button>
                          <PlatformActions p={p} onAct={act} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableShell>

          {/* Mobile/tablet cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
            {data?.platforms.map((p) => {
              const th = themeOf(p.theme)
              return (
                <AdminCard key={p.id} bodyClass="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.accent2})` }}>
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-zinc-800 dark:text-zinc-100">{p.name}</p>
                      <p className="truncate text-[12px] text-zinc-400 dark:text-zinc-500">
                        {p.domainType === 'CUSTOM' && p.customDomain ? p.customDomain : `${p.slug}.${base}`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge className="rounded-full text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)', color: 'var(--brand-ink)' }}>{p.plan?.name}</Badge>
                        <StatusBadge status={p.status} />
                        {p.domainType === 'CUSTOM' && <StatusBadge status={p.domainStatus} />}
                      </div>
                    </div>
                    <PlatformActions p={p} onAct={act} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Metric label={t('admin.p.clients')} value={p.clientsCount} />
                    <Metric label={t('admin.p.orders')} value={p.ordersCount} />
                    <Metric label={t('admin.p.feeMo')} value={<Money usd={p.monthlyFee} />} />
                  </div>
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <ExternalLink className="h-3 w-3" /> {p.owner?.email} · {t('admin.p.since')} <AdminDate d={p.createdAt} />
                  </p>
                </AdminCard>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PlatformActions({ p, onAct }: {
  p: AdminPlatform
  onAct: (p: AdminPlatform, action: 'suspend' | 'activate' | 'approve_domain' | 'reject_domain') => void
}) {
  const { t } = useI18n()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label={`Actions for ${p.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('admin.p.actions')}</DropdownMenuLabel>
        {p.status === 'ACTIVE' ? (
          <DropdownMenuItem onClick={() => onAct(p, 'suspend')}>
            <PauseCircle className="mr-2 h-3.5 w-3.5 text-amber-500" /> {t('admin.p.suspend')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAct(p, 'activate')}>
            <PlayCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" /> {t('admin.p.activate')}
          </DropdownMenuItem>
        )}
        {p.domainType === 'CUSTOM' && p.domainStatus === 'PENDING' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAct(p, 'approve_domain')} className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400">
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> {t('admin.p.approveDomain')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAct(p, 'reject_domain')} className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400">
              <XCircle className="mr-2 h-3.5 w-3.5" /> {t('admin.p.rejectDomain')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-2 py-2">
      <p className="text-[13px] font-extrabold tabular-nums text-zinc-800 dark:text-zinc-100">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
    </div>
  )
}
