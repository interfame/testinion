// GrowthRush — Landing Studio configuration model
// A reseller's public storefront landing is 100% driven by this config:
// section ORDER, section VISIBILITY and per-section COPY — plus the PAGES
// (Terms, Privacy, Refund, About + custom) rendered from the footer.
// Stored server-side inside Platform.settings JSON under the key `landing`.

/* --------------------------------- types ---------------------------------- */

export type LandingSectionId =
  | 'header' | 'hero' | 'stats' | 'signin' | 'problem' | 'features' | 'networks'
  | 'payments' | 'how' | 'testimonials' | 'faq' | 'cta' | 'newsletter' | 'footer'

export type LandingSection = { id: LandingSectionId; visible: boolean; copy: Record<string, unknown> }

export type LandingPage = { id: string; slug: string; title: string; body: string; visible: boolean; system: boolean }

export type LandingConfig = { template: string; sections: LandingSection[]; pages: LandingPage[] }

/** Canonical section order (matches the Landing Studio reference). */
export const SECTION_ORDER: LandingSectionId[] = [
  'header', 'hero', 'stats', 'signin', 'problem', 'features', 'networks',
  'payments', 'how', 'testimonials', 'faq', 'cta', 'newsletter', 'footer',
]

/** UI metadata — `icon` is a lucide-react component key resolved by the studio. */
export const SECTION_META: Record<LandingSectionId, { label: string; icon: string }> = {
  header: { label: 'Header', icon: 'panel-top' },
  hero: { label: 'Hero', icon: 'sparkles' },
  stats: { label: 'Stats', icon: 'trending-up' },
  signin: { label: 'Sign-in card', icon: 'log-in' },
  problem: { label: 'Problem / solution', icon: 'circle-alert' },
  features: { label: 'Features', icon: 'zap' },
  networks: { label: 'Networks', icon: 'globe' },
  payments: { label: 'Payment methods', icon: 'credit-card' },
  how: { label: 'How it works', icon: 'list-ordered' },
  testimonials: { label: 'Testimonials', icon: 'star' },
  faq: { label: 'FAQ', icon: 'circle-help' },
  cta: { label: 'Final CTA', icon: 'megaphone' },
  newsletter: { label: 'Newsletter', icon: 'mail' },
  footer: { label: 'Footer', icon: 'panel-bottom' },
}

/* ------------------------------ copy schema ------------------------------- */

export type FieldSpec =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'strings'; max?: number; options?: readonly string[] }
  | { kind: 'items'; max?: number; fields: Record<string, 'string' | 'number'> }

/** Whitelist of allowed copy keys per section (anything else is dropped on save). */
export const COPY_SCHEMA: Record<LandingSectionId, Record<string, FieldSpec>> = {
  header: {
    showBlog: { kind: 'boolean' },
    blogLabel: { kind: 'string' },
  },
  hero: {
    title: { kind: 'string' },
    subtitle: { kind: 'string' },
    cta: { kind: 'string' },
    secondary: { kind: 'string' },
    showBadge: { kind: 'boolean' },
  },
  stats: {
    orders: { kind: 'string' },
    ordersLabel: { kind: 'string' },
    clients: { kind: 'string' },
    clientsLabel: { kind: 'string' },
    services: { kind: 'string' },
    servicesLabel: { kind: 'string' },
    uptime: { kind: 'string' },
    uptimeLabel: { kind: 'string' },
  },
  signin: {
    title: { kind: 'string' },
    subtitle: { kind: 'string' },
    button: { kind: 'string' },
    loginLabel: { kind: 'string' },
  },
  problem: {
    eyebrow: { kind: 'string' },
    title: { kind: 'string' },
    items: { kind: 'items', max: 6, fields: { title: 'string', desc: 'string' } },
    solutions: { kind: 'items', max: 6, fields: { title: 'string', desc: 'string' } },
  },
  features: {
    eyebrow: { kind: 'string' },
    title: { kind: 'string' },
    sub: { kind: 'string' },
    items: { kind: 'items', max: 9, fields: { icon: 'string', title: 'string', desc: 'string' } },
  },
  networks: { title: { kind: 'string' } },
  payments: {
    title: { kind: 'string' },
    sub: { kind: 'string' },
    methods: { kind: 'strings', max: 12, options: ['paypal', 'card', 'mercadopago', 'pix', 'crypto', 'payoneer'] },
  },
  how: {
    title: { kind: 'string' },
    sub: { kind: 'string' },
    steps: { kind: 'items', max: 6, fields: { n: 'string', title: 'string', desc: 'string' } },
  },
  testimonials: {
    title: { kind: 'string' },
    items: { kind: 'items', max: 9, fields: { name: 'string', role: 'string', text: 'string', rating: 'number' } },
  },
  faq: {
    title: { kind: 'string' },
    sub: { kind: 'string' },
  },
  cta: {
    title: { kind: 'string' },
    sub: { kind: 'string' },
    button: { kind: 'string' },
  },
  newsletter: {
    title: { kind: 'string' },
    sub: { kind: 'string' },
    button: { kind: 'string' },
  },
  footer: {
    tagline: { kind: 'string' },
    showSocial: { kind: 'boolean' },
  },
}

