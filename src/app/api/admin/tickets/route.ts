// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/admin/tickets — all tickets with user + last message */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const tickets = await db.ticket.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })
    return jsonOk({ tickets })
  })
}

/** PATCH /api/admin/tickets — {id, status: OPEN|ANSWERED|CLOSED} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, status } = await req.json()
    if (!id || !['OPEN', 'ANSWERED', 'CLOSED'].includes(status)) return jsonError('Missing or invalid parameters')
    const ticket = await db.ticket.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    return jsonOk({ ok: true, ticket, message: `Ticket ${status.toLowerCase()}` })
  })
}
