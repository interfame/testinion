'use client'

// Super Admin — Master content CRUD: news, FAQs, blog posts and CMS pages.

import { useState } from 'react'
import { Plus, Pencil, Trash2, Pin, Search, Eye, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelPageHeader, StatusBadge } from '@/components/shared/panel-shell'
import { api, mutate, useApi } from '@/lib/api'
import { apiDel } from './admin-ui'
import { formatDate } from '@/lib/format'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import RichEditor from '@/components/shared/rich-editor'
import { AdminCard, EmptyState, FieldLabel, TableShell } from './admin-ui'

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100).replace(/-+$/, '')

const viewMasterBlog = () => window.dispatchEvent(new CustomEvent('gr:blog', { detail: null }))

// ── shared bits ───────────────────────────────────────────────────────

function useContentList<T>(type: string) {
  return useApi<{ items: T[] }>(`/api/admin/content?type=${type}`, [type])
}

function useRemove(type: string, refresh: () => void) {
  const { t } = useI18n()
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null)
  const doDelete = async () => {
    if (!deleting) return
    const ok = await mutate(() => apiDel('/api/admin/content', { id: deleting.id, type }), { success: t('admin.content.toastDeleted') })
    if (ok) { setDeleting(null); refresh() }
  }
  const confirmEl = (
    <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.deleteQ').replace('{name}', deleting?.label ?? '')}</AlertDialogTitle>
          <AlertDialogDescription>{t('admin.content.deleteDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>{t('admin.deleteCta')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return { setDeleting, confirmEl }
}

// ── NEWS ──────────────────────────────────────────────────────────────

type NewsItem = { id: string; title: string; body: string; pinned: boolean; createdAt: string }

export function NewsSection() {
  const { lang } = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useContentList<NewsItem>('news')
  const { setDeleting, confirmEl } = useRemove('news', refresh)
  const [editing, setEditing] = useState<NewsItem | 'new' | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)

  const open = (n: NewsItem | 'new') => {
    if (n === 'new') { setTitle(''); setBody(''); setPinned(false) }
    else { setTitle(n.title); setBody(n.body); setPinned(n.pinned) }
    setEditing(n)
  }

  const save = async () => {
    if (!title.trim()) return
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/content', { type: 'news', title, body, pinned }) : api.patch('/api/admin/content', { type: 'news', id: (editing as NewsItem).id, title, body, pinned }),
      { success: t('admin.content.toastNewsSaved') },
    )
    if (ok) { setEditing(null); refresh() }
  }

  const togglePin = async (n: NewsItem) => {
    const ok = await mutate(() => api.patch('/api/admin/content', { type: 'news', id: n.id, pinned: !n.pinned }), { success: n.pinned ? t('admin.content.toastUnpinned') : t('admin.content.toastPinned') })
    if (ok) refresh()
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader title={t('admin.news')} description={t('admin.content.newsDesc')} actions={
        <Button onClick={() => open('new')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}><Plus className="mr-1 h-4 w-4" /> {t('admin.content.newNews')}</Button>
      } />
      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.content.noNews')} hint={t('admin.content.noNewsHint')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.content.title')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.content.preview')}</th>
                <th className="px-3 py-3 font-bold">{t('client.pinned')}</th>
                <th className="px-3 py-3 font-bold">{t('common.date')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.items.map((n) => (
                <tr key={n.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="max-w-[240px] px-4 py-3">
                    <p className="flex items-center gap-1.5 truncate font-semibold text-zinc-800 dark:text-zinc-100">{n.pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />} {n.title}</p>
                  </td>
                  <td className="max-w-[320px] px-3 py-3"><p className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">{n.body}</p></td>
                  <td className="px-3 py-3"><Switch checked={n.pinned} onCheckedChange={() => togglePin(n)} aria-label={t('admin.content.togglePinned')} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">{formatDate(n.createdAt, lang)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => open(n)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting({ id: n.id, label: n.title })} aria-label={t('admin.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing === 'new' ? t('admin.content.newNews') : t('admin.content.editNews')}</DialogTitle><DialogDescription>{t('admin.content.newsFormDesc')}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><FieldLabel>{t('admin.content.title')}</FieldLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('admin.content.newsTitlePlaceholder')} /></div>
            <div><FieldLabel>{t('admin.content.body')}</FieldLabel><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch id="news-pin" checked={pinned} onCheckedChange={setPinned} /><Label htmlFor="news-pin" className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('admin.content.pinnedTop')}</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={!title.trim()} style={{ background: 'var(--brand)' }}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmEl}
    </div>
  )
}

// ── FAQS ──────────────────────────────────────────────────────────────

type FaqItem = { id: string; question: string; answer: string; category: string; sortOrder: number }

export function FaqsSection() {
  const { t } = useI18n()
  const { data, loading, refresh } = useContentList<FaqItem>('faq')
  const { setDeleting, confirmEl } = useRemove('faq', refresh)
  const [editing, setEditing] = useState<FaqItem | 'new' | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('General')
  const [sortOrder, setSortOrder] = useState('0')

  const open = (f: FaqItem | 'new') => {
    if (f === 'new') { setQuestion(''); setAnswer(''); setCategory('General'); setSortOrder('0') }
    else { setQuestion(f.question); setAnswer(f.answer); setCategory(f.category); setSortOrder(String(f.sortOrder)) }
    setEditing(f)
  }

  const save = async () => {
    if (!question.trim()) return
    const payload = { question, answer, category, sortOrder: parseInt(sortOrder) || 0 }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/content', { type: 'faq', ...payload }) : api.patch('/api/admin/content', { type: 'faq', id: (editing as FaqItem).id, ...payload }),
      { success: t('admin.content.toastFaqSaved') },
    )
    if (ok) { setEditing(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader title={t('admin.faqs')} description={t('admin.content.faqsDesc')} actions={
        <Button onClick={() => open('new')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}><Plus className="mr-1 h-4 w-4" /> {t('admin.content.newFaq')}</Button>
      } />
      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.content.noFaqs')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.content.question')}</th>
                <th className="px-3 py-3 font-bold">{t('common.category')}</th>
                <th className="px-3 py-3 text-right font-bold">{t('admin.plans.sort')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.items.map((f) => (
                <tr key={f.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="max-w-[420px] px-4 py-3">
                    <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{f.question}</p>
                    <p className="truncate text-[11.5px] text-zinc-400 dark:text-zinc-500">{f.answer}</p>
                  </td>
                  <td className="px-3 py-3"><Badge variant="outline" className="rounded-full text-[10px] font-bold">{f.category}</Badge></td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400">{f.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => open(f)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting({ id: f.id, label: f.question })} aria-label={t('admin.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing === 'new' ? t('admin.content.newFaq') : t('admin.content.editFaq')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><FieldLabel>{t('admin.content.question')}</FieldLabel><Input value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
            <div><FieldLabel>{t('admin.content.answer')}</FieldLabel><Textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><FieldLabel>{t('common.category')}</FieldLabel><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              <div><FieldLabel>{t('admin.cat.sort')}</FieldLabel><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={!question.trim()} style={{ background: 'var(--brand)' }}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmEl}
    </div>
  )
}

// ── POSTS ─────────────────────────────────────────────────────────────

type PostItem = { id: string; title: string; slug: string; excerpt: string | null; body: string; cover: string | null; status: string; publishedAt: string }

export function PostsSection() {
  const { lang } = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useContentList<PostItem>('post')
  const { setDeleting, confirmEl } = useRemove('post', refresh)
  const [editing, setEditing] = useState<PostItem | 'new' | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', body: '', cover: '', status: 'PUBLISHED' })

  const open = (p: PostItem | 'new') => {
    if (p === 'new') { setSlugTouched(false); setForm({ title: '', slug: '', excerpt: '', body: '', cover: '', status: 'PUBLISHED' }) }
    else { setSlugTouched(true); setForm({ title: p.title, slug: p.slug, excerpt: p.excerpt ?? '', body: p.body, cover: p.cover ?? '', status: p.status }) }
    setEditing(p)
  }

  const save = async () => {
    if (!form.title.trim()) return
    const payload = { title: form.title.trim(), slug: form.slug, excerpt: form.excerpt.trim() || null, body: form.body, cover: form.cover.trim() || null, status: form.status }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/content', { type: 'post', ...payload }) : api.patch('/api/admin/content', { type: 'post', id: (editing as PostItem).id, ...payload }),
      { success: t('admin.content.toastPostSaved') },
    )
    if (ok) { setEditing(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader title={t('admin.content.postsTitle')} description={t('admin.content.postsDesc')} actions={
        <Button onClick={() => open('new')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}><Plus className="mr-1 h-4 w-4" /> {t('admin.content.newPost')}</Button>
      } />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5" style={{ borderColor: 'color-mix(in srgb, var(--brand) 35%, transparent)', background: 'color-mix(in srgb, var(--brand) 7%, transparent)' }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <Eye className="h-4 w-4 text-black" />
          </span>
          <p className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('admin.content.postsBanner')}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 rounded-full font-bold" onClick={viewMasterBlog}>
          <Eye className="h-3.5 w-3.5" /> {t('admin.content.viewBlog')}
        </Button>
      </div>
      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.content.noPosts')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.content.title')}</th>
                <th className="px-3 py-3 font-bold">Slug</th>
                <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.content.published')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.items.map((p) => (
                <tr key={p.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="max-w-[280px] px-4 py-3">
                    <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{p.title}</p>
                    {p.excerpt && <p className="truncate text-[11.5px] text-zinc-400 dark:text-zinc-500">{p.excerpt}</p>}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11.5px] text-zinc-400 dark:text-zinc-500">/{p.slug}</td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">{formatDate(p.publishedAt, lang)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" title={t('admin.content.viewOnBlog')} aria-label={t('admin.content.viewOnBlog')} onClick={viewMasterBlog}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => open(p)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting({ id: p.id, label: p.title })} aria-label={t('admin.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing === 'new' ? t('admin.content.newPost') : t('admin.content.editPost')}</DialogTitle><DialogDescription>{t('admin.content.postFormDesc')}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><FieldLabel>{t('admin.content.title')}</FieldLabel><Input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                // Auto-suggest the slug from the title while creating (until the user edits it)
                setForm((f) => ({ ...f, title, slug: editing === 'new' && !slugTouched ? slugify(title) : f.slug }))
              }}
            /></div>
            <div>
              <FieldLabel hint={t('admin.content.editableHint')}>Slug</FieldLabel>
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-[12px] text-zinc-400">/blog/</span>
                <Input
                  className="font-mono text-[12.5px]"
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }) }}
                  placeholder="my-awesome-post"
                />
              </div>
            </div>
            <div><FieldLabel hint={t('admin.u.noteHint')}>{t('admin.content.excerpt')}</FieldLabel><Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <div><FieldLabel>{t('admin.content.body')}</FieldLabel><RichEditor value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} placeholder={t('admin.content.postPlaceholder')} minRows={10} /></div>
            <div className="space-y-1.5">
              <FieldLabel hint={t('admin.u.noteHint')}>{t('admin.content.cover')}</FieldLabel>
              <div className="flex items-center gap-3">
                <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                  {form.cover
                    ? <img src={form.cover} alt={t('admin.content.coverAlt')} className="h-full w-full object-cover" />
                    : <ImageIcon className="h-5 w-5 text-zinc-400" aria-hidden />}
                </span>
                <Input placeholder="https://… image URL" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
              </div>
            </div>
            <div>
              <FieldLabel>{t('common.status')}</FieldLabel>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={!form.title.trim()} className="text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmEl}
    </div>
  )
}

