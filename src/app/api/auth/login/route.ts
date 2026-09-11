import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, verifyPassword, jsonError, jsonOk, handle } from '@/lib/auth'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const { email, password } = await req.json()
    if (!email || !password) return jsonError('Email and password are required')
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (!user || !verifyPassword(password, user.password)) return jsonError('Invalid credentials', 401)
    if (user.status === 'BANNED') return jsonError('This account has been banned', 403)
    if (user.status === 'SUSPENDED') return jsonError('This account is suspended. Contact support.', 403)
    if (user.status === 'PENDING') return jsonError('Please verify your email — enter the code we sent you', 403)
    await setSessionCookie(user.id)
    return jsonOk({ ok: true, role: user.role })
  })
}
