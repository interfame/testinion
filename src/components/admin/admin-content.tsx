'use client'

// Super Admin — Master content CRUD: news, FAQs, blog posts and CMS pages.

import { useState } from 'react'
import { Plus, Pencil, Trash2, Pin, Search, Eye, Image as ImageIcon
  , Loader2, Upload
} from 'lucide-react'
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
import { toast } from '@/hooks/use-toast'
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

/** Uploads a local file to the platform (stored in DB, served at /api/media/<id>). */
async function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/uploads', { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`)
  return (data as { url: string }).url
}

/** File picker button that uploads the chosen image and returns its platform URL. */
function UploadButton({ onUploaded, label, uploading, setUploading, accept = 'image/*' }: {
  onUploaded: (url: string) => void
  label: string
  uploading: boolean
  setUploading: (v: boolean) => void
  accept?: string
}) {
  return (
    <label className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      {uploading ? label + '…' : label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setUploading(true)
          try {
            const url = await uploadFile(file)
            onUploaded(url)
            toast({ title: t_toast('Uploaded to your platform ✅') })
          } catch (err) {
            toast({ title: err instanceof Error ? err.message : 'Upload failed', variant: 'destructive' })
          } finally {
            setUploading(false)
          }
        }}
      />
    </label>
  )
}

function t_toast(s: string) { return s }

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
  const [coverUploading, setCoverUploading] = useState(false)
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
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <UploadButton label={t('admin.content.uploadImage')} uploading={coverUploading} setUploading={setCoverUploading} onUploaded={(url) => setForm((f) => ({ ...f, cover: url }))} />
                    {form.cover && (
                      <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full text-[11.5px] font-bold text-rose-500 hover:text-rose-600" onClick={() => setForm((f) => ({ ...f, cover: '' }))}>
                        {t('common.remove')}
                      </Button>
                    )}
                  </div>
                  <Input className="h-8 text-[11.5px]" placeholder="https://…" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
                </div>
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

type PageItem = { id: string; title: string; slug: string; body: string; metaTitle: string | null; metaDescription: string | null; status: string; createdAt: string }

const PAGE_PRESETS = ['terms', 'privacy', 'about', 'faq', 'refill-policy', 'refund-policy']

