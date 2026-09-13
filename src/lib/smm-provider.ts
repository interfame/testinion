// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// Standard SMM Panel API v2 client.
// Providers expose a POST endpoint accepting {key, action}. Some accept JSON,
// some form-encoded — we try JSON first and automatically fall back to
// form-urlencoded. Never throws raw errors: returns a discriminated result.

import { SOCIAL_ICONS } from './social'
import { db } from '@/lib/db'
import { ceil2 } from './pricing'

export type ProviderResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Raw service entry as returned by provider `action=services` */
export type ProviderService = {
  service?: string | number
  type?: string | number
  name?: string
  rate?: string | number
  min?: string | number
  max?: string | number
  category?: string
  description?: string
  dripfeed?: boolean | string | number
  refill?: boolean | string | number
  cancel?: boolean | string | number
  [k: string]: unknown
}

export type ProviderBalance = { balance: number; currency: string }

const TIMEOUT_MS = 20000

function toBool(v: unknown, fallback: boolean): boolean {
  if (v === undefined || v === null) return fallback
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const s = String(v).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(s)) return true
  if (['false', '0', 'no', 'off'].includes(s)) return false
  return fallback
}

export { toBool as parseProviderBool }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export { round2 }

/** 4-decimal precision — kept for display/verification of raw provider rates. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

export { round4 }

/** POST to the provider API. Tries JSON, falls back to form-urlencoded. */
export async function providerFetch(
  apiUrl: string,
  apiKey: string,
  params: Record<string, string | number>,
): Promise<ProviderResult<unknown>> {
  if (!apiUrl?.trim()) return { ok: false, error: 'Provider API URL is missing' }
  const body = { key: apiKey, ...params }

  const attempt = async (mode: 'json' | 'form'): Promise<ProviderResult<unknown>> => {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers:
          mode === 'json'
            ? { 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:
          mode === 'json'
            ? JSON.stringify(body)
            : new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const text = await res.text()
      if (!res.ok) return { ok: false, error: `Provider returned HTTP ${res.status}` }
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        return { ok: false, error: 'Provider response is not valid JSON' }
      }
      // Provider error payloads: {"error": "..."} — treat as failure so we can fall back
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>
        const errText = obj.error ?? obj.message
        // a shape that plausibly matches what we asked for wins regardless
        const looksRelevant = Array.isArray(parsed) || 'balance' in obj || 'currency' in obj
        if (!looksRelevant && typeof errText === 'string') return { ok: false, error: errText }
      }
      return { ok: true, data: parsed }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg.includes('abort') || msg.toLowerCase().includes('timeout')) return { ok: false, error: 'Provider request timed out' }
      return { ok: false, error: msg }
    }
  }

  const json = await attempt('json')
  let jsonError = ''
  // JSON attempt that clearly parsed into an expected shape → done
  if (json.ok) {
    const d = json.data
    const plausible =
      Array.isArray(d) ||
      (d !== null && typeof d === 'object' && ('balance' in d || 'currency' in d || 'error' in d || 'order' in d))
    if (plausible) return json
  } else {
    jsonError = json.error
  }

  const form = await attempt('form')
  if (form.ok) return form

  return { ok: false, error: form.error || jsonError || 'Provider request failed' }
}

/** action=balance → {balance, currency} */
export async function fetchProviderBalance(apiUrl: string, apiKey: string): Promise<ProviderResult<ProviderBalance>> {
  const res = await providerFetch(apiUrl, apiKey, { action: 'balance' })
  if (!res.ok) return res
  const d = res.data as Record<string, unknown>
  const rawBalance = d?.balance
  const balance = typeof rawBalance === 'string' ? parseFloat(rawBalance) : Number(rawBalance)
  if (!Number.isFinite(balance) || balance < 0) return { ok: false, error: 'Provider returned an invalid balance' }
  return { ok: true, data: { balance: round2(balance), currency: String(d?.currency ?? 'USD') } }
}

