// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/reseller/email/logs?take=100 — latest email logs scoped to the reseller's platform */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    if (user.role !== 'RESELLER') throw jsonError('Forbidden', 403)
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) throw jsonError('No platform', 404)
    const { searchParams } = new URL(req.url)
    const take = Math.min(300, Math.max(1, parseInt(searchParams.get('take') ?? '') || 100))
    const logs = await db.emailLog.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'desc' },
      take,
    })
    return jsonOk({ logs })
  })
}