export function PagesSection() {
  const { lang } = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useContentList<PageItem>('page')
  const { setDeleting, confirmEl } = useRemove('page', refresh)
  const [editing, setEditing] = useState<PageItem | 'new' | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [preview, setPreview] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', body: '', metaTitle: '', metaDescription: '', status: 'PUBLISHED' })

  const open = (p: PageItem | 'new') => {
    setShowSource(false)
    setPreview(false)
    if (p === 'new') { setSlugTouched(false); setForm({ title: '', slug: '', body: '', metaTitle: '', metaDescription: '', status: 'PUBLISHED' }) }
    else { setSlugTouched(true); setForm({ title: p.title, slug: p.slug, body: p.body, metaTitle: p.metaTitle ?? '', metaDescription: p.metaDescription ?? '', status: p.status }) }
    setEditing(p)
  }

  const save = async () => {
    if (!form.title.trim()) return
    const payload = {
      title: form.title.trim(), slug: form.slug, body: form.body,
      metaTitle: form.metaTitle.trim() || null, metaDescription: form.metaDescription.trim() || null,
      status: form.status,
    }
    const ok = await mutate(
      () => editing === 'new' ? api.post('/api/admin/content', { type: 'page', ...payload }) : api.patch('/api/admin/content', { type: 'page', id: (editing as PageItem).id, ...payload }),
      { success: t('admin.content.toastPageSaved') },
    )
    if (ok) { setEditing(null); refresh() }
  }

  const usedSlugs = (data?.items ?? []).map((p) => p.slug)

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
                <th className="px-3 py-3 font-bold">SEO</th>
                <th className="px-3 py-3 font-bold">{t('common.status')}</th>
                <th className="px-3 py-3 font-bold">{t('admin.content.created')}</th>
                <th className="px-4 py-3 text-right font-bold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {data?.items.map((p) => (
                <tr key={p.id} className="transition hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                  <td className="max-w-[260px] truncate px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{p.title}</td>
                  <td className="px-3 py-3 font-mono text-[11.5px] text-zinc-400 dark:text-zinc-500">/{p.slug}</td>
                  <td className="px-3 py-3">
                    {p.metaTitle || p.metaDescription
                      ? <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">META OK</Badge>
                      : <Badge variant="outline" className="rounded-full text-[10px] font-bold text-zinc-400">NO META</Badge>}
                  </td>
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
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? t('admin.content.newPage') : t('admin.content.editPage')}</DialogTitle>
            <DialogDescription>{t('admin.pg.formDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>{t('admin.content.title')}</FieldLabel>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: editing === 'new' && !slugTouched ? slugify(e.target.value) : f.slug }))} />
              </div>
              <div>
                <FieldLabel hint={t('admin.pg.slugHint')}>Slug</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-[12px] text-zinc-400">/</span>
                  <Input
                    className="font-mono text-[12.5px]"
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })) }}
                    placeholder="terms-of-service"
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {PAGE_PRESETS.filter((sp) => !usedSlugs.includes(sp) || sp === form.slug).slice(0, 4).map((sp) => (
                    <button
                      key={sp} type="button"
                      className="rounded-full border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[10.5px] font-bold text-zinc-500 transition hover:border-[var(--brand)] hover:text-zinc-800 dark:hover:text-zinc-200"
                      onClick={() => { setSlugTouched(true); setForm((f) => ({ ...f, slug: sp, title: f.title || sp.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })) }}
                    >
                      /{sp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <FieldLabel hint={t('admin.pg.bodyHint')}>{t('admin.content.body')}</FieldLabel>
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" variant={showSource ? 'default' : 'ghost'} className="h-7 rounded-full px-2.5 text-[11px] font-bold" style={showSource ? { background: 'var(--brand)', color: 'var(--on-brand)' } : undefined} onClick={() => { setShowSource((v) => !v); setPreview(false) }}>
                    HTML
                  </Button>
                  <Button type="button" size="sm" variant={preview ? 'default' : 'ghost'} className="h-7 rounded-full px-2.5 text-[11px] font-bold" style={preview ? { background: 'var(--brand)', color: 'var(--on-brand)' } : undefined} onClick={() => { setPreview((v) => !v); setShowSource(false) }}>
                    <Eye className="mr-1 h-3 w-3" /> {t('admin.pg.preview')}
                  </Button>
                </div>
              </div>
              {preview ? (
                <div
                  className="gr-scroll prose prose-sm prose-zinc dark:prose-invert max-h-[360px] max-w-none overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-[13px] leading-relaxed [&_a]:underline [&_h1]:text-xl [&_h1]:font-extrabold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_img]:rounded-lg [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2"
                  dangerouslySetInnerHTML={{ __html: form.body }}
                />
              ) : showSource ? (
                <Textarea rows={12} className="font-mono text-[12px]" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="<h2>Terms</h2>\n<p>…</p>" />
              ) : (
                <RichEditor value={form.body} onChange={(html) => setForm((f) => ({ ...f, body: html }))} placeholder={t('admin.pg.bodyPlaceholder')} minRows={9} />
              )}
            </div>

            {/* SEO */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5">
              <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <Search className="h-3.5 w-3.5" /> {t('admin.pg.seoTitle')}
              </p>
              <div className="space-y-3">
                <div>
                  <FieldLabel hint={t('admin.pg.metaTitleHint')}>{t('admin.pg.metaTitle')}</FieldLabel>
                  <Input value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} placeholder={`${form.title || 'Page'} — GrowthRush`} maxLength={200} />
                </div>
                <div>
                  <FieldLabel hint={t('admin.pg.metaDescHint')}>{t('admin.pg.metaDescription')}</FieldLabel>
                  <Textarea rows={2} value={form.metaDescription} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} placeholder={t('admin.pg.metaDescPlaceholder')} maxLength={300} />
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <p className="truncate text-[13px] font-medium text-[#1a0dab] dark:text-[#8ab4f8]">{form.metaTitle || form.title || 'Page title'} — GrowthRush</p>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">yoursite.com/{form.slug || 'page-slug'}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-zinc-500 dark:text-zinc-400">{form.metaDescription || t('admin.pg.metaDescPlaceholder')}</p>
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>{t('common.status')}</FieldLabel>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
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