export const PAYMENT_METHOD_KEYS = ['paypal', 'card', 'mercadopago', 'pix', 'crypto', 'payoneer'] as const

/* ----------------------------- default copies ----------------------------- */

export const DEFAULT_PROBLEM_ITEMS = [
  { title: 'Slow manual growth', desc: 'Posting daily and grinding engagement takes months — and the algorithms change the rules without warning.' },
  { title: 'Scams and bot farms', desc: 'Dirt-cheap providers deliver fake bots that vanish overnight and can get your account restricted or banned.' },
  { title: 'No guarantees, no support', desc: 'Most sellers disappear after the sale — no refills, no replies and no way to get your money back.' },
]

export const DEFAULT_SOLUTIONS = [
  { title: 'Instant automated delivery', desc: 'Orders start within minutes and run automatically — no spreadsheets, no manual work, no waiting around.' },
  { title: 'Real, safe, gradual delivery', desc: 'High-quality sources with drip-feed pacing that keeps your accounts safe and your growth looking natural.' },
  { title: 'Refill & support guarantees', desc: '30-day refills on eligible services and a real human support team answering 24/7 — usually in minutes.' },
]

export const DEFAULT_TESTIMONIALS = [
  {
    name: 'Camila Torres', role: 'Creator · 84K followers', rating: 5,
    text: 'I ordered followers at 9am and watched them roll in gradually all week. It looks completely natural — and my engagement actually went up.',
  },
  {
    name: 'Jake Morrison', role: 'Agency owner · 40 clients', rating: 5,
    text: 'We manage 40+ client accounts through the API. Orders fire automatically, the refill guarantee saved us twice, and support answers in minutes.',
  },
  {
    name: 'Ana Ribeiro', role: 'Artist & producer', rating: 5,
    text: 'My Spotify plays and monthly listeners finally match my real audience growth. Fast, affordable and zero sketchy stuff. Totally recommend.',
  },
]

/* ------------------------------ default pages ----------------------------- */

const TERMS_BODY = `
<h3>1. Agreement to these terms</h3>
<p>By accessing this website, creating an account or placing an order, you agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of them, please do not use the platform. The service is provided on an as-is basis and we may update these terms from time to time; the version published on this page is the one that applies to your orders.</p>
<h3>2. Description of the service</h3>
<p>We provide social media marketing services — such as followers, likes, views, plays and other engagement — delivered to the accounts and links you submit. Delivery times displayed for each service are good-faith estimates: most orders start within minutes and complete progressively, but exact timing depends on the service and on factors outside our control.</p>
<h3>3. Orders, wallet and delivery</h3>
<p>Orders are paid from your platform wallet balance. You are responsible for providing correct links and quantities; orders placed on wrong or private links are non-refundable once delivery has been attempted. If an order cannot be delivered, the remaining value is credited back to your wallet.</p>
<h3>4. Third-party platforms and trademarks</h3>
<p>Our services are performed on third-party platforms such as Instagram, TikTok, YouTube, Spotify, X and others. We are not affiliated with, endorsed by or sponsored by any of those platforms. All product names, logos and brands mentioned on this website are the property of their respective owners and are used for identification purposes only. We do not require your passwords and we never publish content on your behalf.</p>
<h3>5. Refunds</h3>
<p>Orders that cannot be delivered are refunded as wallet credit. Orders delivered as described are not eligible for a refund — eligible services include a refill guarantee instead. Wallet credit can be used for any service on the platform but cannot be withdrawn as cash. See our Refund Policy for the full details.</p>
<h3>6. Acceptable use</h3>
<p>You may not use the platform to promote illegal content, hate speech, harassment, spam, malware or anything that violates the terms of the underlying social network or applicable law. You may not resell our services in ways that misrepresent them, and you must keep your account credentials confidential. Accounts that violate this policy may be suspended without a refund for work already delivered.</p>
<h3>7. Accounts and security</h3>
<p>You are responsible for maintaining the accuracy of your account information and for all activity that happens under your account. Notify us immediately if you suspect unauthorized access. We may request identity verification before processing certain support or refund requests to protect your balance.</p>
<h3>8. Changes to these terms</h3>
<p>We may revise these terms at any time to reflect changes in the service or applicable regulations. Material changes will be published on this page with an updated date. Continuing to use the platform after a change constitutes acceptance of the revised terms. Questions? Contact our support team from your dashboard — we answer around the clock.</p>
`.trim()