/** action=services → array of raw service entries */
export async function fetchProviderServices(apiUrl: string, apiKey: string): Promise<ProviderResult<ProviderService[]>> {
  const res = await providerFetch(apiUrl, apiKey, { action: 'services' })
  if (!res.ok) return res
  if (!Array.isArray(res.data)) {
    const obj = res.data as Record<string, unknown> | null
    const msg = obj && typeof obj.error === 'string' ? obj.error : 'Provider services response is not an array'
    return { ok: false, error: msg }
  }
  return { ok: true, data: res.data as ProviderService[] }
}

// ── Category guessing (provider category name → social icon key) ──────────

const KEYWORD_ICONS: [string, string][] = [
  ['instagram', 'instagram'],
  ['tiktok', 'tiktok'],
  ['youtube', 'youtube'],
  ['facebook', 'facebook'],
  ['twitter', 'x'],
  [' x ', 'x'],
  ['telegram', 'telegram'],
  ['spotify', 'spotify'],
  ['twitch', 'twitch'],
  ['snapchat', 'snapchat'],
  ['pinterest', 'pinterest'],
  ['linkedin', 'linkedin'],
  ['discord', 'discord'],
  ['reddit', 'reddit'],
  ['whatsapp', 'whatsapp'],
  ['soundcloud', 'soundcloud'],
  ['shazam', 'shazam'],
  ['threads', 'threads'],
  ['kwai', 'kwai'],
  ['likee', 'likee'],
  ['google', 'google'],
  ['trustpilot', 'trustpilot'],
  ['apple music', 'applemusic'],
  ['vimeo', 'vimeo'],
  ['vk', 'vk'],
  ['wechat', 'wechat'],
  ['line ', 'line'],
  ['medium', 'medium'],
  ['quora', 'quora'],
  ['tumblr', 'tumblr'],
  ['clubhouse', 'clubhouse'],
  ['periscope', 'periscope'],
  ['trovo', 'trovo'],
  ['rumble', 'rumble'],
  ['kick', 'kick'],
  ['dailymotion', 'dailymotion'],
  ['bilibili', 'bilibili'],
  ['douyin', 'douyin'],
  ['datpiff', 'datpiff'],
  ['mixcloud', 'mixcloud'],
  ['napster', 'napster'],
  ['tidal', 'tidal'],
  ['deezer', 'deezer'],
  ['booking', 'booking'],
  ['airbnb', 'airbnb'],
  ['amazon', 'amazon'],
  ['netflix', 'netflix'],
  ['disney', 'disney'],
  ['apple', 'apple'],
]

const PALETTE = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#14b8a6', '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#d946ef']

function firstIconKey(): string {
  const keys = Object.keys(SOCIAL_ICONS)
  return keys[0] ?? 'instagram'
}

/** Map a provider category name ("Instagram Followers") to a social icon key. */
export function guessCategoryIcon(name: string): string {
  const lower = ` ${name.toLowerCase()} `
  for (const [kw, icon] of KEYWORD_ICONS) {
    if (lower.includes(kw)) return SOCIAL_ICONS[icon] ? icon : firstIconKey()
  }
  return SOCIAL_ICONS['globe'] ? 'globe' : firstIconKey()
}

/** Fixed palette color picked deterministically by hash of the name. */
export function guessCategoryColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Lowercase, non-alnum → '-', collapse, trim, max 40 chars. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '') || 'category'
}

/** Map provider type string → Prisma Service.type */
export function mapServiceType(raw: unknown): 'DEFAULT' | 'CUSTOM_COMMENTS' | 'SUBSCRIPTION' {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('custom comment')) return 'CUSTOM_COMMENTS'
  if (s.includes('subscription')) return 'SUBSCRIPTION'
  return 'DEFAULT'
}

