// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { emitToUsers } from '@/lib/realtime-server'
import { decryptSecret } from '@/lib/crypto'

// GrowthRush — AI agent autopilot (shared core, BYOK)
//
// COST MODEL (important): every AI agent runs on the RESELLER'S OWN model API
// key (OpenAI · Claude · Gemini — entered in AI Agents, encrypted at rest).
// The Growthrush platform owner pays nothing for reseller AI usage.
//
// Used by:
//   · POST /api/reseller/crm/ai-reply   (manual "AI reply" button in the inbox)
//   · CRM engine inbound pipeline       (auto-pilot when a conversation is on AI)
//
// Generates an agent reply with the platform's active AI agent, persists it as
// an OUT message and pushes it over the websocket so the inbox updates live.

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

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

/** Call the provider REST API with the agent's own key. Throws on failure. */
async function callProvider(
  provider: string,
  model: string,
  apiKey: string,
  temperature: number,
  messages: ChatMessage[]
): Promise<string> {
  if (provider === 'CLAUDE') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 300, temperature, messages }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      content?: { text?: string }[]
      error?: { message?: string }
    }
    if (!res.ok) throw new Error(data?.error?.message || `Claude API error ${res.status}`)
    return (data.content?.map((c) => c.text ?? '').join('') ?? '').trim()
  }

  if (provider === 'GEMINI') {
    const sys = messages.find((m) => m.role === 'system')?.content ?? ''
    const rest = messages.filter((m) => m.role !== 'system')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
          contents: rest.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature, maxOutputTokens: 300 },
        }),
      }
    )
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
      error?: { message?: string }
    }
    if (!res.ok) throw new Error(data?.error?.message || `Gemini API error ${res.status}`)
    return (data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '').trim()
  }

  // Default: OpenAI-compatible chat completions (OPENAI)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature, max_tokens: 300, messages }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`)
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

/**
 * Generate + persist an AI reply for a conversation using the agent's OWN key.
 * Emits a realtime `crm` event to the platform owner when done.
 */
export async function generateAgentReply(
  conversationId: string,
  opts?: { emit?: boolean }
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

  // BYOK: the agent MUST have its own key — the platform funds nothing.
  const apiKey = decryptSecret(agent.apiKey)
  if (!apiKey) {
    return {
      ok: false,
      reason: `Agent "${agent.name}" has no API key. Open AI Agents and add your own ${agent.provider} key — calls are billed to your provider account, not to Growthrush.`,
    }
  }

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
    reply = await callProvider(
      agent.provider,
      agent.model || 'gpt-4o-mini',
      apiKey,
      Math.min(1, Math.max(0, agent.temperature)),
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            lastIncoming?.body ??
            'Send a short, helpful follow-up message to re-engage the customer.',
        },
      ]
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Provider request failed'
    console.error('[ai-agent] provider call failed:', msg)
    return { ok: false, reason: `${agent.provider} request failed: ${msg}` }
  }

  if (!reply) return { ok: false, reason: 'The model returned an empty reply — try again or adjust the agent prompt.' }
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
