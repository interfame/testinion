import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/** Domain manager for the reseller's platform (switch/verify handled by /api/platform/mine). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({
      where: { ownerId: user.id },
      select: { slug: true, domainType: true, customDomain: true, domainStatus: true },
    })
    if (!platform) return jsonOk({ platform: null })
    return jsonOk({ platform })
  })
}

/** Simulated DNS verification for custom domains */
export async function POST() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonOk({ ok: false })
    if (platform.domainType !== 'CUSTOM' || !platform.customDomain) return jsonOk({ ok: false, error: 'No custom domain configured' })
    await db.platform.update({ where: { id: platform.id }, data: { domainStatus: 'ACTIVE' } })
    return jsonOk({ ok: true, status: 'ACTIVE' })
  })
}
