import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { placeOrder } from '@/lib/orders'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const where: Record<string, unknown> = { userId: user.id }
    if (status && status !== 'ALL') where.status = status
    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { service: { include: { category: { select: { icon: true, name: true } } } } },
    })
    return jsonOk({ orders })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await req.json()
    const res = await placeOrder(user, {
      serviceId: body.serviceId,
      link: body.link,
      quantity: body.quantity,
      comments: body.comments,
      dripfeed: body.dripfeed,
      dripRuns: body.dripRuns,
      dripInterval: body.dripInterval,
    })
    if (!res.ok) return jsonError(res.error)
    await notify(user.id, 'ORDER', 'Order placed 🚀', `${res.order.serviceName} — ${res.order.quantity.toLocaleString()} units for $${res.order.charge.toFixed(2)}`, 'orders')
    // notify the reseller who owns the storefront (if any)
    if (res.order.id) {
      const order = await db.order.findUnique({ where: { id: res.order.id }, select: { platformId: true } })
      if (order?.platformId) {
        const platform = await db.platform.findUnique({ where: { id: order.platformId }, select: { ownerId: true, name: true } })
        if (platform && platform.ownerId !== user.id) {
          await notify(platform.ownerId, 'ORDER', 'New order on your platform 🛒', `${user.name} — ${res.order.serviceName} ($${res.order.charge.toFixed(2)})`, 'orders')
        }
      }
    }
    return jsonOk(res)
  })
}
