import { randomInt } from 'crypto'
import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

// GrowthRush — Email engine (server-only).
// Master scope reads its provider config from global Settings (`mail_*` keys);
// reseller scopes read their own Platform.settings JSON blob (`mail: {...}`).
// Every send is recorded in EmailLog: SENT (SMTP ok) | FAILED (SMTP error) | OUTBOX (demo mode).

export const EMAIL_KEYS = ['welcome', 'verify_code', 'order_complete', 'deposit_approved', 'new_client'] as const
export type EmailKey = (typeof EMAIL_KEYS)[number]

export const EMAIL_KEY_LABELS: Record<EmailKey, string> = {
  welcome: 'Welcome email',
  verify_code: 'Verification code',
  order_complete: 'Order completed',
  deposit_approved: 'Deposit approved',
  new_client: 'New client alert',
}

export const EMAIL_VARS = ['name', 'email', 'code', 'platform', 'service', 'quantity', 'amount', 'link']

export type MailMode = 'outbox' | 'smtp'
export type MailConfig = {
  mode: MailMode
  host: string
  port: string
  user: string
  pass: string
  secure: string // '1' = implicit TLS on 465
  from: string
  fromName: string
}

type TemplatePair = { subject: string; body: string }
export type Vars = Record<string, string | number | undefined>

const LIME = '#c6e508'
const DARK = '#15180a'

// ─────────────────────────── Default templates ───────────────────────────

