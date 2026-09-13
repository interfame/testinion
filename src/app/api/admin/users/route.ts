// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

const SAFE_SELECT = {
  id: true, name: true, email: true, role: true, balance: true, currency: true,
  language: true, status: true, platformId: true, twoFactorEnabled: true, createdAt: true,
} as const

/** GET /api/admin/users?q=&role=&status= */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }]
    if (role) where.role = role
    if (status) where.status = status

    const users = await db.user.findMany({
      where,
      select: { ...SAFE_SELECT, platform: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return jsonOk({ users })
  })
}

/** PATCH /api/admin/users — {id, action: suspend|activate|ban|adjust_balance, amount?, note?} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, action, amount, note, role } = await req.json()
    if (!id || !action) return jsonError('Missing parameters')

    if (action === 'suspend' || action === 'activate' || action === 'ban') {
      const status = action === 'suspend' ? 'SUSPENDED' : action === 'ban' ? 'BANNED' : 'ACTIVE'
      const user = await db.user.update({ where: { id }, data: { status }, select: SAFE_SELECT })
      return jsonOk({ ok: true, user, message: `User ${status.toLowerCase()}` })
    }

    if (action === 'set_role') {
      const allowed = ['CLIENT', 'RESELLER', 'SUPER_ADMIN']
      const nextRole = String(role ?? '')
      if (!allowed.includes(nextRole)) return jsonError('Invalid role')
      const me = await requireRole(['SUPER_ADMIN'])
      if (id === me.id) return jsonError('You cannot change your own role')
      const user = await db.user.update({ where: { id }, data: { role: nextRole }, select: SAFE_SELECT })
      return jsonOk({ ok: true, user, message: `Role set to ${nextRole}` })
    }

    if (action === 'adjust_balance') {
      const value = Math.round(parseFloat(String(amount)) * 100) / 100
      if (isNaN(value) || value === 0) return jsonError('Enter a non-zero amount')
      const target = await db.user.findUnique({ where: { id } })
      if (!target) return jsonError('User not found', 404)
      const desc = (note && String(note).trim()) || `Balance adjustment by admin (${value > 0 ? '+' : ''}${value.toFixed(2)})`
      const res = await db.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: { balance: { increment: value } },
          select: SAFE_SELECT,
        })
        const transaction = await tx.transaction.create({
          data: {
            userId: id,
            type: 'ADJUSTMENT',
            amount: value,
            description: desc.slice(0, 160),
            status: 'COMPLETED',
          },
        })
        return { user, transaction }
      })
      return jsonOk({ ok: true, ...res, message: `Balance adjusted by ${value > 0 ? '+' : ''}${value.toFixed(2)}` })
    }

    return jsonError('Unknown action')
  })
}
