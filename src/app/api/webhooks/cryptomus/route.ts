import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  baseUrlFromReq,
  creditDeposit,
  findGatewayForMethod,
  fundsRedirect,
  md5Hex,
  parseGatewayConfig,
  safeEqual,
} from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * PUBLIC route (no session) — Cryptomus webhooks + browser return.
 *
 * POST → payment webhook. The raw request body is signed by Cryptomus:
 *        sign = md5(rawBody + apiKey). We look the deposit up via `order_id`,
 *        load THAT deposit's gateway credentials and verify the signature over
 *        the exact bytes received BEFORE any credit. status paid/paid_over → credit.
 * GET  ?return=1&deposit=<id> → buyer came back from the invoice → 302 /?funds=<id>.
 *      ?cancel=1 → 302 /?funds=cancel.
 */

const PAID = new Set(['paid', 'paid_over'])
const FAILED = new Set(['canceled', 'fail', 'system_fail', 'wrong_amount', 'deleted'])

type CryptomusWebhook = {
  order_id?: string
  orderId?: string
  uuid?: string
  status?: string
  sign?: string
}

export async function POST(req: NextRequest) {
  try {
    // Exact raw bytes — the signature covers the body as sent.
    const raw = await req.text()
    const body = JSON.parse(raw || '{}') as CryptomusWebhook
    const orderId = body.order_id || body.orderId
    if (!orderId) return Response.json({ error: 'order_id missing' }, { status: 400 })

    const deposit = await db.deposit.findUnique({ where: { id: orderId } })
    if (!deposit) return Response.json({ error: 'deposit not found' }, { status: 400 })
    if (deposit.status !== 'PENDING') return Response.json({ received: true, ignored: true, already: deposit.status })

    const gateway = await findGatewayForMethod(deposit.method, deposit.platformId)
    const apiKey = gateway ? parseGatewayConfig(gateway).apiKey : ''
    if (!apiKey || !body.sign) return Response.json({ ignored: true })

    // Cryptomus signs the JSON payload WITHOUT the sign field:
    //   sign = md5(JSON(payload-minus-sign) + apiKey).
    // Re-serialize the object without `sign` (key order is preserved) and verify.
    // The raw-body variant is also accepted for integrations that sign the full text.
    const { sign: _sign, ...payload } = body
    const expectedStripped = md5Hex(JSON.stringify(payload) + apiKey)
    const expectedRaw = md5Hex(raw + apiKey)
    if (!safeEqual(expectedStripped, body.sign) && !safeEqual(expectedRaw, body.sign)) {
      console.error('[webhooks/cryptomus] invalid signature for deposit', deposit.id)
      return Response.json({ ignored: true })
    }

    if (PAID.has(body.status ?? '')) {
      await creditDeposit(deposit.id)
      return Response.json({ received: true, credited: true })
    }
    if (FAILED.has(body.status ?? '')) {
      return Response.json({ received: true, status: body.status })
    }
    return Response.json({ received: true, status: body.status ?? 'unknown' })
  } catch (e) {
    console.error('[webhooks/cryptomus] POST failed:', e instanceof Error ? e.message : e)
    return Response.json({ received: true })
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
