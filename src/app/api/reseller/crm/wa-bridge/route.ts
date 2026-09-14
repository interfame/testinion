// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.

// Authed server-side proxy for the WhatsApp QR bridge.
//
// Why: the browser cannot always reach the reseller's bridge directly (mixed
// content, CORS, sandbox previews). This route forwards requests to the
// bridge configured for the panel — WA_BRIDGE_URL env var or the local
// companion service — so the QR flow works with ZERO client setup.

import { NextRequest } from 'next/server'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { waBridgeBase } from '@/lib/wa-bridge'

const BASE = waBridgeBase()

/** GET ?session=<id> → bridge session status (+ QR when waiting) · ?health=1 → bridge liveness */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireUser()
    const url = new URL(req.url)
    if (url.searchParams.get('health')) {
      try {
        const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(4000) })
        const d = (await res.json().catch(() => ({}))) as { ok?: boolean }
        return jsonOk({ ok: !!d.ok, base: BASE })
      } catch {
        return jsonOk({ ok: false, base: BASE })
      }
    }
    const session = (url.searchParams.get('session') || '').trim()
    if (!session || !/^[A-Za-z0-9_-]{1,64}$/.test(session)) return jsonError('Bad session id', 400)
    try {
      const res = await fetch(`${BASE}/session/${encodeURIComponent(session)}`, { signal: AbortSignal.timeout(8000) })
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return jsonOk(d)
    } catch {
      return jsonError('Bridge unreachable — check that the WhatsApp bridge service is online', 502)
    }
  })
}

/** POST { action: 'start' | 'logout', session } — open a pairing session or drop one */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireUser()
    const body = (await req.json().catch(() => ({}))) as { action?: string; session?: string }
    const session = String(body.session || '').trim()
    if (!session || !/^[A-Za-z0-9_-]{1,64}$/.test(session)) return jsonError('Bad session id', 400)
    if (body.action !== 'start' && body.action !== 'logout') return jsonError('Bad action', 400)
    const path = body.action === 'start' ? '/session/start' : `/session/${encodeURIComponent(session)}/logout`
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
        signal: AbortSignal.timeout(20000),
      })
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return jsonOk(d)
    } catch {
      return jsonError('Bridge unreachable — check that the WhatsApp bridge service is online', 502)
    }
  })
}
