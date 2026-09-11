import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { placeOrder } from '@/lib/orders'

const MAX_LINES = 30

/**
 * Mass order — accepts raw text lines in the standard SMM format:
 *   serviceId | link | quantity
 * (also tolerates "serviceId | link | quantity | comments" and extra spaces)
 * Processes each line atomically; one bad line never blocks the rest.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await req.json()
    const raw: string = typeof body === 'string' ? body : String(body?.lines ?? '')
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, MAX_LINES)
    if (lines.length === 0) return jsonOk({ results: [], balance: user.balance })

    const results: { line: number; ok: boolean; orderId?: string; service?: string; charge?: number; error?: string }[] = []
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|').map((p) => p.trim())
      const [serviceId, link, quantity, comments] = parts
      if (!serviceId || !link || !quantity) {
        results.push({ line: i + 1, ok: false, error: 'Format: serviceId | link | quantity' })
        continue
      }
      const res = await placeOrder(user, { serviceId, link, quantity, comments: comments || undefined })
      if (!res.ok) {
        results.push({ line: i + 1, ok: false, error: res.error })
        continue
      }
      results.push({ line: i + 1, ok: true, orderId: res.order.id, service: res.order.serviceName, charge: res.order.charge })
      await notify(user.id, 'ORDER', 'Order placed 🚀', `${res.order.serviceName} — ${res.order.quantity.toLocaleString()} units for $${res.order.charge.toFixed(2)}`, 'orders')
      if (res.order.id) {
        const order = await db.order.findUnique({ where: { id: res.order.id }, select: { platformId: true } })
        if (order?.platformId) {
          const platform = await db.platform.findUnique({ where: { id: order.platformId }, select: { ownerId: true } })
          if (platform && platform.ownerId !== user.id) {
            await notify(platform.ownerId, 'ORDER', 'New order on your platform 🛒', `${user.name} — ${res.order.serviceName} ($${res.order.charge.toFixed(2)})`, 'orders')
          }
        }
      }
    }

    const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    return jsonOk({ results, balance: fresh?.balance ?? 0 })
  })
}
