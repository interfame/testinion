// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { maskConfig, parseConfig } from '@/lib/gateways'
import { ceil2 } from '@/lib/pricing'
import {
  baseUrlFromReq,
  createDeposit,
  initiateProviderPayment,
  notifyOwnerNewDeposit,
} from '@/lib/payments'

/**
 * GET  → gateways enabled for user's scope + transactions + deposits + saved methods
 * POST → create a deposit. Real payment system: every deposit starts PENDING.
 *        - Configured PayPal/MercadoPago/Cryptomus/CoinPayments → real provider checkout
 *          (redirect or crypto invoice); the wallet is credited only after the provider
 *          confirms (webhook / verification).
 *        - Pix / Payoneer / unconfigured / custom gateways → manual instructions; the
 *          deposit waits in the approval queue (admin for master scope, reseller for
 *          platform scope) and is NEVER credited instantly.
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platformId = user.platformId ?? null
    const [gateways, transactions, deposits, methods] = await Promise.all([
      db.gateway.findMany({ where: { platformId, enabled: true }, orderBy: { sortOrder: 'asc' } }),
      db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 60 }),
      db.deposit.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      db.paymentMethod.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    ])
    // Security: raw credentials never leave the server — return masked config only.
    const safeGateways = gateways.map((g) => ({
      ...g,
      config: g.config ? JSON.stringify(maskConfig(g.code ?? '', parseConfig(g.config))) : g.config,
    }))
    return jsonOk({ gateways: safeGateways, transactions, deposits, methods })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const parsed = parseFloat(body.amount)
    if (!Number.isFinite(parsed)) return jsonError('Enter a valid amount')
    const amount = Math.round(parsed * 100) / 100
    const gatewayId = body.gatewayId
    if (!gatewayId || amount < 1 || amount > 10000) {
      return jsonError('Amount must be between $1 and $10,000')
    }

    // Gateway must belong to the user's scope (master scope = platformId null).
    const platformId = user.platformId ?? null
    const gateway = await db.gateway.findFirst({ where: { id: gatewayId, platformId } })
    if (!gateway || !gateway.enabled) return jsonError('Payment method unavailable')

    // Totals are ALWAYS recomputed server-side; the client value is ignored.
    // Round UP — the platform never absorbs fractional-cent losses.
    const fee = ceil2(amount * (gateway.feePercent / 100))
    const total = ceil2(amount + fee)

    const deposit = await createDeposit({
      platformId,
      userId: user.id,
      amount: total,
      method: gateway.name,
      note: `GW:${gateway.id}`,
    })

    const ctx = {
      amount,
      fee,
      total,
      user: { id: user.id, email: user.email, name: user.name },
      depositId: deposit.id,
      baseUrl: baseUrlFromReq(req),
      platformId,
    }
    const init = await initiateProviderPayment(gateway, ctx)

    if ('error' in init) {
      // Provider rejected the payment start — drop the deposit so the history stays clean.
      await db.deposit.update({ where: { id: deposit.id }, data: { status: 'REJECTED' } }).catch(() => undefined)
      return jsonError(`Payment could not be started: ${init.error}`)
    }

    if ('manual' in init) {
      // Manual flow: reseller/platform owner gets a review notification (best-effort).
      await notifyOwnerNewDeposit(platformId, deposit)
      return jsonOk({
        ok: true,
        deposit,
        manual: true,
        instructions: init.instructions,
        message: 'Deposit created — follow the instructions; it will be credited after approval.',
      })
    }

    // Real provider checkout: client performs a full navigation to the gateway.
    return jsonOk({
      ok: true,
      deposit,
      redirect: init.redirect,
      crypto: init.crypto ?? false,
      message: init.crypto
        ? 'Crypto invoice created — complete the payment to credit your wallet.'
        : 'Redirecting to checkout…',
    })
  })
}
