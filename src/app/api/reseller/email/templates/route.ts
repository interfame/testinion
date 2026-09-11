import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { EMAIL_KEYS, DEFAULT_TEMPLATES, EMAIL_KEY_LABELS, type EmailKey, type Vars } from '@/lib/email'

/**
 * GET /api/reseller/email/templates — platform override ?? master default ?? built-in, plus `defaults` for reset
 * PUT /api/reseller/email/templates — { key, subject, body } upsert override · { key, reset: true } removes it
 */
async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'RESELLER') throw jsonError('Forbidden', 403)
    const platform = await myPlatform(user.id)
    const [rows, masterRows] = await Promise.all([
      db.emailTemplate.findMany({ where: { platformId: platform.id } }),
      db.emailTemplate.findMany({ where: { platformId: null } }),
    ])

    const resolve = (key: EmailKey, brand: string) => {
      const own = rows.find((r) => r.key === key)
      if (own) return { key, label: EMAIL_KEY_LABELS[key], subject: own.subject, body: own.body, updatedAt: own.updatedAt, overridden: true }
      const master = masterRows.find((r) => r.key === key)
      if (master) return { key, label: EMAIL_KEY_LABELS[key], subject: master.subject, body: master.body, updatedAt: null, overridden: false }
      return {
        key, label: EMAIL_KEY_LABELS[key],
        subject: DEFAULT_TEMPLATES[key].subject,
        body: DEFAULT_TEMPLATES[key].body({ platform: brand } as Vars),
        updatedAt: null, overridden: false,
      }
    }

    return jsonOk({
      templates: EMAIL_KEYS.map((k) => resolve(k, platform.name)),
      defaults: EMAIL_KEYS.map((k) => ({
        key: k,
        subject: DEFAULT_TEMPLATES[k].subject,
        body: DEFAULT_TEMPLATES[k].body({ platform: platform.name } as Vars),
      })),
    })
  })
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'RESELLER') throw jsonError('Forbidden', 403)
    const platform = await myPlatform(user.id)
    const { key, subject, body, reset } = await req.json()
    if (!key || !EMAIL_KEYS.includes(key as EmailKey)) return jsonError('Unknown template key')
    const existing = await db.emailTemplate.findFirst({ where: { platformId: platform.id, key: String(key) } })

    if (reset) {
      if (existing) await db.emailTemplate.delete({ where: { id: existing.id } })
      return jsonOk({ ok: true, message: 'Template reset to default' })
    }

    if (!subject || !body) return jsonError('Subject and body are required')
    if (existing) {
      await db.emailTemplate.update({ where: { id: existing.id }, data: { subject: String(subject), body: String(body) } })
    } else {
      await db.emailTemplate.create({ data: { platformId: platform.id, key: String(key), subject: String(subject), body: String(body) } })
    }
    return jsonOk({ ok: true, message: 'Template saved' })
  })
}
