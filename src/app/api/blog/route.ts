import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handle, jsonOk, jsonError } from '@/lib/auth'

/**
 * Public blog API — no auth.
 * GET /api/blog?platform=<slug|master>            → { platform: {slug,name}, posts: [...] } (PUBLISHED only, latest 50)
 * GET /api/blog?platform=<slug|master>&post=<slug> → { platform: {slug,name}, post: {...full with body} }
 * 'master' or empty platform → platformId null (GrowthRush master blog).
 */

export async function GET(req: NextRequest) {
  return handle(async () => {
    const url = new URL(req.url)
    const platformParam = (url.searchParams.get('platform') ?? 'master').trim() || 'master'
    const postSlug = url.searchParams.get('post')?.trim() || null

    let platformId: string | null = null
    let platformName = 'GrowthRush'
    let platformTheme: string | null = null
    let platformLogo: string | null = null
    if (platformParam !== 'master') {
      const platform = await db.platform.findUnique({
        where: { slug: platformParam },
        select: { id: true, name: true, slug: true, theme: true, logoUrl: true },
      })
      // Unknown platform → empty result (public route, no error leaking)
      if (!platform) return jsonOk({ platform: null, posts: [], post: null })
      platformId = platform.id
      platformName = platform.name
      platformTheme = platform.theme
      platformLogo = platform.logoUrl
    }

    const platformInfo = { slug: platformParam, name: platformName, theme: platformTheme, logoUrl: platformLogo }

    // Single post (with body)
    if (postSlug) {
      const post = await db.post.findFirst({
        where: { slug: postSlug, status: 'PUBLISHED', platformId },
        orderBy: { publishedAt: 'desc' },
      })
      if (!post) return jsonError('Post not found', 404)
      return jsonOk({ platform: platformInfo, post })
    }

    // Post list (no body — keeps payload small)
    const posts = await db.post.findMany({
      where: { platformId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, slug: true, excerpt: true, cover: true, publishedAt: true },
    })
    return jsonOk({ platform: platformInfo, posts })
  })
}
