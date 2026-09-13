// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'
import { fetchProviderBalance } from '@/lib/smm-provider'

/** POST /api/admin/providers/test — {apiUrl, apiKey} or {id} → balance check */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json().catch(() => ({}))
    let apiUrl = typeof b.apiUrl === 'string' ? b.apiUrl.trim() : ''
    let apiKey = typeof b.apiKey === 'string' ? b.apiKey.trim() : ''

    if (b.id) {
      const provider = await db.provider.findUnique({ where: { id: String(b.id) } })
      if (!provider || provider.platformId !== null) return jsonError('Provider not found', 404)
      apiUrl = provider.apiUrl
      apiKey = provider.apiKey ?? ''
    }

    if (!apiUrl) return jsonError('API URL is required')
    const res = await fetchProviderBalance(apiUrl, apiKey)
    if (!res.ok) return jsonError(res.error)
    return jsonOk({ ok: true, balance: res.data.balance, currency: res.data.currency })
  })
}
