// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { emitToUsers } from '@/lib/realtime-server'
import { generateAgentReply } from '@/lib/ai-agent'
import { getReferralConfig, usdLabel } from '@/lib/referral'
import { sendTemplateEmail, brandNameOf } from '@/lib/email'

/**
 * Delivery engine tick — simulates provider progress on SMM orders.
 *
 * Called every ~10s by the order-engine mini-service (cron worker equivalent).
 * Auth (either one, must match CRON_SECRET):
 *   · `x-cron-secret` header      → generic cron workers (cPanel, VPS, cron-job.org…)
 *   · `Authorization: Bearer ...` → Vercel Cron sends this automatically when
 *     the CRON_SECRET environment variable is set on the Vercel project.
 *
 * Configurable from Admin → Settings → Delivery engine:
 *   engine_enabled      "0" | "1"        master switch (default on)
 *   engine_speed        slow|normal|turbo  queue delay + ticks to complete
 *   engine_partial_rate "0.07"             chance an order finishes PARTIAL
 *
 * State machine per tick:
 *   PENDING  → IN_PROGRESS        (after queue delay by speed)
 *   IN_PROGRESS → remains -= chunk (completes in N ticks by speed)
 *     - partial-rate chance the order finishes PARTIAL → auto-refund
 *     - COMPLETED → notify client + platform owner (DB + realtime push)
 */

const SPEEDS = {
  slow: { queueMs: 30_000, chunks: 12, advanceMs: 16_000 },
  normal: { queueMs: 12_000, chunks: 6, advanceMs: 8_000 },
  turbo: { queueMs: 4_000, chunks: 3, advanceMs: 4_000 },
} as const

type SpeedKey = keyof typeof SPEEDS

async function engineConfig() {
  const rows = await db.setting.findMany({
    where: { key: { in: ['engine_enabled', 'engine_speed', 'engine_partial_rate'] } },
  })
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  const speed: SpeedKey = map.engine_speed === 'slow' || map.engine_speed === 'turbo' ? map.engine_speed : 'normal'
  const partialRate = Math.min(0.9, Math.max(0, parseFloat(map.engine_partial_rate ?? '0.07'))) || 0
  return { enabled: map.engine_enabled !== '0', speed, partialRate }
}

/**
 * Auth helper — accepts the CRON_SECRET via (any of):
 *   · `x-cron-secret` header              → generic cron workers (cron-job.org, cPanel, VPS…)
 *   · `Authorization: Bearer ...` header  → Vercel Cron
 *   · `?secret=...` query param           → cron services that cannot send headers
 */
function authorize(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || 'gr-cron-dev-secret'
  const headerSecret = req.headers.get('x-cron-secret') ?? ''
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? ''
  const querySecret = new URL(req.url).searchParams.get('secret') ?? ''
  return headerSecret === expected || bearer === expected || querySecret === expected
}

