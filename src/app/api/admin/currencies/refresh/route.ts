import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/**
 * POST /api/admin/currencies/refresh — pull FX rates from the configured API.
 * Response format is flexible: {rates:{USD:1,...}} or a flat {USD:1,...} map.
 * 5s timeout; only known Currency rows are updated.
 */
export async function POST() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const apiUrl = (await db.setting.findUnique({ where: { key: 'conversion_api_url' } }))?.value?.trim()
    if (!apiUrl) return jsonError('No conversion API URL configured. Set it in Settings → Currency conversion.')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    let payload: Record<string, unknown>
    try {
      const res = await fetch(apiUrl, { signal: controller.signal, cache: 'no-store' })
      if (!res.ok) return jsonError(`API responded with status ${res.status}`, 502)
      payload = await res.json()
    } catch {
      return jsonError('Could not reach the conversion API (timeout or network error)', 504)
    } finally {
      clearTimeout(timeout)
    }

    // Flexible parsing: {rates:{...}} wrapper or flat map with currency codes
    let rates: Record<string, number> | null = null
    if (payload && typeof payload === 'object' && payload.rates && typeof payload.rates === 'object') {
      rates = payload.rates as Record<string, number>
    } else if (payload && typeof payload === 'object') {
      const flat = payload as Record<string, unknown>
      const looksFlat = Object.keys(flat).some((k) => k.length === 3 && k === k.toUpperCase()) && typeof flat.USD === 'number'
      if (looksFlat) rates = flat as Record<string, number>
    }
    if (!rates) return jsonError('Unrecognized API response format — expected {rates:{...}} or a flat {USD:1,...} map', 502)

    const currencies = await db.currency.findMany()
    let updated = 0
    for (const c of currencies) {
      const r = rates[c.code]
      if (typeof r === 'number' && r > 0 && isFinite(r)) {
        await db.currency.update({
          where: { code: c.code },
          data: { rate: Math.round(r * 1000000) / 1000000, auto: true },
        })
        updated++
      }
    }
    if (updated === 0) return jsonError('The API responded but no known currency codes were found in the payload', 502)

    const fresh = await db.currency.findMany({ orderBy: { code: 'asc' } })
    return jsonOk({ ok: true, updated, currencies: fresh, message: `${updated} rate(s) synced from API` })
  })
}
