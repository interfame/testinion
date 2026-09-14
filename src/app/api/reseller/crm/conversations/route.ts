// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { sendOutboundMessage } from '@/lib/crm-engine'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

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
  const platform = await resilientPlatformForOwner(userId)
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

    const result = await sendOutboundMessage(platform.id, conversation.id, conversation.channel, String(text).trim())

    return jsonOk({ message: { id: result.id }, sentBy: user.name, delivered: result.sent, deliveryError: result.error ?? null })
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
