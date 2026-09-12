import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, verifyPassword, jsonError, jsonOk, handle } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = clientIp(req)

    // Brute-force protection: 10 attempts / 5 min per IP and 5 / 5 min per account
    const ipLimit = rateLimit(`login:ip:${ip}`, 10, 5 * 60_000)
    if (!ipLimit.allowed) {
      return jsonError(`Too many attempts — try again in ${Math.ceil(ipLimit.retryAfterSec / 60)} minute(s)`, 429)
    }

    const { email, password } = await req.json()
    if (!email || !password) return jsonError('Email and password are required')
    const cleanEmail = String(email).toLowerCase().trim()

    const emailLimit = rateLimit(`login:email:${cleanEmail}`, 5, 5 * 60_000)
    if (!emailLimit.allowed) {
      return jsonError(`Too many attempts for this account — try again in ${Math.ceil(emailLimit.retryAfterSec / 60)} minute(s)`, 429)
    }

    const user = await db.user.findUnique({ where: { email: cleanEmail } })
    if (!user || !verifyPassword(password, user.password)) return jsonError('Invalid credentials', 401)
    if (user.status === 'BANNED') return jsonError('This account has been banned', 403)
    if (user.status === 'SUSPENDED') return jsonError('This account is suspended. Contact support.', 403)
    if (user.status === 'PENDING') return jsonError('Please verify your email — enter the code we sent you', 403)
    await setSessionCookie(user.id)
    return jsonOk({ ok: true, role: user.role })
  })
}
