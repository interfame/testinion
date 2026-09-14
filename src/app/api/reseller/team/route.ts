// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

const ROLES = ['ADMIN', 'SUPPORT', 'FINANCE', 'CONTENT', 'CRM']
const STATUSES = ['ACTIVE', 'SUSPENDED']

async function myPlatform(userId: string) {
  const p = await resilientPlatformForOwner(userId)
  if (!p) throw jsonError('No platform', 404)
  return p
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const team = await db.teamMember.findMany({ where: { platformId: platform.id }, orderBy: { createdAt: 'asc' } })
    return jsonOk({ team })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { name, email, role } = await req.json()
    if (!name?.trim() || !email?.trim()) return jsonError('Name and email are required')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError('Enter a valid email')
    const member = await db.teamMember.create({
      data: {
        platformId: platform.id,
        name: String(name).trim().slice(0, 80),
        email: String(email).toLowerCase().trim(),
        role: ROLES.includes(String(role)) ? String(role) : 'SUPPORT',
        permissions: JSON.stringify(body_permissions(role)),
      },
    })
    return jsonOk({ member })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    const member = await db.teamMember.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!member) return jsonError('Member not found', 404)
    const data: Record<string, string> = {}
    if (body.name !== undefined) data.name = String(body.name).slice(0, 80)
    if (body.role !== undefined) {
      if (!ROLES.includes(String(body.role))) return jsonError('Invalid role')
      data.role = String(body.role)
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(String(body.status))) return jsonError('Invalid status')
      data.status = String(body.status)
    }
    if (body.permissions !== undefined) data.permissions = JSON.stringify(body.permissions)
    const updated = await db.teamMember.update({ where: { id: member.id }, data })
    return jsonOk({ member: updated })
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
    await db.teamMember.deleteMany({ where: { id, platformId: platform.id } })
    return jsonOk({ ok: true })
  })
}

function body_permissions(role: string): string[] {
  switch (role) {
    case 'ADMIN': return ['inbox', 'tickets', 'deposits', 'transactions', 'content', 'catalog', 'clients']
    case 'FINANCE': return ['deposits', 'transactions']
    case 'CONTENT': return ['content']
    case 'CRM': return ['contacts', 'automations', 'inbox']
    default: return ['inbox', 'tickets']
  }
}
