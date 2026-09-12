import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { fetchProviderBalance } from '@/lib/smm-provider'

/** POST /api/reseller/providers/test — {id} or {apiUrl, apiKey} → balance check (platform-scoped) */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('Platform not found', 404)
    if (!platform.externalApi) return jsonError('External API add-on required', 403)

    const b = await req.json().catch(() => ({}))
    let apiUrl = typeof b.apiUrl === 'string' ? b.apiUrl.trim() : ''
    let apiKey = typeof b.apiKey === 'string' ? b.apiKey.trim() : ''

    if (b.id) {
      const provider = await db.provider.findFirst({ where: { id: String(b.id), platformId: platform.id } })
      if (!provider) return jsonError('Provider not found', 404)
      apiUrl = provider.apiUrl
      apiKey = provider.apiKey ?? ''
    }

    if (!apiUrl) return jsonError('API URL is required')
    const res = await fetchProviderBalance(apiUrl, apiKey)
    if (!res.ok) return jsonError(res.error)
    return jsonOk({ ok: true, balance: res.data.balance, currency: res.data.currency })
  })
}
