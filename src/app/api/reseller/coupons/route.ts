// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

/**
 * Reseller promo coupons — scoped to the reseller's own platform clients.
 * GET    → list platform coupons with redemption stats + last 6 redemptions each
 * POST   → { code, value, maxUses, expiresAt?, note? }
 * PATCH  → { id, active?, note?, value?, maxUses?, expiresAt? }
 * DELETE → { id }
 *
 * Codes are globally unique (schema-level), so a reseller cannot take a code
 * that master GrowthRush (or another platform) already uses.
 */

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24)
}

async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const items = await db.coupon.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'desc' },
      include: {
        redemptions: { orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    const totals = await db.couponRedemption.aggregate({
      where: { coupon: { platformId: platform.id } },
      _sum: { amount: true },
    })
    const clients = await db.user.count({ where: { platformId: platform.id, role: 'CLIENT' } })
    return jsonOk({ items, totalGiven: totals._sum.amount ?? 0, clients })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const b = await req.json()
    const code = normalizeCode(String(b.code ?? ''))
    const value = Math.round(parseFloat(b.value) * 100) / 100
    const maxUses = Number.isFinite(parseInt(b.maxUses)) ? Math.max(0, parseInt(b.maxUses)) : 0
    if (code.length < 3) return jsonError('Code must be at least 3 characters (A-Z, 0-9, -)')
    if (!Number.isFinite(value) || value <= 0) return jsonError('Enter a valid bonus amount')

    const exists = await db.coupon.findUnique({ where: { code } })
    if (exists) {
      return jsonError(exists.platformId === platform.id ? `Code "${code}" already exists` : 'That code is taken on another network — pick another')
    }

    let expiresAt: Date | null = null
    if (b.expiresAt) {
      const d = new Date(b.expiresAt)
      if (Number.isNaN(d.getTime())) return jsonError('Invalid expiry date')
      expiresAt = d
    }

    const item = await db.coupon.create({
      data: { platformId: platform.id, code, value, maxUses, expiresAt, note: b.note ? String(b.note).slice(0, 200) : null },
    })
    return jsonOk({ ok: true, item, message: `Coupon ${code} created` })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing coupon id')
    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing || existing.platformId !== platform.id) return jsonError('Coupon not found', 404)

    const data: Record<string, unknown> = {}
    if (b.active !== undefined) data.active = !!b.active
    if (b.note !== undefined) data.note = b.note ? String(b.note).slice(0, 200) : null
    if (b.value !== undefined) {
      const v = Math.round(parseFloat(b.value) * 100) / 100
      if (!Number.isFinite(v) || v <= 0) return jsonError('Enter a valid bonus amount')
      data.value = v
    }
    if (b.maxUses !== undefined) data.maxUses = Math.max(0, parseInt(b.maxUses) || 0)
    if (b.expiresAt !== undefined) {
      if (!b.expiresAt) data.expiresAt = null
      else {
        const d = new Date(b.expiresAt)
        if (Number.isNaN(d.getTime())) return jsonError('Invalid expiry date')
        data.expiresAt = d
      }
    }
    const item = await db.coupon.update({ where: { id }, data })
    return jsonOk({ ok: true, item, message: `Coupon ${item.code} updated` })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { id } = await req.json()
    if (!id) return jsonError('Missing coupon id')
    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing || existing.platformId !== platform.id) return jsonError('Coupon not found', 404)
    const item = await db.coupon.delete({ where: { id } })
    return jsonOk({ ok: true, message: `Coupon ${item.code} deleted` })
  })
}
