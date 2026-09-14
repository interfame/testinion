// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — CRM inbound engine: turns incoming messages (real webhooks or
// the web-chat widget) into contacts, conversations, automation runs and AI
// autopilot replies. This is REAL logic, not a simulation:
//
//   · WELCOME     fires on the first inbound message of a conversation
//   · KEYWORD     fires when the message contains the keyword (case-insensitive)
//   · AWAY_HOURS  fires when the message arrives outside the business hours
//                 configured in CRM Settings ("09:00 - 21:00 (Mon-Sat)")
//   · NO_REPLY    swept by the cron tick (AI conversations with no answer)
//
// Actions executed per automation (stored as JSON):
//   { "type": "send_message", "value": "text" }   → persisted + sent via the
//                                                    channel's real API
//   { "type": "add_label",    "value": "Lead" }   → appended to the contact
//   { "type": "assign",       "value": "Ana" }    → assigns + status HANDED
//
// When CRM Settings → autoAssignAi is on (default) and no human is assigned,
// new conversations automatically enter AI mode and the active agent (with the
// reseller's own API key) answers.

import { db } from '@/lib/db'
import { emitToUsers } from '@/lib/realtime-server'
import { notify } from '@/lib/notify'
import { sendChannelMessage, parseChannelConfig } from '@/lib/crm-send'
import { decryptSecret } from '@/lib/crypto'
import { generateAgentReply } from '@/lib/ai-agent'

type AutomationAction = { type: string; value?: string }

function parseActions(raw: string | null | undefined): AutomationAction[] {
  try {
    const v = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? (v as AutomationAction[]) : []
  } catch {
    return []
  }
}

function parseLabels(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

/** Parse "09:00 - 21:00 (Mon-Sat)" → { startMin, endMin, days } | null */
function parseBusinessHours(spec: string): { startMin: number; endMin: number; days: number[] } | null {
  const m = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})(?:\s*\(([^)]+)\))?/.exec(spec || '')
  if (!m) return null
  const startMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const endMin = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
  const span = (m[5] ?? 'Mon-Sun').toLowerCase()
  const first = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(span.slice(0, 3))
  const last = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(span.slice(-3))
  if (first < 0 || last < 0) return null
  const days: number[] = []
  for (let d = first; ; d = (d + 1) % 7) {
    days.push(d)
    if (d === last) break
  }
  return { startMin, endMin, days }
}

/** Is `at` inside business hours? (server time — documented in CRM Settings) */
function inBusinessHours(spec: string, at: Date): boolean {
  const spec2 = parseBusinessHours(spec)
  if (!spec2) return true
  const day = (at.getDay() + 6) % 7 // 0 = Monday
  if (!spec2.days.includes(day)) return false
  const mins = at.getHours() * 60 + at.getMinutes()
  return mins >= spec2.startMin && mins <= spec2.endMin
}

export type InboundInput = {
  platformId: string
  channelId?: string | null
  channelType: string
  handle: string // contact identifier (phone / chat id / email / visitor id)
  contactName?: string
  body: string
}

export type InboundResult = {
  conversationId: string
  messageId: string
  contactId: string
  isNewContact: boolean
  isNewConversation: boolean
  automationRuns: number
  aiTriggered: boolean
}

/**
 * Full inbound pipeline for one customer message. Returns the conversation id
 * so webhook routes can respond quickly. Never throws for automation issues —
 * the message itself is always persisted first.
 */
