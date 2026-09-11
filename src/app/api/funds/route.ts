import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'

/**
 * GET  → gateways enabled for user's scope + transactions + deposits + saved methods
 * POST → create a deposit. Master scope = instant sandbox credit.
 *        Reseller-platform scope = PENDING deposit in reseller's approval queue.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platformId = user.platformId ?? null
    const [gateways, transactions, deposits, methods] = await Promise.all([
      db.gateway.findMany({ where: { platformId, enabled: true }, orderBy: { sortOrder: 'asc' } }),
      db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 60 }),
      db.deposit.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      db.paymentMethod.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    ])
    return jsonOk({ gateways, transactions, deposits, methods })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await req.json()
    const amount = Math.round(parseFloat(body.amount) * 100) / 100
    const gatewayId = body.gatewayId
    if (!gatewayId || !amount || amount <= 0) return jsonError('Enter a valid amount and method')

    const gateway = await db.gateway.findUnique({ where: { id: gatewayId } })
    if (!gateway || !gateway.enabled) return jsonError('Payment method unavailable')

    const fee = Math.round(amount * (gateway.feePercent / 100) * 100) / 100
    const total = Math.round((amount + fee) * 100) / 100
    const platformId = user.platformId

    if (platformId) {
      // Reseller storefront: manual review queue
      const deposit = await db.deposit.create({
        data: {
          platformId,
          userId: user.id,
          amount: total,
          method: gateway.name,
          reference: body.reference || null,
          note: body.note || null,
          status: 'PENDING',
        },
      })
      return jsonOk({ ok: true, deposit, pending: true, message: 'Deposit submitted! It will be credited once approved.' })
    }

    // Master platform: sandbox instant gateway
    const tx = await db.$transaction(async (db2) => {
      await db2.user.update({ where: { id: user.id }, data: { balance: { increment: total } } })
      return db2.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: total,
          description: `Deposit via ${gateway.name}`,
          method: gateway.name,
          reference: body.reference || `ORD-${Date.now().toString().slice(-6)}`,
          status: 'COMPLETED',
        },
      })
    })
    const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    await notify(user.id, 'DEPOSIT', 'Deposit credited 💰', `$${total.toFixed(2)} via ${gateway.name}`, 'add-funds')
    return jsonOk({ ok: true, transaction: tx, balance: fresh?.balance ?? 0, message: `$${total.toFixed(2)} credited to your wallet!` })
  })
}
