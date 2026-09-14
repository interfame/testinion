// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.

// WhatsApp QR bridge — self-hosted companion service for the Growthrush CRM.
//
// Vercel is serverless: the WhatsApp-Web protocol needs a persistent socket,
// so it can never run inside the Next.js deployment. This tiny service runs
// on any always-on Node/Bun host (Railway, Render, Fly.io, a VPS…) and gives
// the reseller panel a WhatsApp-Web-style QR pairing flow:
//
//   1. Panel asks this bridge to open a session → bridge returns a REAL QR
//   2. Reseller scans it with WhatsApp (Linked devices)
//   3. Bridge reports `connected`; incoming/outgoing messages flow through
//      the CRM webhook (`/api/webhooks/crm/<channelId>`)
//
// Endpoints (CORS enabled — the browser talks to it directly):
//   GET  /health                       → { ok }
//   POST /session/start  { session }   → { status, qr? }  (qr = PNG data URL)
//   GET  /session/:id                  → { status, qr?, user? }
//   POST /session/:id/logout           → { ok }
//
// Sessions persist in ./sessions so a restart does not force a re-scan.
// Deploy (web only): push this folder to its own GitHub repo → Railway
// "Deploy from GitHub" → done. No env vars required.

import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'

// Baileys is imported lazily so `bun install` in CI never breaks on its
// optional native bits — the bridge still serves /health without it.
type BaileysModule = typeof import('@whiskeysockets/baileys')

const PORT = 3040
const SESSIONS_DIR = join(import.meta.dir, 'sessions')

type SessionState = {
  status: 'qr' | 'connecting' | 'connected' | 'disconnected'
  qr?: string // PNG data URL
  user?: string
  sock?: unknown
  ev?: unknown
}

const sessions = new Map<string, SessionState>()

async function loadBaileys(): Promise<BaileysModule | null> {
  try {
    return await import('@whiskeysockets/baileys')
  } catch (e) {
    console.error('[bridge] Baileys not available:', e instanceof Error ? e.message : e)
    return null
  }
}

async function persistSession(id: string) {
  try {
    await mkdir(SESSIONS_DIR, { recursive: true })
    const state = sessions.get(id)
    await writeFile(
      join(SESSIONS_DIR, `${id}.json`),
      JSON.stringify({ status: state?.status, user: state?.user ?? null }),
    )
  } catch { /* best effort */ }
}

async function startSession(id: string): Promise<SessionState> {
  const existing = sessions.get(id)
  if (existing && (existing.status === 'connected' || existing.status === 'connecting')) return existing

  const baileys = await loadBaileys()
  if (!baileys) {
    const state: SessionState = { status: 'disconnected' }
    sessions.set(id, state)
    return state
  }

  const { default: makeWASocket, useMultiFileAuthState: multiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys
  await mkdir(join(SESSIONS_DIR, id), { recursive: true })
  const { state, saveCreds } = await multiFileAuthState(join(SESSIONS_DIR, id))
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Growthrush', 'Chrome', '1.0.0'],
  })

  const sessionState: SessionState = { status: 'connecting', sock, ev: sock.ev }
  sessions.set(id, sessionState)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update: { qr?: string; connection?: string }) => {
    const s = sessions.get(id)
    if (!s) return
    if (update.qr) {
      try {
        s.qr = await QRCode.toDataURL(update.qr, { margin: 1, width: 320 })
        s.status = 'qr'
        console.log(`[bridge] QR ready for session ${id}`)
      } catch { /* qr encode failed */ }
    }
    if (update.connection === 'open') {
      s.status = 'connected'
      s.qr = undefined
      s.user = (sock.user as { id?: string } | undefined)?.id ?? undefined
      console.log(`[bridge] session ${id} connected as ${s.user}`)
      await persistSession(id)
    }
    if (update.connection === 'close') {
      const code = (update as { lastDisconnect?: { error?: { output?: { statusCode?: number } } } })
        .lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        s.status = 'disconnected'
        s.user = undefined
        await persistSession(id)
      } else {
        // Transient drop — reconnect automatically
        setTimeout(() => { void startSession(id) }, 3000)
      }
    }
  })

  // Incoming messages → forward to the panel webhook when configured
  sock.ev.on('messages.upsert', async (up: { messages: { key?: { remoteJid?: string; fromMe?: boolean }; pushName?: string; message?: { conversation?: string; extendedTextMessage?: { text?: string } } }[] }) => {
    const s = sessions.get(id)
    const webhookUrl = s?.webhookUrl
    if (!webhookUrl) return
    for (const msg of up.messages) {
      if (msg.key?.fromMe) continue
      const body = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? ''
      if (!body) continue
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: msg.key?.remoteJid, name: msg.pushName ?? '', text: body }),
        })
      } catch { /* webhook unreachable — skip */ }
    }
  })

  return sessionState
}

const json = (res: import('node:http').ServerResponse, code: number, data: unknown) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

const readBody = (req: import('node:http').IncomingMessage): Promise<Record<string, string>> =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c: Buffer) => { raw += c })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
  })

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, service: 'whatsapp-bridge' })

  // POST /session/start { session, webhookUrl? }
  if (req.method === 'POST' && url.pathname === '/session/start') {
    const body = await readBody(req)
    const id = (body.session || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
    if (!id) return json(res, 400, { error: 'session id required' })
    const state = await startSession(id)
    if (state) state.webhookUrl = body.webhookUrl || state.webhookUrl
    return json(res, 200, { status: state.status, qr: state.qr ?? null, user: state.user ?? null })
  }

  // GET /session/:id
  const statusMatch = url.pathname.match(/^\/session\/([a-zA-Z0-9_-]+)$/)
  if (req.method === 'GET' && statusMatch) {
    const s = sessions.get(statusMatch[1])
    if (!s) return json(res, 404, { status: 'disconnected' })
    return json(res, 200, { status: s.status, qr: s.qr ?? null, user: s.user ?? null })
  }

  // POST /session/:id/logout
  const logoutMatch = url.pathname.match(/^\/session\/([a-zA-Z0-9_-]+)\/logout$/)
  if (req.method === 'POST' && logoutMatch) {
    const s = sessions.get(logoutMatch[1])
    try {
      const sock = s?.sock as { logout?: () => Promise<void>; end?: () => void } | undefined
      await sock?.logout?.()
      sock?.end?.()
    } catch { /* already dead */ }
    sessions.delete(logoutMatch[1])
    return json(res, 200, { ok: true })
  }

  json(res, 404, { error: 'not found' })
})

server.listen(PORT, () => console.log(`[bridge] WhatsApp QR bridge on :${PORT}`))
