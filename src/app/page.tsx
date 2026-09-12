import { headers } from 'next/headers'
import { db } from '@/lib/db'
import AppRoot from '@/components/app-root'

// Deployment hosts where subdomains can never exist (the whole host IS the app).
const HOSTING_SUFFIXES = [
  'vercel.app', 'netlify.app', 'pages.dev', 'onrender.com', 'railway.app',
  'deno.dev', 'fly.dev', 'vercel.sh', 'workers.dev', 'amplifyapp.com',
  'herokuapp.com', 'ngrok-free.app', 'ngrok.io', 'repl.co',
]

function isIpLike(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true
  return host.includes(':')
}

/**
 * Resolves the storefront for the current hostname (white-label routing):
 *   · slug.mydomain.com  → platform with slug "slug"      (subdomain mode)
 *   · mybrand.com        → platform with customDomain set (custom domain mode)
 *
 * Only real platforms activate the storefront view — any other host simply
 * renders the master landing, so previews/proxies never break.
 */
async function resolveStorefront(host: string): Promise<string | null> {
  const clean = host.split(':')[0].split(',')[0].trim().toLowerCase().replace(/^www\./, '')
  if (!clean || isIpLike(clean) || clean === 'localhost') return null
  if (HOSTING_SUFFIXES.some((s) => clean === s || clean.endsWith('.' + s))) return null

  const appDomain = (process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN || '')
    .toLowerCase().replace(/^www\./, '')

  const labels = clean.split('.')

  // 1) Custom domain mode (precise when APP_DOMAIN pins the master domain)
  if (appDomain && clean !== appDomain) {
    const byDomain = await db.platform.findFirst({
      where: { customDomain: clean, status: 'ACTIVE' },
      select: { slug: true },
    })
    if (byDomain) return byDomain.slug
  }

  // 2) Subdomain mode: slug.appDomain, or heuristic slug.anything.com (3+ labels)
  const sub = appDomain && clean.endsWith('.' + appDomain)
    ? clean.slice(0, clean.length - appDomain.length - 1).split('.').pop()
    : labels.length >= 3 && labels[0] !== 'www'
      ? labels[0]
      : null
  if (!sub) return null

  const bySlug = await db.platform.findFirst({
    where: { slug: sub, status: 'ACTIVE' },
    select: { slug: true },
  })
  return bySlug?.slug ?? null
}

export default async function Home() {
  let storefront: string | null = null
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? ''
    if (host) storefront = await resolveStorefront(host)
  } catch {
    storefront = null
  }
  return <AppRoot initialStorefront={storefront} />
}
