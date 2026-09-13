// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
/**
 * GrowthRush — Order Engine (cron worker)
 *
 * Drives the SMM delivery simulation: every 10s it calls the platform's
 * /api/cron/tick endpoint, which advances PENDING → IN_PROGRESS → COMPLETED
 * orders and fires notifications. Exposes a tiny health endpoint on :3031.
 *
 * Also babysits the Next.js dev server: the sandbox reaps processes spawned
 * from short-lived tool sessions, but this mini-service was started at boot
 * time — a dev server spawned as ITS child survives. The keeper only spawns
 * when :3000 is down, so reloads (--hot) never create duplicates.
 */

const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3000'
const SECRET = process.env.CRON_SECRET || 'gr-cron-dev-secret'
const TICK_MS = 10_000
const PORT = 3031
const PROJECT_DIR = process.env.PROJECT_DIR || '/home/z/my-project'

// ── Dev server keeper ───────────────────────────────────────────────
let devProc: ReturnType<typeof Bun.spawn> | null = null

async function platformUp(): Promise<boolean> {
  try {
    const res = await fetch(PLATFORM_URL, { signal: AbortSignal.timeout(4000) })
    return res.status < 500
  } catch {
    return false
  }
}

async function ensureDevServer() {
  if (await platformUp()) return
  if (devProc && !devProc.exited) {
    console.log('[order-engine] platform down but keeper process alive — waiting on it')
    return
  }
  console.log(`[order-engine] platform DOWN at ${new Date().toISOString()} — spawning dev server`)
  devProc = Bun.spawn(['bun', 'run', 'dev'], {
    cwd: PROJECT_DIR,
    stdout: 'ignore',
    stderr: 'ignore',
    stdin: 'ignore',
  })
  devProc.unref()
}

async function tick() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/cron/tick`, {
      method: 'POST',
      headers: { 'x-cron-secret': SECRET },
    })
    const json = await res.json().catch(() => null)
    if (res.ok) {
      const d = json?.data ?? json
      const total = (d?.started ?? 0) + (d?.advanced ?? 0) + (d?.completed ?? 0) + (d?.partial ?? 0)
      if (total > 0) {
        console.log(
          `[order-engine] ${new Date().toISOString()} started=${d?.started ?? 0} advanced=${d?.advanced ?? 0} completed=${d?.completed ?? 0} partial=${d?.partial ?? 0}`,
        )
      }
    } else {
      console.error(`[order-engine] tick failed: ${res.status}`, json)
    }
  } catch {
    // platform down — the keeper below will revive it
  }
}

Bun.serve({
  port: PORT,
  fetch() {
    return Response.json({ ok: true, service: 'order-engine', tickMs: TICK_MS, platform: PLATFORM_URL })
  },
})

console.log(`[order-engine] health on :${PORT} — ticking every ${TICK_MS / 1000}s → ${PLATFORM_URL}/api/cron/tick`)
await ensureDevServer()
await tick()
setInterval(tick, TICK_MS)
setInterval(ensureDevServer, 15_000)
