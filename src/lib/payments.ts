// GrowthRush — Real payment engine (server-only).
//
// Every deposit starts as PENDING — funds are NEVER credited instantly at
// deposit creation. Two paths credit a wallet:
//   1. Real provider flows (PayPal / MercadoPago / Cryptomus / CoinPayments
//      with credentials configured): checkout redirect + webhook / API
//      verification → creditDeposit().
//   2. Manual review (Pix, Payoneer, unconfigured or custom gateways):
//      an admin (master scope) or the platform reseller approves the deposit
//      in their queue → approve route calls its own transaction.
//
// Security invariants enforced here:
//   - Amounts are always recomputed server-side; client totals are never trusted.
//   - Crediting is idempotent (status guard inside a transaction).
//   - Webhook signatures are verified over the RAW request body before any credit.
//   - No secret is ever returned or logged.

import { createHash, createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { notify } from '@/lib/notify'
import { brandNameOf, sendTemplateEmail } from '@/lib/email'
import { isConfigured, parseConfig } from '@/lib/gateways'

// ─────────────────────────── Types ───────────────────────────

export type GatewayLike = {
  id: string
  platformId: string | null
  name: string
  type: string
  code: string | null
  instructions: string | null
  config: string | null
  feePercent: number
  enabled: boolean
  sortOrder: number
}

export type DepositLike = {
  id: string
  platformId: string | null
  userId: string
  amount: number
  method: string
  reference: string | null
  note: string | null
  status: string
}

export type PaymentContext = {
  amount: number // base amount (fee excluded)
  fee: number
  total: number // what the payer is charged = what gets credited
  user: { id: string; email: string; name: string }
  depositId: string
  baseUrl: string
  platformId: string | null
}

export type InitResult =
  | { redirect: string; crypto?: boolean }
  | { manual: true; instructions: string }
  | { error: string }

export type VerifyResult = { status: 'paid' | 'pending' | 'failed' | 'unknown'; error?: string }

// ─────────────────────────── Small helpers ───────────────────────────

/** Absolute origin for the current request (proxy-aware). */
export function baseUrlFromReq(req: Request | NextRequest): string {
  try {
    const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    const host =
      req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      req.headers.get('host') ||
      'localhost:3000'
    return `${proto}://${host}`
  } catch {
    return 'https://localhost:3000'
  }
}

export function parseGatewayConfig(gateway: { config?: string | null }): Record<string, string> {
  return parseConfig(gateway.config)
}

/** md5 hex — Cryptomus signature = md5(JSON body + apiKey). */
export function md5Hex(str: string): string {
  return createHash('md5').update(str, 'utf8').digest('hex')
}

/** HMAC-SHA512 hex — CoinPayments signs the exact raw body with the IPN secret. */
export function hmacSha512Hex(secret: string, str: string): string {
  return createHmac('sha512', secret).update(str, 'utf8').digest('hex')
}

/** Timing-safe string comparison for webhook signatures. */
export function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/** Create the PENDING deposit row shared by every payment path. */
export async function createDeposit(data: {
  platformId: string | null
  userId: string
  amount: number
  method: string
  reference?: string | null
  note?: string | null
}): Promise<DepositLike> {
  return db.deposit.create({
    data: {
      platformId: data.platformId,
      userId: data.userId,
      amount: data.amount,
      method: data.method,
      reference: data.reference ?? null,
      note: data.note ?? null,
      status: 'PENDING',
    },
  })
}

/**
 * Idempotently credit a PENDING deposit: flip to APPROVED inside a transaction,
 * increment the balance and write the ledger row. Double calls (webhook retries,
 * double approvals) are no-ops. Notifications/email afterwards are best-effort.
 */
export async function creditDeposit(
  depositId: string,
): Promise<{ credited: boolean; already?: boolean; deposit?: DepositLike }> {
  try {
    const deposit = await db.$transaction(async (tx) => {
      const upd = await tx.deposit.updateMany({
        where: { id: depositId, status: 'PENDING' },
        data: { status: 'APPROVED' },
      })
      if (upd.count === 0) return null
      const d = await tx.deposit.findUnique({ where: { id: depositId } })
      if (!d) return null
      await tx.user.update({ where: { id: d.userId }, data: { balance: { increment: d.amount } } })
      await tx.transaction.create({
        data: {
          userId: d.userId,
          platformId: d.platformId,
          type: 'DEPOSIT',
          amount: d.amount,
          description: `Deposit via ${d.method}`,
          method: d.method,
          reference: d.reference,
          status: 'COMPLETED',
        },
      })
      return d
    })
    if (!deposit) return { credited: false, already: true }

    // Best-effort side effects — must never throw / block the credit.
    try {
      await notify(
        deposit.userId,
        'DEPOSIT',
        'Deposit credited 💰',
        `$${deposit.amount.toFixed(2)} via ${deposit.method} is now available in your wallet`,
        'add-funds',
      )
    } catch { /* best-effort */ }
    try {
      const client = await db.user.findUnique({
        where: { id: deposit.userId },
        select: { email: true, name: true },
      })
      if (client?.email) {
        const brand = await brandNameOf(deposit.platformId)
        await sendTemplateEmail(deposit.platformId, 'deposit_approved', client.email, {
          name: client.name,
          amount: `$${deposit.amount.toFixed(2)}`,
          platform: brand,
        })
      }
    } catch { /* best-effort */ }
    return { credited: true, deposit }
  } catch (e) {
    console.error('[payments] creditDeposit failed:', e instanceof Error ? e.message : e)
    return { credited: false }
  }
}

/** Notify the platform owner (reseller) that a deposit awaits review — best-effort. */
export async function notifyOwnerNewDeposit(platformId: string | null, deposit: DepositLike): Promise<void> {
  if (!platformId) return
  try {
    const p = await db.platform.findUnique({ where: { id: platformId }, select: { ownerId: true } })
    if (!p) return
    await notify(
      p.ownerId,
      'DEPOSIT',
      'New deposit pending review 🧾',
      `$${deposit.amount.toFixed(2)} via ${deposit.method} — approve it in Finance → Deposits`,
      'deposits',
    )
  } catch { /* best-effort */ }
}

/** Gateway that matches a deposit's method name within a platform scope. */
export async function findGatewayForMethod(
  method: string,
  platformId: string | null,
): Promise<GatewayLike | null> {
  const exact = await db.gateway.findFirst({ where: { name: method, platformId } })
  if (exact) return exact
  return db.gateway.findFirst({ where: { name: method } })
}

/** 302 back to the panel; the client picks up ?funds=<depositId|cancel>. */
export function fundsRedirect(baseUrl: string, depositId: string | 'cancel'): Response {
  const url = `${baseUrl}/?funds=${encodeURIComponent(depositId)}`
  return new Response(null, { status: 302, headers: { Location: url } })
}

// ─────────────────────────── Manual instructions ───────────────────────────

/** Plain-text payment instructions for manual providers (Pix, Payoneer, custom). */
export function manualInstructions(
  gateway: GatewayLike,
  ctx: { total: number; depositId: string },
): string {
  const cfg = parseGatewayConfig(gateway)
  const money = `$${ctx.total.toFixed(2)} USD`
  const lines: string[] = []

  if (gateway.code === 'PIX') {
    lines.push(`Send ${money} with a Pix instant transfer to:`)
    if (cfg.pixKey) lines.push(`Clave Pix: ${cfg.pixKey}`)
    if (cfg.holderName) lines.push(`Titular: ${cfg.holderName}`)
    if (cfg.bank) lines.push(`Banco: ${cfg.bank}`)
  } else if (gateway.code === 'PAYONEER') {
    lines.push(`Send ${money} via Payoneer to:`)
    if (cfg.payoneerId) lines.push(`Payoneer account ID: ${cfg.payoneerId}`)
    if (cfg.email) lines.push(`Account email: ${cfg.email}`)
  } else if (gateway.instructions?.trim()) {
    lines.push(`Send ${money} following the merchant instructions:`)
    lines.push(gateway.instructions.trim())
  } else {
    lines.push(
      `Complete the payment of ${money} following the store's instructions, then submit this deposit for review.`,
    )
  }

  lines.push('')
  lines.push(`Amount: ${money}`)
  lines.push(`Deposit ID: ${ctx.depositId} (mention it if support asks for proof)`)
  lines.push('The balance is credited as soon as the deposit is approved.')
  return lines.join('\n')
}

// ─────────────────────────── Provider initiators ───────────────────────────

function paypalApiBase(cfg: Record<string, string>): string {
  return (cfg.mode || 'SANDBOX').toUpperCase() === 'LIVE'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

async function paypalToken(cfg: Record<string, string>): Promise<string> {
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')
  const res = await fetch(`${paypalApiBase(cfg)}/v2/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('PayPal auth returned no token')
  return data.access_token
}

async function initiatePayPal(ctx: PaymentContext, cfg: Record<string, string>): Promise<InitResult> {
  const token = await paypalToken(cfg)
  const brand = await brandNameOf(ctx.platformId)
  const res = await fetch(`${paypalApiBase(cfg)}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: ctx.depositId,
          amount: { currency_code: 'USD', value: ctx.total.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: brand.slice(0, 127),
        user_action: 'PAY_NOW',
        return_url: `${ctx.baseUrl}/api/webhooks/paypal?return=1&deposit=${ctx.depositId}`,
        cancel_url: `${ctx.baseUrl}/api/webhooks/paypal?cancel=1&deposit=${ctx.depositId}`,
      },
    }),
  })
  if (!res.ok) throw new Error(`PayPal order rejected (${res.status})`)
  const data = (await res.json()) as {
    id?: string
    links?: { rel: string; href: string }[]
  }
  const approve = data.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action')?.href
  if (!data.id || !approve) throw new Error('PayPal returned no approval link')
  // Store the provider order id: reference = orderId, note marker PAYPAL:<orderId>
  await db.deposit
    .update({ where: { id: ctx.depositId }, data: { reference: data.id, note: `PAYPAL:${data.id}` } })
    .catch(() => undefined)
  return { redirect: approve }
}

