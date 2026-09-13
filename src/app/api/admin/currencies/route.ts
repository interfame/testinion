// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/** GET /api/admin/currencies — currencies + conversion settings */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const [currencies, settings] = await Promise.all([
      db.currency.findMany({ orderBy: { code: 'asc' } }),
      db.setting.findMany({
        where: { key: { in: ['conversion_mode', 'conversion_api_url'] } },
      }),
    ])
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value
    return jsonOk({
      currencies,
      settings: { conversion_mode: map.conversion_mode ?? 'manual', conversion_api_url: map.conversion_api_url ?? '' },
    })
  })
}

/** PATCH /api/admin/currencies — {code, rate?, auto?} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { code, rate, auto } = await req.json()
    if (!code) return jsonError('Missing currency code')
    const data: Record<string, unknown> = {}
    if (rate !== undefined) {
      const r = parseFloat(rate)
      if (isNaN(r) || r <= 0) return jsonError('Enter a valid positive rate')
      data.rate = Math.round(r * 1000000) / 1000000
    }
    if (auto !== undefined) data.auto = !!auto
    if (!Object.keys(data).length) return jsonError('Nothing to update')
    const currency = await db.currency.update({ where: { code }, data })
    return jsonOk({ ok: true, currency, message: `${currency.code} updated` })
  })
}
