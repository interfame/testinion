import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

/** Saved payment cards (mock tokenized) */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { number, brand, expMonth, expYear } = await req.json()
    const digits = String(number || '').replace(/\D/g, '')
    if (digits.length < 12) return jsonError('Enter a valid card number')
    const count = await db.paymentMethod.count({ where: { userId: user.id } })
    const method = await db.paymentMethod.create({
      data: {
        userId: user.id,
        brand: brand || detectBrand(digits),
        last4: digits.slice(-4),
        expMonth: parseInt(expMonth) || 12,
        expYear: parseInt(expYear) || new Date().getFullYear() + 3,
        primary: count === 0,
      },
    })
    return jsonOk({ method })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await req.json()
    const method = await db.paymentMethod.findUnique({ where: { id } })
    if (!method || method.userId !== user.id) return jsonError('Method not found', 404)
    await db.paymentMethod.delete({ where: { id } })
    return jsonOk({ ok: true })
  })
}

function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa'
  if (/^5[1-5]/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return 'Card'
}
