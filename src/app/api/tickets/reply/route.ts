// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'

/** Reply to a ticket. Clients reply to their own; SUPER_ADMIN to any. Optional file attachment (already uploaded → /api/media/<id>). */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { ticketId, body, fileUrl, fileName, fileMime, fileSize } = await req.json()
    const text = typeof body === 'string' ? body.trim() : ''
    if (!ticketId || (!text && !fileUrl)) return jsonError('Message or attachment is required')
    if (fileUrl && !/^\/api\/media\/[a-z0-9]+$/i.test(String(fileUrl))) return jsonError('Invalid attachment URL')

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
        body: text || (typeof fileMime === 'string' && fileMime.startsWith('image/') ? '(image)' : '(attachment)'),
        ...(fileUrl ? {
          fileUrl: String(fileUrl),
          fileName: fileName ? String(fileName).slice(0, 200) : null,
          fileMime: fileMime ? String(fileMime).slice(0, 120) : null,
          fileSize: Number.isFinite(Number(fileSize)) ? Number(fileSize) : null,
        } : {}),
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
