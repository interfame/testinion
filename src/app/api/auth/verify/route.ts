import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie, jsonError, jsonOk, handle } from '@/lib/auth'

/**
 * POST /api/auth/verify — { email, code }
 * Activates a PENDING account, sets the session cookie and returns { ok, role }.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const { email, code } = await req.json()
    if (!email || !code) return jsonError('Email and code are required')
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (!user) return jsonError('Invalid or expired code', 400)
    if (user.status === 'ACTIVE') {
      // Already verified (idempotent) — just log them in
      await setSessionCookie(user.id)
      return jsonOk({ ok: true, role: user.role })
    }
    if (user.status !== 'PENDING' || !user.verifyCode) return jsonError('This account cannot be verified — try logging in', 400)
    if (!user.verifyExpires || user.verifyExpires.getTime() < Date.now()) {
      return jsonError('This code has expired — request a new one', 400)
    }
    if (user.verifyCode !== String(code).trim()) return jsonError('Invalid or expired code', 400)

    await db.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', verifyCode: null, verifyExpires: null },
    })
    await setSessionCookie(user.id)
    return jsonOk({ ok: true, role: user.role })
  })
}
