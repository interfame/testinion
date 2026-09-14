// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — CRM inbound webhook (REAL provider traffic, no simulation).
//
//   GET  → Meta webhook verification (hub.challenge) for WhatsApp Cloud API
//   POST → one route for every channel type:
//          · Telegram update        (setWebhook → this URL)
//          · WhatsApp Cloud message (Meta webhook → this URL)
//          · Web-chat widget        (storefront floating chat → this URL)
//
// URL format (given to the reseller in Channels → Connect):
//   https://<your-domain>/api/webhooks/crm/<channelId>?k=<webhookSecret>
//
// The secret `k` (or Meta's hub.verify_token) must match the channel's stored
// webhookSecret. Incoming messages run the full CRM engine: contact upsert →
// conversation → automations (WELCOME / KEYWORD / AWAY_HOURS) → AI autopilot
// (reseller's own API key) → realtime inbox push.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handle, jsonOk } from '@/lib/auth'
import { parseChannelConfig } from '@/lib/crm-send'
import { handleInbound } from '@/lib/crm-engine'

type Params = { params: Promise<{ channelId: string }> }

function authorized(channelConfig: string | null | undefined, req: NextRequest): boolean {
  const creds = parseChannelConfig(channelConfig)
  const secret = String(creds.webhookSecret ?? '')
  if (!secret) return false
  const url = new URL(req.url)
  const k = url.searchParams.get('k') ?? ''
  const hubToken = url.searchParams.get('hub.verify_token') ?? ''
  const header = req.headers.get('x-webhook-secret') ?? ''
  return k === secret || hubToken === secret || header === secret
}

export async function GET(req: NextRequest, { params }: Params) {
  // Meta webhook verification handshake
  const { channelId } = await params
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge') ?? ''

  const channel = await db.channel.findUnique({ where: { id: channelId } })
  if (!channel) return new Response('Not found', { status: 404 })

  const creds = parseChannelConfig(channel.config)
  const secret = String(creds.webhookSecret ?? '')
  if (mode === 'subscribe' && token && token === secret) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
  }
  if (authorized(channel.config, req)) return jsonOk({ ok: true })
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { channelId } = await params
    const channel = await db.channel.findUnique({ where: { id: channelId } })
    if (!channel) return jsonOk({ ok: false, error: 'unknown channel' })
    if (!authorized(channel.config, req)) return jsonOk({ ok: false, error: 'forbidden' })

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>

    // ── Telegram update ────────────────────────────────────────────────
    if (channel.type === 'TELEGRAM' && payload.message) {
      const msg = payload.message as {
        text?: string
        chat?: { id?: number | string }
        from?: { first_name?: string; username?: string }
      }
      if (msg.text && msg.chat?.id !== undefined) {
        await handleInbound({
          platformId: channel.platformId,
          channelId: channel.id,
          channelType: 'TELEGRAM',
          handle: String(msg.chat.id),
          contactName: msg.from?.first_name || msg.from?.username || undefined,
          body: msg.text,
        })
      }
      return jsonOk({ ok: true })
    }

    // ── WhatsApp Cloud API webhook ─────────────────────────────────────
    if (channel.type === 'WHATSAPP' && Array.isArray(payload.entry)) {
      type WaMsg = { from?: string; text?: { body?: string } }
      type WaEntry = {
        changes?: {
          value?: {
            messages?: WaMsg[]
            contacts?: { profile?: { name?: string }; wa_id?: string }[]
          }
        }[]
      }
      for (const entry of payload.entry as WaEntry[]) {
        const value = entry.changes?.[0]?.value
        const msg = value?.messages?.[0]
        const name = value?.contacts?.[0]?.profile?.name
        if (msg?.from && msg.text?.body) {
          await handleInbound({
            platformId: channel.platformId,
            channelId: channel.id,
            channelType: 'WHATSAPP',
            handle: msg.from,
            contactName: name || undefined,
            body: msg.text.body,
          })
        }
      }
      return jsonOk({ ok: true })
    }

    // ── Web-chat widget (storefront floating chat) ─────────────────────
    if (channel.type === 'WEBCHAT') {
      const body = String((payload.body as string) ?? '').trim()
      const handle = String((payload.handle as string) ?? '').trim().slice(0, 160) || `web-${Date.now()}`
      const name = String((payload.name as string) ?? '').trim().slice(0, 80) || 'Web visitor'
      if (body) {
        const result = await handleInbound({
          platformId: channel.platformId,
          channelId: channel.id,
          channelType: 'WEBCHAT',
          handle,
          contactName: name,
          body,
        })
        return jsonOk({ ok: true, conversationId: result.conversationId })
      }
      return jsonOk({ ok: false, error: 'empty body' })
    }

    // Unsupported type (Instagram/Messenger/Email) — acknowledge to stop retries
    return jsonOk({ ok: true, note: 'channel type has no inbound parser yet' })
  })
}
