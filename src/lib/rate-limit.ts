// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
/**
 * Minimal in-memory rate limiter (per process) for auth endpoints.
 *
 * Sliding window keyed by `bucket` (e.g. "ip:1.2.3.4" or "email:a@b.com").
 * Memory is bounded: stale entries are swept opportunistically.
 * Good enough for single-instance deployments (Vercel Hobby, small VPS);
 * for multi-instance setups swap the Map for Redis.
 */
type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()
const MAX_KEYS = 10_000

export type RateResult = {
  allowed: boolean
  retryAfterSec: number
  remaining: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now()

  // opportunistic sweep to keep memory bounded
  if (buckets.size > MAX_KEYS / 2) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }
  if (buckets.size >= MAX_KEYS) buckets.clear()

  const entry = buckets.get(key)
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000), remaining: 0 }
  }
  entry.count++
  return { allowed: true, retryAfterSec: 0, remaining: limit - entry.count }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  return (fwd.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim()
}
