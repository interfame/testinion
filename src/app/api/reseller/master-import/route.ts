import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * POST /api/reseller/master-import
 * Bulk-import categories + services from the master GrowthRush catalog into the
 * reseller's platform, leaving providerId null (built-in GrowthRush API).
 *
 * Body: { categoryIds: string[] | 'all', mode: 'percent' | 'manual',
 *         percent?: number, prices?: Record<string, number> }
 * Response: { importedCategories, importedServices, skipped, capped }
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({
      where: { ownerId: user.id },
      include: { plan: { select: { maxServices: true } } },
    })
    if (!platform) return jsonError('No platform', 404)

    const body = await req.json().catch(() => ({})) as {
      categoryIds?: string[] | 'all'
      mode?: string
      percent?: number | string
      prices?: Record<string, number | string>
    }

    const ids = body.categoryIds
    if (ids !== 'all' && !Array.isArray(ids)) return jsonError('categoryIds must be an array or "all"')
    if (ids !== 'all' && ids.length === 0) return jsonError('Select at least one category')

    const mode = body.mode === 'percent' || body.mode === 'manual' ? body.mode : null
    if (!mode) return jsonError("mode must be 'percent' or 'manual'")

    const percent = typeof body.percent === 'number' ? body.percent : parseFloat(String(body.percent ?? ''))
    if (mode === 'percent' && (!Number.isFinite(percent) || percent < 0))
      return jsonError('percent must be a number ≥ 0')

    const rawPrices = body.prices && typeof body.prices === 'object' ? body.prices : {}
    const prices = new Map<string, number>()
    for (const [k, v] of Object.entries(rawPrices)) {
      const n = typeof v === 'number' ? v : parseFloat(String(v))
      if (Number.isFinite(n) && n > 0) prices.set(k, round2(n))
    }

    // Source: master catalog (platformId: null) — ACTIVE categories + their ACTIVE services
    const masterCategories = await db.category.findMany({
      where: { platformId: null, status: 'ACTIVE', ...(ids === 'all' ? {} : { id: { in: ids as string[] } }) },
      orderBy: { sortOrder: 'asc' },
      include: { services: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } } },
    })

    // Existing platform categories by slug (reuse when the slug already exists)
    const myCategories = await db.category.findMany({ where: { platformId: platform.id } })
    const catBySlug = new Map(myCategories.map((c) => [c.slug, c]))

    // Existing platform service names grouped by category (skip duplicates)
    const myServices = await db.service.findMany({
      where: { platformId: platform.id },
      select: { categoryId: true, name: true },
    })
    const namesByCat = new Map<string, Set<string>>()
    for (const s of myServices) {
      let set = namesByCat.get(s.categoryId)
      if (!set) { set = new Set(); namesByCat.set(s.categoryId, set) }
      set.add(s.name.trim().toLowerCase())
    }

    const maxServices = platform.plan?.maxServices ?? 500
    let existingCount = myServices.length
    let importedCategories = 0
    let importedServices = 0
    let skipped = 0
    let capped = false

    for (const mc of masterCategories) {
      // Reuse platform category with the same slug, or create it (copy name/slug/icon/color/sortOrder)
      let category = catBySlug.get(mc.slug)
      if (!category) {
        category = await db.category.create({
          data: {
            platformId: platform.id,
            name: mc.name,
            slug: mc.slug,
            icon: mc.icon,
            color: mc.color,
            status: 'ACTIVE',
            sortOrder: mc.sortOrder,
          },
        })
        catBySlug.set(mc.slug, category)
      }

      const taken = namesByCat.get(category.id) ?? new Set<string>()
      const toCreate: {
        platformId: string; categoryId: string; providerId: null
        name: string; type: string; rate: number; min: number; max: number
        description: string | null; dripfeed: boolean; refill: boolean; cancel: boolean
        status: string; sortOrder: number
      }[] = []

      for (const ms of mc.services) {
        // Skip services whose name already exists in that category on the platform
        const key = ms.name.trim().toLowerCase()
        if (taken.has(key)) { skipped++; continue }

        // Enforce plan.maxServices — stop importing beyond the cap
        if (existingCount + toCreate.length >= maxServices) { capped = true; break }

        const rate =
          mode === 'manual'
            ? (prices.has(ms.id) ? prices.get(ms.id)! : round2(ms.rate))
            : round2(ms.rate * (1 + percent / 100))
        // Clamp: never create a free service by accident (min $0.01)
        const finalRate = Math.max(0.01, round2(rate))

        toCreate.push({
          platformId: platform.id,
          categoryId: category.id,
          providerId: null, // built-in GrowthRush API
          name: ms.name,
          type: ms.type,
          rate: finalRate,
          min: ms.min,
          max: ms.max,
          description: ms.description,
          dripfeed: ms.dripfeed,
          refill: ms.refill,
          cancel: ms.cancel,
          status: 'ACTIVE',
          sortOrder: ms.sortOrder,
        })
        taken.add(key)
      }

      if (toCreate.length) {
        await db.service.createMany({ data: toCreate })
        existingCount += toCreate.length
        importedServices += toCreate.length
        importedCategories++
        namesByCat.set(category.id, taken)
      }

      if (capped) break
    }

    return jsonOk({ importedCategories, importedServices, skipped, capped })
  })
}
