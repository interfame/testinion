// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { emitToUsers } from '@/lib/realtime-server'
import { sweepNoReply } from '@/lib/crm-engine'
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

  // 3) CRM real sweeps — NO_REPLY automations + AI autopilot follow-ups
  //    (real inbound arrives via webhooks; nothing here fabricates messages)
  let noReply = { ai: 0 }
  try {
    noReply = await sweepNoReply()
  } catch (e) {
    console.error('[tick] crm sweep failed:', e instanceof Error ? e.message : e)
  }

  // 4) Platform subscription sweep — auto-suspend expired storefronts and
  //    permanently delete suspended ones after the 30-day grace period.
  let expiry = { suspended: 0, deleted: 0, reminded: 0 }
  try {
    expiry = await sweepPlatforms()
  } catch (e) {
    console.error('[tick] platform sweep failed:', e instanceof Error ? e.message : e)
  }

  return jsonOk({ started: started.count, advanced, completed, partial, noReply, expiry, speed: cfg.speed, at: new Date().toISOString() })
}

// ───────────────────────── Platform subscription sweep ─────────────────────
//
//   · ACTIVE  + expiresAt < now                     → SUSPENDED (+ owner notice)
//   · ACTIVE  + expiresAt within 3 days             → renewal reminder notice
//   · SUSPENDED + suspendedAt < now − GRACE (30 d)  → PERMANENT DELETION
//
// After the grace period the storefront, its catalog, CRM data and branding are
// removed for good. Clients (User.platformId) survive and simply become users
// of the master GrowthRush panel.

const GRACE_DAYS = 30

async function sweepPlatforms(): Promise<{ suspended: number; deleted: number; reminded: number }> {
  const now = new Date()
  let suspended = 0
  let deleted = 0
  let reminded = 0

  // 5a) expire overdue ACTIVE platforms
  const expired = await db.platform.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    select: { id: true, name: true, ownerId: true, slug: true },
    take: 50,
  })
  for (const platform of expired) {
    await db.platform.update({
      where: { id: platform.id },
      data: { status: 'SUSPENDED', suspendedAt: now },
    })
    suspended++
    await notify(
      platform.ownerId,
      'SYSTEM',
      `Storefront "${platform.name}" suspended ⏸`,
      `Your subscription expired, so the storefront is offline. Renew within ${GRACE_DAYS} days to restore it — after that the platform is deleted permanently.`,
      'plan-billing'
    )
  }

  // 5b) renewal reminder 3 days before expiry (once — only ACTIVE platforms)
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const expiring = await db.platform.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: now, lt: soon } },
    select: { id: true, name: true, ownerId: true, expiresAt: true },
    take: 50,
  })
  for (const platform of expiring) {
    const days = Math.max(1, Math.ceil(((platform.expiresAt?.getTime() ?? now.getTime()) - now.getTime()) / 86_400_000))
    reminded++
    await notify(
      platform.ownerId,
      'SYSTEM',
      `Storefront "${platform.name}" expires in ${days} day${days === 1 ? '' : 's'} ⏳`,
      'Renew from Plan & Billing to keep the storefront online without interruption.',
      'plan-billing'
    )
  }

  // 5c) permanent deletion after the grace period
  const cutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000)
  const doomed = await db.platform.findMany({
    where: { status: 'SUSPENDED', OR: [{ suspendedAt: { lt: cutoff } }, { suspendedAt: null, updatedAt: { lt: cutoff } }] },
    select: { id: true, name: true, ownerId: true },
    take: 20,
  })
  for (const platform of doomed) {
    try {
      await deletePlatformCompletely(platform.id)
      deleted++
      await notify(
        platform.ownerId,
        'SYSTEM',
        `Storefront "${platform.name}" deleted`,
        `The ${GRACE_DAYS}-day grace period ended and the platform was permanently removed. Your client account keeps its balance and history on the master panel.`,
        'plan-billing'
      )
    } catch (e) {
      console.error('[tick] platform delete failed:', platform.id, e instanceof Error ? e.message : e)
    }
  }

  return { suspended, deleted, reminded }
}

/** Delete a platform and every required-relation child (CRM suite). */
async function deletePlatformCompletely(platformId: string) {
  await db.$transaction([
    db.message.deleteMany({ where: { conversation: { platformId } } }),
    db.conversation.deleteMany({ where: { platformId } }),
    db.contact.deleteMany({ where: { platformId } }),
    db.channel.deleteMany({ where: { platformId } }),
    db.label.deleteMany({ where: { platformId } }),
    db.quickReply.deleteMany({ where: { platformId } }),
    db.aiAgent.deleteMany({ where: { platformId } }),
    db.automation.deleteMany({ where: { platformId } }),
    db.platform.delete({ where: { id: platformId } }),
  ])
}

export async function POST(req: NextRequest) {
  return runTick(req)
}

export async function GET(req: NextRequest) {
  return runTick(req)
}
