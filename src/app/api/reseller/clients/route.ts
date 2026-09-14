// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

async function myPlatform(userId: string) {
  const p = await resilientPlatformForOwner(userId)
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const clients = await db.user.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, balance: true, status: true, currency: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    })
    const spend = await db.order.groupBy({
      by: ['userId'],
      where: { platformId: platform.id },
      _sum: { charge: true },
    })
    const spendMap: Record<string, number> = {}
    for (const s of spend) spendMap[s.userId] = Math.round((s._sum.charge ?? 0) * 100) / 100
    return jsonOk({
      clients: clients.map((c) => ({ ...c, spent: spendMap[c.id] ?? 0 })),
    })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    const client = await db.user.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!client) return jsonError('Client not found', 404)

    if (body.action === 'adjust') {
      const amount = Math.round(parseFloat(body.amount) * 100) / 100
      if (!amount) return jsonError('Enter a valid amount (use negative to debit)')
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: client.id }, data: { balance: { increment: amount } } })
        await tx.transaction.create({
          data: {
            userId: client.id,
            platformId: platform.id,
            type: 'ADJUSTMENT',
            amount,
            description: body.note || `Manual adjustment by ${platform.name}`,
          },
        })
      })
      return jsonOk({ ok: true })
    }

    if (body.action === 'status' && ['ACTIVE', 'SUSPENDED', 'BANNED'].includes(body.status)) {
      await db.user.update({ where: { id: client.id }, data: { status: body.status } })
      return jsonOk({ ok: true })
    }
    return jsonError('Unknown action')
  })
}
