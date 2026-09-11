import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

/**
 * One route handling the 4 master content types via ?type= / body.type:
 *   news → News(title, body, pinned)
 *   faq  → Faq(question, answer, category, sortOrder)
 *   post → Post(title, slug, excerpt, body, cover, status)
 *   page → CmsPage(title, slug, body, status)
 */

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100).replace(/-+$/, '')
}

/** Slug unique among master posts (platformId null) — on conflict appends -2, -3… */
async function uniquePostSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || `post-${Date.now()}`
  let candidate = root
  let n = 2
  for (;;) {
    const clash = await db.post.findFirst({
      where: { slug: candidate, platformId: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    if (!clash) return candidate
    candidate = `${root}-${n++}`
  }
}

const TYPES = ['news', 'faq', 'post', 'page'] as const
type ContentType = (typeof TYPES)[number]

function assertType(type: unknown): ContentType | null {
  return typeof type === 'string' && (TYPES as readonly string[]).includes(type) ? (type as ContentType) : null
}

async function list(type: ContentType) {
  switch (type) {
    case 'news': return db.news.findMany({ where: { platformId: null }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] })
    case 'faq': return db.faq.findMany({ where: { platformId: null }, orderBy: [{ sortOrder: 'asc' }, { question: 'asc' }] })
    case 'post': return db.post.findMany({ where: { platformId: null }, orderBy: { publishedAt: 'desc' } })
    case 'page': return db.cmsPage.findMany({ where: { platformId: null }, orderBy: { createdAt: 'desc' } })
  }
}

function buildData(type: ContentType, b: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  if (type === 'news') {
    if (b.title !== undefined) data.title = String(b.title).trim().slice(0, 200)
    if (b.body !== undefined) data.body = String(b.body).slice(0, 5000)
    if (b.pinned !== undefined) data.pinned = !!b.pinned
  } else if (type === 'faq') {
    if (b.question !== undefined) data.question = String(b.question).trim().slice(0, 300)
    if (b.answer !== undefined) data.answer = String(b.answer).slice(0, 5000)
    if (b.category !== undefined) data.category = String(b.category || 'General').slice(0, 60)
    if (b.sortOrder !== undefined) data.sortOrder = parseInt(String(b.sortOrder)) || 0
  } else if (type === 'post') {
    if (b.title !== undefined) data.title = String(b.title).trim().slice(0, 200)
    if (b.excerpt !== undefined) data.excerpt = b.excerpt ? String(b.excerpt).slice(0, 300) : null
    if (b.body !== undefined) data.body = String(b.body).slice(0, 20000)
    if (b.cover !== undefined) data.cover = b.cover ? String(b.cover).slice(0, 500) : null
    if (b.status !== undefined) data.status = b.status || 'PUBLISHED'
    // slug handled in POST/PATCH (user-editable, unique per platform scope)
  } else {
    if (b.title !== undefined) {
      data.title = String(b.title).trim().slice(0, 200)
      data.slug = slugify(String(b.title))
    }
    if (b.body !== undefined) data.body = String(b.body).slice(0, 20000)
    if (b.status !== undefined) data.status = b.status || 'PUBLISHED'
  }
  return data
}

/** GET /api/admin/content?type=news|faq|post|page */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const type = assertType(new URL(req.url).searchParams.get('type'))
    if (!type) return jsonError('type must be one of: news, faq, post, page')
    const items = await list(type)
    return jsonOk({ type, items })
  })
}

/** POST /api/admin/content — body includes type */
export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const b = await req.json()
    const type = assertType(b.type)
    if (!type) return jsonError('type must be one of: news, faq, post, page')
    const data = buildData(type, b)
    if (type === 'news' && !data.title) return jsonError('Title is required')
    if (type === 'faq' && !data.question) return jsonError('Question is required')
    if ((type === 'post' || type === 'page') && !data.title) return jsonError('Title is required')

    let item: unknown
    if (type === 'news') item = await db.news.create({ data: { platformId: null, title: String(data.title ?? 'Untitled'), body: String(data.body ?? ''), pinned: !!data.pinned } })
    else if (type === 'faq') item = await db.faq.create({ data: { platformId: null, question: String(data.question ?? ''), answer: String(data.answer ?? ''), category: String(data.category ?? 'General'), sortOrder: Number(data.sortOrder ?? 0) } })
    else if (type === 'post') item = await db.post.create({ data: { platformId: null, title: String(data.title), slug: await uniquePostSlug(String(b.slug || b.title || '')), excerpt: (data.excerpt as string) ?? null, body: String(data.body ?? ''), cover: (data.cover as string) ?? null, status: String(data.status ?? 'PUBLISHED') } })
    else item = await db.cmsPage.create({ data: { platformId: null, title: String(data.title), slug: String(data.slug), body: String(data.body ?? ''), status: String(data.status ?? 'PUBLISHED') } })

    return jsonOk({ ok: true, type, item, message: 'Content created' })
  })
}

/** PATCH /api/admin/content — {id, type, ...fields} */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, type, ...b } = await req.json()
    const t = assertType(type)
    if (!id || !t) return jsonError('Missing id or invalid type')
    const data = buildData(t, b)
    // Posts: persist an explicitly-sent slug ('' → regenerate from title), unique among master posts
    if (t === 'post' && typeof b.slug === 'string') {
      data.slug = await uniquePostSlug(b.slug.trim() || String(b.title ?? ''), id)
    }

    let item: unknown
    if (t === 'news') item = await db.news.update({ where: { id }, data })
    else if (t === 'faq') item = await db.faq.update({ where: { id }, data })
    else if (t === 'post') item = await db.post.update({ where: { id }, data })
    else item = await db.cmsPage.update({ where: { id }, data })

    return jsonOk({ ok: true, type: t, item, message: 'Content updated' })
  })
}

/** DELETE /api/admin/content — {id, type} */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { id, type } = await req.json()
    const t = assertType(type)
    if (!id || !t) return jsonError('Missing id or invalid type')
    if (t === 'news') await db.news.delete({ where: { id } })
    else if (t === 'faq') await db.faq.delete({ where: { id } })
    else if (t === 'post') await db.post.delete({ where: { id } })
    else await db.cmsPage.delete({ where: { id } })
    return jsonOk({ ok: true, message: 'Content deleted' })
  })
}
