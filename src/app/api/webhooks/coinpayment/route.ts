import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  baseUrlFromReq,
  creditDeposit,
  findGatewayForMethod,
  fundsRedirect,
  hmacSha512Hex,
  parseGatewayConfig,
  safeEqual,
} from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * PUBLIC route (no session) — CoinPayments IPN + browser return.
 *
 * POST → IPN (form-urlencoded). HMAC header = HMAC-SHA512(rawBody, ipnSecret),
 *        verified over the exact bytes received BEFORE any credit. `custom`
 *        carries the deposit id; status >= 100 means the payment is confirmed
 *        (>=0 && <100 pending, <0 failed). Underpayments never credit.
 *        Answers plain text 'OK' as CoinPayments expects.
 * GET  ?return=1&deposit=<id> → buyer came back from checkout → 302 /?funds=<id>.
 *      ?cancel=1 → 302 /?funds=cancel.
 */

export async function POST(req: NextRequest) {
  try {
    // Exact raw bytes — the HMAC covers the body as sent.
    const raw = await req.text()
    const params = new URLSearchParams(raw)
    const depositId = params.get('custom')
    if (!depositId) return new Response('OK')

    const deposit = await db.deposit.findUnique({ where: { id: depositId } })
    if (!deposit) return new Response('deposit not found', { status: 400 })
    if (deposit.status !== 'PENDING') return new Response('OK')

    const gateway = await findGatewayForMethod(deposit.method, deposit.platformId)
    const ipnSecret = gateway ? parseGatewayConfig(gateway).ipnSecret : ''
    const hmacHeader = req.headers.get('hmac') ?? req.headers.get('HMAC') ?? ''
    if (!ipnSecret || !hmacHeader) return new Response('OK')

    // Signature check over the exact raw body with the gateway's IPN secret.
    const expected = hmacSha512Hex(ipnSecret, raw)
    if (!safeEqual(expected, hmacHeader)) {
      console.error('[webhooks/coinpayment] invalid HMAC for deposit', deposit.id)
      return new Response('OK')
    }

    const status = parseInt(params.get('status') ?? '', 10)
    // Defense in depth: only credit when the paid amount covers the deposit total.
    const paidAmount = parseFloat(params.get('amount1') ?? '')
    const underpaid = Number.isFinite(paidAmount) && paidAmount + 0.009 < deposit.amount

    if (Number.isFinite(status) && status >= 100 && !underpaid) {
      await creditDeposit(deposit.id)
      return new Response('OK')
    }
    if (Number.isFinite(status) && status < 0) {
      console.error('[webhooks/coinpayment] failed payment for deposit', deposit.id, status)
    }
    return new Response('OK')
  } catch (e) {
    console.error('[webhooks/coinpayment] POST failed:', e instanceof Error ? e.message : e)
    return new Response('OK')
  }
}

export async function GET(req: NextRequest) {
  const baseUrl = baseUrlFromReq(req)
  const sp = req.nextUrl.searchParams
  if (sp.get('cancel')) return fundsRedirect(baseUrl, 'cancel')
  const depositId = sp.get('deposit')
  if (!depositId) return fundsRedirect(baseUrl, 'cancel')
  const deposit = await db.deposit.findUnique({ where: { id: depositId } }).catch(() => null)
  return fundsRedirect(baseUrl, deposit?.id ?? 'cancel')
}
