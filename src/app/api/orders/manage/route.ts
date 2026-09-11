import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'

/**
 * Client order actions: cancel (refund if pending), refill request.
 * Staff can also force status updates (used by admin/reseller routes separately).
 */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { id, action } = await req.json()
    if (!id || !action) return jsonError('Missing parameters')

    const order = await db.order.findUnique({ where: { id }, include: { service: true } })
    if (!order || order.userId !== user.id) return jsonError('Order not found', 404)

    if (action === 'cancel') {
      if (!order.service?.cancel) return jsonError('This service does not support cancellation')
      if (!['PENDING', 'IN_PROGRESS'].includes(order.status)) return jsonError('Order can no longer be canceled')
      const refund = order.charge
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: 'CANCELED', remains: 0 } })
        await tx.user.update({ where: { id: user.id }, data: { balance: { increment: refund } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'REFUND', amount: refund, description: `Refund — order canceled (${order.serviceName.slice(0, 40)})` },
        })
      })
      await notify(user.id, 'MONEY', 'Order canceled — refunded 💸', `$${refund.toFixed(2)} returned to your wallet (${order.serviceName.slice(0, 40)})`, 'orders')
      return jsonOk({ ok: true })
    }

    if (action === 'refill') {
      if (!order.service?.refill) return jsonError('This service does not support refill')
      if (order.status !== 'COMPLETED') return jsonError('Only completed orders can be refilled')
      await db.order.update({ where: { id }, data: { status: 'IN_PROGRESS', remains: order.quantity } })
      await notify(user.id, 'ORDER', 'Refill requested ♻️', `${order.serviceName.slice(0, 40)} — delivery restarting`, 'orders')
      return jsonOk({ ok: true })
    }

    return jsonError('Unknown action')
  })
}
