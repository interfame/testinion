import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'

/** Reply to a ticket. Clients reply to their own; SUPER_ADMIN to any. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { ticketId, body } = await req.json()
    if (!ticketId || !body?.trim()) return jsonError('Message is required')

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) return jsonError('Ticket not found', 404)
    const isStaff = ['SUPER_ADMIN', 'TEAM', 'RESELLER'].includes(user.role)
    if (!isStaff && ticket.userId !== user.id) return jsonError('Ticket not found', 404)

    const message = await db.ticketMessage.create({
      data: {
        ticketId,
        senderId: user.id,
        senderName: isStaff ? 'Support Team' : user.name,
        isStaff,
        body: String(body).trim(),
      },
    })
    await db.ticket.update({ where: { id: ticketId }, data: { status: isStaff ? 'ANSWERED' : 'OPEN' } })
    if (isStaff && ticket.userId !== user.id) {
      await notify(ticket.userId, 'TICKET', 'Support replied to your ticket 🎫', ticket.subject.slice(0, 60), 'tickets')
    }
    return jsonOk({ message })
  })
}

/** Close / reopen a ticket */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { ticketId, status } = await req.json()
    if (!ticketId || !status) return jsonError('Missing parameters')
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket || (ticket.userId !== user.id && user.role !== 'SUPER_ADMIN')) return jsonError('Ticket not found', 404)
    await db.ticket.update({ where: { id: ticketId }, data: { status } })
    return jsonOk({ ok: true })
  })
}
