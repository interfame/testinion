import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Reseller catalog: own categories + services + master catalog for cloning.
 *
 * Every platform service carries a `cost` field — what the reseller PAYS for it:
 *  - Built-in GrowthRush API (providerId null): the master catalog wholesale rate
 *    (matched by category slug + service name, the same rule used by bulk import).
 *  - Third-party provider: the provider price derived from the reseller's own
 *    sell rate and the provider markup (rate / (1 + markup/100)).
 *  - Fully custom services with no master match: null (shown as "—").
 */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform', 404)

    const [categories, masterCategories, providers] = await Promise.all([
      db.category.findMany({
        where: { platformId: platform.id },
        orderBy: { sortOrder: 'asc' },
        include: { services: { orderBy: { sortOrder: 'asc' } } },
      }),
      db.category.findMany({
        where: { platformId: null, status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' },
        include: { services: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } } },
      }),
      db.provider.findMany({ where: { platformId: platform.id }, select: { id: true, markup: true } }),
    ])

    // Master wholesale lookup: slug → service name → master rate
    const masterBySlug = new Map<string, Map<string, number>>()
    for (const mc of masterCategories) {
      const byName = new Map<string, number>()
      for (const s of mc.services) byName.set(s.name.trim().toLowerCase(), s.rate)
      masterBySlug.set(mc.slug, byName)
    }
    const markupByProvider = new Map(providers.map((p) => [p.id, p.markup]))

    const withCost = categories.map((c) => ({
      ...c,
      services: c.services.map((s) => {
        let cost: number | null = null
        if (s.providerId) {
          // provider-linked: derive provider cost from the configured markup
          const markup = markupByProvider.get(s.providerId) ?? 0
          cost = round2(s.rate / (1 + markup / 100))
        } else {
          const master = masterBySlug.get(c.slug)?.get(s.name.trim().toLowerCase())
          if (typeof master === 'number') cost = round2(master)
        }
        return { ...s, cost }
      }),
    }))

    return jsonOk({ categories: withCost, masterCategories })
  })
}