// ── PAGES ─────────────────────────────────────────────────────────────

type PageItem = { id: string; title: string; slug: string; body: string; status: string; createdAt: string }

export function PagesSection() {
  const { lang } = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useContentList<PageItem>('page')
  const { setDeleting, confirmEl } = useRemove('page', refresh)
  const [editing, setEditing] = useState<PageItem | 'new' | null>(null)
  const [form, setForm] = useState({ title: '', body: '', status: 'PUBLISHED' })

  const open = (p: PageItem | 'new') => {
    if (p === 'new') setForm({ title: '', body: '', status: 'PUBLISHED' })
    else setForm({ title: p.title, body: p.body, status: p.status })
    setEditing(p)
  }

  const save = async () => {
    if (!form.title.trim()) return
    const payload = { title: form.title.trim(), body: form.body, status: form.status }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/content', { type: 'page', ...payload }) : api.patch('/api/admin/content', { type: 'page', id: (editing as PageItem).id, ...payload }),
      { success: t('admin.content.toastPageSaved') },
    )
    if (ok) { setEditing(null); refresh() }
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader title={t('admin.content.pagesTitle')} description={t('admin.content.pagesDesc')} actions={
        <Button onClick={() => open('new')} className="h-9 rounded-full px-4 text-[13px] font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}><Plus className="mr-1 h-4 w-4" /> {t('admin.content.newPage')}</Button>
      } />
      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <AdminCard><EmptyState title={t('admin.content.noPages')} /></AdminCard>
      ) : (
        <TableShell>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/70 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="px-4 py-3 font-bold">{t('admin.content.title')}</th>
                <th className="px-3 py-3 font-bold">Slug</th>
                <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.content.created')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.items.map((p) => (
                <tr key={p.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{p.title}</td>
                  <td className="px-3 py-3 font-mono text-[11.5px] text-zinc-400 dark:text-zinc-500">/{p.slug}</td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-400 dark:text-zinc-500">{formatDate(p.createdAt, lang)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => open(p)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => setDeleting({ id: p.id, label: p.title })} aria-label={t('admin.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing === 'new' ? t('admin.content.newPage') : t('admin.content.editPage')}</DialogTitle><DialogDescription>{t('admin.content.pageFormDesc')}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><FieldLabel>{t('admin.content.title')}</FieldLabel><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><FieldLabel>{t('admin.content.body')}</FieldLabel><Textarea rows={7} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div>
              <FieldLabel>{t('common.status')}</FieldLabel>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={!form.title.trim()} style={{ background: 'var(--brand)' }}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmEl}
    </div>
  )
}
