// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Pin, Search, Newspaper, HelpCircle, FileText, FileStack, Eye, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { useApp } from '@/components/shared/app-context'
import RichEditor from '@/components/shared/rich-editor'
import { useApi, api, mutate } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useI18n, type Lang, type DictKey } from '@/lib/i18n'

type Item = Record<string, unknown> & { id: string }

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100).replace(/-+$/, '')

type CType = 'news' | 'faq' | 'post' | 'page'

const CONFIG: Record<CType, { titleKey: DictKey; descKey: DictKey; icon: typeof Newspaper; fields: string[] }> = {
  news: { titleKey: 'reseller.news', descKey: 'rcont.newsDesc', icon: Newspaper, fields: ['title', 'body'] },
  faq: { titleKey: 'reseller.faqs', descKey: 'rcont.faqDesc', icon: HelpCircle, fields: ['question', 'answer'] },
  post: { titleKey: 'reseller.blog', descKey: 'rcont.postDesc', icon: FileText, fields: ['title', 'slug', 'excerpt', 'body', 'cover'] },
  page: { titleKey: 'reseller.pages', descKey: 'rcont.pageDesc', icon: FileStack, fields: ['title', 'body'] },
}

const NEW_KEY: Record<CType, DictKey> = { news: 'rcont.newNews', faq: 'rcont.newFaq', post: 'rcont.newPost', page: 'rcont.newPage' }
const EDIT_KEY: Record<CType, DictKey> = { news: 'admin.content.editNews', faq: 'admin.content.editFaq', post: 'admin.content.editPost', page: 'admin.content.editPage' }
const DEL_KEY: Record<CType, DictKey> = { news: 'rcont.delNews', faq: 'rcont.delFaq', post: 'rcont.delPost', page: 'rcont.delPage' }

