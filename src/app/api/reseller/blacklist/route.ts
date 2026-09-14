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

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const blacklist = await db.blacklist.findMany({ where: { platformId: platform.id }, orderBy: { createdAt: 'desc' } })
    return jsonOk({ blacklist })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const { type, value, note } = await req.json()
    if (!value?.trim()) return jsonError('Value is required')
    const item = await db.blacklist.create({
      data: {
        platformId: platform.id,
        type: type || 'EMAIL',
        value: String(value).trim().slice(0, 200),
        note: note ? String(note).slice(0, 200) : null,
      },
    })
    return jsonOk({ item })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireUser()
    const platform = await myPlatform((await requireUser()).id)
    const body = await req.json().catch(() => ({})) as { id?: string }
    const urlId = new URL(req.url).searchParams.get('id')
    const id = body.id || urlId
    if (!id) return jsonError('Missing id')
    await db.blacklist.deleteMany({ where: { id, platformId: platform.id } })
    return jsonOk({ ok: true })
  })
}
