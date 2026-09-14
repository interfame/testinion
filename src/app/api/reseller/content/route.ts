// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { MASTER_LANDING } from '@/lib/master-landing'
import { resilientPlatformForOwner } from '@/lib/platform-safe'

async function myPlatform(userId: string) {
  const p = await resilientPlatformForOwner(userId)
  if (!p) throw jsonError('No platform', 404)
  return p
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100).replace(/-+$/, '')
}

/** Slug unique within the platform's posts — on conflict appends -2, -3… */
async function uniquePostSlug(base: string, platformId: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || `post-${Date.now()}`
  let candidate = root
  let n = 2
  for (;;) {
    const clash = await db.post.findFirst({
      where: { slug: candidate, platformId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    if (!clash) return candidate
    candidate = `${root}-${n++}`
  }
}

/** Content CRUD for the reseller platform: news | faq | post | page */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const type = new URL(req.url).searchParams.get('type') ?? 'news'
    const where = { platformId: platform.id }
    if (type === 'news') {
      const news = await db.news.findMany({ where, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] })
      return jsonOk({ items: news })
    }
    if (type === 'faq') {
      const faqs = await db.faq.findMany({ where, orderBy: { sortOrder: 'asc' } })
      return jsonOk({ items: faqs })
    }
    if (type === 'post') {
      const posts = await db.post.findMany({ where, orderBy: { publishedAt: 'desc' } })
      return jsonOk({ items: posts })
    }
    if (type === 'page') {
      const pages = await db.cmsPage.findMany({ where, orderBy: { createdAt: 'asc' } })
      return jsonOk({ items: pages })
    }
    return jsonError('Unknown type')
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    const type = body.type
    if (type === 'news') {
      if (!body.title?.trim() || !body.body?.trim()) return jsonError('Title and body are required')
      const item = await db.news.create({ data: { platformId: platform.id, title: String(body.title).slice(0, 140), body: String(body.body), pinned: !!body.pinned } })
      return jsonOk({ item })
    }
    if (type === 'faq') {
      if (!body.question?.trim() || !body.answer?.trim()) return jsonError('Question and answer are required')
      const count = await db.faq.count({ where: { platformId: platform.id } })
      const item = await db.faq.create({ data: { platformId: platform.id, question: String(body.question).slice(0, 200), answer: String(body.answer), category: body.category || 'General', sortOrder: count } })
      return jsonOk({ item })
    }
    if (type === 'post') {
      if (!body.title?.trim()) return jsonError('Title is required')
      const slug = await uniquePostSlug(String(body.slug || body.title), platform.id)
      const item = await db.post.create({ data: { platformId: platform.id, title: String(body.title).slice(0, 140), slug, excerpt: body.excerpt || null, body: body.body || '', cover: body.cover || null, status: body.status || 'PUBLISHED' } })
      return jsonOk({ item })
    }
    if (type === 'page') {
      if (!body.title?.trim()) return jsonError('Title is required')
      const slug = String(body.slug || body.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `page-${Date.now()}`
      const item = await db.cmsPage.create({ data: { platformId: platform.id, title: String(body.title).slice(0, 140), slug, body: body.body || '', status: body.status || 'PUBLISHED' } })
      return jsonOk({ item })
    }
    return jsonError('Unknown type')
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json()
    // Special action: re-clone the master landing copy (hero + tagline + FAQs)
    if (body.cloneMaster) {
      const masterFaqs = await db.faq.findMany({ where: { platformId: null }, orderBy: { sortOrder: 'asc' } })
      await db.$transaction([
        db.platform.update({
          where: { id: platform.id },
          data: {
            tagline: MASTER_LANDING.tagline,
            heroTitle: MASTER_LANDING.heroTitle,
            heroSubtitle: MASTER_LANDING.heroSubtitle,
            heroCta: MASTER_LANDING.heroCta,
            heroImage: MASTER_LANDING.heroImage,
          },
        }),
        db.faq.deleteMany({ where: { platformId: platform.id } }),
        ...masterFaqs.map((f) => db.faq.create({
          data: { platformId: platform.id, question: f.question, answer: f.answer, category: f.category, sortOrder: f.sortOrder },
        })),
      ])
      return jsonOk({ ok: true, cloned: true, message: 'Master landing cloned into your storefront' })
    }
    const { id, type, ...fields } = body
    if (!id || !type) return jsonError('Missing id or type')
    const clean = (s: unknown, max = 200) => (s === undefined ? undefined : String(s).slice(0, max))
    if (type === 'news') {
      const item = await db.news.findFirst({ where: { id, platformId: platform.id } })
      if (!item) return jsonError('Not found', 404)
      const updated = await db.news.update({
        where: { id },
        data: {
          title: clean(fields.title, 140),
          body: fields.body === undefined ? undefined : String(fields.body),
          pinned: fields.pinned === undefined ? undefined : !!fields.pinned,
        },
      })
      return jsonOk({ item: updated })
    }
    if (type === 'faq') {
      const item = await db.faq.findFirst({ where: { id, platformId: platform.id } })
      if (!item) return jsonError('Not found', 404)
      const updated = await db.faq.update({
        where: { id },
        data: {
          question: clean(fields.question),
          answer: fields.answer === undefined ? undefined : String(fields.answer),
          category: clean(fields.category, 60),
          sortOrder: fields.sortOrder === undefined ? undefined : parseInt(fields.sortOrder) || 0,
        },
      })
      return jsonOk({ item: updated })
    }
    if (type === 'post') {
      const item = await db.post.findFirst({ where: { id, platformId: platform.id } })
      if (!item) return jsonError('Not found', 404)
      // Slug: persisted when explicitly sent ('' → regenerate from title); unique per platform
      let slug: string | undefined
      if (typeof fields.slug === 'string') {
        slug = await uniquePostSlug(fields.slug.trim() || String(fields.title ?? item.title), platform.id, id)
      }
      const updated = await db.post.update({
        where: { id },
        data: {
          title: clean(fields.title, 140),
          slug,
          excerpt: fields.excerpt === undefined ? undefined : String(fields.excerpt).slice(0, 300),
          body: fields.body === undefined ? undefined : String(fields.body),
          status: clean(fields.status, 20),
          cover: fields.cover === undefined ? undefined : String(fields.cover).slice(0, 300),
        },
      })
      return jsonOk({ item: updated })
    }
    if (type === 'page') {
      const item = await db.cmsPage.findFirst({ where: { id, platformId: platform.id } })
      if (!item) return jsonError('Not found', 404)
      const updated = await db.cmsPage.update({
        where: { id },
        data: {
          title: clean(fields.title, 140),
          body: fields.body === undefined ? undefined : String(fields.body),
          status: clean(fields.status, 20),
        },
      })
      return jsonOk({ item: updated })
    }
    return jsonError('Unknown type')
  })
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await myPlatform(user.id)
    const body = await req.json().catch(() => ({})) as { id?: string; type?: string }
    const url = new URL(req.url)
    const id = body.id || url.searchParams.get('id')
    const type = body.type || url.searchParams.get('type')
    if (!id || !type) return jsonError('Missing id or type')
    if (type === 'news') await db.news.deleteMany({ where: { id, platformId: platform.id } })
    else if (type === 'faq') await db.faq.deleteMany({ where: { id, platformId: platform.id } })
    else if (type === 'post') await db.post.deleteMany({ where: { id, platformId: platform.id } })
    else if (type === 'page') await db.cmsPage.deleteMany({ where: { id, platformId: platform.id } })
    else return jsonError('Unknown type')
    return jsonOk({ ok: true })
  })
}
