// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { creditDeposit, findGatewayForMethod, parseGatewayConfig, verifyProviderPayment } from '@/lib/payments'
import { isConfigured } from '@/lib/gateways'

/** Providers whose payments can be re-checked against a live API. */
const AUTO_VERIFY_CODES = new Set(['PAYPAL', 'MERCADOPAGO', 'CRYPTOMUS', 'COINPAYMENT'])

/**
 * POST /api/funds/verify — {depositId}. Re-checks a PENDING deposit against its
 * provider API (PayPal order status, MercadoPago payment, Cryptomus/CoinPayments
 * invoice) and credits the wallet when the provider reports it paid.
 * Manual gateways have nothing to verify → { status: 'pending' }.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    if (!body?.depositId) return jsonError('Missing depositId')

    const deposit = await db.deposit.findUnique({ where: { id: body.depositId } })
    if (!deposit || deposit.userId !== user.id) return jsonError('Deposit not found', 404)

    if (deposit.status !== 'PENDING') {
      return jsonOk({ status: deposit.status === 'APPROVED' ? 'paid' : 'failed', credited: false })
    }

    const gateway = await findGatewayForMethod(deposit.method, user.platformId ?? null)
    // Manual methods (Pix/Payoneer/custom/unconfigured) have no API to check → pending.
    if (
      !gateway ||
      !gateway.code ||
      !AUTO_VERIFY_CODES.has(gateway.code) ||
      !isConfigured(gateway.code, parseGatewayConfig(gateway))
    ) {
      return jsonOk({ status: 'pending' })
    }

    const ver = await verifyProviderPayment(deposit, gateway)
    if (ver.status === 'paid') {
      await creditDeposit(deposit.id)
      const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
      return jsonOk({ status: 'paid', credited: true, balance: fresh?.balance ?? user.balance })
    }
    return jsonOk({ status: ver.status, error: ver.error })
  })
}
