// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const CRM_DEFAULTS = {
  autoAssignAi: true,
  businessHours: '09:00 - 21:00 (Mon-Sat)',
  awayMessage: '🌙 We are away right now — an agent will reply first thing during business hours!',
}

type CrmSettings = typeof CRM_DEFAULTS

function readCrmSettings(settingsJson: string): CrmSettings {
  try {
    const parsed = JSON.parse(settingsJson || '{}') as { crm?: Partial<CrmSettings> }
    return { ...CRM_DEFAULTS, ...(parsed?.crm ?? {}) }
  } catch {
    return { ...CRM_DEFAULTS }
  }
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform found for this account', 404)
    return jsonOk({ crm: readCrmSettings(platform.settings) })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform found for this account', 404)

    const body = await req.json().catch(() => ({}))
    const current = readCrmSettings(platform.settings)
    const merged: CrmSettings = {
      autoAssignAi: body.autoAssignAi === undefined ? current.autoAssignAi : !!body.autoAssignAi,
      businessHours:
        body.businessHours === undefined
          ? current.businessHours
          : String(body.businessHours).trim().slice(0, 120),
      awayMessage:
        body.awayMessage === undefined
          ? current.awayMessage
          : String(body.awayMessage).trim().slice(0, 500),
    }

    let settings: Record<string, unknown> = {}
    try {
      settings = JSON.parse(platform.settings || '{}') as Record<string, unknown>
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) settings = {}
    } catch {
      settings = {}
    }
    settings.crm = merged

    await db.platform.update({ where: { id: platform.id }, data: { settings: JSON.stringify(settings) } })
    return jsonOk({ crm: merged })
  })
}
