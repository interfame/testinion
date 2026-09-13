// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { emitToUsers } from '@/lib/realtime-server'

// GrowthRush — AI agent autopilot (shared core)
//
// Used by:
//   · POST /api/reseller/crm/ai-reply   (manual "AI reply" button in the inbox)
//   · /api/cron/tick chatter simulator  (auto-pilot when a conversation is on AI)
//
// Generates an agent reply with the platform's active AI agent, persists it as
// an OUT message and pushes it over the websocket so the inbox updates live.

type CompletionShape = { choices?: { message?: { content?: string } }[] }

function parseChannels(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

export type AgentReplyResult =
  | { ok: true; message: { id: string; body: string; createdAt: Date; direction: string; aiGenerated: boolean }; agentName: string }
  | { ok: false; reason: string }

/**
 * Generate + persist an AI reply for a conversation.
 * Emits a realtime `crm` event to the platform owner when done.
 */
export async function generateAgentReply(
  conversationId: string,
  opts?: { emit?: boolean },
): Promise<AgentReplyResult> {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: { select: { name: true } } },
  })
  if (!conversation) return { ok: false, reason: 'Conversation not found' }

  // Pick the first active agent covering this channel (fallback: any active agent)
  const agents = await db.aiAgent.findMany({
    where: { platformId: conversation.platformId, active: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!agents.length) return { ok: false, reason: 'No active AI agent' }
  const agent = agents.find((a) => parseChannels(a.channels).includes(conversation.channel)) ?? agents[0]

  // Last 10 messages as context
  const recent = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  recent.reverse()

  const transcript = recent.length
    ? recent.map((m) => `${m.direction === 'IN' ? 'Customer' : 'Agent'}: ${m.body}`).join('\n')
    : '(no messages yet)'
  const lastIncoming = [...recent].reverse().find((m) => m.direction === 'IN')

  const system = [
    agent.prompt || 'You are a friendly sales & support agent for an SMM (social media marketing) panel.',
    agent.knowledge ? `Knowledge base:\n${agent.knowledge}` : '',
    'Guidelines: reply like a human chat agent. Keep it SHORT (under 60 words, a couple of sentences max). Match the language the customer writes in. Use at most one emoji. Never invent prices that are not in the knowledge base.',
    `Recent conversation (oldest first):\n${transcript}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  let reply = ''
  try {
    const zai = await ZAI.create()
    const completion = (await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            lastIncoming?.body ??
            'Send a short, helpful follow-up message to re-engage the customer.',
        },
      ],
      thinking: { type: 'disabled' },
    })) as CompletionShape
    reply = (completion.choices?.[0]?.message?.content ?? '').trim()
  } catch (e) {
    console.error('[ai-agent] SDK failure, using canned fallback:', e instanceof Error ? e.message : e)
  }

  if (!reply) {
    const topic = (lastIncoming?.body ?? 'your request').slice(0, 60)
    reply = `Thanks for reaching out! 👋 We received your message about "${topic}" — a specialist is on it and will reply in a few minutes. Meanwhile, you can browse our full catalog and prices from your dashboard.`
  }
  reply = reply.slice(0, 1200)

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId: conversation.id, direction: 'OUT', body: reply, aiGenerated: true },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: reply, lastMessageAt: new Date(), unread: 0 },
    }),
    db.aiAgent.update({ where: { id: agent.id }, data: { resolved: { increment: 1 } } }),
  ])

  if (opts?.emit !== false) {
    emitToUsers([await ownerIdOf(conversation.platformId)], {
      type: 'crm',
      action: 'message',
      conversationId: conversation.id,
      contactName: conversation.contact.name,
      channel: conversation.channel,
      direction: 'OUT',
      message: {
        id: message.id,
        body: message.body,
        direction: 'OUT',
        aiGenerated: true,
        createdAt: message.createdAt,
      },
      lastMessage: reply,
      lastMessageAt: message.createdAt,
      preview: reply.slice(0, 90),
    })
  }

  return { ok: true, message, agentName: agent.name }
}

async function ownerIdOf(platformId: string): Promise<string | null> {
  const p = await db.platform.findUnique({ where: { id: platformId }, select: { ownerId: true } })
  return p?.ownerId ?? null
}
