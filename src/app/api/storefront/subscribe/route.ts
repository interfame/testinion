import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handle, jsonError, jsonOk } from '@/lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Public: newsletter signup from the storefront's Newsletter section.
 *  Idempotent — re-subscribing the same email is a silent success. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => ({})) as { slug?: string; email?: string }
    const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!slug) return jsonError('Missing storefront', 400)
    if (!email || !EMAIL_RE.test(email) || email.length > 200) return jsonError('Please enter a valid email address', 400)

    const platform = await db.platform.findUnique({ where: { slug }, select: { id: true, status: true } })
    if (!platform || platform.status !== 'ACTIVE') return jsonError('Storefront not found', 404)

    const existing = await db.landingLead.findFirst({
      where: { platformId: platform.id, email },
      select: { id: true },
    })
    if (existing) return jsonOk({ ok: true, subscribed: false })

    await db.landingLead.create({ data: { platformId: platform.id, email } })
    return jsonOk({ ok: true, subscribed: true })
  })
}
