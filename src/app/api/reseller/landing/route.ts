import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { defaultLandingConfig, sanitizeConfig, type LandingConfig } from '@/lib/landing-config'

/** Landing Studio API — GET returns the stored config + newsletter lead stats,
 *  PUT saves a sanitized config (or resets to the default with {reset:true}). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) throw jsonError('No platform', 404)

    let config: LandingConfig = defaultLandingConfig()
    try {
      const settings = JSON.parse(platform.settings || '{}') as { landing?: unknown }
      const parsed = sanitizeConfig(settings.landing)
      if (parsed) config = parsed
    } catch { /* settings is not valid JSON — serve the default */ }

    const [leads, latest] = await Promise.all([
      db.landingLead.count({ where: { platformId: platform.id } }),
      db.landingLead.findMany({
        where: { platformId: platform.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { email: true, createdAt: true },
      }),
    ])
    return jsonOk({ config, leads, recentLeads: latest, latest })
  })
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) throw jsonError('No platform', 404)

    const body = await req.json().catch(() => ({})) as { reset?: boolean; config?: unknown }
    let config: LandingConfig
    if (body.reset === true) {
      config = defaultLandingConfig()
    } else {
      const parsed = sanitizeConfig(body.config)
      if (!parsed) throw jsonError('Invalid landing configuration', 400)
      config = parsed
    }

    // Merge into the platform settings JSON, preserving other keys (crm, integrations, landingCopy…).
    let settings: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(platform.settings || '{}')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) settings = parsed as Record<string, unknown>
    } catch { /* overwrite invalid JSON blob */ }
    settings.landing = config
    await db.platform.update({ where: { id: platform.id }, data: { settings: JSON.stringify(settings) } })

    return jsonOk({ ok: true, config })
  })
}
