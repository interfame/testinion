// Growthrush SMM Suite — © Growthrush. All rights reserved.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

const ALLOWED_KEYS = [
  'brand_name', 'brand_tagline', 'landing_theme', 'landing_copy', 'subdomain_base',
  'conversion_mode', 'conversion_api_url', 'external_api_price', 'custom_domain_price',
  'engine_enabled', 'engine_speed', 'engine_partial_rate',
  'crm_chatter',
  'ref_enabled', 'ref_bonus_amount', 'ref_welcome_credit',
  // SEO & analytics (Admin → Settings → SEO & Analytics)
  'seo_title', 'seo_description', 'seo_keywords',
  'ga_measurement_id', 'gsc_verification', 'bing_verification', 'robots_noindex',
  // Root domain used for subdomain storefronts (slug.<root_domain>)
  'root_domain',
] as const

/** GET /api/admin/settings — all settings as a map + platform count */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const [rows, platformCount] = await Promise.all([
      db.setting.findMany(),
      db.platform.count(),
    ])
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return jsonOk({ settings, platformCount })
  })
}

/** PATCH /api/admin/settings — {key: value, ...} (whitelisted keys only) */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const body = await req.json()
    const entries = Object.entries(body).filter(([k]) => (ALLOWED_KEYS as readonly string[]).includes(k))
    if (!entries.length) return jsonError('No valid settings keys provided')

    for (const [key, value] of entries) {
      await db.setting.upsert({
        where: { key },
        update: { value: String(value ?? '') },
        create: { key, value: String(value ?? '') },
      })
    }
    const rows = await db.setting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return jsonOk({ ok: true, settings, message: 'Settings saved' })
  })
}
