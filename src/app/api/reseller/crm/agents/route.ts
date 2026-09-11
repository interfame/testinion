import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const PROVIDERS = ['OPENAI', 'CLAUDE', 'GEMINI']
const CHANNELS = ['WHATSAPP', 'INSTAGRAM', 'TELEGRAM', 'MESSENGER', 'EMAIL', 'WEBCHAT']

async function requirePlatform(userId: string) {
  const platform = await db.platform.findUnique({ where: { ownerId: userId } })
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

/** Accepts channels as array or JSON string of channel types */
function normalizeChannels(v: unknown): string {
  let arr: string[] = []
  if (Array.isArray(v)) arr = v.map((x) => String(x))
  else if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      arr = Array.isArray(parsed) ? parsed.map((x: unknown) => String(x)) : []
    } catch {
      arr = []
    }
  }
  return JSON.stringify(arr.filter((c) => CHANNELS.includes(c)))
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const agent = await db.aiAgent.findFirst({ where: { id, platformId: platform.id } })
      if (!agent) return jsonError('AI agent not found', 404)
      return jsonOk({ agent })
    }

    const agents = await db.aiAgent.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'asc' },
    })
    return jsonOk({ agents })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { name, provider, model, prompt, knowledge, temperature, channels, active } = body
    if (!name?.trim()) return jsonError('Agent name is required')

    const agent = await db.aiAgent.create({
      data: {
        platformId: platform.id,
        name: String(name).trim().slice(0, 80),
        provider: PROVIDERS.includes(String(provider)) ? String(provider) : 'OPENAI',
        model: model ? String(model).trim().slice(0, 80) : 'gpt-4o-mini',
        prompt: prompt ? String(prompt).slice(0, 4000) : null,
        knowledge: knowledge ? String(knowledge).slice(0, 8000) : null,
        temperature:
          Number.isFinite(Number(temperature))
            ? Math.min(1, Math.max(0, Number(temperature)))
            : 0.7,
        channels: normalizeChannels(channels),
        active: active === undefined ? true : !!active,
      },
    })
    return jsonOk({ agent })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, name, provider, model, prompt, knowledge, temperature, channels, active } = body
    if (!id) return jsonError('Agent id is required')

    const existing = await db.aiAgent.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('AI agent not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim().slice(0, 80)
    if (provider !== undefined && PROVIDERS.includes(String(provider))) data.provider = String(provider)
    if (model !== undefined) data.model = String(model).trim().slice(0, 80) || 'gpt-4o-mini'
    if (prompt !== undefined) data.prompt = prompt ? String(prompt).slice(0, 4000) : null
    if (knowledge !== undefined) data.knowledge = knowledge ? String(knowledge).slice(0, 8000) : null
    if (temperature !== undefined && Number.isFinite(Number(temperature)))
      data.temperature = Math.min(1, Math.max(0, Number(temperature)))
    if (channels !== undefined) data.channels = normalizeChannels(channels)
    if (active !== undefined) data.active = !!active

    const agent = await db.aiAgent.update({ where: { id: existing.id }, data })
    return jsonOk({ agent })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Agent id is required')

    const existing = await db.aiAgent.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('AI agent not found', 404)

    await db.aiAgent.delete({ where: { id: existing.id } })
    return jsonOk({ ok: true })
  })
}
