// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { runProviderSync } from '@/lib/smm-provider'

/** POST /api/reseller/providers/sync — {id, markup?, categoryId?, providerCategory?} → import provider services into the platform catalog */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('Platform not found', 404)
    if (!platform.externalApi) return jsonError('External API add-on required', 403)

    const b = await req.json().catch(() => ({}))
    if (!b.id) return jsonError('Missing provider id')
    const provider = await db.provider.findFirst({ where: { id: String(b.id), platformId: platform.id } })
    if (!provider) return jsonError('Provider not found', 404)

    let markup = provider.markup
    if (b.markup !== undefined && b.markup !== null && b.markup !== '') {
      const m = parseFloat(String(b.markup))
      if (Number.isFinite(m) && m >= 0) markup = m
    }
    // only import entries whose provider-side category matches this (case-insensitive)
    const providerCategory =
      typeof b.providerCategory === 'string' && b.providerCategory.trim()
        ? b.providerCategory.trim().slice(0, 120)
        : null

    // Rate = provider price × (1 + markup/100) — the reseller's SELL price.
    const result = await runProviderSync({
      provider,
      platformId: platform.id,
      markup,
      categoryId: b.categoryId ? String(b.categoryId) : null,
      providerCategory,
    })
    if (!result.ok) return jsonError(result.error)
    return jsonOk({ ok: true, ...result.stats })
  })
}
