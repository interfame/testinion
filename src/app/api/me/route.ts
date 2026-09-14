// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk, hashPassword, verifyPassword, generateApiKey } from '@/lib/auth'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

export async function GET() {
  return handle(async () => {
    const session = await requireUser()
    let user = await db.user.findUnique({ where: { id: session.id } })
    if (!user) return jsonError('User not found', 404)

    // Lazy-generate the referral code so Account → Refer & earn always has one
    if (!user.refCode) {
      const code = generateRefCode(user.id)
      try {
        user = await db.user.update({ where: { id: user.id }, data: { refCode: code } })
      } catch {
        // Collision (virtually impossible) — retry once with a suffix
        user = await db.user.update({
          where: { id: user.id },
          data: { refCode: `${code}${Math.floor(Math.random() * 90 + 10)}` },
        })
      }
    }

    const [platform, storefront, referralCount, referralEarned] = await Promise.all([
      // Schema-drift safe: never fails, even on a database missing new columns
      resilientPlatformForOwner(user.id),
      // The reseller storefront this user belongs to (for white-label branding)
      user.platformId
        ? db.platform.findUnique({
            where: { id: user.platformId },
            select: { id: true, name: true, slug: true, theme: true, accent: true, logoUrl: true, tagline: true, domainType: true, customDomain: true, status: true },
          })
        : null,
      db.user.count({ where: { referredById: user.id } }),
      db.transaction.aggregate({
        where: { userId: user.id, type: 'REF_BONUS' },
        _sum: { amount: true },
      }),
    ])
    const { password: _p, ...safe } = user
    return jsonOk({
      user: {
        ...safe,
        platform,
        storefront,
        referralCount,
        referralEarned: Math.round((referralEarned._sum.amount ?? 0) * 100) / 100,
      },
    })
  })
}

/** Short, human-friendly referral code derived from the user id. */
function generateRefCode(id: string): string {
  const base = id.replace(/[^a-z0-9]/gi, '').toUpperCase()
  return `${base.slice(-4)}${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase().padStart(2, '0')}`
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const session = await requireUser()
    const body = await req.json()
    const data: Record<string, string | boolean> = {}

    if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 80)
    if (body.currency !== undefined) data.currency = String(body.currency).slice(0, 3).toUpperCase()
    if (body.language !== undefined) data.language = String(body.language).slice(0, 2)
    if (body.twoFactorEnabled !== undefined) data.twoFactorEnabled = !!body.twoFactorEnabled

    if (body.newPassword) {
      const user = await db.user.findUnique({ where: { id: session.id } })
      if (!user) return jsonError('User not found', 404)
      if (!body.currentPassword || !verifyPassword(body.currentPassword, user.password))
        return jsonError('Current password is incorrect')
      if (String(body.newPassword).length < 6) return jsonError('Password must be at least 6 characters')
      data.password = hashPassword(String(body.newPassword))
    }

    await db.user.update({ where: { id: session.id }, data })
    if (body.regenerateApiKey) {
      await db.user.update({ where: { id: session.id }, data: { apiKey: generateApiKey('gr') } })
    }
    const fresh = await db.user.findUnique({ where: { id: session.id } })
    if (!fresh) return jsonError('User not found', 404)
    const [platform, storefront] = await Promise.all([
      // Schema-drift safe (same helper as GET)
      resilientPlatformForOwner(session.id),
      fresh.platformId
        ? db.platform.findUnique({
            where: { id: fresh.platformId },
            select: { id: true, name: true, slug: true, theme: true, accent: true, logoUrl: true, tagline: true, domainType: true, customDomain: true, status: true },
          })
        : null,
    ])
    const { password: _p, ...safe } = fresh
    return jsonOk({ user: { ...safe, platform, storefront } })
  })
}
