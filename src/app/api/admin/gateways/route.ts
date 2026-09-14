// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { maskConfig, parseConfig, sanitizeConfig, PROVIDER_CODES } from '@/lib/gateways'

/** GET /api/admin/gateways — master payment gateways (secrets masked) */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const gateways = await db.gateway.findMany({ where: { platformId: null }, orderBy: { sortOrder: 'asc' } })
    return jsonOk({
      gateways: gateways.map((g) => ({
        ...g,
        config: g.code ? maskConfig(g.code, parseConfig(g.config)) : {},
      })),
    })
  })
}

/** POST /api/admin/gateways — {name, type, code?, feePercent, instructions, enabled, config?} */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.name?.trim()) return jsonError('Gateway name is required')
    const code = b.code && PROVIDER_CODES.includes(b.code) ? b.code : null
    const gateway = await db.gateway.create({
      data: {
        platformId: null,
        name: String(b.name).trim().slice(0, 60),
        type: b.type || 'MANUAL',
        code,
        instructions: b.instructions ? String(b.instructions).slice(0, 2000) : null,
        feePercent: parseFloat(b.feePercent) || 0,
        enabled: b.enabled === undefined ? true : !!b.enabled,
        sortOrder: parseInt(b.sortOrder) || 0,
        config: code ? JSON.stringify(sanitizeConfig(code, b.config)) : '{}',
      },
    })
    return jsonOk({ ok: true, gateway, message: 'Gateway created' })
  })
}

/** PATCH /api/admin/gateways — {id, ...fields, config?} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing gateway id')
    const existing = await db.gateway.findFirst({ where: { id, platformId: null } })
    if (!existing) return jsonError('Gateway not found', 404)
    const data: Record<string, unknown> = {}
    if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 60)
    if (b.type !== undefined) data.type = b.type
    if (b.code !== undefined) data.code = b.code && PROVIDER_CODES.includes(b.code) ? b.code : null
    if (b.instructions !== undefined) data.instructions = b.instructions ? String(b.instructions).slice(0, 2000) : null
    if (b.feePercent !== undefined) data.feePercent = parseFloat(b.feePercent) || 0
    if (b.enabled !== undefined) data.enabled = !!b.enabled
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder) || 0
    if (data.code) {
      const code = data.code as string
      // merge over existing config so masked values never wipe real credentials
      const merged = { ...parseConfig(existing.config), ...sanitizeConfig(code, b.config) }
      data.config = JSON.stringify(merged)
    }
    const gateway = await db.gateway.update({ where: { id }, data })
    return jsonOk({
      ok: true,
      gateway: { ...gateway, config: gateway.code ? maskConfig(gateway.code, parseConfig(gateway.config)) : {} },
      message: 'Gateway updated',
    })
  })
}

/** DELETE /api/admin/gateways — {id} */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id } = await req.json()
    if (!id) return jsonError('Missing gateway id')
    await db.gateway.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Gateway deleted' })
  })
}
