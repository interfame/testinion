// Growthrush SMM Suite — © Growthrush. All rights reserved.

// Edge middleware — subdomain storefront routing.
//
//   myplatform.yourdomain.com  →  /?storefront=myplatform
//
// How to enable on a real domain (all doable from the web, no terminal):
//   1. DNS: add an A/CNAME record  *  →  your Vercel deployment (76.76.21.21 / cname.vercel-dns.com)
//   2. Vercel: Project → Settings → Domains → add "*.yourdomain.com" (and "yourdomain.com")
//   3. Vercel env: optionally set ROOT_DOMAIN=yourdomain.com (or save it in
//      Admin → Settings → "Root domain for subdomain storefronts", which the
//      server components also consult via APP_DOMAIN).
// The *.vercel.app sandbox domain can never serve subdomains — that is a
// platform limitation, not a code one.

import { NextResponse, type NextRequest } from 'next/server'

/** Hosts that are always the master app — no subdomain logic applies. */
const PLATFORM_SUFFIXES = [
  'vercel.app', 'vercel.sh', 'netlify.app', 'pages.dev', 'onrender.com',
  'railway.app', 'deno.dev', 'fly.dev', 'workers.dev', 'amplifyapp.com',
  'herokuapp.com', 'ngrok-free.app', 'ngrok.io', 'repl.co',
]

/** Reserved subdomains that must keep hitting the master app. */
const RESERVED = new Set(['www', 'app', 'admin', 'api', 'cdn', 'mail', 'static', 'assets'])

export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '')
    .split(':')[0].split(',')[0].trim().toLowerCase()
  if (!host || host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    return NextResponse.next()
  }
  if (PLATFORM_SUFFIXES.some((s) => host === s || host.endsWith('.' + s))) {
    return NextResponse.next()
  }

  // Root domain from env (ROOT_DOMAIN or APP_DOMAIN); fallback heuristic: the
  // last two labels of the host (myplatform.example.com → example.com).
  const configured = (process.env.ROOT_DOMAIN || process.env.APP_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN || '')
    .toLowerCase().replace(/^www\./, '')
  const labels = host.split('.')
  const root = configured && host.endsWith('.' + configured)
    ? configured
    : labels.length >= 3
      ? labels.slice(-2).join('.')
      : null
  if (!root || host === root || host === `www.${root}`) return NextResponse.next()

  const sub = host.slice(0, host.length - root.length - 1)
  // Only single-label, non-reserved subdomains map to storefronts
  if (!sub || sub.includes('.') || RESERVED.has(sub)) return NextResponse.next()

  const url = req.nextUrl.clone()
  if (url.searchParams.has('storefront')) return NextResponse.next()
  url.searchParams.set('storefront', sub)
  return NextResponse.rewrite(url)
}

export const config = {
  // Skip Next internals, API routes and static assets
  matcher: ['/((?!api/|_next/|brand/|favicon|robots.txt|sitemap.xml).*)'],
}
