// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

async function requirePlatform(userId: string) {
  const platform = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const quickReplies = await db.quickReply.findMany({
      where: { platformId: platform.id },
      orderBy: { title: 'asc' },
    })
    return jsonOk({ quickReplies })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { title, body: text, shortcut } = body
    if (!title?.trim() || !text?.trim()) return jsonError('Title and body are required')

    const quickReply = await db.quickReply.create({
      data: {
        platformId: platform.id,
        title: String(title).trim().slice(0, 80),
        body: String(text).trim().slice(0, 2000),
        shortcut: shortcut ? String(shortcut).trim().slice(0, 30) : null,
      },
    })
    return jsonOk({ quickReply })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, title, body: text, shortcut } = body
    if (!id) return jsonError('Quick reply id is required')

    const existing = await db.quickReply.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Quick reply not found', 404)

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = String(title).trim().slice(0, 80)
    if (text !== undefined) data.body = String(text).trim().slice(0, 2000)
    if (shortcut !== undefined) data.shortcut = shortcut ? String(shortcut).trim().slice(0, 30) : null

    const quickReply = await db.quickReply.update({ where: { id: existing.id }, data })
    return jsonOk({ quickReply })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Quick reply id is required')

    const existing = await db.quickReply.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Quick reply not found', 404)

    await db.quickReply.delete({ where: { id: existing.id } })
    return jsonOk({ ok: true })
  })
}
