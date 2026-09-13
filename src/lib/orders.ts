// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { ceil2 } from '@/lib/pricing'

export type PlaceOrderInput = {
  serviceId: string
  link: string
  quantity: number | string
  comments?: string
  dripfeed?: boolean
  dripRuns?: number | string
  dripInterval?: number | string
}

export type PlaceOrderResult =
  | { ok: true; order: { id: string; serviceName: string; quantity: number; charge: number; status: string }; balance: number }
  | { ok: false; error: string }

/**
 * Single source of truth for placing an SMM order (used by portal UI,
 * mass order and the public API v2). Validates, charges and creates the order.
 */
export async function placeOrder(
  user: { id: string; balance: number },
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const { serviceId, link } = input
  if (!serviceId || !link) return { ok: false, error: 'Service and link are required' }
  const qty = parseInt(String(input.quantity))
  if (!qty || qty <= 0) return { ok: false, error: 'Enter a valid quantity' }

  const service = await db.service.findUnique({ where: { id: serviceId }, include: { category: true } })
  if (!service || service.status !== 'ACTIVE') return { ok: false, error: 'Service not available' }
  if (qty < service.min) return { ok: false, error: `Minimum quantity is ${service.min.toLocaleString()}` }
  if (qty > service.max) return { ok: false, error: `Maximum quantity is ${service.max.toLocaleString()}` }
  if (service.type === 'CUSTOM_COMMENTS' && !input.comments?.trim()) return { ok: false, error: 'Enter the comments, one per line' }

  // round UP to the cent — the platform never loses margin on fractional cents
  const charge = ceil2((qty / 1000) * service.rate)
  const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
  if ((fresh?.balance ?? 0) < charge) return { ok: false, error: 'Insufficient balance — add funds first' }

  const startCount = service.category.name.match(/followers|subscribers|members/i) ? Math.floor(Math.random() * 5000) : 0

  try {
    const order = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id, balance: { gte: charge } },
        data: { balance: { decrement: charge } },
      })
      await tx.transaction.create({
        data: {
          userId: user.id,
          platformId: service.platformId,
          type: 'ORDER',
          amount: -charge,
          description: `Order — ${service.name}`,
        },
      })
      return tx.order.create({
        data: {
          platformId: service.platformId,
          userId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          link: String(link).trim(),
          quantity: qty,
          charge,
          startCount,
          remains: qty,
          status: 'IN_PROGRESS',
          dripfeed: !!input.dripfeed && service.dripfeed,
          dripRuns: input.dripRuns ? parseInt(String(input.dripRuns)) : 1,
          dripInterval: input.dripInterval ? parseInt(String(input.dripInterval)) : 60,
          comments: input.comments || null,
        },
      })
      // `updated` guards the atomic balance check above
      void updated
    })
    return { ok: true, order, balance: (await db.user.findUnique({ where: { id: user.id }, select: { balance: true } }))?.balance ?? 0 }
  } catch {
    return { ok: false, error: 'Insufficient balance — add funds first' }
  }
}
