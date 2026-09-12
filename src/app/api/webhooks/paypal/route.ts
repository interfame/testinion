import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { baseUrlFromReq, creditDeposit, findGatewayForMethod, fundsRedirect, verifyProviderPayment } from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * PUBLIC route (no session) — PayPal flow for the browser + webhooks.
 *
 * GET  ?return=1&deposit=<id>  → buyer came back from PayPal: re-check the order
 *                                server-side (capture if needed), then 302 to /?funds=<id>.
 * GET  ?cancel=1&deposit=<id>  → buyer canceled → 302 to /?funds=cancel.
 *      `token` (PayPal's order id param) is honored when `deposit` is missing.
 * POST → PayPal webhook. Safe mode: we never trust the body amounts — the order is
 *        re-fetched from the PayPal API with our own credentials before crediting.
 *        Always answers 200 quickly so PayPal doesn't retry-storm.
 */
export async function GET(req: NextRequest) {
  const baseUrl = baseUrlFromReq(req)
  try {
    const sp = req.nextUrl.searchParams
    const depositId = sp.get('deposit')
    if (sp.get('cancel')) {
      return fundsRedirect(baseUrl, 'cancel')
    }

    // Resolve the deposit: explicit param → PayPal `token` (order id) fallback.
    let deposit = depositId ? await db.deposit.findUnique({ where: { id: depositId } }) : null
    if (!deposit) {
      const token = sp.get('token')
      if (token) deposit = await db.deposit.findFirst({ where: { reference: token } })
    }
    if (!deposit) {
      return fundsRedirect(baseUrl, 'cancel')
    }

    // Re-verify with PayPal (captures APPROVED orders too), credit if paid.
    const gateway = await findGatewayForMethod(deposit.method, deposit.platformId)
    if (gateway) {
      const ver = await verifyProviderPayment(deposit, gateway)
      if (ver.status === 'paid') await creditDeposit(deposit.id)
    }
    return fundsRedirect(baseUrl, deposit.id)
  } catch (e) {
    console.error('[webhooks/paypal] GET failed:', e instanceof Error ? e.message : e)
    return fundsRedirect(baseUrl, 'cancel')
  }
}

type PayPalWebhookBody = {
  event_type?: string
  resource?: {
    id?: string
    purchase_units?: { reference_id?: string }[]
    supplementary_data?: { related_ids?: { order_id?: string } }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PayPalWebhookBody
    const resource = body.resource ?? {}
    // Order events carry purchase_units; capture events carry supplementary_data.
    const orderId =
      resource.supplementary_data?.related_ids?.order_id ||
      resource.id ||
      resource.purchase_units?.[0]?.reference_id
    const refId = resource.purchase_units?.[0]?.reference_id
    if (!orderId && !refId) return Response.json({ ignored: true })

    // Find the deposit by explicit reference_id, else by stored PayPal order id.
    const deposit = refId
      ? await db.deposit.findUnique({ where: { id: refId } })
      : orderId
        ? await db.deposit.findFirst({ where: { reference: orderId } })
        : null
    if (!deposit) return Response.json({ error: 'deposit not found' }, { status: 400 })
    if (deposit.status !== 'PENDING') return Response.json({ ignored: true, already: deposit.status })

    const gateway = await findGatewayForMethod(deposit.method, deposit.platformId)
    if (!gateway) return Response.json({ ignored: true })

    // Verification is fully server-side: re-fetch the order with our credentials.
    const ver = await verifyProviderPayment(deposit, gateway)
    if (ver.status === 'paid') await creditDeposit(deposit.id)
    return Response.json({ received: true, status: ver.status })
  } catch (e) {
    console.error('[webhooks/paypal] POST failed:', e instanceof Error ? e.message : e)
    return Response.json({ received: true })
  }
}
