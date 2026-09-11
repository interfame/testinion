import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { sendTemplateEmail } from '@/lib/email'

async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const deposits = await db.deposit.findMany({
      where: { platformId: platform.id, ...(status && status !== 'ALL' ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    })
    return jsonOk({ deposits })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    const deposit = await db.deposit.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!deposit) return jsonError('Deposit not found', 404)
    if (deposit.status !== 'PENDING') return jsonError('Deposit already processed')

    if (body.action === 'approve') {
      await db.$transaction(async (tx) => {
        await tx.deposit.update({ where: { id: deposit.id }, data: { status: 'APPROVED' } })
        await tx.user.update({ where: { id: deposit.userId }, data: { balance: { increment: deposit.amount } } })
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            platformId: platform.id,
            type: 'DEPOSIT',
            amount: deposit.amount,
            description: `Deposit approved via ${deposit.method}`,
            method: deposit.method,
            reference: deposit.reference,
          },
        })
      })
      await notify(deposit.userId, 'DEPOSIT', 'Deposit approved ✅', `$${deposit.amount.toFixed(2)} added to your wallet via ${deposit.method}`, 'add-funds')
      // Automated email: deposit approved (best-effort, never blocks the approval)
      try {
        const client = await db.user.findUnique({ where: { id: deposit.userId }, select: { email: true, name: true } })
        if (client?.email) {
          await sendTemplateEmail(platform.id, 'deposit_approved', client.email, {
            name: client.name, amount: `$${deposit.amount.toFixed(2)}`, platform: platform.name,
          })
        }
      } catch { /* best-effort */ }
      return jsonOk({ ok: true })
    }
    if (body.action === 'reject') {
      await db.deposit.update({ where: { id: deposit.id }, data: { status: 'REJECTED', note: body.note || 'Rejected by admin' } })
      await notify(deposit.userId, 'DEPOSIT', 'Deposit rejected ❌', `Your ${deposit.method} deposit of $${deposit.amount.toFixed(2)} was not approved.`, 'add-funds')
      return jsonOk({ ok: true })
    }
    return jsonError('Unknown action')
  })
}
