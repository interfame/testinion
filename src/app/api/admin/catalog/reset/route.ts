import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/**
 * POST /api/admin/catalog/reset — {mode:'services', purgeOrders?:boolean}
 * Wipes the catalog back to zero. With purgeOrders=false, services that still
 * have linked orders are kept and reported in `kept`.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json().catch(() => ({}))
    if (b.mode !== 'services') return jsonError("Invalid mode — expected 'services'")
    const purgeOrders = Boolean(b.purgeOrders)

    const total = await db.service.count()
    let deleted = 0
    let kept = 0
    let ordersDeleted = 0

    if (purgeOrders) {
      ordersDeleted = (await db.order.deleteMany({})).count
      deleted = (await db.service.deleteMany({})).count
    } else {
      deleted = (await db.service.deleteMany({ where: { orders: { none: {} } } })).count
      kept = total - deleted
    }

    return jsonOk({ ok: true, deleted, kept, ordersDeleted })
  })
}
