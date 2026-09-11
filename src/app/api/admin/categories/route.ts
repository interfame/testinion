import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** GET /api/admin/categories — master catalog categories with service counts */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const categories = await db.category.findMany({
      where: { platformId: null },
      include: { _count: { select: { services: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return jsonOk({ categories })
  })
}

/** POST /api/admin/categories — {name, icon, color, status, sortOrder} */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.name?.trim()) return jsonError('Category name is required')
    const slug = slugify(b.name)
    const dupe = await db.category.findFirst({ where: { platformId: null, slug } })
    if (dupe) return jsonError('A master category with that slug already exists', 409)
    const category = await db.category.create({
      data: {
        platformId: null,
        name: String(b.name).trim().slice(0, 60),
        slug,
        icon: b.icon || 'globe',
        color: b.color || '#e11d48',
        status: b.status || 'ACTIVE',
        sortOrder: parseInt(b.sortOrder) || 0,
      },
      include: { _count: { select: { services: true } } },
    })
    return jsonOk({ ok: true, category, message: 'Category created' })
  })
}

/** PATCH /api/admin/categories — {id, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing category id')
    const data: Record<string, unknown> = {}
    if (b.name !== undefined) {
      data.name = String(b.name).trim().slice(0, 60)
      data.slug = slugify(String(b.name))
      const dupe = await db.category.findFirst({ where: { platformId: null, slug: String(data.slug), id: { not: id } } })
      if (dupe) return jsonError('Another master category already uses that slug', 409)
    }
    if (b.icon !== undefined) data.icon = b.icon
    if (b.color !== undefined) data.color = b.color
    if (b.status !== undefined) data.status = b.status
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder) || 0
    const category = await db.category.update({
      where: { id },
      data,
      include: { _count: { select: { services: true } } },
    })
    return jsonOk({ ok: true, category, message: 'Category updated' })
  })
}

/** DELETE /api/admin/categories — {id} (only when it has no services) */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id } = await req.json()
    if (!id) return jsonError('Missing category id')
    const count = await db.service.count({ where: { categoryId: id } })
    if (count > 0) return jsonError(`Cannot delete: ${count} service(s) belong to this category`, 409)
    await db.category.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Category deleted' })
  })
}
