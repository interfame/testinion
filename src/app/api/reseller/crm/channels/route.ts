// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/crypto'
import { validateChannel, type ChannelCreds } from '@/lib/crm-send'
import { resilientPlatformForOwner } from '@/lib/platform-safe'
import { WA_BRIDGE_PANEL, waBridgeBase } from '@/lib/wa-bridge'

const TYPES = ['WHATSAPP', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'EMAIL', 'WEBCHAT']
const STATUSES = ['CONNECTED', 'DISCONNECTED', 'PENDING']

// Config keys that hold credentials → encrypted at rest, masked on read.
const SECRET_KEYS = ['botToken', 'accessToken', 'password', 'apiKey']
const PLAIN_KEYS = ['phoneNumberId', 'verifyToken', 'email', 'host', 'mode', 'bridgeUrl', 'bridgeSession']

async function requirePlatform(userId: string) {
  const platform = await resilientPlatformForOwner(userId)
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

/** Encrypt credential fields before storing Channel.config */
function encryptConfig(creds: Record<string, unknown>): string {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(creds)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = SECRET_KEYS.includes(k) ? encryptSecret(String(v)) : String(v).slice(0, 300)
  }
  return JSON.stringify(out)
}

/** Merge new credentials into the existing config (keeps old values when blank). */
function mergeConfig(existingRaw: string | null | undefined, patch: Record<string, unknown>): string {
  let existing: Record<string, unknown> = {}
  try {
    existing = JSON.parse(existingRaw || '{}') as Record<string, unknown>
  } catch {
    existing = {}
  }
  const merged: Record<string, unknown> = { ...existing }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    if (v === '' && SECRET_KEYS.includes(k)) continue // blank = keep current secret
    merged[k] = SECRET_KEYS.includes(k) ? encryptSecret(String(v)) : String(v).slice(0, 300)
  }
  return JSON.stringify(merged)
}

/** Client-safe view of a channel: masked secrets + the webhook URL to install. */
function channelView(channel: { id: string; type: string; name: string; handle: string | null; status: string; config: string | null; createdAt: Date }, origin: string) {
  let creds: Record<string, unknown> = {}
  try {
    creds = JSON.parse(channel.config || '{}') as Record<string, unknown>
  } catch { /* ignore */ }
  const configPreview: Record<string, string | null> = {}
  for (const key of [...SECRET_KEYS, ...PLAIN_KEYS]) {
    if (creds[key] === undefined) continue
    configPreview[key] = SECRET_KEYS.includes(key) ? maskSecret(String(creds[key])) : String(creds[key])
  }
  const secret = String(creds.webhookSecret ?? '')
  return {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    handle: channel.handle,
    status: channel.status,
    createdAt: channel.createdAt,
    configPreview,
    webhookSecret: secret ? `${secret.slice(0, 4)}••••${secret.slice(-4)}` : null,
    webhookUrl: secret ? `${origin}/api/webhooks/crm/${channel.id}?k=${secret}` : null,
  }
}

