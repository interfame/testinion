// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/**
 * Reseller referral program — ambassador leaderboard.
 *
 * Returns, scoped to the reseller's platform clients:
 *  - leaderboard: clients ranked by how many people they referred
 *  - recent: latest signups that arrived via a referral link
 *  - totals: referred users, bonus paid, active ambassadors
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) {
      return jsonOk({ leaderboard: [], recent: [], totals: { referred: 0, bonusPaid: 0, ambassadors: 0 } })
    }

    // All users belonging to this platform (clients of the storefront)
    const members = await db.user.findMany({
      where: { platformId: platform.id },
      select: { id: true, name: true, email: true, createdAt: true, referredById: true, status: true },
    })
    const byId = new Map(members.map((m) => [m.id, m]))
    const memberIds = members.map((m) => m.id)

    // Referrals where BOTH referrer and referred belong to the platform
    const referredMembers = members.filter((m) => m.referredById && byId.has(m.referredById))

    // Earned per referrer (REF_BONUS transactions)
    if (memberIds.length === 0) {
      return jsonOk({ leaderboard: [], recent: [], totals: { referred: 0, bonusPaid: 0, ambassadors: 0 } })
    }
    const bonusRows = await db.transaction.groupBy({
      by: ['userId'],
      where: { userId: { in: memberIds }, type: 'REF_BONUS' },
      _sum: { amount: true },
    })
    const earnedBy = new Map(bonusRows.map((r) => [r.userId, r._sum.amount ?? 0]))

    const counts = new Map<string, number>()
    for (const m of referredMembers) {
      const ref = m.referredById as string
      counts.set(ref, (counts.get(ref) ?? 0) + 1)
    }

    const leaderboard = [...counts.entries()]
      .map(([id, count]) => {
        const u = byId.get(id)
        return {
          id,
          name: u?.name ?? '—',
          email: u?.email ?? '',
          refCount: count,
          earned: Math.round((earnedBy.get(id) ?? 0) * 100) / 100,
          status: u?.status ?? 'ACTIVE',
        }
      })
      .sort((a, b) => b.refCount - a.refCount || b.earned - a.earned)
      .slice(0, 10)

    const recent = [...referredMembers]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8)
      .map((m) => {
        const ref = byId.get(m.referredById as string)
        return {
          id: m.id,
          name: m.name,
          createdAt: m.createdAt.toISOString(),
          referrerName: ref?.name ?? '—',
        }
      })

    const bonusPaid = [...earnedBy.values()].reduce((s, v) => s + v, 0)

    return jsonOk({
      leaderboard,
      recent,
      totals: {
        referred: referredMembers.length,
        bonusPaid: Math.round(bonusPaid * 100) / 100,
        ambassadors: counts.size,
      },
    })
  })
}
