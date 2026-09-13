// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const TYPES = ['WHATSAPP', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'EMAIL', 'WEBCHAT']
const STATUSES = ['CONNECTED', 'DISCONNECTED', 'PENDING']

async function requirePlatform(userId: string) {
  const platform = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const channel = await db.channel.findFirst({ where: { id, platformId: platform.id } })
      if (!channel) return jsonError('Channel not found', 404)
      return jsonOk({ channel })
    }

    const channels = await db.channel.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'asc' },
    })
    return jsonOk({ channels })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { type, name, handle: channelHandle } = body
    if (!TYPES.includes(String(type))) return jsonError('Invalid channel type')
    if (!name?.trim()) return jsonError('Channel name is required')

    const channel = await db.channel.create({
      data: {
        platformId: platform.id,
        type: String(type),
        name: String(name).trim().slice(0, 120),
        handle: channelHandle ? String(channelHandle).trim().slice(0, 160) : null,
        status: 'DISCONNECTED',
      },
    })
    return jsonOk({ channel })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, name, handle: channelHandle, status, type } = body
    if (!id) return jsonError('Channel id is required')

    const existing = await db.channel.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Channel not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim().slice(0, 120)
    if (channelHandle !== undefined) data.handle = channelHandle ? String(channelHandle).trim().slice(0, 160) : null
    if (type !== undefined && TYPES.includes(String(type))) data.type = String(type)
    if (status !== undefined) {
      if (!STATUSES.includes(String(status))) return jsonError('Invalid channel status')
      // Simulated connect/disconnect flow
      data.status = String(status)
    }

    const channel = await db.channel.update({ where: { id: existing.id }, data })
    return jsonOk({ channel })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Channel id is required')

    const existing = await db.channel.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Channel not found', 404)

    await db.channel.delete({ where: { id: existing.id } })
    return jsonOk({ ok: true })
  })
}
