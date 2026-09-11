import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, jsonOk, handle } from '@/lib/auth'
import { sendTemplateEmail, generateVerifyCode, brandNameOf } from '@/lib/email'

const RESEND_COOLDOWN_MS = 30_000 // light rate-limit: one resend every 30s

/**
 * POST /api/auth/resend — { email }
 * Regenerates + resends the verification code (PENDING accounts only, 30s cooldown).
 * Returns { ok, devCode? } — devCode only in outbox demo mode.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const { email } = await req.json()
    if (!email) return jsonError('Email is required')
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (!user || user.status === 'ACTIVE') return jsonError('This account is already verified — try logging in', 400)
    if (user.status !== 'PENDING') return jsonError('This account cannot be verified — contact support', 400)

    // Light rate-limit: the previous code must be at least 30s old
    if (user.verifyExpires) {
      const issuedAt = user.verifyExpires.getTime() - 15 * 60 * 1000
      if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) {
        return jsonError('Please wait a few seconds before requesting a new code', 429)
      }
    }

    const code = generateVerifyCode()
    await db.user.update({
      where: { id: user.id },
      data: { verifyCode: code, verifyExpires: new Date(Date.now() + 15 * 60 * 1000) },
    })
    const platform = await brandNameOf(user.platformId)
    const res = await sendTemplateEmail(user.platformId, 'verify_code', user.email, { name: user.name, code, platform })
    return jsonOk({ ok: true, ...(res.mode === 'outbox' ? { devCode: code } : {}) })
  })
}