async function initiateMercadoPago(ctx: PaymentContext, cfg: Record<string, string>): Promise<InitResult> {
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: 'Wallet top-up', quantity: 1, unit_price: ctx.total, currency_id: 'USD' }],
      external_reference: ctx.depositId,
      back_urls: {
        success: `${ctx.baseUrl}/api/webhooks/mercadopago?return=1&deposit=${ctx.depositId}`,
        failure: `${ctx.baseUrl}/api/webhooks/mercadopago?return=1&deposit=${ctx.depositId}`,
        pending: `${ctx.baseUrl}/api/webhooks/mercadopago?return=1&deposit=${ctx.depositId}`,
      },
      auto_return: 'approved',
      notification_url: `${ctx.baseUrl}/api/webhooks/mercadopago`,
    }),
  })
  if (!res.ok) throw new Error(`MercadoPago preference rejected (${res.status})`)
  const data = (await res.json()) as { id?: string; init_point?: string }
  if (!data.init_point) throw new Error('MercadoPago returned no init_point')
  // reference = preference id; note marker MPPREF (the real MP:<paymentId> marker
  // is written once the payment id is known from the return/webhook).
  await db.deposit
    .update({ where: { id: ctx.depositId }, data: { reference: data.id ?? ctx.depositId, note: `MPPREF:${data.id ?? ''}` } })
    .catch(() => undefined)
  return { redirect: data.init_point }
}

