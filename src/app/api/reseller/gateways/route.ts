import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { maskConfig, parseConfig, sanitizeConfig, missingRequired, providerOf, PROVIDER_CODES } from '@/lib/gateways'

async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

/**
 * Reseller "My Payment Methods" — the payment providers (PayPal, MercadoPago,
 * Pix, Cryptomus, CoinPayments, Payoneer) configured with the reseller's OWN
 * credentials so their storefront clients pay directly into the reseller's accounts.
 * Credentials are stored server-side and always returned masked.
 */

/** GET → provider gateway rows for my platform */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const gateways = await db.gateway.findMany({ where: { platformId: platform.id }, orderBy: { sortOrder: 'asc' } })
    return jsonOk({
      gateways: gateways.map((g) => ({
        ...g,
        config: g.code ? maskConfig(g.code, parseConfig(g.config)) : {},
      })),
    })
  })
}

/** POST → connect a provider on my platform: {code, enabled?, feePercent?, config} */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(['RESELLER', 'CLIENT'])
    const platform = await myPlatform(user.id)
    const b = await req.json()
    const code = String(b.code || '').toUpperCase()
    if (!PROVIDER_CODES.includes(code)) return jsonError('Unknown provider')
    const provider = providerOf(code)!
    const config = sanitizeConfig(code, b.config)
    // require every REQUIRED credential before the gateway can go live
    // (optional fields — e.g. MercadoPago publicKey — don't block the connection)
    const missing = missingRequired(code, config)
    if (missing.length) return jsonError(`Missing credentials: ${missing.map((f) => f.label).join(', ')}`)

    const existing = await db.gateway.findFirst({ where: { platformId: platform.id, code } })
    const base = {
      name: provider.name,
      type: code === 'CRYPTOMUS' || code === 'COINPAYMENT' ? 'CRYPTO' : code === 'PAYPAL' ? 'PAYPAL' : code === 'PIX' ? 'BANK' : 'CARD',
      code,
      config: JSON.stringify(config),
      feePercent: b.feePercent !== undefined ? Math.max(0, Math.min(50, parseFloat(b.feePercent) || 0)) : undefined,
      enabled: b.enabled === undefined ? true : !!b.enabled,
    }
    const gateway = existing
      ? await db.gateway.update({ where: { id: existing.id }, data: base })
      : await db.gateway.create({ data: { platformId: platform.id, ...base, sortOrder: 10 + PROVIDER_CODES.indexOf(code) } })
    return jsonOk({
      ok: true,
      gateway: { ...gateway, config: maskConfig(code, config) },
      message: `${provider.name} connected to your platform`,
    })
  })
}

/** PATCH → update fee / enabled / credentials: {id, feePercent?, enabled?, config?} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(['RESELLER', 'CLIENT'])
    const platform = await myPlatform(user.id)
    const { id, ...b } = await req.json()
    const gateway = await db.gateway.findFirst({ where: { id, platformId: platform.id } })
    if (!gateway) return jsonError('Gateway not found', 404)
    const data: Record<string, unknown> = {}
    if (b.feePercent !== undefined) data.feePercent = Math.max(0, Math.min(50, parseFloat(b.feePercent) || 0))
    if (b.enabled !== undefined) data.enabled = !!b.enabled
    if (gateway.code) {
      const merged = { ...parseConfig(gateway.config), ...sanitizeConfig(gateway.code, b.config) }
      data.config = JSON.stringify(merged)
    }
    const updated = await db.gateway.update({ where: { id: gateway.id }, data })
    return jsonOk({
      ok: true,
      gateway: { ...updated, config: updated.code ? maskConfig(updated.code, parseConfig(updated.config)) : {} },
      message: 'Gateway updated',
    })
  })
}

/** DELETE → disconnect a provider from my platform: {id} */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(['RESELLER', 'CLIENT'])
    const platform = await myPlatform(user.id)
    const body = await req.json().catch(() => ({})) as { id?: string }
    const id = body.id || new URL(req.url).searchParams.get('id')
    if (!id) return jsonError('Missing id')
    await db.gateway.deleteMany({ where: { id, platformId: platform.id } })
    return jsonOk({ ok: true })
  })
}
