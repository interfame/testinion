// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import {
  getMailConfig, maskMailConfig, savePlatformMailConfig, sendTemplateEmail,
  ensureTemplates, EMAIL_KEYS, type MailConfig,
} from '@/lib/email'

async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

/** GET /api/reseller/email — masked platform mail config + stats (scoped to the reseller's platform) */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'RESELLER') throw jsonError('Forbidden', 403)
    const platform = await myPlatform(user.id)
    await ensureTemplates(platform.id)
    const [cfg, sent, failed, outbox, last7d] = await Promise.all([
      getMailConfig(platform.id),
      db.emailLog.count({ where: { platformId: platform.id, status: 'SENT' } }),
      db.emailLog.count({ where: { platformId: platform.id, status: 'FAILED' } }),
      db.emailLog.count({ where: { platformId: platform.id, status: 'OUTBOX' } }),
      db.emailLog.findMany({
        where: { platformId: platform.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
        select: { status: true, createdAt: true },
      }),
    ])

    const days: { date: string; sent: number; failed: number; outbox: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000)
      days.push({ date: d.toISOString().slice(0, 10), sent: 0, failed: 0, outbox: 0 })
    }
    for (const row of last7d) {
      const bucket = days.find((d) => d.date === row.createdAt.toISOString().slice(0, 10))
      if (bucket && ['SENT', 'FAILED', 'OUTBOX'].includes(row.status)) bucket[row.status.toLowerCase() as 'sent' | 'failed' | 'outbox']++
    }

    return jsonOk({
      config: maskMailConfig(cfg),
      platform: { id: platform.id, name: platform.name },
      verificationManagedByMaster: true,
      stats: { sent, failed, outbox, last7d: days },
    })
  })
}

const MAIL_FIELDS = ['mode', 'host', 'port', 'user', 'pass', 'secure', 'from', 'fromName'] as const

/** PATCH /api/reseller/email — save the platform's mail config into Platform.settings JSON */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'RESELLER') throw jsonError('Forbidden', 403)
    const platform = await myPlatform(user.id)
    const body = await req.json()

    const patch: Partial<MailConfig> = {}
    for (const f of MAIL_FIELDS) {
      if (body[f] !== undefined) (patch as Record<string, string>)[f] = String(body[f])
    }
    if (Object.keys(patch).length) await savePlatformMailConfig(platform.id, patch)

    const cfg = await getMailConfig(platform.id)
    return jsonOk({ ok: true, config: maskMailConfig(cfg), message: 'Email settings saved' })
  })
}

/** POST /api/reseller/email — { to } send a test email scoped to this platform */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'RESELLER') throw jsonError('Forbidden', 403)
    const platform = await myPlatform(user.id)
    const { to } = await req.json()
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) return jsonError('Enter a valid email address')
    const res = await sendTemplateEmail(platform.id, 'welcome', String(to).trim(), { name: 'there', platform: platform.name })
    const status = res.mode === 'smtp' ? (res.ok ? 'SENT' : 'FAILED') : 'OUTBOX'
    return jsonOk({
      ok: true, status, mode: res.mode,
      message: res.mode === 'smtp'
        ? (res.ok ? `Test email sent to ${to}` : 'SMTP send failed — check the logs tab')
        : 'Outbox mode: email recorded in Logs (no SMTP configured)',
    })
  })
}
