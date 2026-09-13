// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
/**
 * GrowthRush — Realtime service (WebSocket)
 *
 * One socket.io server (path "/", port 3032) that the SPA connects to via
 * the Caddy gateway (`io('/?XTransformPort=3032')`). Clients join a personal
 * room `user:<id>` after subscribing, and the Next.js backend pushes events
 * (notifications, order updates, CRM messages) through an internal HTTP
 * emitter running on port 3033 (guarded by a shared secret).
 *
 * Event wire format (always "gr:event"):
 *   { type: 'notification', notification: {...} }
 *   { type: 'order', orderId, status, remains }
 *   { type: 'refresh', scope }
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { Server } from 'socket.io'

const WS_PORT = 3032
const CTRL_PORT = 3033
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'gr-internal-dev-secret'

const onlineUsers = new Map<string, Set<string>>() // userId -> socketIds

// ── WebSocket server ────────────────────────────────────────────────────────
const wsServer = createServer()
const io = new Server(wsServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  socket.on('subscribe', (userId: unknown) => {
    if (typeof userId !== 'string' || !userId || userId.length > 64) return
    socket.join(`user:${userId}`)
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId)!.add(socket.id)
  })

  socket.on('unsubscribe', (userId: unknown) => {
    if (typeof userId !== 'string') return
    socket.leave(`user:${userId}`)
    onlineUsers.get(userId)?.delete(socket.id)
  })

  socket.on('disconnect', () => {
    for (const [userId, ids] of onlineUsers) {
      ids.delete(socket.id)
      if (!ids.size) onlineUsers.delete(userId)
    }
  })
})

wsServer.listen(WS_PORT, () => {
  console.log(`[realtime] socket.io on :${WS_PORT} (path /)`)
})

// ── Internal emit API (Next.js backend → this service) ─────────────────────
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 1e6) reject(new Error('too large'))
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

const ctrlServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const done = (code: number, json: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(json))
  }

  if (req.method === 'GET') {
    return done(200, {
      ok: true,
      service: 'realtime',
      wsPort: WS_PORT,
      onlineUsers: onlineUsers.size,
      sockets: io.engine.clientsCount,
    })
  }

  if (req.method === 'POST' && req.url === '/emit') {
    if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) return done(401, { error: 'Unauthorized' })
    try {
      const body = JSON.parse(await readBody(req)) as {
        userIds?: string[]
        event?: { type?: string } & Record<string, unknown>
      }
      const userIds = (body.userIds ?? []).filter((u) => typeof u === 'string')
      const event = { ...body.event, at: new Date().toISOString() }
      let delivered = 0
      for (const id of userIds) {
        const room = `user:${id}`
        if (io.sockets.adapter.rooms.has(room)) {
          io.to(room).emit('gr:event', event)
          delivered++
        }
      }
      return done(200, { ok: true, delivered })
    } catch (e) {
      return done(400, { error: e instanceof Error ? e.message : 'Bad request' })
    }
  }

  done(404, { error: 'Not found' })
})

ctrlServer.listen(CTRL_PORT, () => {
  console.log(`[realtime] internal emit API on :${CTRL_PORT} (POST /emit)`)
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
