// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform found for this account', 404)

    const [contacts, conversations, agents] = await Promise.all([
      db.contact.findMany({ where: { platformId: platform.id }, select: { createdAt: true } }),
      db.conversation.findMany({
        where: { platformId: platform.id },
        select: { id: true, status: true, channel: true },
      }),
      db.aiAgent.findMany({ where: { platformId: platform.id }, select: { resolved: true } }),
    ])

    const convIds = conversations.map((c) => c.id)
    const messages = convIds.length
      ? await db.message.findMany({
          where: { conversationId: { in: convIds } },
          select: { direction: true },
        })
      : []

    const byStatus: Record<string, number> = {}
    const byChannel: Record<string, number> = {}
    for (const c of conversations) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1
      byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1
    }

    let messagesIn = 0
    let messagesOut = 0
    for (const m of messages) {
      if (m.direction === 'IN') messagesIn++
      else messagesOut++
    }

    const aiResolved = agents.reduce((sum, a) => sum + a.resolved, 0)

    // Last 7 days new contacts (grouped in JS)
    const last7Days: { date: string; label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      const next = new Date(day)
      next.setDate(day.getDate() + 1)
      last7Days.push({
        date: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        count: contacts.filter((c) => c.createdAt >= day && c.createdAt < next).length,
      })
    }

    return jsonOk({
      totals: {
        contacts: contacts.length,
        conversations: conversations.length,
        conversationsOpen: (byStatus.OPEN ?? 0) + (byStatus.AI ?? 0) + (byStatus.HANDED ?? 0),
        conversationsClosed: byStatus.CLOSED ?? 0,
        messages: messages.length,
        messagesIn,
        messagesOut,
        aiResolved,
        avgMessagesPerConversation: conversations.length
          ? Math.round((messages.length / conversations.length) * 10) / 10
          : 0,
      },
      byStatus,
      byChannel,
      last7Days,
    })
  })
}