// cron-job.org (and many UI-only cron services) send a GET when you press
// "Test run" — accept GET as well as POST so the endpoint never 405s.
async function runTick(req: NextRequest) {
  if (!authorize(req)) return jsonError('Unauthorized', 401)

  const cfg = await engineConfig()
  if (!cfg.enabled) return jsonOk({ disabled: true, at: new Date().toISOString() })
  const speed = SPEEDS[cfg.speed]

  const now = Date.now()

  // 1) Start queued orders (PENDING → IN_PROGRESS)
  const started = await db.order.updateMany({
    where: { status: 'PENDING', updatedAt: { lt: new Date(now - speed.queueMs) } },
    data: { status: 'IN_PROGRESS' },
  })
  if (started.count) {
    const justStarted = await db.order.findMany({
      where: { status: 'IN_PROGRESS', updatedAt: { gte: new Date(now - 2_000) } },
      select: { id: true, userId: true, platformId: true, status: true, remains: true },
    })
    for (const o of justStarted) {
      emitToUsers([o.userId, o.platformId ? (await db.platform.findUnique({ where: { id: o.platformId }, select: { ownerId: true } }))?.ownerId : null], {
        type: 'order', orderId: o.id, status: o.status, remains: o.remains,
      })
    }
  }

  // 2) Advance in-flight orders not touched in the last advanceMs
  const inFlight = await db.order.findMany({
    where: { status: 'IN_PROGRESS', updatedAt: { lt: new Date(now - speed.advanceMs) } },
    take: 60,
    orderBy: { updatedAt: 'asc' },
  })

  let advanced = 0
  let completed = 0
  let partial = 0

  const ownerCache = new Map<string, string | null>()
  const ownerOf = async (platformId: string | null) => {
    if (!platformId) return null
    if (!ownerCache.has(platformId)) {
      const p = await db.platform.findUnique({ where: { id: platformId }, select: { ownerId: true } })
      ownerCache.set(platformId, p?.ownerId ?? null)
    }
    return ownerCache.get(platformId) ?? null
  }

  for (const order of inFlight) {
    const chunk = Math.max(1, Math.ceil(order.quantity / speed.chunks))
    let remains = order.remains - chunk

    // configurable realistic chance of a partial delivery on the final chunk
    if (remains <= 0 && Math.random() < cfg.partialRate) {
      remains = Math.max(1, Math.round(order.quantity * 0.08))
    }

    if (remains <= 0) {
      await db.order.update({ where: { id: order.id }, data: { remains: 0, status: 'COMPLETED' } })
      completed++
      await notify(order.userId, 'ORDER', 'Order completed ✅', `${order.serviceName} — ${order.quantity.toLocaleString()} units delivered to ${order.link}`, 'orders')
      const ownerId = await ownerOf(order.platformId)
      if (ownerId) {
        await notify(ownerId, 'ORDER', 'Order completed on your platform ✅', `${order.serviceName} — ${order.quantity.toLocaleString()} units ($${order.charge.toFixed(2)})`, 'orders')
      }
      emitToUsers([order.userId, ownerId], { type: 'order', orderId: order.id, status: 'COMPLETED', remains: 0 })

      // Automated email: order completed (best-effort, never blocks the engine tick)
      try {
        const buyerForMail = await db.user.findUnique({ where: { id: order.userId }, select: { email: true } })
        if (buyerForMail?.email) {
          const brand = await brandNameOf(order.platformId)
          await sendTemplateEmail(order.platformId, 'order_complete', buyerForMail.email, {
            service: order.serviceName, quantity: order.quantity, platform: brand,
          })
        }
      } catch (e) {
        console.error('[tick] order email failed:', e instanceof Error ? e.message : e)
      }

      // Referral program: referrer earns the configured bonus on the buyer's FIRST completed order
      try {
        const buyer = await db.user.findUnique({
          where: { id: order.userId },
          select: { referredById: true, name: true, email: true },
        })
        if (buyer?.referredById) {
          const refCfg = await getReferralConfig()
          if (refCfg.enabled && refCfg.bonusAmount > 0) {
            const priorCompleted = await db.order.count({
              where: { userId: order.userId, status: 'COMPLETED', id: { not: order.id } },
            })
            if (priorCompleted === 0) {
              const referrer = await db.user.findUnique({
                where: { id: buyer.referredById },
                select: { email: true },
              })
              if (referrer && referrer.email !== buyer.email) {
                await db.$transaction([
                  db.user.update({ where: { id: buyer.referredById }, data: { balance: { increment: refCfg.bonusAmount } } }),
                  db.transaction.create({
                    data: {
                      userId: buyer.referredById,
                      type: 'REF_BONUS',
                      amount: refCfg.bonusAmount,
                      description: `Referral bonus — ${buyer.name}'s first order`,
                    },
                  }),
                ])
                await notify(buyer.referredById, 'MONEY', 'Referral bonus earned 💰', `${usdLabel(refCfg.bonusAmount)} credited — ${buyer.name} just completed their first order. Keep sharing your link!`, 'account')
              }
            }
          }
        }
      } catch (e) {
        console.error('[tick] referral bonus failed:', e instanceof Error ? e.message : e)
      }
    } else if (remains < order.remains && remains <= Math.ceil(order.quantity * 0.08)) {
      // finalize as PARTIAL and refund the undelivered share
      const refund = Math.round((remains / order.quantity) * order.charge * 100) / 100
      await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { remains, status: 'PARTIAL' } })
        await tx.user.update({ where: { id: order.userId }, data: { balance: { increment: refund } } })
        await tx.transaction.create({
          data: {
            userId: order.userId,
            platformId: order.platformId,
            type: 'REFUND',
            amount: refund,
            description: `Partial refund — ${order.serviceName} (${remains.toLocaleString()} undelivered)`,
          },
        })
      })
      partial++
      await notify(order.userId, 'MONEY', 'Partial delivery — refund issued 💸', `${order.serviceName}: ${remains.toLocaleString()} units could not be delivered. $${refund.toFixed(2)} refunded to your wallet.`, 'orders')
      emitToUsers([order.userId, await ownerOf(order.platformId)], { type: 'order', orderId: order.id, status: 'PARTIAL', remains })
    } else {
      await db.order.update({ where: { id: order.id }, data: { remains } })
      advanced++
      emitToUsers([order.userId, await ownerOf(order.platformId)], { type: 'order', orderId: order.id, status: 'IN_PROGRESS', remains })
    }
  }

  // 3) CRM live chatter — simulated incoming customer messages (+ AI autopilot)
  let chatter = { messages: 0, aiReplies: 0 }
  try {
    chatter = await crmChatter()
  } catch (e) {
    console.error('[tick] chatter failed:', e instanceof Error ? e.message : e)
  }

  return jsonOk({ started: started.count, advanced, completed, partial, chatter, speed: cfg.speed, at: new Date().toISOString() })
}