function originOf(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https')
  return host ? `${proto}://${host}` : new URL(req.url).origin
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const origin = originOf(req)

    if (id) {
      const channel = await db.channel.findFirst({ where: { id, platformId: platform.id } })
      if (!channel) return jsonError('Channel not found', 404)
      return jsonOk({ channel: channelView(channel, origin) })
    }

    const channels = await db.channel.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'asc' },
    })
    return jsonOk({ channels: channels.map((c) => channelView(c, origin)) })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { type, name, handle: channelHandle, config } = body
    if (!TYPES.includes(String(type))) return jsonError('Invalid channel type')
    if (!name?.trim()) return jsonError('Channel name is required')

    const webhookSecret = crypto.randomBytes(16).toString('hex')
    const configStr = encryptConfig({ ...(typeof config === 'object' && config ? config : {}), webhookSecret })
    const channel = await db.channel.create({
      data: {
        platformId: platform.id,
        type: String(type),
        name: String(name).trim().slice(0, 120),
        handle: channelHandle ? String(channelHandle).trim().slice(0, 160) : null,
        status: 'DISCONNECTED',
        config: configStr,
      },
    })
    return jsonOk({ channel: channelView(channel, originOf(req)) })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, name, handle: channelHandle, type, config, action } = body
    if (!id) return jsonError('Channel id is required')

    const existing = await db.channel.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Channel not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim().slice(0, 120)
    if (channelHandle !== undefined) data.handle = channelHandle ? String(channelHandle).trim().slice(0, 160) : null
    if (type !== undefined && TYPES.includes(String(type))) data.type = String(type)
    if (config && typeof config === 'object') data.config = mergeConfig(existing.config, config as Record<string, unknown>)

    // REAL connect flow — validate the credentials against the provider API.
    if (action === 'connect') {
      const nextConfig = data.config ?? existing.config
      const parsedNext: Record<string, unknown> = (() => {
        try {
          return JSON.parse(String(nextConfig || '{}')) as Record<string, unknown>
        } catch {
          return {}
        }
      })()

      // WhatsApp QR mode — validated against the bridge (the reseller's own
      // hosted bridge, or the panel-hosted one via '@panel'). Baileys/WhatsApp-Web
      // protocol needs a persistent socket, so it never runs on serverless itself.
      if (existing.type === 'WHATSAPP' && parsedNext.mode === 'qr') {
        const rawBridge = String(parsedNext.bridgeUrl ?? '').trim().replace(/\/+$/, '')
        const bridgeUrl = rawBridge === WA_BRIDGE_PANEL ? waBridgeBase() : rawBridge
        const bridgeSession = String(parsedNext.bridgeSession ?? existing.id)
        if (!bridgeUrl) {
          if (data.config) await db.channel.update({ where: { id: existing.id }, data })
          return jsonError('Bridge URL is required for QR linking (e.g. https://your-bridge.up.railway.app)', 400)
        }
        try {
          const res = await fetch(`${bridgeUrl}/session/${encodeURIComponent(bridgeSession)}`, {
            signal: AbortSignal.timeout(10000),
          })
          const state = (await res.json().catch(() => ({}))) as { status?: string; user?: string }
          if (state.status !== 'connected') {
            if (data.config) await db.channel.update({ where: { id: existing.id }, data })
            return jsonError(
              state.status === 'qr' || state.status === 'connecting'
                ? 'Scan the QR with WhatsApp first (WhatsApp → Settings → Linked devices), then press Connect again'
                : `Bridge reports session "${state.status}" — generate a fresh QR and scan it`,
              400,
            )
          }
          data.status = 'CONNECTED'
          if (state.user && !existing.handle) data.handle = state.user
        } catch {
          if (data.config) await db.channel.update({ where: { id: existing.id }, data })
          return jsonError('Could not reach the WhatsApp bridge — check the URL is public and online', 400)
        }
      } else {
        const creds: ChannelCreds = (() => {
          const out: ChannelCreds = {}
          for (const key of ['botToken', 'accessToken', 'phoneNumberId', 'verifyToken']) {
            if (parsedNext[key] !== undefined) out[key] = decryptSecret(String(parsedNext[key]))
          }
          return out
        })()
        const check = await validateChannel(existing.type, creds)
        if (!check.ok) {
          // Persist any credential updates the user just typed, but stay DISCONNECTED
          if (data.config) await db.channel.update({ where: { id: existing.id }, data })
          return jsonError(`Connection failed: ${check.detail}`, 400)
        }
        data.status = existing.type === 'INSTAGRAM' || existing.type === 'MESSENGER' || existing.type === 'EMAIL' ? 'PENDING' : 'CONNECTED'
        if (check.handle && !existing.handle) data.handle = check.handle
      }
      if (data.config) {
        // store the derived handle/verifyToken for the webhook verifier
        try {
          const parsed = JSON.parse(String(data.config)) as Record<string, unknown>
          if (!parsed.verifyToken && parsed.webhookSecret) parsed.verifyToken = parsed.webhookSecret
          data.config = JSON.stringify(parsed)
        } catch { /* ignore */ }
      }
    } else if (action === 'disconnect') {
      data.status = 'DISCONNECTED'
    } else if (body.status !== undefined && STATUSES.includes(String(body.status)) && action === undefined) {
      // Direct status set is no longer allowed for CONNECTED (must pass validation);
      // disconnecting directly is still fine.
      if (String(body.status) === 'CONNECTED') return jsonError('Use action:"connect" — credentials are validated against the provider first', 400)
      data.status = String(body.status)
    }

    const channel = await db.channel.update({ where: { id: existing.id }, data })
    return jsonOk({ channel: channelView(channel, originOf(req)) })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Channel id is required')

    const existing = await db.channel.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Channel not found', 404)

    await db.channel.delete({ where: { id: existing.id } })
    return jsonOk({ ok: true })
  })
}
