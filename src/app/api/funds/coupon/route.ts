import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { emitToUsers } from '@/lib/realtime-server'

/**
 * POST /api/funds/coupon — redeem a promo code → instant wallet credit.
 * Rules: active, not expired, uses left, one redemption per user, scope match
 * (master users redeem master coupons; platform users redeem their platform's).
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { code } = await req.json()
    const clean = String(code ?? '').trim().toUpperCase()
    if (!clean) return jsonError('Enter a promo code')

    const coupon = await db.coupon.findUnique({ where: { code: clean } })
    if (!coupon || coupon.platformId !== (user.platformId ?? null)) return jsonError('Invalid promo code')
    if (!coupon.active) return jsonError('This code is paused')
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return jsonError('This code has expired')
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return jsonError('This code has reached its usage limit')

    const already = await db.couponRedemption.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId: user.id } },
    })
    if (already) return jsonError('You already redeemed this code')

    // Atomic: redemption row (unique per user) + credit + transaction + counter
    const result = await db.$transaction(async (db2) => {
      const redemption = await db2.couponRedemption.create({
        data: { couponId: coupon.id, userId: user.id, amount: coupon.value },
      })
      await db2.user.update({ where: { id: user.id }, data: { balance: { increment: coupon.value } } })
      await db2.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
      const tx = await db2.transaction.create({
        data: {
          userId: user.id,
          platformId: user.platformId,
          type: 'ADJUSTMENT',
          amount: coupon.value,
          description: `Promo code ${coupon.code}`,
          method: 'COUPON',
          reference: coupon.code,
          status: 'COMPLETED',
        },
      })
      return { redemption, tx }
    })

    const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    await notify(
      user.id,
      'MONEY',
      'Promo code redeemed 🎁',
      `$${coupon.value.toFixed(2)} credited with code ${coupon.code}`,
      'add-funds',
    )
    // Reseller whose platform the coupon belongs to gets an instant push too
    // (bell toast with a deep-link to their Coupons section + live table refresh).
    if (coupon.platformId) {
      const platform = await db.platform.findUnique({ where: { id: coupon.platformId }, select: { ownerId: true } })
      if (platform && platform.ownerId !== user.id) {
        await notify(
          platform.ownerId,
          'MONEY',
          'Coupon redeemed on your platform 🎟️',
          `${user.name} used ${coupon.code} — $${coupon.value.toFixed(2)} credited to their wallet.`,
          'coupons',
        )
        emitToUsers([platform.ownerId], {
          type: 'coupon',
          code: coupon.code,
          value: coupon.value,
          by: user.name,
        })
      }
    }
    return jsonOk({
      ok: true,
      amount: coupon.value,
      balance: fresh?.balance ?? 0,
      message: `$${coupon.value.toFixed(2)} credited with code ${coupon.code}!`,
    })
  })
}

/** GET /api/funds/coupon — codes this user already redeemed (to mark them as used in UI) */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const rows = await db.couponRedemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { coupon: { select: { code: true } } },
    })
    return jsonOk({
      items: rows.map((r) => ({ id: r.id, code: r.coupon.code, amount: r.amount, createdAt: r.createdAt })),
    })
  })
}