export function parseProviderRate(raw: unknown): number | null {
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function parseProviderInt(raw: unknown, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// ── Full catalog sync engine (shared by admin + reseller routes) ──────────

export type SyncStats = {
  created: number
  updated: number
  skipped: number
  categoriesCreated: number
  total: number
  capped: boolean
}

const MAX_SYNC_SERVICES = 2000
const UPDATE_CHUNK = 50

type MinimalProvider = { id: string; apiUrl: string; apiKey: string | null }

export async function runProviderSync(opts: {
  provider: MinimalProvider
  platformId: string | null
  markup: number
  /** local target category for NEW services only (same platform scope) — existing services are NEVER moved */
  categoryId?: string | null
  /** sync only entries whose provider category matches (case-insensitive) — null = all */
  providerCategory?: string | null
}): Promise<{ ok: true; stats: SyncStats } | { ok: false; error: string }> {
  const { provider, platformId, markup } = opts

  const raw = await fetchProviderServices(provider.apiUrl, provider.apiKey ?? '')
  if (!raw.ok) return { ok: false, error: raw.error }

  // When providerCategory is set, only entries in that provider category are considered.
  const providerCat = opts.providerCategory?.trim().toLowerCase() || null
  const scoped = providerCat
    ? raw.data.filter((e) => String(e?.category ?? '').trim().toLowerCase() === providerCat)
    : raw.data

  const total = scoped.length
  const capped = total > MAX_SYNC_SERVICES
  const entries = scoped.slice(0, MAX_SYNC_SERVICES)

  // ── 1. Resolve / create categories ──────────────────────────────
  // forceCategory applies to NEW services only; updates keep their current category.
  const forceCategory = opts.categoryId
    ? await db.category.findFirst({ where: { id: opts.categoryId, platformId } })
    : null
  if (opts.categoryId && !forceCategory) return { ok: false, error: 'Target category not found' }

  let categoriesCreated = 0
  const catIdByName = new Map<string, string>() // lowercased provider category name → category id

  if (forceCategory) {
    catIdByName.set('*', forceCategory.id)
  } else {
    const scopeCats = await db.category.findMany({
      where: { platformId },
      select: { id: true, name: true, slug: true },
    })
    const bySlug = new Map(scopeCats.map((c) => [c.slug, c]))
    const byName = new Map(scopeCats.map((c) => [c.name.trim().toLowerCase(), c]))
    const maxRow = await db.category.aggregate({
      where: { platformId },
      _max: { sortOrder: true },
    })
    let nextSort = (maxRow._max.sortOrder ?? 0) + 1

    const uniqueNames: string[] = []
    for (const e of entries) {
      const name = String(e?.category ?? '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!catIdByName.has(key) && !uniqueNames.includes(name)) uniqueNames.push(name)
    }

    for (const name of uniqueNames) {
      const key = name.toLowerCase()
      const existing = byName.get(key) ?? bySlug.get(slugify(name))
      if (existing) {
        catIdByName.set(key, existing.id)
        continue
      }
      // ensure a unique slug within the scope (append -2, -3, …)
      const base = slugify(name)
      let slug = base
      let n = 2
      while (bySlug.has(slug)) slug = `${base}-${n++}`
      const created = await db.category.create({
        data: {
          platformId,
          name: name.slice(0, 80),
          slug,
          icon: guessCategoryIcon(name),
          color: guessCategoryColor(name),
          status: 'ACTIVE',
          sortOrder: nextSort++,
        },
        select: { id: true },
      })
      bySlug.set(slug, { id: created.id, name, slug })
      byName.set(key, { id: created.id, name, slug })
      catIdByName.set(key, created.id)
      categoriesCreated++
    }
  }

  const resolveCat = (rawName: unknown): string =>
    forceCategory?.id ?? catIdByName.get(String(rawName ?? '').trim().toLowerCase()) ?? catIdByName.get('*') ?? ''

  // ── 2. Parse + validate entries ─────────────────────────────────
  type Parsed = {
    providerServiceId: string
    categoryId: string
    name: string
    type: string
    rate: number
    cost: number
    min: number
    max: number
    description: string | null
    dripfeed: boolean
    refill: boolean
    cancel: boolean
  }
  const parsed: Parsed[] = []
  let skipped = 0

  for (const e of entries) {
    const providerServiceId = e?.service !== undefined && e?.service !== null ? String(e.service).trim() : ''
    const name = String(e?.name ?? '').trim()
    const providerRate = parseProviderRate(e?.rate)
    if (!providerServiceId || !name || providerRate === null) {
      skipped++
      continue
    }
    const catId = resolveCat(e?.category)
    if (!catId) {
      skipped++
      continue
    }
    parsed.push({
      providerServiceId: providerServiceId.slice(0, 100),
      categoryId: catId,
      name: name.slice(0, 200),
      type: mapServiceType(e?.type),
      rate: ceil2(providerRate * (1 + markup / 100)),
      cost: providerRate,
      min: parseProviderInt(e?.min, 1),
      max: parseProviderInt(e?.max, 100000),
      description:
        typeof e?.description === 'string' && e.description.trim() ? e.description.trim().slice(0, 1000) : null,
      dripfeed: toBool(e?.dripfeed, false),
      refill: toBool(e?.refill, true),
      cancel: toBool(e?.cancel, true),
    })
  }

  // dedupe incoming by providerServiceId (first wins)
  const seen = new Set<string>()
  const fresh = parsed.filter((p) => (seen.has(p.providerServiceId) ? false : (seen.add(p.providerServiceId), true)))

  // ── 3. Split create / update ────────────────────────────────────
  const existing = await db.service.findMany({
    where: { providerId: provider.id, platformId },
    select: { id: true, providerServiceId: true, name: true },
  })
  const existingByPsid = new Map<string, string>() // providerServiceId → service id
  const existingNameNoPsid = new Map<string, string>() // lower name → service id (only rows with null psid)
  for (const s of existing) {
    if (s.providerServiceId) existingByPsid.set(s.providerServiceId, s.id)
    else existingNameNoPsid.set(s.name.trim().toLowerCase(), s.id)
  }

  const creates: Parsed[] = []
  const updates: { id: string; data: Parsed }[] = []

  for (const p of fresh) {
    const matchByPsid = existingByPsid.get(p.providerServiceId)
    if (matchByPsid) {
      updates.push({ id: matchByPsid, data: p })
      continue
    }
    const matchByName = existingNameNoPsid.get(p.name.toLowerCase())
    if (matchByName) {
      // service exists under this provider but was never linked — link it now
      updates.push({ id: matchByName, data: p })
      continue
    }
    creates.push(p)
  }

  // ── 4. Write ────────────────────────────────────────────────────
  let created = 0
  if (creates.length) {
    const res = await db.service.createMany({
      data: creates.map((p) => ({
        platformId,
        categoryId: p.categoryId,
        providerId: provider.id,
        providerServiceId: p.providerServiceId,
        name: p.name,
        type: p.type,
        rate: p.rate,
        cost: p.cost,
        min: p.min,
        max: p.max,
        description: p.description,
        dripfeed: p.dripfeed,
        refill: p.refill,
        cancel: p.cancel,
        status: 'ACTIVE',
      })),
    })
    created = res.count
  }

  let updated = 0
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK)
    await Promise.all(
      chunk.map((u) =>
        db.service.update({
          where: { id: u.id },
          data: {
            // categoryId is only forced for NEW services — updates never move a
            // service out of its current category (the category-destroying bug).
            ...(forceCategory ? {} : { categoryId: u.data.categoryId }),
            providerServiceId: u.data.providerServiceId,
            name: u.data.name,
            type: u.data.type,
            rate: u.data.rate,
            cost: u.data.cost,
            min: u.data.min,
            max: u.data.max,
            description: u.data.description,
            dripfeed: u.data.dripfeed,
            refill: u.data.refill,
            cancel: u.data.cancel,
          },
        }),
      ),
    )
    updated += chunk.length
  }

  return { ok: true, stats: { created, updated, skipped, categoriesCreated, total, capped } }
}
