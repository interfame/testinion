import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** GET /api/admin/plans */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const plans = await db.plan.findMany({
      include: { _count: { select: { platforms: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    return jsonOk({ plans })
  })
}

/** POST /api/admin/plans — create plan */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.name?.trim()) return jsonError('Plan name is required')
    let slug = b.slug?.trim() ? slugify(b.slug) : slugify(b.name)
    const exists = await db.plan.findUnique({ where: { slug } })
    if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    const plan = await db.plan.create({
      data: {
        name: String(b.name).trim().slice(0, 60),
        slug,
        description: b.description ? String(b.description).slice(0, 300) : null,
        monthlyPrice: parseFloat(b.monthlyPrice) || 0,
        annualPrice: b.annualPrice === undefined || b.annualPrice === null || b.annualPrice === '' ? null : parseFloat(b.annualPrice) || null,
        setupPrice: parseFloat(b.setupPrice) || 0,
        customDomainPrice: parseFloat(b.customDomainPrice) || 0,
        externalApiPrice: parseFloat(b.externalApiPrice) || 0,
        maxServices: parseInt(b.maxServices) || 500,
        maxOrders: parseInt(b.maxOrders) || 100000,
        portalDesigns: typeof b.portalDesigns === 'string' ? b.portalDesigns : 'nova,horizon,boost',
        features: typeof b.features === 'string' ? b.features : '[]',
        popular: !!b.popular,
        active: b.active === undefined ? true : !!b.active,
        sortOrder: parseInt(b.sortOrder) || 0,
      },
    })
    return jsonOk({ ok: true, plan, message: 'Plan created' })
  })
}

/** PATCH /api/admin/plans — {id, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing plan id')
    const existing = await db.plan.findUnique({ where: { id } })
    if (!existing) return jsonError('Plan not found', 404)

    const data: Record<string, unknown> = {}
    if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 60)
    if (b.description !== undefined) data.description = b.description ? String(b.description).slice(0, 300) : null
    for (const k of ['monthlyPrice', 'setupPrice', 'customDomainPrice', 'externalApiPrice'] as const)
      if (b[k] !== undefined) data[k] = parseFloat(b[k]) || 0
    if (b.annualPrice !== undefined) data.annualPrice = b.annualPrice === null || b.annualPrice === '' ? null : parseFloat(b.annualPrice) || null
    for (const k of ['maxServices', 'maxOrders', 'sortOrder'] as const)
      if (b[k] !== undefined) data[k] = parseInt(b[k]) || 0
    if (b.portalDesigns !== undefined) data.portalDesigns = typeof b.portalDesigns === 'string' ? b.portalDesigns : 'nova,horizon,boost'
    if (b.features !== undefined) data.features = typeof b.features === 'string' ? b.features : '[]'
    for (const k of ['popular', 'active'] as const)
      if (b[k] !== undefined) data[k] = !!b[k]

    const plan = await db.plan.update({ where: { id }, data })
    return jsonOk({ ok: true, plan, message: 'Plan updated' })
  })
}

/** DELETE /api/admin/plans — {id} (only if no platform uses it) */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id } = await req.json()
    if (!id) return jsonError('Missing plan id')
    const inUse = await db.platform.count({ where: { planId: id } })
    if (inUse > 0) return jsonError(`Cannot delete: ${inUse} platform(s) are using this plan`, 409)
    await db.plan.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Plan deleted' })
  })
}
