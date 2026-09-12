'use client'

// Client portal — Services price list

import { useMemo, useState, type ReactNode } from 'react'
import { Ban, ChevronDown, Droplets, LayoutGrid, Repeat, Search, ShoppingBag, Star } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { SocialLogo } from '@/components/shared/social-logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClientData } from '../client-data'
import { useMoney, Card, Pill, EmptyState, LoadingRows, TableWrap } from '../bits'
import type { CatalogService } from '../types'

export default function ServicesSection({ onOrder }: { onOrder: (categoryId: string, serviceId: string) => void }) {
  const { t } = useI18n()
  const m = useMoney()
  const { catalog, catalogLoading } = useClientData()
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const totalServices = useMemo(
    () => catalog.categories.reduce((s, c) => s + c.services.length, 0),
    [catalog.categories],
  )

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.categories
      .filter((c) => catFilter === 'all' || c.id === catFilter)
      .map((c) => ({
        ...c,
        services: q
          ? c.services.filter((s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q))
          : c.services,
      }))
      .filter((c) => c.services.length > 0)
  }, [catalog.categories, query, catFilter])

  const shown = groups.reduce((s, g) => s + g.services.length, 0)

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function serviceBadges(s: CatalogService) {
    return (
      <span className="flex flex-wrap gap-1">
        {s.refill && <Pill tone="emerald"><Repeat className="h-2.5 w-2.5" /> {t('client.refill')}</Pill>}
        {s.dripfeed && <Pill tone="sky"><Droplets className="h-2.5 w-2.5" /> {t('cord.dripfeed')}</Pill>}
        {!s.cancel && <Pill tone="rose"><Ban className="h-2.5 w-2.5" /> {t('csvc.noCancel')}</Pill>}
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('common.services')}
        description={t('csvc.desc').replace('{total}', String(totalServices)).replace('{shown}', String(shown))}
      />

      {/* Toolbar */}
      <Card className="mb-4 p-4 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="svc-search">{t('common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <Input
                id="svc-search"
                className="min-h-[40px] pl-9"
                placeholder={t('csvc.searchPh')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full space-y-1.5 sm:w-72">
            <Label>{t('common.category')}</Label>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="min-h-[40px] w-full">
                <SelectValue placeholder={t('csvc.allCategories')} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">
                  <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-zinc-400 dark:text-zinc-500" /> {t('csvc.allCategories')}</span>
                </SelectItem>
                {catalog.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <SocialLogo icon={c.icon} size={14} />
                      <span className="truncate">{c.name}</span>
                      <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">({c.services.length})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {catalogLoading ? (
        <Card><LoadingRows rows={8} /></Card>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('csvc.noneTitle')}
          message={t('csvc.noneDesc')}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((c) => (
            <Card key={c.id} className="p-0 sm:p-0">
              {/* Category header */}
              <div
                className="flex items-center gap-3 rounded-t-2xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 sm:px-6"
                style={{ background: `color-mix(in srgb, ${c.color} 7%, white)` }}
              >
                <SocialLogo icon={c.icon} size={22} />
                <h2 className="text-[14px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{c.name}</h2>
                <span className="rounded-full bg-white dark:bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 shadow-sm">
                  {t('csvc.count').replace('{n}', String(c.services.length))}
                </span>
              </div>

              <TableWrap>
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      <th className="px-4 py-2.5 sm:px-6">ID</th>
                      <th className="px-3 py-2.5">{t('common.service')}</th>
                      <th className="px-3 py-2.5 text-right">{t('cord.rate1k')}</th>
                      <th className="px-3 py-2.5 text-right">{t('csvc.minMax')}</th>
                      <th className="hidden px-3 py-2.5 md:table-cell">{t('csvc.features')}</th>
                      <th className="px-4 py-2.5 text-right sm:px-6">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.services.map((s) => (
                      <ServiceRow
                        key={s.id}
                        s={s}
                        m={m}
                        expanded={!!expanded[s.id]}
                        onToggle={() => toggle(s.id)}
                        onOrder={() => onOrder(c.id, s.id)}
                        badges={serviceBadges(s)}
                      />
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceRow({ s, m, expanded, onToggle, onOrder, badges }: {
  s: CatalogService
  m: (n: number) => string
  expanded: boolean
  onToggle: () => void
  onOrder: () => void
  badges: ReactNode
}) {
  const { t } = useI18n()
  return (
    <>
      <tr className="border-b border-zinc-100 dark:border-zinc-800/70 transition hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11.5px] text-zinc-400 dark:text-zinc-500 sm:px-6">{s.id.slice(0, 8)}</td>
        <td className="max-w-[280px] px-3 py-2.5">
          <button onClick={onToggle} className="group flex items-center gap-1.5 text-left" aria-expanded={expanded}>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600 transition-transform ${expanded ? 'rotate-180 text-[var(--brand)]' : 'group-hover:text-zinc-500 dark:group-hover:text-zinc-400'}`} />
            <span className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-50">{s.name}</span>
            {s.featured && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
          </button>
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right font-extrabold tabular-nums text-[var(--brand)]">{m(s.rate)}</td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
          {s.min.toLocaleString()} – {s.max.toLocaleString()}
        </td>
        <td className="hidden px-3 py-2.5 md:table-cell">{badges}</td>
        <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-6">
          <Button
            size="sm"
            className="h-8 min-h-[32px] rounded-full px-3 text-[12px] font-bold text-[var(--on-brand)]"
            style={{ background: 'var(--brand)' }}
            onClick={onOrder}
          >
            <ShoppingBag className="mr-1 h-3 w-3" /> {t('csvc.order')}
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/70 dark:bg-zinc-900/50">
          <td colSpan={6} className="px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-6">
              <div className="md:max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('cord.description')}</p>
                <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {s.description || t('csvc.noDesc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 md:ml-auto">
                <Pill tone={s.refill ? 'emerald' : 'zinc'}><Repeat className="h-2.5 w-2.5" /> {t('client.refill')} {s.refill ? '✓' : '✗'}</Pill>
                <Pill tone={s.dripfeed ? 'sky' : 'zinc'}><Droplets className="h-2.5 w-2.5" /> {t('cord.dripfeed')} {s.dripfeed ? '✓' : '✗'}</Pill>
                <Pill tone={s.cancel ? 'amber' : 'zinc'}><Ban className="h-2.5 w-2.5" /> {t('cord.cancelPill')} {s.cancel ? '✓' : '✗'}</Pill>
                <Pill tone="violet">{s.type.replace(/_/g, ' ')}</Pill>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
