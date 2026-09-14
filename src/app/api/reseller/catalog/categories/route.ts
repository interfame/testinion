// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

async function myPlatform(userId: string) {
  const p = await resilientPlatformForOwner(userId)
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()

    if (body.action === 'clone') {
      // Clone a master category (+ services at margin) into my catalog
      const masterCat = await db.category.findUnique({
        where: { id: body.categoryId },
        include: { services: true },
      })
      if (!masterCat || masterCat.platformId !== null) return jsonError('Master category not found')
      const exists = await db.category.findFirst({ where: { platformId: platform.id, slug: masterCat.slug } })
      if (exists) return jsonError('Category already exists in your catalog')
      const margin = typeof body.margin === 'number' ? body.margin : 25
      const count = await db.category.count({ where: { platformId: platform.id } })
      const cat = await db.category.create({
        data: { platformId: platform.id, slug: masterCat.slug, name: masterCat.name, icon: masterCat.icon, color: masterCat.color, sortOrder: count },
      })
      let sSort = 0
      for (const s of masterCat.services) {
        await db.service.create({
          data: {
            platformId: platform.id,
            categoryId: cat.id,
            name: s.name, type: s.type,
            rate: Math.round(s.rate * (1 + margin / 100) * 100) / 100,
            min: s.min, max: s.max, description: s.description,
            dripfeed: s.dripfeed, refill: s.refill, cancel: s.cancel,
            sortOrder: sSort++,
          },
        })
      }
      return jsonOk({ ok: true, categoryId: cat.id })
    }

    const name = String(body.name || '').trim()
    if (!name) return jsonError('Name is required')
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`
    const dup = await db.category.findFirst({ where: { platformId: platform.id, slug } })
    if (dup) return jsonError('A category with this name already exists')
    const count = await db.category.count({ where: { platformId: platform.id } })
    const cat = await db.category.create({
      data: {
        platformId: platform.id,
        name, slug,
        icon: body.icon || 'globe',
        color: body.color || '#e11d48',
        status: body.status || 'ACTIVE',
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : count,
      },
    })
    return jsonOk({ category: cat })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireUser()
    const platform = await myPlatform((await requireUser()).id)
    const body = await req.json()
    const cat = await db.category.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!cat) return jsonError('Category not found', 404)
    const data: Record<string, string | number> = {}
    if (body.name !== undefined) data.name = String(body.name).slice(0, 60)
    if (body.icon !== undefined) data.icon = String(body.icon)
    if (body.color !== undefined) data.color = String(body.color)
    if (body.status !== undefined) data.status = String(body.status)
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0
    const updated = await db.category.update({ where: { id: cat.id }, data })
    return jsonOk({ category: updated })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { id } = await req.json().catch(() => ({})) as { id?: string } ?? {}
    const urlId = new URL(req.url).searchParams.get('id')
    const catId = id || urlId
    if (!catId) return jsonError('Missing id')
    const cat = await db.category.findFirst({ where: { id: catId, platformId: platform.id }, include: { _count: { select: { services: true } } } })
    if (!cat) return jsonError('Category not found', 404)
    if (cat._count.services > 0) return jsonError('Category has services — remove them first', 409)
    await db.category.delete({ where: { id: cat.id } })
    return jsonOk({ ok: true })
  })
}