const PRIVACY_BODY = `
<h3>Data we collect</h3>
<p>When you create an account we store the details you provide — name, email address, preferred currency and language — plus the links you submit for orders and the transactions on your wallet. We also keep basic technical records (such as IP address and browser type) to secure the platform and prevent fraud.</p>
<h3>How we use your data</h3>
<p>Your data is used to process and deliver your orders, provide support, prevent abuse and improve the service. We use your email to send transactional messages — order updates, deposit receipts and account notices — and, only with your consent, occasional growth tips you can unsubscribe from at any time.</p>
<h3>Cookies</h3>
<p>We use a small number of cookies: a session cookie that keeps you logged in, preference cookies that remember your language and theme, and optional analytics cookies that help us understand which pages are useful. You can clear or block cookies in your browser settings; the platform will still work, but some preferences may reset.</p>
<h3>Third parties we share data with</h3>
<p>We share only the minimum data necessary with trusted processors: payment providers to complete deposits, service suppliers who fulfill the engagement you ordered, and email/communication tools used to support you. These parties are bound to process data only on our instructions. We never sell your personal data.</p>
<h3>Your rights</h3>
<p>You can access, correct, export or delete your personal data at any time from your account settings or by contacting support. Deleting your account removes your personal information from our active systems, except for records we must keep for legal, accounting or fraud-prevention purposes.</p>
<h3>Security and retention</h3>
<p>Data is transmitted over encrypted connections and access is restricted to team members who need it to do their jobs. We keep personal data only as long as needed to provide the service, comply with legal obligations and resolve disputes — after that it is deleted or anonymized.</p>
`.trim()

const REFUND_BODY = `
<h3>Refunds as wallet credit</h3>
<p>If an order cannot be delivered — for example because the link is invalid, the account is private or the service becomes unavailable — the undelivered value is refunded to your platform wallet as credit, automatically or upon request. You can use that credit immediately for any other service on the platform.</p>
<h3>Delivered orders</h3>
<p>Orders that were delivered as described are not eligible for a refund. Eligible services include a 30-day refill guarantee instead: if the delivered count drops within the guarantee window, you can trigger a refill yourself from your dashboard and we will restore it free of charge.</p>
<h3>No cash-outs</h3>
<p>Wallet credit — including refunds — cannot be withdrawn as cash or transferred between accounts. It remains available to spend on the platform. Deposits that have not been used at all may be reviewed case by case; contact support before escalating anything.</p>
<h3>Chargeback warning</h3>
<p>Opening a payment dispute or chargeback with your bank before talking to us usually ends in account suspension and never speeds up a resolution. Our support team answers 24/7 and resolves the vast majority of cases within 24 hours — please give us the chance to fix the problem first.</p>
<h3>How to request</h3>
<p>Open a ticket from your dashboard with your order ID and a short description of the issue. Refund requests are typically reviewed within 24 hours; approved amounts are credited straight to your wallet and you get a notification when it happens.</p>
`.trim()

const ABOUT_BODY = `
<p>We are a social media marketing platform built for creators, artists and businesses that want to grow without wasting months on manual grinding. From one dashboard you can order followers, likes, views, plays and engagement across every major network — with transparent pricing per 1,000 and no hidden fees.</p>
<p>Everything is automated: orders start within minutes, delivery is gradual and safe, eligible services carry refill guarantees, and a real human support team answers around the clock. Agencies and power users get a full public API, wallet-based billing and detailed order tracking as standard.</p>
<p>Our mission is simple — make growth accessible, fast and safe for everyone. Thousands of clients trust us every day to boost their presence; we repay that trust with reliable delivery, honest guarantees and support that actually answers.</p>
`.trim()

function defaultPages(): LandingPage[] {
  return [
    { id: 'page-terms', slug: 'terms', title: 'Terms & Conditions', body: TERMS_BODY, visible: true, system: true },
    { id: 'page-privacy', slug: 'privacy', title: 'Privacy Policy', body: PRIVACY_BODY, visible: true, system: true },
    { id: 'page-refund', slug: 'refund', title: 'Refund Policy', body: REFUND_BODY, visible: true, system: true },
    { id: 'page-about', slug: 'about', title: 'About us', body: ABOUT_BODY, visible: true, system: true },
  ]
}

/* --------------------------- default config ------------------------------- */

function section(id: LandingSectionId, visible: boolean, copy: Record<string, unknown> = {}): LandingSection {
  return { id, visible, copy }
}

/** Fresh default landing config (safe to mutate). */
export function defaultLandingConfig(): LandingConfig {
  return {
    template: 'growthrush',
    sections: [
      section('header', true, { showBlog: true, blogLabel: 'Blog' }),
      section('hero', true),
      section('stats', true),
      section('signin', false),
      section('problem', false),
      section('features', true),
      section('networks', true),
      section('payments', false),
      section('how', true),
      section('testimonials', false),
      section('faq', true),
      section('cta', true),
      section('newsletter', false),
      section('footer', true, { showSocial: true }),
    ],
    pages: defaultPages(),
  }
}

