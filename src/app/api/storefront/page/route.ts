// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handle, jsonError, jsonOk } from '@/lib/auth'
import { defaultLandingConfig, sanitizeConfig } from '@/lib/landing-config'

/** Public: fetch a landing page body by platform slug + page slug
 *  (rendered by the storefront's in-place page view — no auth). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    const pageSlug = url.searchParams.get('page')
    if (!slug || !pageSlug) return jsonError('Missing slug or page', 400)

    const platform = await db.platform.findUnique({
      where: { slug },
      select: { id: true, status: true, settings: true, updatedAt: true },
    })
    if (!platform || platform.status !== 'ACTIVE') return jsonError('Page not found', 404)

    let config = defaultLandingConfig()
    try {
      const settings = JSON.parse(platform.settings || '{}') as { landing?: unknown }
      const parsed = sanitizeConfig(settings.landing)
      if (parsed) config = parsed
    } catch { /* serve the default pages */ }

    const page = config.pages.find((p) => p.slug === pageSlug)
    if (!page) return jsonError('Page not found', 404)

    return jsonOk({ page: { title: page.title, body: page.body, updatedAt: platform.updatedAt } })
  })
}
