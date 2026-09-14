// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

/** Reseller: read + update own platform (branding, theme, landing copy, domains, addons). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await resilientPlatformForOwner(user.id)
    if (!platform) return jsonError('You do not own a platform', 404)
    const [clients, orders, services] = await Promise.all([
      db.user.count({ where: { platformId: platform.id } }),
      db.order.findMany({ where: { platformId: platform.id }, orderBy: { createdAt: 'desc' }, take: 5, include: { user: { select: { name: true } } } }),
      db.service.count({ where: { platformId: platform.id, status: 'ACTIVE' } }),
    ])
    return jsonOk({ platform, stats: { clients, orders: orders.length, services, recentOrders: orders } })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await resilientPlatformForOwner(user.id)
    if (!platform) return jsonError('You do not own a platform', 404)

    const body = await req.json()
    const data: Record<string, string | boolean | Date | null> = {}

    // Renew the subscription (charged from balance) — restores a suspended storefront
    if (body.renew) {
      const months = platform.cycle === 'annual' ? 12 : 1
      const price = platform.cycle === 'annual'
        ? (platform.plan.annualPrice ?? platform.plan.monthlyPrice)
        : platform.plan.monthlyPrice
      if (user.balance < price)
        return jsonError(`You need $${price.toFixed(2)} in your wallet — add funds first (Client version → Add funds)`)
      const until = new Date()
      until.setMonth(until.getMonth() + months)
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: price } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'PLAN', amount: -price, description: `${platform.plan.name} plan — renewal (${platform.cycle})`, method: 'Balance' },
        })
        await tx.platform.update({
          where: { id: platform.id },
          data: { status: 'ACTIVE', expiresAt: until, nextBilling: until, suspendedAt: null },
        })
      })
      await notify(user.id, 'MONEY', `Storefront renewed ✅`, `${platform.name} is back online until ${until.toISOString().slice(0, 10)}.`, 'plan-billing')
      const updated = await resilientPlatformForOwner(user.id)
      const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
      return jsonOk({ platform: updated, balance: fresh?.balance ?? 0 })
    }

    // Plan change (charged from balance immediately)
    if (body.changePlan) {
      const newPlan = await db.plan.findUnique({ where: { id: String(body.changePlan) } })
      if (!newPlan || !newPlan.active) return jsonError('Plan not available')
      if (newPlan.id === platform.planId) return jsonError('You are already on this plan')
      if (user.balance < newPlan.monthlyPrice)
        return jsonError(`You need $${newPlan.monthlyPrice.toFixed(2)} in your wallet — add funds first`)
      const nextBilling = new Date()
      nextBilling.setMonth(nextBilling.getMonth() + 1)
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: newPlan.monthlyPrice } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'PLAN', amount: -newPlan.monthlyPrice, description: `${newPlan.name} plan — subscription`, method: 'Balance' },
        })
        await tx.platform.update({
          where: { id: platform.id },
          data: { planId: newPlan.id, monthlyFee: newPlan.monthlyPrice, nextBilling, expiresAt: nextBilling, suspendedAt: null, status: 'ACTIVE', theme: newPlan.portalDesigns.includes(platform.theme) ? platform.theme : 'nova' },
        })
      })
      await notify(user.id, 'MONEY', `Plan upgraded to ${newPlan.name} 👑`, `$${newPlan.monthlyPrice.toFixed(2)} charged. New features are active now.`, 'plan-billing')
      const updated = await resilientPlatformForOwner(user.id)
      const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
      return jsonOk({ platform: updated, balance: fresh?.balance ?? 0 })
    }

    if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 60)
    if (body.tagline !== undefined) data.tagline = String(body.tagline).slice(0, 120)
    if (body.heroTitle !== undefined) data.heroTitle = String(body.heroTitle).slice(0, 120)
    if (body.heroSubtitle !== undefined) data.heroSubtitle = String(body.heroSubtitle).slice(0, 220)
    if (body.heroCta !== undefined) data.heroCta = String(body.heroCta).slice(0, 40)
    if (body.logoUrl !== undefined) data.logoUrl = String(body.logoUrl).slice(0, 300) || null
    if (body.currency !== undefined) data.currency = String(body.currency).slice(0, 3).toUpperCase()

    // Theme must be unlocked by the plan
    if (body.theme !== undefined) {
      const allowed = platform.plan.portalDesigns.split(',')
      const theme = String(body.theme)
      if (!allowed.includes(theme)) return jsonError(`The ${theme} design requires a plan upgrade`)
      data.theme = theme
    }
    if (body.accent !== undefined && /^#[0-9a-fA-F]{6}$/.test(body.accent)) data.accent = body.accent

    // Domain change
    if (body.domainAction === 'switch_custom') {
      const domain = String(body.customDomain || '').toLowerCase().trim()
      if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) return jsonError('Enter a valid domain')
      const taken = await db.platform.findFirst({ where: { customDomain: domain } })
      if (taken) return jsonError('Domain already in use')
      const fee = platform.plan.customDomainPrice
      if (user.balance < fee) return jsonError(`Custom domain costs $${fee.toFixed(2)} — add funds first`)
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: fee } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'ADDON', amount: -fee, description: 'Custom domain setup', status: 'COMPLETED' },
        })
        await tx.platform.update({
          where: { id: platform.id },
          data: { domainType: 'CUSTOM', customDomain: domain, domainStatus: 'PENDING' },
        })
      })
      await db.transaction.findFirst({ where: { userId: user.id } }) // keep tx consistent
    } else if (body.domainAction === 'switch_subdomain') {
      await db.platform.update({
        where: { id: platform.id },
        data: { domainType: 'SUBDOMAIN', customDomain: null, domainStatus: 'ACTIVE' },
      })
    }

    // External API add-on (paid monthly)
    if (body.externalApi !== undefined && body.externalApi !== platform.externalApi) {
      if (body.externalApi) {
        const fee = platform.plan.externalApiPrice
        if (user.balance < fee) return jsonError(`External API connector costs $${fee.toFixed(2)}/mo — add funds first`)
        await db.$transaction(async (tx) => {
          await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: fee } } })
          await tx.transaction.create({
            data: { userId: user.id, type: 'ADDON', amount: -fee, description: 'External API connector — monthly', status: 'COMPLETED' },
          })
          await tx.platform.update({ where: { id: platform.id }, data: { externalApi: true } })
        })
        await notify(user.id, 'MONEY', 'External API connector enabled 🔌', `$${fee.toFixed(2)}/mo — connect third-party providers in My Providers.`, 'providers')
      } else {
        await db.platform.update({ where: { id: platform.id }, data: { externalApi: false } })
      }
    }

    if (Object.keys(data).length) await db.platform.update({ where: { id: platform.id }, data })

    const updated = await resilientPlatformForOwner(user.id)
    const fresh = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } })
    return jsonOk({ platform: updated, balance: fresh?.balance ?? 0 })
  })
}
