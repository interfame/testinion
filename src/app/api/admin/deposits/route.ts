// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { sendTemplateEmail, brandNameOf } from '@/lib/email'

/** GET /api/admin/deposits — full deposit queue + history */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const deposits = await db.deposit.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return jsonOk({ deposits })
  })
}

/** PATCH /api/admin/deposits — {id, action: approve|reject}. Approve credits user balance atomically. */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, action } = await req.json()
    if (!id || !['approve', 'reject'].includes(action)) return jsonError('Missing parameters')

    const deposit = await db.deposit.findUnique({ where: { id } })
    if (!deposit) return jsonError('Deposit not found', 404)
    if (deposit.status !== 'PENDING') return jsonError(`This deposit was already ${deposit.status.toLowerCase()}`)

    if (action === 'reject') {
      await db.deposit.update({ where: { id }, data: { status: 'REJECTED' } })
      return jsonOk({ ok: true, message: 'Deposit rejected' })
    }

    const res = await db.$transaction(async (tx) => {
      const updated = await tx.deposit.update({ where: { id }, data: { status: 'APPROVED' } })
      await tx.user.update({ where: { id: deposit.userId }, data: { balance: { increment: deposit.amount } } })
      await tx.transaction.create({
        data: {
          userId: deposit.userId,
          platformId: deposit.platformId,
          type: 'DEPOSIT',
          amount: deposit.amount,
          description: `Deposit approved — ${deposit.method}`,
          method: deposit.method,
          reference: deposit.reference,
          status: 'COMPLETED',
        },
      })
      return updated
    })
    // Automated email: deposit approved (best-effort, never blocks the approval)
    try {
      const client = await db.user.findUnique({ where: { id: deposit.userId }, select: { email: true, name: true } })
      if (client?.email) {
        const brand = await brandNameOf(deposit.platformId)
        await sendTemplateEmail(deposit.platformId, 'deposit_approved', client.email, {
          name: client.name, amount: `$${deposit.amount.toFixed(2)}`, platform: brand,
        })
      }
    } catch { /* best-effort */ }
    return jsonOk({ ok: true, deposit: res, message: `Deposit of $${deposit.amount.toFixed(2)} approved and credited` })
  })
}
