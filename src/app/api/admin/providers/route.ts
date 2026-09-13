// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/admin/providers — master providers with service counts */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const providers = await db.provider.findMany({
      where: { platformId: null },
      include: { _count: { select: { services: true } } },
      orderBy: { name: 'asc' },
    })
    return jsonOk({ providers })
  })
}

/** POST /api/admin/providers — {name, apiUrl, apiKey, markup, status} */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.name?.trim()) return jsonError('Provider name is required')
    if (!b.apiUrl?.trim()) return jsonError('API URL is required')
    const provider = await db.provider.create({
      data: {
        platformId: null,
        name: String(b.name).trim().slice(0, 80),
        apiUrl: String(b.apiUrl).trim(),
        apiKey: b.apiKey ? String(b.apiKey).trim() : null,
        markup: parseFloat(b.markup) || 0,
        status: b.status || 'ACTIVE',
        balance: parseFloat(b.balance) || 0,
      },
      include: { _count: { select: { services: true } } },
    })
    return jsonOk({ ok: true, provider, message: 'Provider created' })
  })
}

/** PATCH /api/admin/providers — {id, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing provider id')
    const data: Record<string, unknown> = {}
    if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 80)
    if (b.apiUrl !== undefined) data.apiUrl = String(b.apiUrl).trim()
    if (b.apiKey !== undefined) data.apiKey = b.apiKey ? String(b.apiKey).trim() : null
    if (b.markup !== undefined) data.markup = parseFloat(b.markup) || 0
    if (b.status !== undefined) data.status = b.status
    if (b.balance !== undefined) data.balance = parseFloat(b.balance) || 0
    const provider = await db.provider.update({
      where: { id }, data, include: { _count: { select: { services: true } } },
    })
    return jsonOk({ ok: true, provider, message: 'Provider updated' })
  })
}

/** DELETE /api/admin/providers — {id} */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id } = await req.json()
    if (!id) return jsonError('Missing provider id')
    const services = await db.service.count({ where: { providerId: id } })
    if (services > 0) return jsonError(`Cannot delete: ${services} service(s) reference this provider`, 409)
    await db.provider.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Provider deleted' })
  })
}