export async function handleInbound(input: InboundInput): Promise<InboundResult> {
  const body = input.body.trim().slice(0, 4000)
  const at = new Date()
  const handle = input.handle.trim().slice(0, 160)

  // 1) Contact — find by platform + handle (stored in phone for messengers, email for EMAIL)
  let contact = await db.contact.findFirst({
    where: { platformId: input.platformId, OR: [{ phone: handle }, { email: handle }] },
  })
  const isNewContact = !contact
  if (!contact) {
    contact = await db.contact.create({
      data: {
        platformId: input.platformId,
        name: (input.contactName || handle || 'Visitor').slice(0, 80),
        phone: input.channelType === 'EMAIL' ? null : handle,
        email: input.channelType === 'EMAIL' ? handle : null,
        channel: input.channelType,
        lastSeen: at,
      },
    })
  } else {
    await db.contact.update({ where: { id: contact.id }, data: { lastSeen: at } }).catch(() => undefined)
  }

  // 2) Conversation — reuse the latest non-closed one, else create
  let conversation = await db.conversation.findFirst({
    where: { contactId: contact.id, status: { not: 'CLOSED' } },
    orderBy: { lastMessageAt: 'desc' },
  })
  const priorInbound = conversation
    ? await db.message.count({ where: { conversationId: conversation.id, direction: 'IN' } })
    : 0
  const isNewConversation = !conversation
  if (!conversation) {
    conversation = await db.conversation.create({
      data: { platformId: input.platformId, contactId: contact.id, channel: input.channelType, unread: 0 },
    })
  }

  // 3) Persist the inbound message (source of truth)
  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId: conversation.id, direction: 'IN', body } }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: body, lastMessageAt: at, unread: { increment: 1 } },
    }),
  ])

  // 4) Realtime + notification to the owner
  const platform = await db.platform.findUnique({
    where: { id: input.platformId },
    select: { ownerId: true, settings: true },
  })
  const ownerId = platform?.ownerId ?? null
  emitToUsers([ownerId], {
    type: 'crm',
    action: 'message',
    conversationId: conversation.id,
    contactName: contact.name,
    channel: input.channelType,
    direction: 'IN',
    message: {
      id: message.id,
      body: message.body,
      direction: 'IN',
      aiGenerated: false,
      createdAt: message.createdAt,
    },
    lastMessage: body,
    lastMessageAt: at,
    preview: body.slice(0, 90),
  })
  if (ownerId) {
    await notify(ownerId, 'CRM', `New message · ${contact.name}`, body.slice(0, 120), `crm-inbox:${conversation.id}`)
  }

  // 5) Automations — real trigger evaluation
  let automationRuns = 0
  try {
    automationRuns = await runAutomations({
      platformId: input.platformId,
      conversationId: conversation.id,
      contactId: contact.id,
      channelType: input.channelType,
      body,
      isFirstMessage: isNewConversation || priorInbound === 0,
      at,
    })
  } catch (e) {
    console.error('[crm-engine] automations failed:', e instanceof Error ? e.message : e)
  }

  // 6) AI autopilot — when the conversation is on AI, or autoAssignAi puts it there
  let aiTriggered = false
  try {
    const fresh = await db.conversation.findUnique({ where: { id: conversation.id } })
    const settings = readCrmAutoAssign(platform?.settings)
    const shouldAi = fresh?.status === 'AI' || (fresh?.status === 'OPEN' && settings.autoAssignAi && !fresh?.assignedName)
    if (fresh && shouldAi) {
      if (fresh.status !== 'AI') {
        await db.conversation.update({ where: { id: fresh.id }, data: { status: 'AI' } })
      }
      const reply = await generateAgentReply(fresh.id)
      aiTriggered = reply.ok
      if (!reply.ok) console.log('[crm-engine] AI autopilot skipped:', reply.reason)
    }
  } catch (e) {
    console.error('[crm-engine] ai autopilot failed:', e instanceof Error ? e.message : e)
  }

  return {
    conversationId: conversation.id,
    messageId: message.id,
    contactId: contact.id,
    isNewContact,
    isNewConversation,
    automationRuns,
    aiTriggered,
  }
}

function readCrmAutoAssign(settingsJson: string | null | undefined): { autoAssignAi: boolean } {
  try {
    const parsed = JSON.parse(settingsJson || '{}') as { crm?: { autoAssignAi?: boolean } }
    return { autoAssignAi: parsed?.crm?.autoAssignAi !== false }
  } catch {
    return { autoAssignAi: true }
  }
}

/** Evaluate + execute matching automations for an inbound message. */
async function runAutomations(ctx: {
  platformId: string
  conversationId: string
  contactId: string
  channelType: string
  body: string
  isFirstMessage: boolean
  at: Date
}): Promise<number> {
  const automations = await db.automation.findMany({
    where: { platformId: ctx.platformId, active: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!automations.length) return 0

  const settingsRow = await db.platform.findUnique({
    where: { id: ctx.platformId },
    select: { settings: true },
  })
  let businessHours = '09:00 - 21:00 (Mon-Sat)'
  let awayMessage = ''
  try {
    const parsed = JSON.parse(settingsRow?.settings || '{}') as {
      crm?: { businessHours?: string; awayMessage?: string }
    }
    if (parsed?.crm?.businessHours) businessHours = parsed.crm.businessHours
    awayMessage = parsed?.crm?.awayMessage ?? ''
  } catch { /* defaults */ }

  let runs = 0
  for (const automation of automations) {
    let matches = false
    switch (automation.trigger) {
      case 'WELCOME':
        matches = ctx.isFirstMessage
        break
      case 'KEYWORD':
        matches = !!automation.matchValue && ctx.body.toLowerCase().includes(automation.matchValue.toLowerCase())
        break
      case 'AWAY_HOURS':
        matches = !inBusinessHours(businessHours, ctx.at)
        break
      default:
        matches = false // NO_REPLY is swept by cron; HANDOFF is manual
    }
    if (!matches) continue

    for (const action of parseActions(automation.actions).slice(0, 5)) {
      const value = String(action.value ?? '').slice(0, 2000)
      try {
        if (action.type === 'send_message' && value) {
          await sendOutboundMessage(ctx.platformId, ctx.conversationId, ctx.channelType, value || awayMessage)
        } else if (action.type === 'add_label' && value) {
          const contact = await db.contact.findUnique({ where: { id: ctx.contactId }, select: { labels: true } })
          const labels = parseLabels(contact?.labels)
          if (!labels.includes(value)) labels.push(value)
          await db.contact.update({ where: { id: ctx.contactId }, data: { labels: JSON.stringify(labels.slice(0, 20)) } })
          // Keep the Label registry in sync so the label shows up in filters
          const existing = await db.label.findFirst({ where: { platformId: ctx.platformId, name: value } })
          if (!existing) await db.label.create({ data: { platformId: ctx.platformId, name: value.slice(0, 40) } })
        } else if (action.type === 'assign' && value) {
          await db.conversation.update({
            where: { id: ctx.conversationId },
            data: { assignedName: value.slice(0, 60), status: 'HANDED' },
          })
        }
      } catch (e) {
        console.error('[crm-engine] action failed:', action.type, e instanceof Error ? e.message : e)
      }
    }

    await db.automation.update({ where: { id: automation.id }, data: { runs: { increment: 1 } } })
    runs++
    if (await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { status: true } }).then((c) => c?.status === 'HANDED')) {
      break // handed to a human — stop the automation chain
    }
  }
  return runs
}

