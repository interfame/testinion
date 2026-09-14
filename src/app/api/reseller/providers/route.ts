// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { getExternalApiPrice } from '@/lib/addon-price'
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
    const providers = await db.provider.findMany({
      where: { platformId: platform.id },
      orderBy: { name: 'asc' },
      include: { _count: { select: { services: true } } },
    })
    return jsonOk({ providers, externalApi: platform.externalApi })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    if (!platform.externalApi) {
      const price = await getExternalApiPrice(platform.id)
      return jsonError(`Connecting external providers requires the External API add-on ($${price} — unlock it from this page)`, 403)
    }
    if (!body.name || !body.apiUrl) return jsonError('Name and API URL are required')
    const provider = await db.provider.create({
      data: {
        platformId: platform.id,
        name: String(body.name).slice(0, 60),
        apiUrl: String(body.apiUrl).slice(0, 300),
        apiKey: body.apiKey ? String(body.apiKey).slice(0, 200) : null,
        markup: Math.max(0, parseFloat(body.markup) || 20),
        status: body.status || 'ACTIVE',
      },
    })
    return jsonOk({ provider })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    const provider = await db.provider.findFirst({ where: { id: body.id, platformId: platform.id } })
    if (!provider) return jsonError('Provider not found', 404)
    const data: Record<string, string | number> = {}
    if (body.name !== undefined) data.name = String(body.name).slice(0, 60)
    if (body.apiUrl !== undefined) data.apiUrl = String(body.apiUrl).slice(0, 300)
    if (body.apiKey !== undefined) data.apiKey = String(body.apiKey).slice(0, 200)
    if (body.markup !== undefined) data.markup = Math.max(0, parseFloat(body.markup) || 0)
    if (body.status !== undefined) data.status = String(body.status)
    const updated = await db.provider.update({ where: { id: provider.id }, data })
    return jsonOk({ provider: updated })
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
    const provider = await db.provider.findFirst({ where: { id, platformId: platform.id } })
    if (!provider) return jsonError('Provider not found', 404)
    const svcCount = await db.service.count({ where: { providerId: provider.id } })
    if (svcCount > 0) return jsonError('Provider has linked services — unlink them first', 409)
    await db.provider.delete({ where: { id: provider.id } })
    return jsonOk({ ok: true })
  })
}
