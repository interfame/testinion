import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

async function myPlatform(userId: string) {
  const p = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()

    if (body.action === 'clone') {
      const master = await db.service.findUnique({ where: { id: body.serviceId } })
      if (!master || master.platformId !== null) return jsonError('Master service not found')
      const myCat = await db.category.findFirst({ where: { platformId: platform.id, slug: master.categoryId } })
      // find my matching category by master category slug
      const masterCat = await db.category.findUnique({ where: { id: master.categoryId } })
      let target = masterCat ? await db.category.findFirst({ where: { platformId: platform.id, slug: masterCat.slug } }) : null
      if (!target) target = await db.category.findFirst({ where: { platformId: platform.id } })
      if (!target) return jsonError('Create or clone a category first')
      const margin = typeof body.margin === 'number' ? body.margin : 25
      const dup = await db.service.findFirst({ where: { platformId: platform.id, name: master.name, categoryId: target.id } })
      if (dup) return jsonError('Service already exists in your catalog')
      const count = await db.service.count({ where: { platformId: platform.id } })
      const svc = await db.service.create({
        data: {
          platformId: platform.id,
          categoryId: target.id,
          name: master.name, type: master.type,
          rate: Math.round(master.rate * (1 + margin / 100) * 100) / 100,
          min: master.min, max: master.max, description: master.description,
          dripfeed: master.dripfeed, refill: master.refill, cancel: master.cancel,
          sortOrder: count,
        },
      })
      return jsonOk({ service: svc })
    }

    const { name, categoryId, rate, min, max } = body
    if (!name || !categoryId) return jsonError('Name and category are required')
    const cat = await db.category.findFirst({ where: { id: categoryId, platformId: platform.id } })
    if (!cat) return jsonError('Category not found')
    const count = await db.service.count({ where: { platformId: platform.id } })
    const svc = await db.service.create({
      data: {
        platformId: platform.id,
        categoryId,
        name: String(name).slice(0, 140),
        type: body.type || 'DEFAULT',
        rate: Math.max(0, parseFloat(rate) || 0),
        min: Math.max(1, parseInt(min) || 1),
        max: Math.max(1, parseInt(max) || 100000),
        description: body.description || null,
        dripfeed: !!body.dripfeed,
        refill: body.refill !== false,
        cancel: body.cancel !== false,
        sortOrder: count,
      },
    })
    return jsonOk({ service: svc })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()

    // Bulk margin over master catalog prices
    if (body.action === 'margin') {
      const margin = parseFloat(body.percent)
      if (isNaN(margin) || margin < -90 || margin > 500) return jsonError('Margin must be between -90 and 500')
      const categoryId = body.categoryId
      const masterServices = await db.service.findMany({
        where: { platformId: null, ...(categoryId ? { categoryId } : {}) },
      })
      let updated = 0
      for (const m of masterServices) {
        const masterCat = await db.category.findUnique({ where: { id: m.categoryId } })
        if (!masterCat) continue
        const myCat = await db.category.findFirst({ where: { platformId: platform.id, slug: masterCat.slug } })
        if (!myCat) continue
        const mine = await db.service.findFirst({ where: { platformId: platform.id, name: m.name, categoryId: myCat.id } })
        if (!mine) continue
        await db.service.update({
          where: { id: mine.id },
          data: { rate: Math.round(m.rate * (1 + margin / 100) * 100) / 100 },
        })
        updated++
      }
      return jsonOk({ ok: true, updated })
    }

    const svc = await db.service.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!svc) return jsonError('Service not found', 404)
    const data: Record<string, string | number | boolean> = {}
    if (body.name !== undefined) data.name = String(body.name).slice(0, 140)
    if (body.rate !== undefined) data.rate = Math.max(0, parseFloat(body.rate) || 0)
    if (body.min !== undefined) data.min = Math.max(1, parseInt(body.min) || 1)
    if (body.max !== undefined) data.max = Math.max(1, parseInt(body.max) || 100000)
    if (body.type !== undefined) data.type = String(body.type)
    if (body.description !== undefined) data.description = body.description || null
    if (body.status !== undefined) data.status = String(body.status)
    if (body.dripfeed !== undefined) data.dripfeed = !!body.dripfeed
    if (body.refill !== undefined) data.refill = !!body.refill
    if (body.cancel !== undefined) data.cancel = !!body.cancel
    if (body.categoryId !== undefined) {
      const cat = await db.category.findFirst({ where: { id: body.categoryId, platformId: platform.id } })
      if (!cat) return jsonError('Category not found')
      data.categoryId = cat.id
    }
    const updated = await db.service.update({ where: { id: svc.id }, data })
    return jsonOk({ service: updated })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json().catch(() => ({})) as { id?: string }
    const urlId = new URL(req.url).searchParams.get('id')
    const id = body.id || urlId
    if (!id) return jsonError('Missing id')
    const svc = await db.service.findFirst({ where: { id, platformId: platform.id } })
    if (!svc) return jsonError('Service not found', 404)
    const ordersCount = await db.order.count({ where: { serviceId: svc.id } })
    if (ordersCount > 0) {
      await db.service.update({ where: { id: svc.id }, data: { status: 'INACTIVE' } })
      return jsonOk({ ok: true, deactivated: true })
    }
    await db.service.delete({ where: { id: svc.id } })
    return jsonOk({ ok: true })
  })
}