export default function ResellerContent({ section }: { section: string }) {
  const type = (section === 'posts' ? 'post' : section === 'pages' ? 'page' : section === 'faqs' ? 'faq' : 'news') as CType
  const cfg = CONFIG[type]
  const app = useApp()
  const { t } = useI18n()
  const { data, loading, refresh } = useApi<{ items: Item[] }>(`/api/reseller/content?type=${type}`, [type])
  const [edit, setEdit] = useState<Item | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Item | null>(null)
  const [q, setQ] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  // Public blog of this reseller's platform ("where do my posts show up?")
  const platform = app.user.platform as { slug?: string } | null
  const viewOnBlog = () => window.dispatchEvent(new CustomEvent('gr:blog', { detail: platform?.slug ?? null }))

  const empty: Record<string, string | boolean> = type === 'faq'
    ? { question: '', answer: '', category: 'General' }
    : type === 'news'
      ? { title: '', body: '', pinned: false }
      : type === 'post'
        ? { title: '', body: '', excerpt: '', cover: '', slug: '', status: 'PUBLISHED' }
        : { title: '', body: '', status: 'PUBLISHED' }
  const [form, setForm] = useState<Record<string, string | boolean>>(empty)

  const items = (data?.items ?? []).filter((i) => {
    const text = JSON.stringify(i).toLowerCase()
    return !q || text.includes(q.toLowerCase())
  })

  const openEdit = (item: Item) => {
    setEdit(item)
    setSlugTouched(true) // keep the existing slug when editing
    setForm({
      ...(Object.fromEntries(Object.entries(empty).map(([k]) => [k, String(item[k] ?? (typeof empty[k] === 'boolean' ? false : ''))]))) as Record<string, string>,
      ...(type === 'news' ? { pinned: !!item.pinned } : {}),
    })
  }

  const save = async () => {
    const res = edit
      ? await mutate(() => api.patch('/api/reseller/content', { id: edit.id, type, ...form }), { success: t('rcat.savedToast') })
      : await mutate(() => api.post('/api/reseller/content', { type, ...form }), { success: t('rcont.createdToast') })
    if (res) { setEdit(null); setAddOpen(false); setForm(empty); refresh() }
  }

  const remove = async () => {
    if (!deleteItem) return
    const res = await mutate(
      () => fetch('/api/reseller/content', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteItem.id, type }) }).then((r) => r.json()),
      { success: t('admin.content.toastDeleted') }
    )
    if (res) { setDeleteItem(null); refresh() }
  }

  const Icon = cfg.icon
  const labelOf = (item: Item) =>
    String(item.title ?? item.question ?? '—')

  const bodyOf = (item: Item) =>
    String(item.body ?? item.answer ?? item.excerpt ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  return (
    <>
      <PanelPageHeader
        title={t(cfg.titleKey)}
        description={t(cfg.descKey)}
        actions={
          <Button size="sm" className="font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={() => { setEdit(null); setForm(empty); setSlugTouched(false); setAddOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" /> {t(NEW_KEY[type])}
          </Button>
        }
      />

      {type === 'post' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5" style={{ borderColor: 'color-mix(in srgb, var(--brand) 35%, transparent)', background: 'color-mix(in srgb, var(--brand) 7%, transparent)' }}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Eye className="h-4 w-4 text-black" />
            </span>
            <p className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-200">{t('rcont.blogNote')}</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full font-bold" onClick={viewOnBlog}>
            <Eye className="h-3.5 w-3.5" /> {t('admin.content.viewBlog')}
          </Button>
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <Input className="pl-9" placeholder={t('rcont.searchPh').replace('{x}', t(cfg.titleKey).toLowerCase())} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="group flex items-start gap-3 rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition hover:shadow-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--brand) 10%, white)' }}>
                <Icon className="h-4 w-4" style={{ color: 'var(--brand-ink)' }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-extrabold">{labelOf(item)}</p>
                  {'pinned' in item && !!item.pinned && <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"><Pin className="mr-1 h-2.5 w-2.5" />{t('client.pinned')}</Badge>}
                  {'status' in item && <Badge variant="outline" className="text-[10px]">{String(item.status)}</Badge>}
                  {'category' in item && <Badge variant="outline" className="text-[10px]">{String(item.category)}</Badge>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-zinc-500 dark:text-zinc-400">{bodyOf(item)}</p>
                <p className="mt-1 text-[10px] text-zinc-300 dark:text-zinc-600">{formatDateTime(String(item.createdAt ?? item.publishedAt ?? new Date()), app.lang as Lang)}</p>
              </div>
              {type === 'news' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{t('rcont.pin')}</span>
                  <Switch
                    checked={!!item.pinned}
                    onCheckedChange={async (v) => {
                      await api.patch('/api/reseller/content', { id: item.id, type, pinned: v })
                      refresh()
                    }}
                  />
                </div>
              )}
              {type === 'post' && (
                <Button
                  variant="outline" size="icon" className="h-8 w-8 shrink-0"
                  title={t('rcont.viewOnBlog')} aria-label={t('rcont.viewOnBlog')}
                  onClick={viewOnBlog}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setDeleteItem(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Icon className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">{t('rcont.empty')}</p>
            </div>
          )}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={addOpen || edit !== null} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEdit(null) } }}>
        <DialogContent className={`max-h-[85vh] overflow-y-auto ${(type === 'post' || type === 'page') ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`} aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{edit ? t(EDIT_KEY[type]) : t(NEW_KEY[type])}</DialogTitle>{type === 'post' && <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{t('rcont.editorHint')}</p>}</DialogHeader>
          <div className="space-y-3">
            {type === 'faq' ? (
              <>
                <div className="space-y-1.5"><Label>{t('admin.content.question')}</Label><Input value={String(form.question ?? '')} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t('admin.content.answer')}</Label><Textarea rows={3} value={String(form.answer ?? '')} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>{t('common.category')}</Label>
                  <Select value={String(form.category ?? 'General')} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['General', 'Orders', 'Payments', 'API', 'Reseller'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>{t('admin.content.title')}</Label>
                  <Input
                    value={String(form.title ?? '')}
                    onChange={(e) => {
                      const title = e.target.value
                      // Auto-suggest the slug from the title while creating (until the user edits it)
                      setForm((f) => ({ ...f, title, slug: !edit && !slugTouched ? slugify(title) : String(f.slug ?? '') }))
                    }}
                  />
                </div>
                {type === 'post' && (
                  <div className="space-y-1.5">
                    <Label>Slug <span className="font-normal text-zinc-400">{t('rcont.slugHint')}</span></Label>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[12px] text-zinc-400">/blog/</span>
                      <Input
                        className="font-mono text-[12.5px]"
                        value={String(form.slug ?? '')}
                        onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }) }}
                        placeholder="my-awesome-post"
                      />
                    </div>
                  </div>
                )}
                {type === 'post' && (
                  <div className="space-y-1.5"><Label>{t('admin.content.excerpt')} <span className="font-normal text-zinc-400">{t('rcont.excerptHint')}</span></Label><Textarea rows={2} value={String(form.excerpt ?? '')} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
                )}
                <div className="space-y-1.5">
                  <Label>{t('admin.content.body')}</Label>
                  {type === 'post' || type === 'page' ? (
                    <RichEditor
                      value={String(form.body ?? '')}
                      onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                      placeholder={t('rcont.writePh')}
                      minRows={9}
                    />
                  ) : (
                    <Textarea rows={6} value={String(form.body ?? '')} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                  )}
                </div>
                {type === 'post' && (
                  <div className="space-y-1.5">
                    <Label>{t('admin.content.cover')} <span className="font-normal text-zinc-400">{t('rcont.coverHint')}</span></Label>
                    <div className="flex items-center gap-3">
                      <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                        {String(form.cover ?? '')
                          ? <img src={String(form.cover)} alt={t('admin.content.coverAlt')} className="h-full w-full object-cover" />
                          : <ImageIcon className="h-5 w-5 text-zinc-400" aria-hidden />}
                      </span>
                      <Input
                        placeholder={t('rcont.coverPh')}
                        value={String(form.cover ?? '')}
                        onChange={(e) => setForm({ ...form, cover: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {(type === 'post' || type === 'page') && (
                  <div className="space-y-1.5">
                    <Label>{t('common.status')}</Label>
                    <Select value={String(form.status ?? 'PUBLISHED')} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="PUBLISHED">{t('rcont.published')}</SelectItem><SelectItem value="DRAFT">{t('rcont.draft')}</SelectItem></SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <Button className="w-full font-bold text-[var(--on-brand)]" style={{ background: 'var(--brand)' }} onClick={save}>
              {edit ? t('rcat.saveChanges') : t('admin.cat.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(DEL_KEY[type])}</AlertDialogTitle>
            <AlertDialogDescription>{t('rcont.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={remove}>{t('admin.deleteCta')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
