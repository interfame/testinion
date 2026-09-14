// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

const TRIGGERS = ['KEYWORD', 'WELCOME', 'AWAY_HOURS', 'NO_REPLY', 'HANDOFF']

async function requirePlatform(userId: string) {
  const platform = await resilientPlatformForOwner(userId)
  if (!platform) throw jsonError('No platform found for this account', 404)
  return platform
}

/** Accepts actions as array of {type, value} or JSON string; stores canonical JSON string */
function normalizeActions(v: unknown): string {
  let rows: { type: string; value: string }[] = []
  if (Array.isArray(v)) {
    rows = v
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        type: String((r as Record<string, unknown>).type ?? 'send_message'),
        value: String((r as Record<string, unknown>).value ?? ''),
      }))
  } else if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return normalizeActions(parsed)
    } catch {
      /* ignore */
    }
  }
  return JSON.stringify(rows.slice(0, 10))
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const automations = await db.automation.findMany({
      where: { platformId: platform.id },
      orderBy: { createdAt: 'asc' },
    })
    return jsonOk({ automations })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { name, trigger, matchValue, actions, active } = body
    if (!name?.trim()) return jsonError('Automation name is required')

    const automation = await db.automation.create({
      data: {
        platformId: platform.id,
        name: String(name).trim().slice(0, 120),
        trigger: TRIGGERS.includes(String(trigger)) ? String(trigger) : 'KEYWORD',
        matchValue: matchValue ? String(matchValue).trim().slice(0, 200) : null,
        actions: normalizeActions(actions),
        active: active === undefined ? true : !!active,
      },
    })
    return jsonOk({ automation })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { id, name, trigger, matchValue, actions, active } = body
    if (!id) return jsonError('Automation id is required')

    const existing = await db.automation.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Automation not found', 404)

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim().slice(0, 120)
    if (trigger !== undefined && TRIGGERS.includes(String(trigger))) data.trigger = String(trigger)
    if (matchValue !== undefined) data.matchValue = matchValue ? String(matchValue).trim().slice(0, 200) : null
    if (actions !== undefined) data.actions = normalizeActions(actions)
    if (active !== undefined) data.active = !!active

    const automation = await db.automation.update({ where: { id: existing.id }, data })
    return jsonOk({ automation })
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await requirePlatform(user.id)
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = body?.id ?? searchParams.get('id')
    if (!id) return jsonError('Automation id is required')

    const existing = await db.automation.findFirst({ where: { id, platformId: platform.id } })
    if (!existing) return jsonError('Automation not found', 404)

    await db.automation.delete({ where: { id: existing.id } })
    return jsonOk({ ok: true })
  })
}
