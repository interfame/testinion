// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — public storefront web-chat endpoint.
//
// The storefront's floating chat widget posts here (no secrets exposed in the
// page): the platform is resolved by slug, the platform must be ACTIVE and own
// a CONNECTED WEBCHAT channel. Messages run the full CRM engine (contact →
// conversation → automations → AI autopilot) and appear in the reseller inbox.
// Rate limited per IP+visitor to stop bot spam.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handle, jsonOk } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { handleInbound } from '@/lib/crm-engine'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as {
      slug?: string
      name?: string
      body?: string
      visitorId?: string
    }

    const slug = String(body.slug ?? '').toLowerCase().trim().slice(0, 80)
    const text = String(body.body ?? '').trim().slice(0, 2000)
    if (!slug || !text) return jsonOk({ ok: false, error: 'missing data' })

    // Per-IP + visitor throttle: 12 messages / minute
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const visitor = String(body.visitorId ?? 'anon').slice(0, 64)
    const rl = rateLimit(`webchat:${ip}:${visitor}`, 12, 60_000)
    if (!rl.allowed) return jsonOk({ ok: false, error: 'slow_down', retryAfterSec: rl.retryAfterSec })

    const platform = await db.platform.findFirst({
      where: { status: 'ACTIVE', OR: [{ slug }, { customDomain: slug }] },
      select: { id: true },
    })
    if (!platform) return jsonOk({ ok: false, error: 'store_not_found' })

    const webchat = await db.channel.findFirst({
      where: { platformId: platform.id, type: 'WEBCHAT', status: 'CONNECTED' },
      select: { id: true },
    })
    if (!webchat) return jsonOk({ ok: false, error: 'chat_offline' })

    const result = await handleInbound({
      platformId: platform.id,
      channelId: webchat.id,
      channelType: 'WEBCHAT',
      handle: `web:${visitor}`,
      contactName: String(body.name ?? '').trim().slice(0, 80) || 'Web visitor',
      body: text,
    })

    return jsonOk({ ok: true, conversationId: result.conversationId })
  })
}
