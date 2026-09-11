// GrowthRush — realtime server-side emitter (Next.js backend → realtime service)
//
// Fire-and-forget push to the socket.io mini-service (`mini-services/realtime`,
// control port 3033). Never throws — if the service is down the platform keeps
// working and clients fall back to polling.

const CTRL_URL = process.env.REALTIME_URL || 'http://127.0.0.1:3033'
const SECRET = process.env.INTERNAL_SECRET || 'gr-internal-dev-secret'

export type RealtimePush = {
  type: 'notification' | 'order' | 'refresh' | string
  [key: string]: unknown
}

/** Push an event to the personal rooms of the given users (best-effort). */
export function emitToUsers(userIds: (string | null | undefined)[], event: RealtimePush) {
  const ids = userIds.filter((u): u is string => !!u)
  if (!ids.length) return
  const body = JSON.stringify({ userIds: ids, event })
  fetch(`${CTRL_URL}/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': SECRET },
    body,
    signal: AbortSignal.timeout(2500),
  }).catch(() => {
    /* realtime service offline — polling still covers it */
  })
}
