// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/** Reseller support inbox: tickets of my platform's clients + my own tickets to GrowthRush */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonOk({ clientTickets: [], myTickets: [] })

    const [clientTickets, myTickets] = await Promise.all([
      db.ticket.findMany({
        where: { platformId: platform.id },
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: 'asc' } } },
      }),
      db.ticket.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
    ])
    return jsonOk({ clientTickets, myTickets })
  })
}