async function initiateCryptomus(ctx: PaymentContext, cfg: Record<string, string>): Promise<InitResult> {
  const payload = {
    amount: ctx.total.toFixed(2),
    currency: 'USD',
    order_id: ctx.depositId,
    url_callback: `${ctx.baseUrl}/api/webhooks/cryptomus`,
    url_return: `${ctx.baseUrl}/api/webhooks/cryptomus?return=1&deposit=${ctx.depositId}`,
    url_success: `${ctx.baseUrl}/api/webhooks/cryptomus?return=1&deposit=${ctx.depositId}`,
  }
  const body = JSON.stringify(payload)
  const res = await fetch('https://api.cryptomus.com/v1/payment', {
    method: 'POST',
    headers: {
      merchant: cfg.merchantId,
      sign: md5Hex(body + cfg.apiKey),
      'Content-Type': 'application/json',
    },
    body,
  })
  if (!res.ok) throw new Error(`Cryptomus invoice rejected (${res.status})`)
  const data = (await res.json()) as { result?: { uuid?: string; url?: string }; message?: string }
  if (!data.result?.url) throw new Error(data.message || 'Cryptomus returned no payment URL')
  await db.deposit
    .update({ where: { id: ctx.depositId }, data: { reference: data.result.uuid ?? ctx.depositId } })
    .catch(() => undefined)
  return { redirect: data.result.url, crypto: true }
}

