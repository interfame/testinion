import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { sendTemplateEmail, brandNameOf } from '@/lib/email'

/** GET /api/admin/orders?status=&q= — all orders across the platform */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (q) {
      where.OR = [
        { link: { contains: q } },
        { serviceName: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
      ]
    }

    const orders = await db.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, category: { select: { id: true, name: true, icon: true, color: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return jsonOk({ orders })
  })
}

/** PATCH /api/admin/orders — {id, status?, remains?} manual status control */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, status, remains } = await req.json()
    if (!id) return jsonError('Missing order id')
    const data: Record<string, unknown> = {}
    if (status !== undefined) {
      const allowed = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED']
      if (!allowed.includes(status)) return jsonError('Invalid status')
      data.status = status
    }
    if (remains !== undefined) data.remains = parseInt(remains) || 0
    if (!Object.keys(data).length) return jsonError('Nothing to update')
    const before = await db.order.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    })
    const order = await db.order.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, category: { select: { id: true, name: true, icon: true, color: true } } } },
      },
    })
    // Automated email: order completed (best-effort, never blocks the update)
    if (status === 'COMPLETED' && before && before.status !== 'COMPLETED' && before.user?.email) {
      try {
        const platform = await brandNameOf(order.platformId)
        await sendTemplateEmail(order.platformId, 'order_complete', order.user.email, {
          name: order.user.name, service: order.serviceName, quantity: order.quantity, platform,
        })
      } catch { /* best-effort */ }
    }
    return jsonOk({ ok: true, order, message: 'Order updated' })
  })
}
