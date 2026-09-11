// Round 16 patch: annual plan prices + master payment-gateway providers (PayPal,
// MercadoPago, Pix, Cryptomus, CoinPayments, Payoneer) + gateway codes.
// Idempotent — safe to run multiple times.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ANNUAL: Record<string, number> = { starter: 290, pro: 590, agency: 1190 }

// provider -> [name, fee%, defaults shown masked in admin]
const PROVIDERS: Array<{ code: string; name: string; type: string; feePercent: number; sortOrder: number; instructions: string }> = [
  { code: 'PAYPAL', name: 'PayPal', type: 'PAYPAL', feePercent: 0, sortOrder: 10, instructions: 'Clients pay with their PayPal balance or card. Credentials are configured by the store owner.' },
  { code: 'MERCADOPAGO', name: 'MercadoPago', type: 'CARD', feePercent: 0, sortOrder: 11, instructions: 'Checkout Pro / API de MercadoPago. El dueño de la tienda configura su access token.' },
  { code: 'PIX', name: 'Pix', type: 'BANK', feePercent: 0, sortOrder: 12, instructions: 'Transferencia instantánea Pix (Brasil). El dueño de la tienda configura su clave Pix.' },
  { code: 'CRYPTOMUS', name: 'Cryptomus', type: 'CRYPTO', feePercent: 0, sortOrder: 13, instructions: 'Crypto payments (BTC, USDT, TRX…). Merchant ID + API key configured by the store owner.' },
  { code: 'COINPAYMENT', name: 'CoinPayments', type: 'CRYPTO', feePercent: 0, sortOrder: 14, instructions: 'Accept 1900+ cryptocurrencies via CoinPayments.net. IPN-verified credit.' },
  { code: 'PAYONEER', name: 'Payoneer', type: 'BANK', feePercent: 0, sortOrder: 15, instructions: 'Payoneer account transfer. Clients send to the store owner\'s Payoneer account.' },
]

async function main() {
  // 1) Annual rental price on plans (≈ 2 months free)
  for (const [slug, annualPrice] of Object.entries(ANNUAL)) {
    await db.plan.updateMany({ where: { slug }, data: { annualPrice } })
  }
  console.log('✓ annual prices set')

  // 2) Master provider gateways (platformId = null)
  for (const p of PROVIDERS) {
    const existing = await db.gateway.findFirst({ where: { platformId: null, code: p.code } })
    if (!existing) {
      // reuse legacy rows by name if present (e.g. old "PayPal" row)
      const legacy = await db.gateway.findFirst({ where: { platformId: null, name: p.name } })
      if (legacy) {
        await db.gateway.update({ where: { id: legacy.id }, data: { code: p.code, type: p.type, sortOrder: p.sortOrder } })
        console.log(`✓ legacy gateway "${p.name}" → code ${p.code}`)
      } else {
        await db.gateway.create({ data: { platformId: null, ...p, enabled: true } })
        console.log(`✓ created master gateway ${p.name}`)
      }
    }
  }

  // 3) Give every existing platform the 6 providers (disabled until configured)
  const platforms = await db.platform.findMany({ select: { id: true } })
  for (const pl of platforms) {
    for (const p of PROVIDERS) {
      const existing = await db.gateway.findFirst({ where: { platformId: pl.id, code: p.code } })
      if (!existing) {
        await db.gateway.create({ data: { platformId: pl.id, ...p, enabled: false } })
      }
    }
  }
  console.log(`✓ provider gateways ensured on ${platforms.length} platform(s)`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
