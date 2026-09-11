import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import {
  getMailConfig, maskMailConfig, saveMasterMailConfig, sendTemplateEmail,
  ensureTemplates, brandNameOf, EMAIL_KEYS, type MailConfig,
} from '@/lib/email'

/** GET /api/admin/email — masked master mail config + verification flag + send stats */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    await ensureTemplates(null)
    const [cfg, verificationRow, sent, failed, outbox, last7d] = await Promise.all([
      getMailConfig(null),
      db.setting.findUnique({ where: { key: 'verification_required' } }),
      db.emailLog.count({ where: { platformId: null, status: 'SENT' } }),
      db.emailLog.count({ where: { platformId: null, status: 'FAILED' } }),
      db.emailLog.count({ where: { platformId: null, status: 'OUTBOX' } }),
      db.emailLog.findMany({
        where: { platformId: null, createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
        select: { status: true, createdAt: true },
      }),
    ])

    // Daily buckets for the last 7 days (oldest first)
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
      verificationRequired: verificationRow?.value === '1',
      stats: { sent, failed, outbox, last7d: days },
    })
  })
}

const MAIL_FIELD_MAP: Record<string, keyof MailConfig> = {
  mail_mode: 'mode', mail_host: 'host', mail_port: 'port', mail_user: 'user',
  mail_pass: 'pass', mail_secure: 'secure', mail_from: 'from', mail_from_name: 'fromName',
}

/** PATCH /api/admin/email — save master mail config (whitelisted) + verification_required */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const body = await req.json()

    const patch: Partial<MailConfig> = {}
    for (const [apiKey, cfgKey] of Object.entries(MAIL_FIELD_MAP)) {
      if (body[apiKey] !== undefined) (patch as Record<string, string>)[cfgKey] = String(body[apiKey])
    }
    if (body.config && typeof body.config === 'object') {
      for (const cfgKey of Object.values(MAIL_FIELD_MAP)) {
        if ((body.config as Record<string, unknown>)[cfgKey] !== undefined) {
          (patch as Record<string, string>)[cfgKey] = String((body.config as Record<string, unknown>)[cfgKey])
        }
      }
    }
    if (Object.keys(patch).length) await saveMasterMailConfig(patch)

    if (body.verification_required !== undefined) {
      const value = body.verification_required === true || body.verification_required === '1' ? '1' : '0'
      await db.setting.upsert({ where: { key: 'verification_required' }, update: { value }, create: { key: 'verification_required', value } })
    }

    const cfg = await getMailConfig(null)
    const verificationRow = await db.setting.findUnique({ where: { key: 'verification_required' } })
    return jsonOk({ ok: true, config: maskMailConfig(cfg), verificationRequired: verificationRow?.value === '1', message: 'Email settings saved' })
  })
}

/** POST /api/admin/email — { to } send a test email (welcome template) and report the log status */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { to } = await req.json()
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) return jsonError('Enter a valid email address')
    const platform = await brandNameOf(null)
    const res = await sendTemplateEmail(null, 'welcome', String(to).trim(), { name: 'there', platform })
    const status = res.mode === 'smtp' ? (res.ok ? 'SENT' : 'FAILED') : 'OUTBOX'
    return jsonOk({
      ok: true, status, mode: res.mode,
      message: res.mode === 'smtp'
        ? (res.ok ? `Test email sent to ${to}` : 'SMTP send failed — check the logs tab')
        : `Outbox mode: email recorded in Logs (no SMTP configured)`,
    })
  })
}
