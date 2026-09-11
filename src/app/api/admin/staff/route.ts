import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/admin/staff — main-platform team members */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const staff = await db.teamMember.findMany({ where: { platformId: null }, orderBy: { createdAt: 'desc' } })
    return jsonOk({ staff })
  })
}

/** POST /api/admin/staff — {name, email, role, permissions, status} */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    if (!b.name?.trim()) return jsonError('Name is required')
    if (!b.email?.trim()) return jsonError('Email is required')
    const member = await db.teamMember.create({
      data: {
        platformId: null,
        name: String(b.name).trim().slice(0, 80),
        email: String(b.email).trim().toLowerCase().slice(0, 120),
        role: b.role || 'SUPPORT',
        permissions: typeof b.permissions === 'string' ? b.permissions : JSON.stringify(b.permissions ?? []),
        status: b.status || 'ACTIVE',
      },
    })
    return jsonOk({ ok: true, member, message: 'Team member added' })
  })
}

/** PATCH /api/admin/staff — {id, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, ...b } = await req.json()
    if (!id) return jsonError('Missing member id')
    const data: Record<string, unknown> = {}
    if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 80)
    if (b.email !== undefined) data.email = String(b.email).trim().toLowerCase().slice(0, 120)
    if (b.role !== undefined) data.role = b.role
    if (b.permissions !== undefined) data.permissions = typeof b.permissions === 'string' ? b.permissions : JSON.stringify(b.permissions)
    if (b.status !== undefined) data.status = b.status
    const member = await db.teamMember.update({ where: { id }, data })
    return jsonOk({ ok: true, member, message: 'Team member updated' })
  })
}

/** DELETE /api/admin/staff — {id} */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id } = await req.json()
    if (!id) return jsonError('Missing member id')
    await db.teamMember.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Team member removed' })
  })
}
