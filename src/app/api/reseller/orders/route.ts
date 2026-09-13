// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email'

async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const orders = await db.order.findMany({
      where: { platformId: platform.id, ...(status && status !== 'ALL' ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true, email: true } }, service: { select: { id: true, cancel: true, refill: true } } },
    })
    return jsonOk({ orders })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    const order = await db.order.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!order) return jsonError('Order not found', 404)

    const allowed = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELED']
    if (body.action === 'refund') {
      if (order.status === 'CANCELED') return jsonError('Order already canceled')
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELED', remains: 0 } })
        await tx.user.update({ where: { id: order.userId }, data: { balance: { increment: order.charge } } })
        await tx.transaction.create({
          data: { userId: order.userId, platformId: platform.id, type: 'REFUND', amount: order.charge, description: `Refund — ${order.serviceName.slice(0, 50)}` },
        })
      })
      return jsonOk({ ok: true })
    }

    if (body.status && allowed.includes(body.status)) {
      const remains = body.status === 'COMPLETED' ? 0 : body.remains !== undefined ? parseInt(body.remains) || 0 : order.remains
      await db.order.update({ where: { id: order.id }, data: { status: body.status, remains } })
      // Automated email: order completed (best-effort, never blocks the update)
      if (body.status === 'COMPLETED' && order.status !== 'COMPLETED') {
        try {
          const buyer = await db.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } })
          if (buyer) {
            await sendTemplateEmail(platform.id, 'order_complete', buyer.email, {
              name: buyer.name, service: order.serviceName, quantity: order.quantity, platform: platform.name,
            })
          }
        } catch { /* best-effort */ }
      }
      return jsonOk({ ok: true })
    }
    return jsonError('Unknown action')
  })
}
