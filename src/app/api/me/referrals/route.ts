import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'
import { getReferralConfig, usdLabel } from '@/lib/referral'

/**
 * GET /api/me/referrals — the logged-in user's own referral squad.
 *
 * Returns the people who signed up with the caller's ?ref= link, their
 * first-order progress (for the "pending bonus" badge) and the program config
 * so the UI can render live amounts instead of hardcoded copy.
 */
export async function GET() {
  return handle(async () => {
    const session = await requireUser()

    const [friends, cfg, earnedAgg] = await Promise.all([
      db.user.findMany({
        where: { referredById: session.id },
        select: { id: true, name: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      getReferralConfig(),
      db.transaction.aggregate({
        where: { userId: session.id, type: 'REF_BONUS' },
        _sum: { amount: true },
      }),
    ])

    const ids = friends.map((f) => f.id)
    // Completed orders per referred friend (first completed order triggers the bonus)
    const orderCounts = ids.length
      ? await db.order.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, status: 'COMPLETED' },
          _count: { _all: true },
          _sum: { charge: true },
        })
      : []
    const countMap = new Map(orderCounts.map((o) => [o.userId, o._count._all]))
    const spendMap = new Map(orderCounts.map((o) => [o.userId, o._sum.charge ?? 0]))

    const friendsOut = friends.map((f) => {
      const completed = countMap.get(f.id) ?? 0
      return {
        id: f.id,
        name: f.name,
        createdAt: f.createdAt,
        status: f.status,
        completedOrders: completed,
        spent: Math.round((spendMap.get(f.id) ?? 0) * 100) / 100,
        bonusPaid: completed > 0,
      }
    })

    return jsonOk({
      friends: friendsOut,
      totals: {
        count: friendsOut.length,
        earned: Math.round((earnedAgg._sum.amount ?? 0) * 100) / 100,
        active: friendsOut.filter((f) => f.completedOrders > 0).length,
      },
      config: {
        enabled: cfg.enabled,
        bonusLabel: usdLabel(cfg.bonusAmount),
        welcomeLabel: usdLabel(cfg.welcomeCredit),
      },
    })
  })
}
