import { db } from '@/lib/db'

/**
 * Price of the External API add-on (one-time debit from the reseller's wallet).
 * Priority: plan.externalApiPrice (> 0) → Setting 'external_api_price' → 25.
 * NOTE: renewal of the add-on is handled together with the monthly plan renewal —
 * this price is only charged at unlock time.
 */
export async function getExternalApiPrice(platformId: string): Promise<number> {
  const platform = await db.platform.findUnique({
    where: { id: platformId },
    include: { plan: { select: { externalApiPrice: true } } },
  })
  const planPrice = platform?.plan?.externalApiPrice
  if (typeof planPrice === 'number' && Number.isFinite(planPrice) && planPrice > 0) return planPrice
  const setting = await db.setting.findUnique({ where: { key: 'external_api_price' } })
  const parsed = setting ? parseFloat(setting.value) : NaN
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return 25
}
