// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

const INCLUDE = {
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  provider: { select: { id: true, name: true } },
  _count: { select: { orders: true } },
}

/** GET /api/admin/services?categoryId=&q=&status= — master catalog services */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const q = searchParams.get('q')?.trim()
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { platformId: null }
    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    if (q) where.name = { contains: q }

    const services = await db.service.findMany({
      where, include: INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 300,
    })
    return jsonOk({ services })
  })
}

/** POST /api/admin/services */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.name?.trim()) return jsonError('Service name is required')
    if (!b.categoryId) return jsonError('Category is required')
    const rate = parseFloat(b.rate)
    if (isNaN(rate) || rate < 0) return jsonError('Enter a valid rate per 1000')
    const category = await db.category.findUnique({ where: { id: b.categoryId } })
    if (!category) return jsonError('Category not found', 404)

    const service = await db.service.create({
      data: {
        platformId: null,
        categoryId: b.categoryId,
        providerId: b.providerId || null,
        name: String(b.name).trim().slice(0, 200),
        type: b.type || 'DEFAULT',
        rate,
        min: parseInt(b.min) || 1,
        max: parseInt(b.max) || 100000,
        description: b.description ? String(b.description).slice(0, 500) : null,
        dripfeed: !!b.dripfeed,
        refill: b.refill === undefined ? true : !!b.refill,
        cancel: b.cancel === undefined ? true : !!b.cancel,
        status: b.status || 'ACTIVE',
        featured: !!b.featured,
        sortOrder: parseInt(b.sortOrder) || 0,
      },
      include: INCLUDE,
    })
    return jsonOk({ ok: true, service, message: 'Service created' })
  })
}

/** PATCH /api/admin/services — {id, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing service id')
    const data: Record<string, unknown> = {}
    if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 200)
    if (b.categoryId !== undefined) data.categoryId = b.categoryId
    if (b.providerId !== undefined) data.providerId = b.providerId || null
    if (b.type !== undefined) data.type = b.type
    if (b.rate !== undefined) data.rate = parseFloat(b.rate) || 0
    if (b.cost !== undefined) {
      // provider cost per 1k — null clears it; 0 is a valid value
      if (b.cost === null || b.cost === '') data.cost = null
      else {
        const c = parseFloat(b.cost)
        data.cost = Number.isFinite(c) && c >= 0 ? c : null
      }
    }
    if (b.min !== undefined) data.min = parseInt(b.min) || 1
    if (b.max !== undefined) data.max = parseInt(b.max) || 100000
    if (b.description !== undefined) data.description = b.description ? String(b.description).slice(0, 500) : null
    for (const k of ['dripfeed', 'refill', 'cancel', 'featured'] as const)
      if (b[k] !== undefined) data[k] = !!b[k]
    if (b.status !== undefined) data.status = b.status
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder) || 0

    const service = await db.service.update({ where: { id }, data, include: INCLUDE })
    return jsonOk({ ok: true, service, message: 'Service updated' })
  })
}

/** DELETE /api/admin/services — {id} or {ids: string[]} (bulk, max 2000; services with orders are skipped) */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json().catch(() => ({}))

    // ── Bulk delete: {ids: [...]} ─────────────────────────────────
    if (Array.isArray(b.ids)) {
      const ids = b.ids.map((x: unknown) => String(x)).filter(Boolean)
      if (!ids.length) return jsonError('No services selected')
      if (ids.length > 2000) return jsonError('Too many services selected (max 2000 per batch)')

      const withOrders = await db.service.findMany({
        where: { id: { in: ids }, orders: { some: {} } },
        select: { id: true, name: true, _count: { select: { orders: true } } },
      })
      const blocked = withOrders.map((s) => ({ id: s.id, name: s.name, orders: s._count.orders }))
      const blockedIds = new Set(blocked.map((s) => s.id))
      const deletable = ids.filter((id: string) => !blockedIds.has(id))

      let deleted = 0
      for (let i = 0; i < deletable.length; i += 500) {
        const chunk = deletable.slice(i, i + 500)
        const res = await db.service.deleteMany({ where: { id: { in: chunk } } })
        deleted += res.count
      }
      return jsonOk({ ok: true, deleted, blocked })
    }

    // ── Single delete: {id} (blocked when orders exist) ───────────
    const { id } = b
    if (!id) return jsonError('Missing service id')
    const orders = await db.order.count({ where: { serviceId: id } })
    if (orders > 0) return jsonError(`Cannot delete: this service has ${orders} order(s). Set it inactive instead.`, 409)
    await db.service.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Service deleted' })
  })
}
