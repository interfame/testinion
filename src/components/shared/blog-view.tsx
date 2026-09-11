'use client'

// Public blog — master (slug=null) or per-platform (slug=<platform slug>).
// Rendered by app-root for view 'blog' (opened via the `gr:blog` CustomEvent).
// Local selectedSlug state for the article view — no new routes.

import { useEffect, useState } from 'react'
import { useApi } from '@/lib/api'
import { themeVars } from '@/lib/themes'
import { formatDate } from '@/lib/format'
import { useApp } from '@/components/shared/app-context'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, Copy,
  Link2, Newspaper, Sparkles, Zap,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

type PostCard = { id: string; title: string; slug: string; excerpt: string | null; cover: string | null; publishedAt: string }
type PostFull = PostCard & { body: string }
type BlogResp = { platform: { slug: string; name: string; theme: string | null; logoUrl: string | null } | null; posts: PostCard[] }
type ArticleResp = { platform: BlogResp['platform']; post: PostFull }

// ── Cover: image or brand-tinted placeholder ─────────────────────────

function Cover({ post }: { post: { cover: string | null; title: string } }) {
  if (post.cover) {
    return <img src={post.cover} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
  }
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900" aria-hidden>
      <div className="absolute inset-0 opacity-25 dark:opacity-35" style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }} />
      <div
        className="absolute inset-0 opacity-[0.07] dark:opacity-[0.1]"
        style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />
      <Newspaper className="relative h-10 w-10" style={{ color: 'var(--brand)' }} />
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────

function ListView({ data, loading, lang, onOpen }: {
  data: BlogResp | null
  loading: boolean
  lang: Lang
  onOpen: (slug: string) => void
}) {
  const posts = data?.posts ?? []
  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <main>
      {/* Hero band — same pattern as the landing hero */}
      <section className="relative overflow-hidden text-white" style={{ background: 'var(--brand-dark)' }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
          aria-hidden
        />
        <div
          className="absolute -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(closest-side, var(--brand-glow), transparent)' }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand-2)' }} /> The GrowthRush journal
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-black tracking-tight text-4xl leading-[1.05] sm:text-5xl">
            Insights, guides &{' '}
            <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)] bg-clip-text text-transparent">growth playbooks</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            Everything we learn running social media marketing at scale — published for you.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-3xl" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
            </div>
          </div>
        ) : !posts.length ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed p-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--brand) 12%, transparent)' }}>
              <Newspaper className="h-6 w-6" style={{ color: 'var(--brand)' }} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold">No posts yet</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Come back soon — new articles are on the way.</p>
          </div>
        ) : (
          <>
            {/* Featured — latest post */}
            <article
              className="group cursor-pointer overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-zinc-900"
              onClick={() => onOpen(featured.slug)}
            >
              <div className="grid md:grid-cols-[1.1fr_1fr]">
                <div className="aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-[300px]">
                  <Cover post={featured} />
                </div>
                <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                  <span className="w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                    Latest
                  </span>
                  <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{featured.title}</h2>
                  {featured.excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{featured.excerpt}</p>}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 dark:text-zinc-500">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(featured.publishedAt, lang)}
                    </span>
                    <Button size="sm" className="rounded-full px-4 text-[12px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                      Read more <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </article>

            {/* Remaining posts */}
            {rest.length > 0 && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <article
                    key={p.id}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-900"
                    onClick={() => onOpen(p.slug)}
                  >
                    <div className="aspect-[16/9] overflow-hidden">
                      <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
                        <Cover post={p} />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                        <CalendarDays className="h-3 w-3" /> {formatDate(p.publishedAt, lang)}
                      </span>
                      <h3 className="text-[15px] font-extrabold leading-snug">{p.title}</h3>
                      {p.excerpt && <p className="line-clamp-2 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">{p.excerpt}</p>}
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[12px] font-bold" style={{ color: 'var(--brand)' }}>
                        Read more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

// ── Article view ──────────────────────────────────────────────────────

function ArticleView({ platform, slug, lang, onBack }: {
  platform: string
  slug: string
  lang: Lang
  onBack: () => void
}) {
  const scope = useApp()
  const { data, loading, error } = useApi<ArticleResp>(`/api/blog?platform=${encodeURIComponent(platform)}&post=${encodeURIComponent(slug)}`, [slug, platform])
  const [copied, setCopied] = useState(false)
  const post = data?.post

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 rounded-3xl" />
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Newspaper className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <h2 className="mt-4 text-xl font-extrabold">Post not found</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">It may have been unpublished.</p>
        <Button variant="outline" className="mt-6" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to all posts</Button>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2 font-bold" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> All posts
      </Button>

      <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">{post.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[12.5px] text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.publishedAt, lang)}</span>
        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="font-bold" style={{ color: 'var(--brand)' }}>{data?.platform?.name ?? 'GrowthRush'}</span>
      </div>

      {post.cover && (
        <div className="mt-7 aspect-[16/9] overflow-hidden rounded-3xl border">
          <img src={post.cover} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}

      <article className="prose prose-sm sm:prose-base dark:prose-invert mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: post.body }} />

      {/* Share hint */}
      <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'color-mix(in srgb, var(--brand) 35%, transparent)', background: 'color-mix(in srgb, var(--brand) 7%, transparent)' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-extrabold">Enjoyed the read?</p>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">Share it with a friend who needs it.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full font-bold" onClick={share}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>

      <p className="mt-8 text-center text-[11.5px] text-zinc-400 dark:text-zinc-500">
        {scope.lang === 'es' ? 'Publicado en' : scope.lang === 'pt' ? 'Publicado em' : 'Published on'} {data?.platform?.name ?? 'GrowthRush'}
      </p>
    </main>
  )
}

// ── Root ──────────────────────────────────────────────────────────────

export default function BlogView({ slug }: { slug: string | null }) {
  const scopeParam = slug ?? 'master'
  const { lang } = useApp()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const { data, loading } = useApi<BlogResp>(`/api/blog?platform=${encodeURIComponent(scopeParam)}`, [scopeParam])

  // Scroll to top on view/scope change
  useEffect(() => { window.scrollTo({ top: 0 }) }, [selectedSlug, scopeParam])

  const brandName = data?.platform?.name ?? 'GrowthRush'
  const openPost = (s: string) => setSelectedSlug(s)
  const backToList = () => setSelectedSlug(null)

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf7f4] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50" style={data?.platform?.theme ? themeVars(data.platform.theme) : undefined}>
      {/* Sticky mini header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Button variant="ghost" size="sm" className="-ml-2 font-bold" onClick={() => window.dispatchEvent(new Event('gr:exit'))}>
            <ChevronLeft className="mr-0.5 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {data?.platform?.logoUrl ? (
              <img src={data.platform.logoUrl} alt="" className="h-6 w-6 rounded-md object-cover" />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
                <Zap className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="text-[13px] font-black tracking-tight">{brandName} — Blog</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {selectedSlug ? (
        <ArticleView
          platform={scopeParam}
          slug={selectedSlug}
          lang={lang as Lang}
          onBack={backToList}
        />
      ) : (
        <ListView data={data} loading={loading} lang={lang as Lang} onOpen={openPost} />
      )}

      <footer className="mt-auto border-t border-zinc-200/70 py-6 text-center dark:border-zinc-800/80">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          © {new Date().getFullYear()} {brandName} · Powered by GrowthRush
        </p>
      </footer>
    </div>
  )
}