/** Shared email shell: 600px table, dark header bar with lime accent word, footer. */
function shell(inner: string, platform: string): string {
  const words = (platform || 'GrowthRush').split(' ')
  const last = words.pop() ?? 'GrowthRush'
  const head = words.join(' ')
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:${DARK};padding:22px 36px;">
        <table role="presentation" width="100%"><tr>
          <td style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
            ${head} <span style="color:${LIME};">${last}</span>
          </td>
          <td align="right" style="font-size:12px;font-weight:700;color:${LIME};letter-spacing:2px;">✦ SMM</td>
        </tr></table>
      </td>
    </tr>
    <tr><td style="height:3px;background:linear-gradient(90deg,${LIME},#e2fa4f);font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:36px 36px 8px 36px;">${inner}</td></tr>
    <tr>
      <td style="padding:24px 36px 32px 36px;border-top:1px solid #f0f0f0;margin-top:24px;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#a1a1aa;">Sent by {{platform}} · This is an automated message from your SMM panel.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-size:24px;font-weight:800;color:#18181b;letter-spacing:-0.4px;">${text}</h1>`
}
function para(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#52525b;">${text}</p>`
}
function cta(label: string, vars: Vars): string {
  const link = String(vars.link ?? '')
  if (!link) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px 0;"><tr>
    <td style="background:${DARK};border-radius:999px;">
      <a href="${link}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:${LIME};text-decoration:none;border-radius:999px;">${label}</a>
    </td>
  </tr></table>`
}

export const DEFAULT_TEMPLATES: Record<EmailKey, { subject: string; body: (v: Vars) => string }> = {
  welcome: {
    subject: 'Welcome to {{platform}} 🎉',
    body: (v: Vars) => shell(
      `${heading('Welcome aboard, {{name}}! 👋')}
      ${para('Your account is ready. You now have access to our full catalog of social media growth services — followers, likes, views and much more, delivered automatically.')}
      ${para('Top up your wallet, pick a service and watch your first order start in seconds. If you ever need a hand, our support team is one ticket away.')}
      ${cta('Open my panel', v)}`,
      String(v.platform ?? ''),
    ),
  },
  verify_code: {
    subject: 'Your verification code: {{code}}',
    body: (v: Vars) => shell(
      `${heading('Confirm your email')}
      ${para('Hi {{name}}, use the verification code below to activate your {{platform}} account. It expires in <b style="color:#18181b;">15 minutes</b>.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px 0 8px 0;">
        <div style="display:inline-block;padding:16px 36px;border:2px dashed ${LIME};border-radius:16px;background:#fbfdf0;">
          <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#18181b;font-family:'Courier New',monospace;">{{code}}</span>
        </div>
      </td></tr></table>
      ${para('Didn\'t request this? You can safely ignore this email — the code expires on its own.')}
      ${cta('Back to the panel', v)}`,
      String(v.platform ?? ''),
    ),
  },
  order_complete: {
    subject: 'Order completed ✅ — {{service}}',
    body: (v: Vars) => shell(
      `${heading('Your order is delivered! 🚀')}
      ${para('Hi {{name}}, great news — your order has been fully delivered.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;margin:6px 0 16px 0;"><tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px 0;font-size:13px;color:#71717a;">Service</p>
        <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#18181b;">{{service}}</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#71717a;">Quantity</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#18181b;">{{quantity}} units</p>
      </td></tr></table>
      ${para('Loved the results? Reorder in one tap or share {{platform}} with a friend to earn credit.')}
      ${cta('View my orders', v)}`,
      String(v.platform ?? ''),
    ),
  },
  deposit_approved: {
    subject: 'Deposit approved — {{amount}} 💰',
    body: (v: Vars) => shell(
      `${heading('Funds added to your wallet 💸')}
      ${para('Hi {{name}}, your deposit was approved and the funds are now available in your balance.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfdf0;border:1px solid ${LIME};border-radius:12px;margin:6px 0 16px 0;"><tr><td align="center" style="padding:18px 20px;">
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:1px;color:#71717a;">AMOUNT CREDITED</p>
        <p style="margin:0;font-size:30px;font-weight:800;color:#18181b;">{{amount}}</p>
      </td></tr></table>
      ${para('Ready to grow? Browse the catalog and place your next order in seconds.')}
      ${cta('Add a new order', v)}`,
      String(v.platform ?? ''),
    ),
  },
  new_client: {
    subject: 'New client on {{platform}} 🎉',
    body: (v: Vars) => shell(
      `${heading('You have a new client! 🥳')}
      ${para('<b style="color:#18181b;">{{name}}</b> ({{email}}) just created an account on your platform. Send them a welcome offer or check your catalog is looking sharp.')}
      ${para('Every new signup is a chance to build a loyal customer — keep an eye on their first order.')}
      ${cta('Open my panel', v)}`,
      String(v.platform ?? ''),
    ),
  },
}

// Resolve the pair (subject + html body) for a built-in template, with vars applied
function builtInPair(key: EmailKey, vars: Vars): TemplatePair {
  const t = DEFAULT_TEMPLATES[key]
  return { subject: t.subject, body: t.body(vars) }
}

/** Built-in default with the {{platform}} token left intact — what auto-seeded rows store. */
export function defaultPairRaw(key: EmailKey): TemplatePair {
  return { subject: DEFAULT_TEMPLATES[key].subject, body: DEFAULT_TEMPLATES[key].body({ platform: '{{platform}}' }) }
}

/** True when a stored row actually differs from the built-in default (i.e. it is a real override). */
export function isCustomOverride(row: { subject: string; body: string }, key: EmailKey): boolean {
  const def = defaultPairRaw(key)
  return row.subject !== def.subject || row.body !== def.body
}

// ─────────────────────────── Helpers ───────────────────────────

export function renderTemplate(text: string, vars: Vars): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== undefined ? String(vars[k]) : m,
  )
}

export function generateVerifyCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Brand name for a scope: platform name, or master brand_name setting, or GrowthRush. */
export async function brandNameOf(platformId: string | null): Promise<string> {
  try {
    if (platformId) {
      const p = await db.platform.findUnique({ where: { id: platformId }, select: { name: true } })
      if (p?.name) return p.name
    }
    const s = await db.setting.findUnique({ where: { key: 'brand_name' } })
    return s?.value || 'GrowthRush'
  } catch {
    return 'GrowthRush'
  }
}

/** Public URL for a scope (used as {{link}} fallback): storefront or master site. */
async function scopeLink(platformId: string | null): Promise<string> {
  if (platformId) {
    const p = await db.platform.findUnique({ where: { id: platformId }, select: { slug: true, customDomain: true, domainType: true } })
    if (p) return p.domainType === 'CUSTOM' && p.customDomain ? `https://${p.customDomain}` : `https://${p.slug}.growthrush.io`
  }
  return 'https://growthrush.io'
}

/** Lazily upsert default template rows on first use (safe for existing DBs). */
export async function ensureTemplates(platformId: string | null): Promise<void> {
  try {
    const existing = await db.emailTemplate.findMany({
      where: { platformId },
      select: { key: true },
    })
    const have = new Set(existing.map((r) => r.key))
    for (const key of EMAIL_KEYS) {
      if (have.has(key)) continue
      const pair = defaultPairRaw(key)
      await db.emailTemplate.create({ data: { platformId, key, subject: pair.subject, body: pair.body } })
    }
  } catch (e) {
    console.error('[email] ensureTemplates failed:', e instanceof Error ? e.message : e)
  }
}

export const MASTER_MAIL_KEYS = ['mail_mode', 'mail_host', 'mail_port', 'mail_user', 'mail_pass', 'mail_secure', 'mail_from', 'mail_from_name'] as const

function normalizeMode(v: string | undefined | null): MailMode {
  return v === 'smtp' ? 'smtp' : 'outbox'
}

/** Provider config for a scope. Master → global Settings; platform → Platform.settings JSON `mail`. */
export async function getMailConfig(platformId: string | null): Promise<MailConfig> {
  const def: MailConfig = { mode: 'outbox', host: '', port: '587', user: '', pass: '', secure: '0', from: '', fromName: '' }
  try {
    if (platformId) {
      const p = await db.platform.findUnique({ where: { id: platformId }, select: { settings: true } })
      const json = JSON.parse(p?.settings || '{}') as { mail?: Record<string, unknown> }
      const m = json.mail ?? {}
      return {
        mode: normalizeMode((m.mode as string) ?? ((m.host && m.user) ? 'smtp' : 'outbox')),
        host: (m.host as string) ?? '',
        port: String(m.port ?? '587'),
        user: (m.user as string) ?? '',
        pass: (m.pass as string) ?? '',
        secure: m.secure === '1' || m.secure === true ? '1' : '0',
        from: (m.from as string) ?? '',
        fromName: (m.fromName as string) ?? '',
      }
    }
    const rows = await db.setting.findMany({ where: { key: { in: [...MASTER_MAIL_KEYS] } } })
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    return {
      mode: normalizeMode(map.mail_mode),
      host: map.mail_host ?? '',
      port: String(map.mail_port ?? '587'),
      user: map.mail_user ?? '',
      pass: map.mail_pass ?? '',
      secure: map.mail_secure === '1' ? '1' : '0',
      from: map.mail_from ?? '',
      fromName: map.mail_from_name ?? '',
    }
  } catch {
    return def
  }
}

export function maskMailConfig(cfg: MailConfig): MailConfig {
  return { ...cfg, pass: cfg.pass ? '••••••••' : '' }
}

/** Save master mail settings (Settings table) — masked values are ignored. */
export async function saveMasterMailConfig(patch: Partial<MailConfig>): Promise<void> {
  const entries: [string, string][] = []
  if (patch.mode !== undefined) entries.push(['mail_mode', normalizeMode(patch.mode)])
  if (patch.host !== undefined) entries.push(['mail_host', String(patch.host)])
  if (patch.port !== undefined) entries.push(['mail_port', String(patch.port)])
  if (patch.user !== undefined) entries.push(['mail_user', String(patch.user)])
  if (patch.pass !== undefined && !/^•+$/.test(String(patch.pass))) entries.push(['mail_pass', String(patch.pass)])
  if (patch.secure !== undefined) entries.push(['mail_secure', patch.secure === '1' ? '1' : '0'])
  if (patch.from !== undefined) entries.push(['mail_from', String(patch.from)])
  if (patch.fromName !== undefined) entries.push(['mail_from_name', String(patch.fromName)])
  for (const [key, value] of entries) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }
}

/** Save reseller mail settings (Platform.settings JSON `mail`) — masked values are ignored. */
export async function savePlatformMailConfig(platformId: string, patch: Partial<MailConfig>): Promise<void> {
  const p = await db.platform.findUnique({ where: { id: platformId }, select: { settings: true } })
  const json = (JSON.parse(p?.settings || '{}') ?? {}) as Record<string, unknown>
  const mail = (json.mail ?? {}) as Record<string, unknown>
  if (patch.mode !== undefined) mail.mode = normalizeMode(patch.mode)
  if (patch.host !== undefined) mail.host = String(patch.host)
  if (patch.port !== undefined) mail.port = String(patch.port)
  if (patch.user !== undefined) mail.user = String(patch.user)
  if (patch.pass !== undefined && !/^•+$/.test(String(patch.pass))) mail.pass = String(patch.pass)
  if (patch.secure !== undefined) mail.secure = patch.secure === '1' ? '1' : '0'
  if (patch.from !== undefined) mail.from = String(patch.from)
  if (patch.fromName !== undefined) mail.fromName = String(patch.fromName)
  json.mail = mail
  await db.platform.update({ where: { id: platformId }, data: { settings: JSON.stringify(json) } })
}

async function logEmail(platformId: string | null, to: string, subject: string, template: string | null, status: string, error?: string | null) {
  try {
    return await db.emailLog.create({ data: { platformId, to, subject, template, status, error: error ?? null } })
  } catch (e) {
    console.error('[email] log failed:', e instanceof Error ? e.message : e)
    return null
  }
}

async function smtpSend(cfg: MailConfig, to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const port = parseInt(cfg.port) || 587
    const secure = cfg.secure === '1' || port === 465
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port,
      secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
    await transporter.sendMail({
      from: cfg.fromName ? `"${cfg.fromName.replace(/"/g, '')}" <${cfg.from || cfg.user}>` : (cfg.from || cfg.user),
      to,
      subject,
      html,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SMTP send failed' }
  }
}

/**
 * Send a template email for a scope. Template resolution:
 * platform override → master override (DB) → built-in default.
 * ALWAYS writes an EmailLog row (SENT / FAILED / OUTBOX). Never throws.
 */
export async function sendTemplateEmail(
  platformId: string | null,
  key: EmailKey,
  to: string,
  vars: Vars = {},
): Promise<{ ok: boolean; mode: MailMode }> {
  try {
    if (!to) return { ok: false, mode: 'outbox' }
    await ensureTemplates(platformId)

    const platform = await brandNameOf(platformId)
    const link = await scopeLink(platformId)
    const fullVars: Vars = { name: '', email: to, code: '', service: '', quantity: '', amount: '', platform, link, ...vars }

    // Resolve template: platform override ?? master default row ?? built-in
    let subject: string | null = null
    let body: string | null = null
    const own = await db.emailTemplate.findFirst({ where: { platformId, key } })
    if (own) {
      subject = own.subject
      body = own.body
    } else if (platformId) {
      const master = await db.emailTemplate.findFirst({ where: { platformId: null, key } })
      if (master) {
        subject = master.subject
        body = master.body
      }
    }
    if (!subject || !body) {
      const pair = builtInPair(key, fullVars)
      subject = pair.subject
      body = pair.body
    }

    const html = renderTemplate(body, fullVars)
    const finalSubject = renderTemplate(subject, fullVars)

    const cfg = await getMailConfig(platformId)
    if (cfg.mode === 'smtp' && cfg.host && cfg.user) {
      const res = await smtpSend(cfg, to, finalSubject, html)
      await logEmail(platformId, to, finalSubject, key, res.ok ? 'SENT' : 'FAILED', res.error ?? null)
      return { ok: res.ok, mode: 'smtp' }
    }
    await logEmail(platformId, to, finalSubject, key, 'OUTBOX')
    return { ok: true, mode: 'outbox' }
  } catch (e) {
    console.error('[email] sendTemplateEmail failed:', e instanceof Error ? e.message : e)
    return { ok: false, mode: 'outbox' }
  }
}

/** Send an ad-hoc email (test button) — resolves config for the scope and logs it. */
export async function sendRawEmail(
  platformId: string | null,
  to: string,
  subject: string,
  html: string,
  template = 'test',
): Promise<{ ok: boolean; mode: MailMode; status: string; error?: string | null }> {
  const cfg = await getMailConfig(platformId)
  if (cfg.mode === 'smtp' && cfg.host && cfg.user) {
    const res = await smtpSend(cfg, to, subject, html)
    const status = res.ok ? 'SENT' : 'FAILED'
    await logEmail(platformId, to, subject, template, status, res.error ?? null)
    return { ok: res.ok, mode: 'smtp', status, error: res.error ?? null }
  }
  await logEmail(platformId, to, subject, template, 'OUTBOX')
  return { ok: true, mode: 'outbox', status: 'OUTBOX' }
}
