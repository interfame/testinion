// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (id) {
      const ticket = await db.ticket.findUnique({
        where: { id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      if (!ticket || (ticket.userId !== user.id && user.role !== 'SUPER_ADMIN')) return jsonError('Ticket not found', 404)
      return jsonOk({ ticket })
    }
    const tickets = await db.ticket.findMany({
      where: user.role === 'SUPER_ADMIN' ? {} : { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    return jsonOk({ tickets })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { subject, category, priority, message } = await req.json()
    if (!subject?.trim() || !message?.trim()) return jsonError('Subject and message are required')
    const ticket = await db.ticket.create({
      data: {
        platformId: user.platformId,
        userId: user.id,
        subject: String(subject).trim().slice(0, 140),
        category: category || 'general',
        priority: priority || 'normal',
        messages: {
          create: { senderId: user.id, senderName: user.name, body: String(message).trim() },
        },
      },
      include: { messages: true },
    })
    return jsonOk({ ticket })
  })
}
