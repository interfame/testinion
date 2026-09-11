import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { EMAIL_KEYS, DEFAULT_TEMPLATES, EMAIL_KEY_LABELS, type EmailKey, type Vars } from '@/lib/email'

/**
 * GET  /api/admin/email/templates — EMAIL_KEYS merged: master DB override ?? built-in default
 * PUT  /api/admin/email/templates — { key, subject, body } upsert master override · { key, reset: true } removes it
 */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const platform = 'GrowthRush' // master brand name in default previews
    const rows = await db.emailTemplate.findMany({ where: { platformId: null } })
    const templates = EMAIL_KEYS.map((key) => {
      const row = rows.find((r) => r.key === key)
      const label = EMAIL_KEY_LABELS[key]
      if (row) return { key, label, subject: row.subject, body: row.body, updatedAt: row.updatedAt, overridden: true }
      return {
        key, label,
        subject: DEFAULT_TEMPLATES[key].subject,
        body: DEFAULT_TEMPLATES[key].body({ platform } as Vars),
        updatedAt: null,
        overridden: false,
      }
    })
    return jsonOk({ templates })
  })
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { key, subject, body, reset } = await req.json()
    if (!key || !EMAIL_KEYS.includes(key as EmailKey)) return jsonError('Unknown template key')
    const existing = await db.emailTemplate.findFirst({ where: { platformId: null, key: String(key) } })

    // Reset to built-in default → drop the override row
    if (reset) {
      if (existing) await db.emailTemplate.delete({ where: { id: existing.id } })
      return jsonOk({ ok: true, message: 'Template reset to default' })
    }

    if (!subject || !body) return jsonError('Subject and body are required')
    if (existing) {
      await db.emailTemplate.update({ where: { id: existing.id }, data: { subject: String(subject), body: String(body) } })
    } else {
      await db.emailTemplate.create({ data: { platformId: null, key: String(key), subject: String(subject), body: String(body) } })
    }
    return jsonOk({ ok: true, message: 'Template saved' })
  })
}
