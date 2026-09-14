// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// Growthrush — lightweight unauthenticated liveness probe.
// Used by the panel "Live" chip as a polling fallback when the realtime
// websocket service is not reachable (e.g. serverless deploys).
// Intentionally DB-free and anonymous: it must stay fast and cacheable-safe.

import { jsonOk } from '@/lib/auth'

export const dynamic = 'force-static'

export function GET() {
  return jsonOk({ ok: true, ts: Date.now() })
}
