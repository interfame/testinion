import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { fetchProviderServices } from '@/lib/smm-provider'

/** GET /api/reseller/providers/categories?id=<providerId> — distinct provider-side categories with counts (platform-scoped) */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('Platform not found', 404)
    if (!platform.externalApi) return jsonError('External API add-on required', 403)

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return jsonError('Missing provider id')
    const provider = await db.provider.findFirst({ where: { id, platformId: platform.id } })
    if (!provider) return jsonError('Provider not found', 404)

    const res = await fetchProviderServices(provider.apiUrl, provider.apiKey ?? '')
    if (!res.ok) return jsonError(res.error)

    const counts = new Map<string, number>()
    for (const e of res.data) {
      const name = String(e?.category ?? '').trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    const categories = [...counts.entries()]
      .map(([name, count]) => ({ name: name.slice(0, 120), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    return jsonOk({ ok: true, categories })
  })
}
