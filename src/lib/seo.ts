// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// Growthrush — SEO & analytics settings loader (server-only).
//
// Reads the admin-configurable SEO keys from the Setting table and caches
// them per request (React cache) so generateMetadata() and the <head>/<body>
// scripts share a single query. Falls back silently when the DB is not
// reachable (build time, first boot) so the app never crashes on metadata.

import { cache } from 'react'
import { db } from '@/lib/db'

export const SEO_KEYS = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'ga_measurement_id',
  'gsc_verification',
  'bing_verification',
  'robots_noindex',
] as const

export type SeoSettings = Partial<Record<(typeof SEO_KEYS)[number], string>>

export const SEO_DEFAULTS = {
  title: 'GrowthRush — SMM Panel · Omnichannel CRM · Reseller SaaS',
  description:
    'Launch your own social media marketing business with automated SMM orders, a built-in omnichannel CRM, AI-powered automations and white-label reseller plans.',
  keywords: ['SMM Panel', 'Reseller', 'CRM', 'White-label', 'Social Media Marketing', 'GrowthRush'],
}

/** Per-request cached settings map (empty object when DB unavailable). */
export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: [...SEO_KEYS] } },
    })
    const map: SeoSettings = {}
    for (const r of rows) {
      if (r.value) (map as Record<string, string>)[r.key] = r.value
    }
    return map
  } catch {
    return {}
  }
})
