// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { resilientPlatformForOwner } from '@/lib/platform-safe'
import { NextResponse } from 'next/server'

const SECRET = process.env.AUTH_SECRET || 'growthrush-dev-secret-key-v1'
const COOKIE = 'gr_session'

// ── Passwords ─────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const test = scryptSync(password, salt, 64)
    return timingSafeEqual(Buffer.from(hash, 'hex'), test)
  } catch {
    return false
  }
}

export function generateApiKey(prefix = 'gr'): string {
  return `${prefix}_${randomBytes(20).toString('hex')}`
}

// ── Session tokens ─────────────────────────
function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createToken(userId: string): string {
  const payload = `${userId}.${Date.now()}`
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

export function readToken(token: string): string | null {
  try {
    const [b64, sig] = token.split('.')
    const payload = Buffer.from(b64, 'base64url').toString()
    const expected = Buffer.from(sign(payload))
    const received = Buffer.from(sig ?? '')
    // timing-safe comparison — never leak signature validity through latency
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
    const [userId, ts] = payload.split('.')
    // 30 day expiry
    if (Date.now() - parseInt(ts) > 30 * 24 * 3600 * 1000) return null
    return userId
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string) {
  const store = await cookies()
  store.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
    // HTTPS-only in production deployments (Vercel etc.); relaxed on local dev
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE)
}

// ── Current user ───────────────────────────
export type SafeUser = {
  id: string
  email: string
  name: string
  role: string
  balance: number
  currency: string
  language: string
  apiKey: string
  twoFactorEnabled: boolean
  status: string
  platformId: string | null
  createdAt: Date
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  const userId = readToken(token)
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.status === 'BANNED') return null
  const { password: _p, ...safe } = user
  return safe as SafeUser
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

// Require auth — returns user or throws a Response
export async function requireUser(): Promise<SafeUser> {
  const user = await getSessionUser()
  if (!user) throw jsonError('Unauthorized', 401)
  return user
}

export async function requireRole(roles: string[]): Promise<SafeUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw jsonError('Forbidden', 403)
  return user
}

// Wrap a handler catching thrown NextResponse (from require* helpers).
// Internal errors never leak stack/Prisma details to the client.
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof Response) return e
    const msg = e instanceof Error ? e.message : 'Internal error'
    console.error('[api]', msg)
    return jsonError(process.env.NODE_ENV === 'production' ? 'Internal error — please try again' : msg, 500)
  }
}

// ── Platform scope helpers ─────────────────
export async function getOwnedPlatform(userId: string) {
  return resilientPlatformForOwner(userId)
}
