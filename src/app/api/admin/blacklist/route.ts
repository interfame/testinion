import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/admin/blacklist — master blacklist entries */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const items = await db.blacklist.findMany({ where: { platformId: null }, orderBy: { createdAt: 'desc' } })
    return jsonOk({ items })
  })
}

/** POST /api/admin/blacklist — {type: EMAIL|DOMAIN|IP|KEYWORD, value, note} */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.value?.trim()) return jsonError('Value is required')
    const item = await db.blacklist.create({
      data: {
        platformId: null,
        type: b.type || 'EMAIL',
        value: String(b.value).trim().slice(0, 200),
        note: b.note ? String(b.note).slice(0, 300) : null,
      },
    })
    return jsonOk({ ok: true, item, message: 'Added to blacklist' })
  })
}

/** PATCH /api/admin/blacklist — {id, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing entry id')
    const data: Record<string, unknown> = {}
    if (b.type !== undefined) data.type = b.type
    if (b.value !== undefined) data.value = String(b.value).trim().slice(0, 200)
    if (b.note !== undefined) data.note = b.note ? String(b.note).slice(0, 300) : null
    const item = await db.blacklist.update({ where: { id }, data })
    return jsonOk({ ok: true, item, message: 'Blacklist entry updated' })
  })
}

/** DELETE /api/admin/blacklist — {id} */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id } = await req.json()
    if (!id) return jsonError('Missing entry id')
    await db.blacklist.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Removed from blacklist' })
  })
}
