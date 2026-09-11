import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

async function requirePlatform(userId: string) {
  const platform = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

const HEX = /^#[0-9a-fA-F]{6}$/

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const labels = await db.label.findMany({
      where: { platformId: platform.id },
      orderBy: { name: 'asc' },
    })
    return jsonOk({ labels })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { name, color } = body
    if (!name?.trim()) return jsonError('Label name is required')

    const label = await db.label.create({
      data: {
        platformId: platform.id,
        name: String(name).trim().slice(0, 40),
        color: typeof color === 'string' && HEX.test(color) ? color : '#f43f5e',
      },
    })
    return jsonOk({ label })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, name, color } = body
    if (!id) return jsonError('Label id is required')

    const existing = await db.label.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Label not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim().slice(0, 40)
    if (color !== undefined && typeof color === 'string' && HEX.test(color)) data.color = color

    const label = await db.label.update({ where: { id: existing.id }, data })
    return jsonOk({ label })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Label id is required')

    const existing = await db.label.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Label not found', 404)

    await db.label.delete({ where: { id: existing.id } })
    return jsonOk({ ok: true })
  })
}
