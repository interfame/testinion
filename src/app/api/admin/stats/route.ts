import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonOk } from '@/lib/auth'

/**
 * GET /api/admin/stats — dashboard KPIs for the super admin command center.
 * Revenue = sum of positive (money-in) transactions over the last 30 days.
 */
export async function GET(_req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])

    const now = new Date()
    const d30 = new Date(now.getTime() - 30 * 86400000)
    const d7 = new Date(now.getTime() - 7 * 86400000)
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const [
      totalUsers, newUsers7d, resellers, platformsActive, platformsTotal,
      ordersToday, ordersTotal, moneyIn, ordersByStatus, topServicesRaw,
      recentSignups, pendingDeposits, openTickets,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: d7 } } }),
      db.user.count({ where: { role: 'RESELLER' } }),
      db.platform.count({ where: { status: 'ACTIVE' } }),
      db.platform.count(),
      db.order.count({ where: { createdAt: { gte: today } } }),
      db.order.count(),
      db.transaction.findMany({
        where: { amount: { gt: 0 }, createdAt: { gte: d30 } },
        select: { amount: true, createdAt: true },
      }),
      db.order.groupBy({ by: ['status'], _count: { _all: true } }),
      db.service.findMany({
        select: { id: true, name: true, rate: true, _count: { select: { orders: true } } },
        orderBy: { orders: { _count: 'desc' } },
        take: 5,
      }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      }),
      db.deposit.count({ where: { status: 'PENDING' } }),
      db.ticket.count({ where: { status: { not: 'CLOSED' } } }),
    ])

    // 30-day revenue series (by day)
    const revenue30d = moneyIn.reduce((s, t) => s + t.amount, 0)
    const buckets = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000)
      buckets.set(day.toISOString().slice(0, 10), 0)
    }
    for (const t of moneyIn) {
      const key = new Date(t.createdAt).toISOString().slice(0, 10)
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + t.amount)
    }
    const revenueSeries = Array.from(buckets.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }))

    // Client counts per platform
    const clientGroups = await db.user.groupBy({ by: ['platformId'], _count: { _all: true }, where: { platformId: { not: null } } })
    const clientsByPlatform: Record<string, number> = {}
    for (const g of clientGroups) if (g.platformId) clientsByPlatform[g.platformId] = g._count._all

    const topServices = topServicesRaw.map((s) => ({
      id: s.id,
      name: s.name,
      rate: s.rate,
      orders: s._count.orders,
      revenue: Math.round(s._count.orders * s.rate * 100) / 100,
    }))

    return jsonOk({
      totalUsers,
      newUsers7d,
      resellers,
      platformsActive,
      platformsTotal,
      ordersToday,
      ordersTotal,
      revenue30d: Math.round(revenue30d * 100) / 100,
      revenueSeries,
      ordersByStatus: ordersByStatus.map((g) => ({ status: g.status, count: g._count._all })),
      pendingDeposits,
      openTickets,
      topServices,
      recentSignups,
      clientsByPlatform,
    })
  })
}