/* ------------------------------ sanitizer --------------------------------- */

const CONFIG_LIMIT = 200 * 1024
const PAGE_BODY_LIMIT = 60 * 1024
const MAX_PAGES = 12
const SLUG_RE = /^[a-z0-9-]{1,40}$/

/** System page slugs — the system flag is always preserved for these. */
export const SYSTEM_PAGE_SLUGS = ['terms', 'privacy', 'refund', 'about']

function sanitizeCopy(id: LandingSectionId, copy: unknown): Record<string, unknown> | null {
  if (copy === undefined || copy === null) return {}
  if (typeof copy !== 'object' || Array.isArray(copy)) return null
  const schema = COPY_SCHEMA[id]
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(copy as Record<string, unknown>)) {
    const spec = schema[key]
    if (!spec) continue // unknown key → dropped
    if (spec.kind === 'string') {
      if (typeof value === 'string' && value.length <= 5000) out[key] = value
    } else if (spec.kind === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    } else if (spec.kind === 'boolean') {
      out[key] = value === true
    } else if (spec.kind === 'strings') {
      if (Array.isArray(value)) {
        const list = value.filter((v): v is string => typeof v === 'string')
        const filtered = spec.options ? list.filter((v) => (spec.options as readonly string[]).includes(v)) : list
        out[key] = [...new Set(filtered)].slice(0, spec.max ?? 12)
      }
    } else if (spec.kind === 'items') {
      if (Array.isArray(value)) {
        const items: Record<string, string | number>[] = []
        for (const raw of value.slice(0, spec.max ?? 12)) {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
          const item: Record<string, string | number> = {}
          for (const [field, type] of Object.entries(spec.fields)) {
            const v = (raw as Record<string, unknown>)[field]
            if (type === 'string' && typeof v === 'string' && v.length <= 2000) item[field] = v
            else if (type === 'number' && typeof v === 'number' && Number.isFinite(v)) item[field] = v
          }
          items.push(item)
        }
        out[key] = items
      }
    }
  }
  return out
}

/**
 * Server-side validation for a landing config coming from the client.
 * Returns a clean config, or null when the payload is structurally invalid.
 */
export function sanitizeConfig(input: unknown): LandingConfig | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  try {
    if (JSON.stringify(input).length > CONFIG_LIMIT) return null
  } catch {
    return null
  }
  const raw = input as Record<string, unknown>

  // Sections: must be an array with every known id exactly once, in any order.
  const sectionsIn = raw.sections
  if (!Array.isArray(sectionsIn) || sectionsIn.length !== SECTION_ORDER.length) return null
  const seen = new Set<string>()
  const sections: LandingSection[] = []
  for (const s of sectionsIn) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null
    const so = s as Record<string, unknown>
    if (typeof so.id !== 'string' || !SECTION_ORDER.includes(so.id as LandingSectionId)) return null
    if (seen.has(so.id)) return null
    seen.add(so.id)
    if (typeof so.visible !== 'boolean') return null
    const copy = sanitizeCopy(so.id as LandingSectionId, so.copy)
    if (copy === null) return null
    sections.push({ id: so.id as LandingSectionId, visible: so.visible, copy })
  }
  if (seen.size !== SECTION_ORDER.length) return null

  // Pages: max 12, unique valid slugs, bounded title/body.
  if (raw.pages !== undefined && !Array.isArray(raw.pages)) return null
  const pages: LandingPage[] = []
  const slugs = new Set<string>()
  for (const p of (raw.pages ?? []) as unknown[]) {
    if (pages.length >= MAX_PAGES) break
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue
    const po = p as Record<string, unknown>
    const id = typeof po.id === 'string' && po.id.length <= 64 ? po.id : null
    const slug = typeof po.slug === 'string' ? po.slug : ''
    const title = typeof po.title === 'string' ? po.title : ''
    const body = typeof po.body === 'string' ? po.body : ''
    if (!id || !SLUG_RE.test(slug) || slugs.has(slug)) continue
    if (!title.trim() || title.length > 120) continue
    if (body.length >= PAGE_BODY_LIMIT) continue
    slugs.add(slug)
    // System flag is preserved for the 4 system slugs — clients cannot un-system them.
    const isSystem = po.system === true || SYSTEM_PAGE_SLUGS.includes(slug)
    pages.push({ id, slug, title, body, visible: po.visible === true, system: isSystem })
  }

  const template = typeof raw.template === 'string' && raw.template.trim() ? raw.template.trim().slice(0, 40) : 'growthrush'
  return { template, sections, pages }
}
