// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { MASTER_LANDING } from '@/lib/master-landing'

/** Buy your own white-label platform: monthly/annual rental + domain + add-ons, paid from wallet balance.
 *  The new platform is provisioned with the SAME landing copy as the master GrowthRush site
 *  (hero + FAQs), so the reseller's storefront looks exactly like ours from day one. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const body = await req.json()
    const { planId, name, externalApi } = body
    const cycle = body.cycle === 'annual' ? 'annual' : 'monthly'

    if (!planId || !name) return jsonError('Plan and platform name are required')
    if (user.role === 'RESELLER') return jsonError('You already own a platform')

    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.active) return jsonError('Plan not available')

    // ── Domain ──
    let slug = ''
    let dType = 'SUBDOMAIN'
    let cDomain: string | null = null
    let domainFee = 0

    if (body.domainType === 'CUSTOM') {
      const domain = String(body.customDomain || '').toLowerCase().trim()
      if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) return jsonError('Enter a valid custom domain (e.g. mysocial.io)')
      const taken = await db.platform.findFirst({ where: { OR: [{ customDomain: domain }, { slug: domain.split('.')[0] }] } })
      if (taken) return jsonError('That domain is already in use')
      cDomain = domain
      dType = 'CUSTOM'
      domainFee = plan.customDomainPrice
    } else {
      slug = String(body.subdomain || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30)
      if (slug.length < 3) return jsonError('Subdomain must be at least 3 characters (letters, numbers, dashes)')
      const taken = await db.platform.findUnique({ where: { slug }, select: { id: true } })
      if (taken) return jsonError(`"${slug}" is already taken — try another subdomain`)
    }

    // ── Add-on: external API connector ──
    const wantExternalApi = !!externalApi
    const externalApiFee = wantExternalApi ? plan.externalApiPrice : 0

    const monthlyFee = plan.monthlyPrice
    const setupDue = plan.setupPrice + domainFee // domain fee charged once at signup
    // Rental is charged in advance: monthly cycle = first month up-front;
    // annual cycle = 12 months up-front (≈ 2 months free). The external API
    // add-on stays a monthly charge — only the first month is due at checkout.
    const rentalDue = cycle === 'annual'
      ? (plan.annualPrice ?? Math.round(plan.monthlyPrice * 10 * 100) / 100)
      : plan.monthlyPrice
    const totalDue = Math.round((setupDue + rentalDue + externalApiFee) * 100) / 100

    if (user.balance < totalDue)
      return jsonError(`Insufficient balance. You need $${totalDue.toFixed(2)} — add funds first.`)

    const nextBilling = new Date()
    if (cycle === 'annual') nextBilling.setFullYear(nextBilling.getFullYear() + 1)
    else nextBilling.setMonth(nextBilling.getMonth() + 1)
    // Subscription window — the cron sweep auto-suspends the storefront past it
    const expiresAt = new Date(nextBilling)

    // Clone the master landing_copy Setting (stats/steps/features storefront copy)
    // into the new platform's settings JSON so its storefront is a FULL clone of
    // the master landing — best-effort, never blocks a purchase.
    let masterLandingCopy: Record<string, unknown> = {}
    try {
      const landingSetting = await db.setting.findUnique({ where: { key: 'landing_copy' } })
      if (landingSetting?.value) {
        const parsed = JSON.parse(landingSetting.value)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) masterLandingCopy = parsed
      }
    } catch { /* non-critical */ }

    const platform = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: totalDue }, role: 'RESELLER' },
      })
      await tx.transaction.create({
        data: { userId: user.id, type: 'PLAN', amount: -(plan.setupPrice + rentalDue), description: cycle === 'annual' ? `${plan.name} plan — setup + 12-month rental` : `${plan.name} plan — setup + first month`, status: 'COMPLETED' },
      })
      if (domainFee)
        await tx.transaction.create({
          data: { userId: user.id, type: 'ADDON', amount: -domainFee, description: 'Custom domain setup', status: 'COMPLETED' },
        })
      if (externalApiFee)
        await tx.transaction.create({
          data: { userId: user.id, type: 'ADDON', amount: -externalApiFee, description: 'External API connector', status: 'COMPLETED' },
        })
      return tx.platform.create({
        data: {
          ownerId: user.id,
          name: String(name).trim().slice(0, 60),
          slug,
          domainType: dType,
          customDomain: cDomain,
          domainStatus: dType === "CUSTOM" ? "PENDING" : "ACTIVE",
          planId: plan.id,
          status: 'ACTIVE',
          theme: 'nova',
          accent: '#7c3aed',
          currency: user.currency,
          externalApi: wantExternalApi,
          cycle,
          monthlyFee,
          nextBilling,
          expiresAt,
          // Landing clone: same copy as the master site ("la landing del que compra
          // la plataforma es la misma que la mía") — editable later in Website → Landing.
          tagline: MASTER_LANDING.tagline,
          heroTitle: MASTER_LANDING.heroTitle,
          heroSubtitle: MASTER_LANDING.heroSubtitle,
          heroCta: MASTER_LANDING.heroCta,
          heroImage: MASTER_LANDING.heroImage,
          settings: JSON.stringify({ landingCopy: masterLandingCopy }),
        },
      })
    })

    // Clone the master FAQs into the new storefront (best-effort, never blocks purchase)
    try {
      const masterFaqs = await db.faq.findMany({ where: { platformId: null }, orderBy: { sortOrder: 'asc' } })
      if (masterFaqs.length) {
        await db.faq.createMany({
          data: masterFaqs.map((f) => ({
            platformId: platform.id,
            question: f.question,
            answer: f.answer,
            category: f.category,
            sortOrder: f.sortOrder,
          })),
        })
      }
    } catch { /* non-critical */ }

    const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    return jsonOk({ platform, balance: fresh?.balance ?? 0 })
  })
}
