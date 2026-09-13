// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/** Domain manager for the reseller's platform (switch/verify handled by /api/platform/mine). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({
      where: { ownerId: user.id },
      select: { slug: true, domainType: true, customDomain: true, domainStatus: true },
    })
    if (!platform) return jsonOk({ platform: null })
    return jsonOk({ platform })
  })
}

// ───────────────────────── DNS-over-HTTPS verification ─────────────────────────

type DohAnswer = { name: string; type: number; TTL: number; data: string }
type DohResponse = { Status: number; Answer?: DohAnswer[] }

const TYPE_A = 1
const TYPE_CNAME = 5

/** Real DNS lookup via Cloudflare DoH (JSON API, no key needed). */
async function dnsQuery(name: string, type: 'A' | 'CNAME'): Promise<DohAnswer[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`
  const res = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`DNS query failed (${res.status})`)
  const data = (await res.json()) as DohResponse
  return (data.Answer ?? []).filter((a) => (type === 'A' ? a.type === TYPE_A : a.type === TYPE_CNAME))
}

/**
 * POST /api/reseller/domains — REAL DNS verification of the reseller's custom domain.
 * Resolves A + CNAME records via DNS-over-HTTPS:
 *   · A record 76.76.21.21 or CNAME cname.vercel-dns.com → ACTIVE (Vercel connected)
 *   · any other valid record → PENDING (resolves, but not pointing at the deployment —
 *     the records found are returned so the owner can fix them)
 *   · no records → PENDING + helpful message
 */
export async function POST() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonOk({ ok: false })
    if (platform.domainType !== 'CUSTOM' || !platform.customDomain) {
      return jsonOk({ ok: false, error: 'No custom domain configured' })
    }

    const domain = platform.customDomain
    const [aRecords, cnameRecords] = await Promise.all([
      dnsQuery(domain, 'A').catch(() => [] as DohAnswer[]),
      dnsQuery(domain, 'CNAME').catch(() => [] as DohAnswer[]),
    ])
    const cnames = cnameRecords.map((r) => r.data.replace(/\.$/, '').toLowerCase())
    const addresses = aRecords.map((r) => r.data)

    const pointsToVercel =
      cnames.includes('cname.vercel-dns.com') || addresses.includes('76.76.21.21')

    let status: string
    let message: string
    if (pointsToVercel) {
      status = 'ACTIVE'
      message = 'Domain connected — SSL certificate is being issued automatically.'
    } else if (addresses.length || cnames.length) {
      status = 'PENDING'
      message = 'The domain resolves, but not to this platform. Point it to the deployment (A 76.76.21.21 or CNAME cname.vercel-dns.com) and verify again.'
    } else {
      status = 'PENDING'
      message = 'No DNS records found yet. Add the records below at your registrar — propagation can take up to 24h (usually 5–30 min).'
    }

    await db.platform.update({ where: { id: platform.id }, data: { domainStatus: status } })
    return jsonOk({ ok: true, status, message, records: { A: addresses, CNAME: cnames } })
  })
}
