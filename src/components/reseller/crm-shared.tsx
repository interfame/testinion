'use client'

// CRM shared helpers, types and micro-components for the reseller CRM suite.

import type { LucideIcon } from 'lucide-react'
import { Mail, Globe, Store, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SocialLogo } from '@/components/shared/social-logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useI18n, type DictKey } from '@/lib/i18n'

// ── Types ────────────────────────────────

export type CrmContact = {
  id: string
  name: string
  phone: string | null
  email: string | null
  channel: string
  labels: string
  notes: string | null
  totalSpent: number
  lastSeen: string | null
  createdAt?: string
}

export type CrmConversation = {
  id: string
  channel: string
  status: string
  unread: number
  lastMessage: string | null
  lastMessageAt: string
  assignedName: string | null
  contact: CrmContact
}

export type CrmMessage = {
  id: string
  direction: string // IN | OUT
  body: string
  aiGenerated: boolean
  createdAt: string
}

export type CrmChannel = {
  id: string
  type: string
  name: string
  handle: string | null
  status: string
  createdAt: string
}

export type CrmLabel = { id: string; name: string; color: string }

export type CrmQuickReply = { id: string; title: string; body: string; shortcut: string | null }

export type CrmAgent = {
  id: string
  name: string
  provider: string
  model: string
  prompt: string | null
  knowledge: string | null
  temperature: number
  channels: string
  active: boolean
  resolved: number
}

export type CrmAutomation = {
  id: string
  name: string
  trigger: string
  matchValue: string | null
  actions: string | null
  active: boolean
  runs: number
}

// ── Channel metadata ─────────────────────

export const CHANNEL_TYPES = ['WHATSAPP', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'EMAIL', 'WEBCHAT']

export type ChannelMeta = { icon: string; lucide?: LucideIcon; label: string; color: string }

export function channelMeta(type: string): ChannelMeta {
  switch (type) {
    case 'WHATSAPP':
      return { icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' }
    case 'INSTAGRAM':
      return { icon: 'instagram', label: 'Instagram', color: '#E1306C' }
    case 'TELEGRAM':
      return { icon: 'telegram', label: 'Telegram', color: '#26A5E4' }
    case 'MESSENGER':
      return { icon: 'facebook', label: 'Messenger', color: '#1877F2' }
    case 'EMAIL':
      return { icon: 'mail', lucide: Mail, label: 'Email', color: '#64748b' }
    case 'WEBCHAT':
      return { icon: 'globe', lucide: Globe, label: 'Webchat', color: '#0d9488' }
    default:
      return { icon: 'globe', lucide: Globe, label: type, color: '#64748b' }
  }
}

export function ChannelIcon({ type, size = 18, className }: { type: string; size?: number; className?: string }) {
  const meta = channelMeta(type)
  if (meta.lucide) {
    const Icon = meta.lucide
    return (
      <span
        aria-label={meta.label}
        title={meta.label}
        className={cn('inline-flex shrink-0 items-center justify-center rounded-full align-middle', className)}
        style={{ width: size, height: size, backgroundColor: `${meta.color}22` }}
      >
        <Icon style={{ width: size * 0.58, height: size * 0.58, color: meta.color }} />
      </span>
    )
  }
  return <SocialLogo icon={meta.icon} size={size} className={className} title={meta.label} />
}

// ── Conversation status ──────────────────

export const CONV_STATUSES = ['OPEN', 'AI', 'HANDED', 'CLOSED']

export const convDot: Record<string, string> = {
  OPEN: 'bg-emerald-500',
  AI: 'bg-violet-500',
  HANDED: 'bg-sky-500',
  CLOSED: 'bg-zinc-400',
}

export const convDotLabel: Record<string, DictKey> = {
  OPEN: 'crm.stOpen',
  AI: 'crm.stAi',
  HANDED: 'crm.stHanded',
  CLOSED: 'crm.stClosed',
}

// ── JSON helpers ─────────────────────────

export function parseArr(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export function parseRows(raw: string | null | undefined): { type: string; value: string }[] {
  try {
    const v = JSON.parse(raw ?? '[]')
    if (!Array.isArray(v)) return []
    return v.map((r: Record<string, unknown>) => ({
      type: String(r?.type ?? 'send_message'),
      value: String(r?.value ?? ''),
    }))
  } catch {
    return []
  }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Layout primitives ────────────────────

export function PageWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4 sm:p-6 lg:p-8', className)}>{children}</div>
}

export function ContactAvatar({
  name,
  channel,
  size = 40,
}: {
  name: string
  channel: string
  size?: number
}) {
  const meta = channelMeta(channel)
  return (
    <span className="relative inline-block shrink-0 align-middle" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${meta.color}` }} />
      <Avatar className="h-full w-full rounded-full">
        <AvatarFallback
          className="rounded-full bg-zinc-100 dark:bg-zinc-800/60 font-bold text-zinc-600 dark:text-zinc-300"
          style={{ fontSize: Math.max(10, size * 0.32) }}
        >
          {initials(name) || '?'}
        </AvatarFallback>
      </Avatar>
    </span>
  )
}

export function LabelChips({
  labelsJson,
  labels,
  empty = '—',
}: {
  labelsJson: string | null | undefined
  labels: CrmLabel[]
  empty?: React.ReactNode
}) {
  const names = parseArr(labelsJson)
  if (!names.length) return <span className="text-xs text-zinc-400 dark:text-zinc-500">{empty}</span>
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((n) => {
        const color = labels.find((l) => l.name === n)?.color ?? '#94a3b8'
        return (
          <span
            key={n}
            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold leading-4"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            {n}
          </span>
        )
      })}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-14 text-center">
      <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/60">
        <Icon className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
      </span>
      <p className="text-[15px] font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
      {description && <p className="max-w-sm text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function NoPlatform() {
  const { t } = useI18n()
  return (
    <PageWrap>
      <EmptyState
        icon={Store}
        title={t('crm.noPlatform')}
        description={t('crm.noPlatformSub')}
      />
    </PageWrap>
  )
}

export function CardsSkeleton({ n = 6, height = 'h-40' }: { n?: number; height?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className={cn('rounded-2xl', height)} />
      ))}
    </div>
  )
}

export function RowsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  )
}

export function ConfirmDelete({
  onConfirm,
  title,
  description,
}: {
  onConfirm: () => void
  title?: string
  description?: string
}) {
  const { t } = useI18n()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400" aria-label={t('admin.deleteCta')}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t('crm.delItem')}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? t('rcont.deleteDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {t('admin.deleteCta')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
