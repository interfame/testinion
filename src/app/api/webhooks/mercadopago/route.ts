// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  baseUrlFromReq,
  creditDeposit,
  findGatewayForMethod,
  fundsRedirect,
  parseGatewayConfig,
  verifyProviderPayment,
} from '@/lib/payments'

export const dynamic = 'force-dynamic'

/**
 * PUBLIC route (no session) — MercadoPago flow for the browser + webhooks.
 *
 * GET  ?return=1&deposit=<id>&payment_id=<pid>[&status=approved]
 *        → buyer came back from Checkout Pro: verify the payment via the MP API
 *          (external_reference must match the deposit), then 302 to /?funds=<id>.
 * POST → webhook {type:'payment', data:{id}}: the payment is re-fetched from the
 *        MP API with our own credentials (webhook bodies are never trusted),
 *        external_reference → deposit, credited only when approved.
 *        Invalid/unknown bodies answer 200 {ignored:true} to avoid retry storms.
 */

type MpPayment = {
  id?: number | string
  status?: string
  external_reference?: string | null
}

async function fetchMpPayment(paymentId: string, accessToken: string): Promise<MpPayment | null> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return (await res.json()) as MpPayment
  } catch {
    return null
  }
}

/** POST-only helper: find the MP payment via any configured MercadoPago gateway. */
async function probeMpGateways(paymentId: string): Promise<{ pay: MpPayment; gatewayId: string } | null> {
  const gateways = await db.gateway.findMany({
    where: { code: 'MERCADOPAGO', enabled: true },
    take: 20,
  })
  for (const g of gateways) {
    const cfg = parseGatewayConfig(g)
    if (!cfg.accessToken) continue
    const pay = await fetchMpPayment(paymentId, cfg.accessToken)
    if (pay?.id) return { pay, gatewayId: g.id }
  }
  return null
}

export async function GET(req: NextRequest) {
  const baseUrl = baseUrlFromReq(req)
  try {
    const sp = req.nextUrl.searchParams
    const depositId = sp.get('deposit')
    if (!depositId) return fundsRedirect(baseUrl, 'cancel')
    const deposit = await db.deposit.findUnique({ where: { id: depositId } })
    if (!deposit) return fundsRedirect(baseUrl, 'cancel')

    const paymentId = sp.get('payment_id') || sp.get('paymentId') || sp.get('collection_id')
    const paymentStatus = sp.get('status') || sp.get('payment_status')

    // Only run the API check when MP reports an approved payment with an id.
    if (paymentId && /^\d+$/.test(paymentId) && (!paymentStatus || paymentStatus === 'approved')) {
      if (deposit.status === 'PENDING') {
        const gateway = await findGatewayForMethod(deposit.method, deposit.platformId)
        if (gateway) {
          // Persist the payment id so /api/funds/verify can re-check later, then verify.
          const withRef = { ...deposit, note: `MP:${paymentId}` }
          const ver = await verifyProviderPayment(withRef, gateway)
          if (ver.status === 'paid') {
            await db.deposit
              .update({ where: { id: deposit.id }, data: { note: `MP:${paymentId}` } })
              .catch(() => undefined)
            await creditDeposit(deposit.id)
          }
        }
      }
    }
    return fundsRedirect(baseUrl, deposit.id)
  } catch (e) {
    console.error('[webhooks/mercadopago] GET failed:', e instanceof Error ? e.message : e)
    return fundsRedirect(baseUrl, 'cancel')
  }
}

type MPWebhookBody = {
  type?: string
  action?: string
  data?: { id?: string | number }
  resource?: string | { id?: string | number }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as MPWebhookBody
    const paymentId = String(
      body.data?.id ?? (typeof body.resource === 'string' ? body.resource : body.resource?.id) ?? '',
    )
    const isPayment = (body.type ?? body.action ?? 'payment').includes('payment')
    if (!paymentId || !/^\d+$/.test(paymentId) || !isPayment) {
      return Response.json({ ignored: true })
    }

    // Already-known deposit (return flow stored the marker)? Verify with its gateway.
    let deposit = await db.deposit.findFirst({ where: { note: `MP:${paymentId}` } })
    if (deposit && deposit.status !== 'PENDING') {
      return Response.json({ received: true, ignored: true, already: deposit.status })
    }

    if (deposit) {
      const gateway = await findGatewayForMethod(deposit.method, deposit.platformId)
      const pay = gateway ? await fetchMpPayment(paymentId, parseGatewayConfig(gateway).accessToken ?? '') : null
      if (!pay) return Response.json({ received: true, status: 'unknown' })
      if (pay.external_reference && pay.external_reference !== deposit.id) {
        return Response.json({ ignored: true })
      }
      if (pay.status === 'approved') await creditDeposit(deposit.id)
      return Response.json({ received: true, status: pay.status })
    }

    // First notification for this payment: probe configured MP gateways until one
    // of their accounts actually knows the payment, then bind via external_reference.
    const probed = await probeMpGateways(paymentId)
    if (!probed || !probed.pay.external_reference) {
      return Response.json({ received: true, status: 'unmatched' })
    }
    deposit = await db.deposit.findUnique({ where: { id: probed.pay.external_reference } })
    if (!deposit) return Response.json({ error: 'deposit not found' }, { status: 400 })
    if (deposit.status !== 'PENDING') return Response.json({ received: true, ignored: true, already: deposit.status })

    // Keep the payment id so verification/re-checks can use it later.
    await db.deposit
      .update({ where: { id: deposit.id }, data: { note: `MP:${paymentId}` } })
      .catch(() => undefined)
    if (probed.pay.status === 'approved') await creditDeposit(deposit.id)
    return Response.json({ received: true, status: probed.pay.status })
  } catch (e) {
    console.error('[webhooks/mercadopago] POST failed:', e instanceof Error ? e.message : e)
    return Response.json({ received: true })
  }
}
