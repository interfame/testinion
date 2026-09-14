// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { getExternalApiPrice } from '@/lib/addon-price'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

/** GET — pricing + current status for the Providers UI */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await resilientPlatformForOwner(user.id)
    if (!platform) return jsonError('No platform', 404)
    const price = await getExternalApiPrice(platform.id)
    return jsonOk({ unlocked: platform.externalApi, price })
  })
}

/**
 * POST — unlock the External API add-on (one-time debit from the wallet).
 * NOTE: the add-on renewal is handled together with the monthly plan renewal;
 * this endpoint only charges the initial unlock.
 */
export async function POST() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await resilientPlatformForOwner(user.id)
    if (!platform) return jsonError('No platform', 404)
    if (platform.externalApi) return jsonError('Third-party APIs are already unlocked')

    const price = await getExternalApiPrice(platform.id)
    const account = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    if (!account) return jsonError('User not found', 404)
    if (account.balance < price)
      return jsonError(`Insufficient balance — you need $${price.toFixed(2)} — add funds first`)

    const updated = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: price } },
      })
      await tx.transaction.create({
        data: {
          userId: user.id,
          platformId: platform.id,
          type: 'ADDON',
          amount: -price,
          currency: 'USD',
          description: 'External API connector — add-on',
          status: 'COMPLETED',
          method: 'WALLET',
        },
      })
      return tx.platform.update({
        where: { id: platform.id },
        data: { externalApi: true },
      })
    })

    const balance = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    return jsonOk({ ok: true, externalApi: updated.externalApi, balance: balance?.balance ?? 0 })
  })
}
