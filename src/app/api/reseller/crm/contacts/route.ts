// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const CHANNELS = ['WHATSAPP', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'EMAIL', 'WEBCHAT']

async function requirePlatform(userId: string) {
  const platform = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

/** Accepts labels as array or JSON string, stores canonical JSON string */
function normalizeLabels(v: unknown): string | undefined {
  if (v === undefined) return undefined
  let arr: string[] = []
  if (Array.isArray(v)) arr = v.map((x) => String(x))
  else if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      arr = Array.isArray(parsed) ? parsed.map((x: unknown) => String(x)) : [v]
    } catch {
      arr = [v]
    }
  }
  return JSON.stringify(arr.slice(0, 20))
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const contact = await db.contact.findFirst({
        where: { id, platformId: platform.id },
        include: { conversations: { orderBy: { lastMessageAt: 'desc' }, take: 10 } },
      })
      if (!contact) return jsonError('Contact not found', 404)
      return jsonOk({ contact })
    }

    const contacts = await db.contact.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'desc' },
    })
    return jsonOk({ contacts })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { name, phone, email, channel, labels, notes, totalSpent } = body
    if (!name?.trim()) return jsonError('Contact name is required')

    const contact = await db.contact.create({
      data: {
        platformId: platform.id,
        name: String(name).trim().slice(0, 120),
        phone: phone ? String(phone).trim().slice(0, 40) : null,
        email: email ? String(email).trim().slice(0, 160) : null,
        channel: CHANNELS.includes(String(channel)) ? String(channel) : 'WHATSAPP',
        labels: normalizeLabels(labels) ?? '[]',
        notes: notes ? String(notes).trim().slice(0, 2000) : null,
        totalSpent: Number.isFinite(Number(totalSpent)) ? Math.max(0, Number(totalSpent)) : 0,
      },
    })
    return jsonOk({ contact })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, name, phone, email, channel, labels, notes, totalSpent } = body
    if (!id) return jsonError('Contact id is required')

    const existing = await db.contact.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Contact not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim().slice(0, 120)
    if (phone !== undefined) data.phone = phone ? String(phone).trim().slice(0, 40) : null
    if (email !== undefined) data.email = email ? String(email).trim().slice(0, 160) : null
    if (channel !== undefined && CHANNELS.includes(String(channel))) data.channel = String(channel)
    if (labels !== undefined) data.labels = normalizeLabels(labels) ?? '[]'
    if (notes !== undefined) data.notes = notes ? String(notes).trim().slice(0, 2000) : null
    if (totalSpent !== undefined && Number.isFinite(Number(totalSpent)))
      data.totalSpent = Math.max(0, Number(totalSpent))

    const contact = await db.contact.update({ where: { id: existing.id }, data })
    return jsonOk({ contact })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Contact id is required')

    const existing = await db.contact.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Contact not found', 404)

    await db.$transaction([
      db.message.deleteMany({
        where: { conversation: { contactId: existing.id, platformId: platform.id } },
      }),
      db.conversation.deleteMany({ where: { contactId: existing.id, platformId: platform.id } }),
      db.contact.delete({ where: { id: existing.id } }),
    ])
    return jsonOk({ ok: true })
  })
}