/** Persist an OUT message and deliver it through the channel's real API. */
export async function sendOutboundMessage(
  platformId: string,
  conversationId: string,
  channelType: string,
  body: string
): Promise<{ id: string; sent: boolean; error?: string }> {
  const content = body.trim().slice(0, 4000)
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: { select: { name: true, phone: true, email: true } } },
  })
  if (!conversation) return { id: '', sent: false, error: 'Conversation not found' }

  const channel =
    (await db.channel.findFirst({
      where: { platformId, type: channelType, status: 'CONNECTED' },
      orderBy: { createdAt: 'asc' },
    })) ?? null
  const creds = parseChannelConfig(channel?.config)
  const to =
    channelType === 'EMAIL'
      ? conversation.contact.email
      : conversation.contact.phone
  const result = await sendChannelMessage(channelType, channel?.config ?? null, to ?? null, content)
  void creds

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId, direction: 'OUT', body: content, aiGenerated: false },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: content, lastMessageAt: new Date(), unread: 0 },
    }),
  ])

  const platform = await db.platform.findUnique({ where: { id: platformId }, select: { ownerId: true } })
  emitToUsers([platform?.ownerId ?? null], {
    type: 'crm',
    action: 'message',
    conversationId,
    contactName: conversation.contact.name,
    channel: channelType,
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

  return { id: message.id, sent: result.sent, error: result.error }
}

/**
 * Cron sweep — NO_REPLY automations + AI autopilot follow-ups.
 * Conversations whose last message is still IN (customer waiting) and older
 * than `minAgeMs` get one automation pass / AI answer attempt.
 */
export async function sweepNoReply(minAgeMs = 10 * 60 * 1000, take = 25): Promise<{ ai: number }> {
  const threshold = new Date(Date.now() - minAgeMs)
  const waiting = await db.conversation.findMany({
    where: { status: { in: ['AI', 'OPEN'] }, lastMessageAt: { lt: threshold } },
    orderBy: { lastMessageAt: 'asc' },
    take,
    select: { id: true, platformId: true, status: true },
  })
  let ai = 0
  for (const conv of waiting) {
    const last = await db.message.findFirst({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'desc' },
      select: { direction: true },
    })
    if (last?.direction !== 'IN') continue // agent already answered

    // NO_REPLY automations fire first
    const automations = await db.automation.findMany({
      where: { platformId: conv.platformId, active: true, trigger: 'NO_REPLY' },
      take: 3,
    })
    for (const automation of automations) {
      for (const action of parseActions(automation.actions).slice(0, 3)) {
        if (action.type === 'send_message' && action.value) {
          const convRow = await db.conversation.findUnique({ where: { id: conv.id }, select: { channel: true } })
          if (convRow) await sendOutboundMessage(conv.platformId, conv.id, convRow.channel, String(action.value).slice(0, 2000))
        }
      }
      await db.automation.update({ where: { id: automation.id }, data: { runs: { increment: 1 } } })
    }

    // Then the AI agent (only if an agent with a key exists — no platform cost)
    if (conv.status === 'AI') {
      const agents = await db.aiAgent.findMany({
        where: { platformId: conv.platformId, active: true },
        take: 5,
      })
      const withKey = agents.find((a) => !!decryptSecret(a.apiKey))
      if (withKey) {
        const reply = await generateAgentReply(conv.id)
        if (reply.ok) ai++
      }
    }
  }
  return { ai }
}