async function initiateCoinPayments(ctx: PaymentContext, cfg: Record<string, string>): Promise<InitResult> {
  const params: Record<string, string> = {
    version: '1',
    cmd: 'create_transaction',
    key: cfg.publicKey,
    amount: ctx.total.toFixed(2),
    currency1: 'USD',
    currency2: cfg.currency2 || 'USDT',
    buyer_email: ctx.user.email,
    custom: ctx.depositId,
    success_url: `${ctx.baseUrl}/api/webhooks/coinpayment?return=1&deposit=${ctx.depositId}`,
    cancel_url: `${ctx.baseUrl}/api/webhooks/coinpayment?cancel=1&deposit=${ctx.depositId}`,
    ipn_url: `${ctx.baseUrl}/api/webhooks/coinpayment`,
  }
  // The HMAC must cover the EXACT raw body string that is sent.
  const raw = new URLSearchParams(params).toString()
  const res = await fetch('https://www.coinpayments.net/api.php', {
    method: 'POST',
    headers: {
      HMAC: hmacSha512Hex(cfg.ipnSecret, raw),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: raw,
  })
  if (!res.ok) throw new Error(`CoinPayments request failed (${res.status})`)
  const data = (await res.json()) as {
    error?: string
    result?: { txn_id?: string; checkout_url?: string; status_url?: string }
  }
  if (data.error && data.error !== 'ok') throw new Error(`CoinPayments: ${data.error}`)
  const checkout = data.result?.checkout_url || data.result?.status_url
  if (!checkout) throw new Error('CoinPayments returned no checkout URL')
  if (data.result?.txn_id) {
    await db.deposit
      .update({ where: { id: ctx.depositId }, data: { reference: data.result.txn_id } })
      .catch(() => undefined)
  }
  return { redirect: checkout, crypto: true }
}

/**
 * Start a payment for a deposit.
 * - Configured PayPal / MercadoPago / Cryptomus / CoinPayments → real provider checkout.
 * - Manual providers (Pix, Payoneer), unconfigured or custom gateways → instructions
 *   for manual review; credited only after approval in the deposits queue.
 */
export async function initiateProviderPayment(
  gateway: GatewayLike,
  ctx: PaymentContext,
): Promise<InitResult> {
  const cfg = parseGatewayConfig(gateway)
  const configured = gateway.code ? isConfigured(gateway.code, cfg) : false
  try {
    if (configured && gateway.code === 'PAYPAL') return await initiatePayPal(ctx, cfg)
    if (configured && gateway.code === 'MERCADOPAGO') return await initiateMercadoPago(ctx, cfg)
    if (configured && gateway.code === 'CRYPTOMUS') return await initiateCryptomus(ctx, cfg)
    if (configured && gateway.code === 'COINPAYMENT') return await initiateCoinPayments(ctx, cfg)
    return { manual: true, instructions: manualInstructions(gateway, ctx) }
  } catch (e) {
    const msg = (e instanceof Error ? e.message : 'Provider error').slice(0, 160)
    return { error: msg }
  }
}

// ─────────────────────────── Provider verifiers ───────────────────────────

function providerOrderIdOf(deposit: DepositLike): string | null {
  const note = deposit.note ?? ''
  if (note.startsWith('PAYPAL:')) return note.slice('PAYPAL:'.length).trim() || null
  const ref = (deposit.reference ?? '').trim()
  return ref && ref !== deposit.id ? ref : null
}

function mpPaymentIdOf(deposit: DepositLike): string | null {
  const note = deposit.note ?? ''
  if (!note.startsWith('MP:')) return null
  const id = note.slice('MP:'.length).trim()
  return /^\d+$/.test(id) ? id : null
}

async function verifyPayPal(deposit: DepositLike, cfg: Record<string, string>): Promise<VerifyResult> {
  const orderId = providerOrderIdOf(deposit)
  if (!orderId) return { status: 'pending' }
  const apiBase = paypalApiBase(cfg)
  const token = await paypalToken(cfg)
  const headers = { Authorization: `Bearer ${token}` }
  const res = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}`, { headers })
  if (!res.ok) {
    return res.status === 404
      ? { status: 'failed', error: 'PayPal order not found' }
      : { status: 'unknown', error: `PayPal order fetch ${res.status}` }
  }
  const order = (await res.json()) as { status?: string; purchase_units?: { reference_id?: string }[] }
  // Server-verified linkage: the order must reference this exact deposit.
  const refId = order.purchase_units?.[0]?.reference_id
  if (refId && refId !== deposit.id) return { status: 'unknown', error: 'PayPal reference mismatch' }
  if (order.status === 'COMPLETED') return { status: 'paid' }
  if (order.status === 'APPROVED') {
    const cap = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
    if (cap.ok) {
      const data = (await cap.json().catch(() => ({}))) as { status?: string }
      if (data.status === 'COMPLETED') return { status: 'paid' }
      return { status: 'pending' }
    }
    const err = (await cap.json().catch(() => ({}))) as {
      details?: { name?: string }[]
      message?: string
    }
    const name = err.details?.[0]?.name || err.message || ''
    if (/ORDER_ALREADY_CAPTURED/i.test(name)) return { status: 'paid' }
    return { status: 'pending' }
  }
  if (order.status === 'VOIDED') return { status: 'failed' }
  return { status: 'pending' } // CREATED / other transitional states
}

async function verifyMercadoPago(deposit: DepositLike, cfg: Record<string, string>): Promise<VerifyResult> {
  const paymentId = mpPaymentIdOf(deposit)
  if (!paymentId) return { status: 'pending' } // no payment yet — webhook may still arrive
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  })
  if (!res.ok) return { status: 'unknown', error: `MercadoPago payment fetch ${res.status}` }
  const p = (await res.json()) as { status?: string; external_reference?: string }
  if (p.external_reference && p.external_reference !== deposit.id) {
    return { status: 'unknown', error: 'MercadoPago reference mismatch' }
  }
  if (p.status === 'approved') return { status: 'paid' }
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(p.status ?? '')) {
    return { status: 'failed' }
  }
  return { status: 'pending' }
}

async function verifyCryptomus(deposit: DepositLike, cfg: Record<string, string>): Promise<VerifyResult> {
  const uuid = (deposit.reference ?? '').trim()
  if (!uuid || uuid === deposit.id) return { status: 'pending' }
  const body = JSON.stringify({ uuid })
  const res = await fetch('https://api.cryptomus.com/v1/payment/info', {
    method: 'POST',
    headers: {
      merchant: cfg.merchantId,
      sign: md5Hex(body + cfg.apiKey),
      'Content-Type': 'application/json',
    },
    body,
  })
  if (!res.ok) return { status: 'unknown', error: `Cryptomus info fetch ${res.status}` }
  const data = (await res.json()) as { result?: { status?: string }; message?: string }
  const st = data.result?.status
  if (st === 'paid' || st === 'paid_over') return { status: 'paid' }
  if (['canceled', 'fail', 'system_fail', 'wrong_amount', 'deleted'].includes(st ?? '')) {
    return { status: 'failed' }
  }
  return { status: 'pending' } // check / process / confirming …
}

async function verifyCoinPayments(deposit: DepositLike, cfg: Record<string, string>): Promise<VerifyResult> {
  const txn = (deposit.reference ?? '').trim()
  if (!txn) return { status: 'pending' }
  const raw = new URLSearchParams({
    version: '1',
    cmd: 'get_tx_info',
    key: cfg.publicKey,
    txn_id: txn,
  }).toString()
  const res = await fetch('https://www.coinpayments.net/api.php', {
    method: 'POST',
    headers: { HMAC: hmacSha512Hex(cfg.ipnSecret, raw), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: raw,
  })
  if (!res.ok) return { status: 'unknown', error: `CoinPayments info fetch ${res.status}` }
  const data = (await res.json()) as {
    error?: string
    result?: { status?: number } | Record<string, { status?: number }>
  }
  if (data.error && data.error !== 'ok') return { status: 'unknown', error: `CoinPayments: ${data.error}` }
  let info = data.result
  if (info && !('status' in info)) {
    const first = Object.values(info as Record<string, { status?: number }>)[0]
    info = first
  }
  const status = Number((info as { status?: number } | undefined)?.status)
  if (Number.isNaN(status)) return { status: 'unknown' }
  if (status >= 100) return { status: 'paid' }
  if (status >= 0) return { status: 'pending' }
  return { status: 'failed' }
}

/**
 * Re-check a deposit against its provider API (used by /api/funds/verify and
 * browser-return flows). Any external failure is caught → 'unknown', never 500.
 */
export async function verifyProviderPayment(
  deposit: DepositLike,
  gateway: GatewayLike,
): Promise<VerifyResult> {
  const cfg = parseGatewayConfig(gateway)
  try {
    switch (gateway.code) {
      case 'PAYPAL':
        return await verifyPayPal(deposit, cfg)
      case 'MERCADOPAGO':
        return await verifyMercadoPago(deposit, cfg)
      case 'CRYPTOMUS':
        return await verifyCryptomus(deposit, cfg)
      case 'COINPAYMENT':
        return await verifyCoinPayments(deposit, cfg)
      default:
        return { status: 'unknown' }
    }
  } catch (e) {
    return { status: 'unknown', error: e instanceof Error ? e.message : 'Verification error' }
  }
}
