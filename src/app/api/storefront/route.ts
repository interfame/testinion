// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { jsonOk, handle } from '@/lib/auth'
import { getReferralConfig } from '@/lib/referral'
import { sanitizeConfig, type LandingConfig } from '@/lib/landing-config'

/** Public storefront data by slug OR custom domain: branding + catalog + FAQs + blog teaser + stats
 *  (for storefront previews — no auth needed). */
export async function GET(req: Request) {
  return handle(async () => {
    const raw = (new URL(req.url).searchParams.get('slug') ?? '').toLowerCase().trim()
    if (!raw) return jsonOk({ platform: null })
    // "slug" accepts either the platform slug, a full custom domain or a subdomain host
    const hostish = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    const domainCandidate = hostish.includes('.') ? hostish : null
    const slugCandidate = domainCandidate ? domainCandidate.split('.')[0] : hostish
    const platform = await db.platform.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { slug: slugCandidate },
          { slug: hostish },
          ...(domainCandidate ? [{ customDomain: domainCandidate }] : []),
        ],
      },
      select: {
        id: true, name: true, slug: true, tagline: true, heroTitle: true, heroSubtitle: true,
        heroCta: true, theme: true, accent: true, logoUrl: true, status: true,
        customDomain: true, domainType: true, currency: true, settings: true,
      },
    })
    if (!platform || platform.status !== 'ACTIVE') return jsonOk({ platform: null })
    const platformId = platform.id

    // Optional landing copy overrides cloned at purchase time (settings JSON → landingCopy)
    let landingCopy: Record<string, unknown> | null = null
    // Landing Studio config (settings JSON → landing) — validated server-side.
    let landing: LandingConfig | null = null
    try {
      const parsed = JSON.parse(platform.settings || '{}') as { landingCopy?: Record<string, unknown>; landing?: unknown }
      if (parsed.landingCopy && typeof parsed.landingCopy === 'object' && !Array.isArray(parsed.landingCopy)) {
        landingCopy = parsed.landingCopy
      }
      landing = sanitizeConfig(parsed.landing)
    } catch { /* settings is not valid JSON — ignore */ }

    const categories = await db.category.findMany({
      where: { platformId, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      include: { services: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } } },
    })
    // Best active coupon for the hero banner: active, not expired, uses left — highest value wins.
    const now = new Date()
    const coupons = await db.coupon.findMany({ where: { platformId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } })
    const available = coupons.filter((c) => c.maxUses === 0 || c.usedCount < c.maxUses)
    const publicCoupon = available.sort((a, b) => b.value - a.value)[0] ?? null
    // FAQs: platform-scoped first, fall back to the master GrowthRush FAQs.
    let faqs = await db.faq.findMany({ where: { platformId }, orderBy: { sortOrder: 'asc' } })
    if (!faqs.length) faqs = await db.faq.findMany({ where: { platformId: null }, orderBy: { sortOrder: 'asc' } })
    // Latest 3 published posts of this platform for the blog teaser.
    const posts = await db.post.findMany({
      where: { platformId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, cover: true, publishedAt: true },
    })
    // Every new account of this storefront receives the platform's welcome credit
    // (Admin → Settings → Referral program) — advertise it live in the hero.
    const refCfg = await getReferralConfig()
    // Live catalog stats for the hero micro-copy.
    const services = categories.reduce((s, c) => s + c.services.length, 0)
    const rates = categories.flatMap((c) => c.services.map((sv) => sv.rate))
    // Visible pages for the footer (id/slug/title only — bodies stay out of the payload).
    const pages = (landing?.pages ?? [])
      .filter((p) => p.visible)
      .map((p) => ({ id: p.id, slug: p.slug, title: p.title }))
    return jsonOk({
      platform: {
        id: platformId, name: platform.name, slug: platform.slug, tagline: platform.tagline,
        heroTitle: platform.heroTitle, heroSubtitle: platform.heroSubtitle, heroCta: platform.heroCta,
        theme: platform.theme, accent: platform.accent, logoUrl: platform.logoUrl,
        customDomain: platform.customDomain, domainType: platform.domainType, currency: platform.currency,
        landingCopy,
      },
      categories,
      publicCoupon: publicCoupon ? { code: publicCoupon.code, value: publicCoupon.value } : null,
      welcomeCredit: refCfg.welcomeCredit > 0 ? refCfg.welcomeCredit : 0,
      faqs,
      posts,
      stats: { networks: categories.length, services, minRate: rates.length ? Math.min(...rates) : 0 },
      landing,
      pages,
    })
  })
}
