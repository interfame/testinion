import { db } from '@/lib/db'
import { jsonOk, handle } from '@/lib/auth'

/** Public branding + landing content + theme + currencies (no auth needed). */
export async function GET(req: Request) {
  return handle(async () => {
    // The domain this instance is actually installed on — the UI uses it to
    // build real storefront URLs (https://slug.<app_host>) instead of guessing.
    const hostHeader = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
    const appHost = hostHeader.split(':')[0].split(',')[0].trim().toLowerCase()
    const settings = await db.setting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value
    const currencies = await db.currency.findMany({ orderBy: { code: 'asc' } })
    const platformCount = await db.platform.count({ where: { status: 'ACTIVE' } })
    const faqs = await db.faq.findMany({ where: { platformId: null }, orderBy: { sortOrder: 'asc' } })
    // Best active master coupon for the landing promo banner (highest value wins).
    const now = new Date()
    const coupons = await db.coupon.findMany({ where: { platformId: null, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } })
    const available = coupons.filter((c) => c.maxUses === 0 || c.usedCount < c.maxUses)
    const best = available.sort((a, b) => b.value - a.value)[0] ?? null
    return jsonOk({
      settings: {
        brand_name: map.brand_name || 'GrowthRush',
        brand_tagline: map.brand_tagline || '',
        landing_theme: map.landing_theme || 'rush',
        landing_copy: map.landing_copy || '{}',
        subdomain_base: map.subdomain_base || 'growthrush.io',
        // Real install domain detected from the request (falls back to the DB setting)
        app_host: appHost || map.subdomain_base || 'growthrush.io',
        conversion_mode: map.conversion_mode || 'manual',
        ref_enabled: map.ref_enabled ?? '1',
        ref_bonus_amount: map.ref_bonus_amount ?? '1',
        ref_welcome_credit: map.ref_welcome_credit ?? '1',
      },
      currencies,
      faqs,
      platformCount,
      publicCoupon: best ? { code: best.code, value: best.value } : null,
    })
  })
}
