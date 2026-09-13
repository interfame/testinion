// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { emitToUsers } from '@/lib/realtime-server'

const CONTACT_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  channel: true,
  labels: true,
  notes: true,
  totalSpent: true,
  lastSeen: true,
} as const

const CONV_STATUSES = ['OPEN', 'AI', 'HANDED', 'CLOSED']

async function requirePlatform(userId: string) {
  const platform = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const conversation = await db.conversation.findFirst({
        where: { id, platformId: platform.id },
        include: {
          contact: { select: CONTACT_SELECT },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      })
      if (!conversation) return jsonError('Conversation not found', 404)
      return jsonOk({ conversation })
    }

    const conversations = await db.conversation.findMany({
      where: { platformId: platform.id },
      include: { contact: { select: CONTACT_SELECT } },
      orderBy: { lastMessageAt: 'desc' },
    })
    return jsonOk({ conversations })
  })
}

// POST { id, body } → send an OUT message from the agent (user)
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, body: text } = body
    if (!id || !text?.trim()) return jsonError('Conversation id and message body are required')

    const conversation = await db.conversation.findFirst({ where: { id, platformId: platform.id } })
    if (!conversation) return jsonError('Conversation not found', 404)

    const content = String(text).trim().slice(0, 4000)
    const [message] = await db.$transaction([
      db.message.create({
        data: { conversationId: conversation.id, direction: 'OUT', body: content },
      }),
      db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessage: content, lastMessageAt: new Date(), unread: 0 },
      }),
    ])

    // Live-push to every teammate watching this platform's inbox
    const teammates = await db.user.findMany({
      where: { OR: [{ id: user.id }, { role: 'TEAM', platformId: platform.id }] },
      select: { id: true },
    })
    emitToUsers(teammates.map((t) => t.id), {
      type: 'crm',
      action: 'message',
      conversationId: conversation.id,
      contactName: (await db.contact.findUnique({ where: { id: conversation.contactId }, select: { name: true } }))?.name ?? 'Contact',
      channel: conversation.channel,
      direction: 'OUT',
      message: {
        id: message.id,
        body: message.body,
        direction: 'OUT',
        aiGenerated: false,
        createdAt: message.createdAt,
      },
      lastMessage: content,
      lastMessageAt: message.createdAt,
      preview: content.slice(0, 90),
    })

    return jsonOk({ message, sentBy: user.name })
  })
}

// PATCH { id, status?, assignedName?, markRead? }
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, status, assignedName, markRead } = body
    if (!id) return jsonError('Conversation id is required')

    const conversation = await db.conversation.findFirst({ where: { id, platformId: platform.id } })
    if (!conversation) return jsonError('Conversation not found', 404)

    const data: Record<string, unknown> = {}
    if (status !== undefined) {
      if (!CONV_STATUSES.includes(String(status))) return jsonError('Invalid status')
      data.status = String(status)
    }
    if (assignedName !== undefined) {
      data.assignedName = assignedName ? String(assignedName).trim().slice(0, 80) : null
    }
    if (markRead) data.unread = 0

    const updated = await db.conversation.update({ where: { id: conversation.id }, data })
    return jsonOk({ conversation: updated })
  })
}