export async function POST(req: NextRequest) {
  return runTick(req)
}

export async function GET(req: NextRequest) {
  return runTick(req)
}

// ───────────────────────────── CRM live chatter ─────────────────────────────
//
// Simulates customers writing into the omnichannel inbox so the CRM feels
// alive end-to-end: an IN message lands → unread badges bump → the owner gets
// a realtime push + bell notification → conversations on "AI" status get an
// automatic AI-generated reply (agent autopilot).
//
// Admin → Settings → "CRM live chatter" toggles it (crm_chatter, default on).

const CHATTER_LINES = [
  'hola! quisiera 5k seguidores para mi cuenta, cuánto sale? 🙌',
  'hi! do you have a discount if I order 10k likes?',
  '¿hola? hice un pedido hace un rato y todavía no llega nada',
  'How long does delivery usually take for Instagram followers?',
  'oi! vocês têm seguidores brasileiros reais? preciso de 2k',
  'Can you refill my last order? it dropped a bit overnight',
  '¿manejan TikTok? quiero promocionar un video 🙏',
  'hey, my crypto payment went through but the balance is not updated',
  'bom dia! tem alguma promoção hoje?',
  'Do you support Telegram members? I need 2k for my channel',
  'Buenas! el panel acepta MercadoPago?',
  'Is the 30-day refill guarantee included in all services?',
  'holaa me hass censurado la cuenta?? 😅 era broma, todo bien?',
  'I want the same order as last week — 5k YouTube views again',
]

async function crmChatter() {
  const chatterRow = await db.setting.findUnique({ where: { key: 'crm_chatter' } })
  if (chatterRow?.value === '0') return { messages: 0, aiReplies: 0 }

  // ~18% of ticks produce a customer message (≈ 1 per minute with a 10s tick)
  if (Math.random() > 0.18) return { messages: 0, aiReplies: 0 }

  const candidates = await db.conversation.findMany({
    where: {
      status: { in: ['OPEN', 'AI', 'HANDED'] },
      lastMessageAt: { lt: new Date(Date.now() - 25_000) },
    },
    include: { contact: { select: { name: true } } },
    take: 25,
    orderBy: { lastMessageAt: 'desc' },
  })
  if (!candidates.length) return { messages: 0, aiReplies: 0 }

  const conversation = candidates[Math.floor(Math.random() * candidates.length)]
  const body = CHATTER_LINES[Math.floor(Math.random() * CHATTER_LINES.length)]
  const at = new Date()

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId: conversation.id, direction: 'IN', body },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: body, lastMessageAt: at, unread: { increment: 1 } },
    }),
    db.contact.update({
      where: { id: conversation.contactId },
      data: { lastSeen: at },
    }),
  ])

  const owner = await db.platform.findUnique({
    where: { id: conversation.platformId },
    select: { ownerId: true },
  })
  const ownerId = owner?.ownerId ?? null

  emitToUsers([ownerId], {
    type: 'crm',
    action: 'message',
    conversationId: conversation.id,
    contactName: conversation.contact.name,
    channel: conversation.channel,
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

  await notify(
    ownerId ?? '',
    'CRM',
    `New message · ${conversation.contact.name}`,
    body.slice(0, 120),
    `crm-inbox:${conversation.id}`,
  )

  // AI autopilot: conversations handled by the bot answer on their own
  let aiReplies = 0
  if (conversation.status === 'AI' && Math.random() < 0.85) {
    const reply = await generateAgentReply(conversation.id)
    if (reply.ok) aiReplies = 1
  }

  return { messages: 1, aiReplies }
}
