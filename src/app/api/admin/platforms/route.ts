// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/admin/platforms — reseller platforms with owner, plan and counts */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const platforms = await db.platform.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, status: true } },
        plan: { select: { id: true, name: true, slug: true, monthlyPrice: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const clientGroups = await db.user.groupBy({
      by: ['platformId'], _count: { _all: true }, where: { platformId: { not: null } },
    })
    const clientsByPlatform: Record<string, number> = {}
    for (const g of clientGroups) if (g.platformId) clientsByPlatform[g.platformId] = g._count._all

    return jsonOk({
      platforms: platforms.map((p) => ({
        ...p,
        ordersCount: p._count.orders,
        clientsCount: clientsByPlatform[p.id] ?? 0,
      })),
    })
  })
}

/** PATCH /api/admin/platforms — {id, action: suspend|activate|approve_domain|reject_domain} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, action } = await req.json()
    if (!id || !action) return jsonError('Missing parameters')

    const data =
      action === 'suspend' ? { status: 'SUSPENDED' } :
      action === 'activate' ? { status: 'ACTIVE' } :
      action === 'approve_domain' ? { domainStatus: 'ACTIVE' } :
      action === 'reject_domain' ? { domainStatus: 'FAILED' } :
      null
    if (!data) return jsonError('Unknown action')

    const platform = await db.platform.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true, status: true } },
        plan: { select: { id: true, name: true, slug: true, monthlyPrice: true } },
        _count: { select: { orders: true } },
      },
    })
    return jsonOk({ ok: true, platform, message: 'Platform updated' })
  })
}
