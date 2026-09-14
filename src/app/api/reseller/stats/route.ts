// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

/** Reseller dashboard stats */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform', 404)

    const since30 = new Date(Date.now() - 30 * 86400000)
    const since14 = new Date(Date.now() - 14 * 86400000)

    const [clients, orders, orders30, depositsPending, ticketsOpen, unreadConvs, services, recentOrders, topServices, ordersByDay, paymentMethods, coupons] =
      await Promise.all([
        db.user.count({ where: { platformId: platform.id } }),
        db.order.findMany({ where: { platformId: platform.id }, select: { status: true, charge: true } }),
        db.order.aggregate({ where: { platformId: platform.id, createdAt: { gte: since30 } }, _sum: { charge: true }, _count: true }),
        db.deposit.count({ where: { platformId: platform.id, status: 'PENDING' } }),
        db.ticket.count({ where: { platformId: platform.id, status: { in: ['OPEN', 'ANSWERED'] } } }),
        db.conversation.aggregate({ where: { platformId: platform.id }, _sum: { unread: true } }),
        db.service.count({ where: { platformId: platform.id, status: 'ACTIVE' } }),
        db.order.findMany({
          where: { platformId: platform.id },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: { user: { select: { name: true } } },
        }),
        db.order.groupBy({
          by: ['serviceName'],
          where: { platformId: platform.id },
          _count: { serviceName: true },
          _sum: { charge: true },
          orderBy: { _count: { serviceName: 'desc' } },
          take: 5,
        }),
        db.order.findMany({
          where: { platformId: platform.id, createdAt: { gte: since14 } },
          select: { createdAt: true, charge: true, status: true },
        }),
        db.gateway.count({ where: { platformId: platform.id } }),
        db.coupon.count({ where: { platformId: platform.id } }),
      ])

    const revenue = orders.filter((o) => o.status !== 'CANCELED').reduce((s, o) => s + o.charge, 0)
    const statusCounts: Record<string, number> = {}
    for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1

    const days: { date: string; orders: number; revenue: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      const dayOrders = ordersByDay.filter((o) => o.createdAt.toISOString().slice(0, 10) === key)
      days.push({
        date: key,
        orders: dayOrders.length,
        revenue: Math.round(dayOrders.reduce((s, o) => s + o.charge, 0) * 100) / 100,
      })
    }

    // Launch checklist — onboarding steps that gate the store's full potential
    const checklist = {
      branding: Boolean(platform.tagline || platform.logoUrl),
      landing: Boolean(platform.heroTitle),
      payment: paymentMethods > 0,
      coupon: coupons > 0,
      clients: clients > 0,
      orders: orders.length > 0,
    }

    return jsonOk({
      platform: { id: platform.id, name: platform.name, slug: platform.slug, status: platform.status, theme: platform.theme, monthlyFee: platform.monthlyFee, nextBilling: platform.nextBilling, externalApi: platform.externalApi },
      checklist,
      stats: {
        clients,
        orders: orders.length,
        orders30: orders30._count,
        revenue: Math.round(revenue * 100) / 100,
        revenue30: Math.round((orders30._sum.charge ?? 0) * 100) / 100,
        depositsPending,
        ticketsOpen,
        unreadConvs: unreadConvs._sum.unread ?? 0,
        services,
        statusCounts,
      },
      recentOrders,
      topServices: topServices.map((t) => ({ name: t.serviceName, count: t._count.serviceName, revenue: t._sum.charge ?? 0 })),
      chart: days,
    })
  })
}
