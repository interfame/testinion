import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { runProviderSync } from '@/lib/smm-provider'

/** POST /api/admin/providers/sync — {id, markup?, categoryId?} → import/update provider services */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json().catch(() => ({}))
    if (!b.id) return jsonError('Missing provider id')
    const provider = await db.provider.findUnique({ where: { id: String(b.id) } })
    if (!provider || provider.platformId !== null) return jsonError('Provider not found', 404)

    let markup = provider.markup
    if (b.markup !== undefined && b.markup !== null && b.markup !== '') {
      const m = parseFloat(String(b.markup))
      if (Number.isFinite(m) && m >= 0) markup = m
    }
    const categoryId = b.categoryId ? String(b.categoryId) : null

    // provider.status !== 'ACTIVE' is allowed — syncing is an explicit admin action
    const result = await runProviderSync({ provider, platformId: null, markup, categoryId })
    if (!result.ok) return jsonError(result.error)
    return jsonOk({ ok: true, ...result.stats })
  })
}
