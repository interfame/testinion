/**
 * GrowthRush seed — rich demo data
 * Run: bun scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
function apiKey(prefix = 'gr'): string {
  return `${prefix}_${randomBytes(20).toString('hex')}`
}
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

// [icon, name, color, [serviceName, rate, min, max, type?, desc?]]
const MASTER: [string, string, string, [string, number, number, number, string?, string?][]][] = [
  ['instagram', 'Instagram', '#E1306C', [
    ['Instagram Followers — Real HQ', 1.45, 100, 500000, undefined, 'Real and active followers with 30-day refill guarantee.'],
    ['Instagram Followers — Bot (Cheap)', 0.42, 100, 1000000, undefined, 'Fast bot followers, no refill.'],
    ['Instagram Likes — Instant', 0.35, 50, 100000, undefined, 'Instant likes, no drop.'],
    ['Instagram Views — Fast', 0.08, 100, 1000000],
    ['Instagram Story Views', 0.25, 100, 50000],
    ['Instagram Reels Views', 0.12, 500, 1000000],
    ['Instagram Comments — Custom', 8.5, 10, 5000, 'CUSTOM_COMMENTS', 'Write your own comments, one per line.'],
    ['Instagram Saves', 0.3, 100, 50000],
  ]],
  ['tiktok', 'TikTok', '#010101', [
    ['TikTok Followers — Real', 1.8, 100, 200000, undefined, 'High quality followers, smooth delivery.'],
    ['TikTok Likes', 0.28, 50, 200000],
    ['TikTok Views', 0.02, 1000, 10000000],
    ['TikTok Live Views (30 min)', 2.5, 50, 10000],
    ['TikTok Shares', 0.15, 100, 100000],
    ['TikTok Comments — Custom', 12.0, 10, 2000, 'CUSTOM_COMMENTS', 'Custom comments, one per line.'],
  ]],
  ['youtube', 'YouTube', '#FF0000', [
    ['YouTube Subscribers — Non-drop', 8.9, 50, 50000, undefined, 'Guaranteed non-drop subscribers with refill.'],
    ['YouTube Views — HR', 1.2, 1000, 1000000],
    ['YouTube Likes', 0.9, 50, 100000],
    ['YouTube Watch Time (4000h package)', 45.0, 1000, 400000],
    ['YouTube Comments — Custom', 25.0, 5, 1000, 'CUSTOM_COMMENTS', 'Custom comments, one per line.'],
    ['YouTube Shorts Views', 0.35, 500, 500000],
  ]],
  ['facebook', 'Facebook', '#1877F2', [
    ['Facebook Page Likes', 2.2, 100, 100000],
    ['Facebook Followers', 1.6, 100, 200000],
    ['Facebook Post Likes', 0.5, 50, 100000],
    ['Facebook Video Views', 0.15, 500, 500000],
    ['Facebook Group Members', 3.2, 100, 50000],
  ]],
  ['x', 'X (Twitter)', '#000000', [
    ['X Followers', 3.4, 100, 100000],
    ['X Likes', 0.6, 50, 50000],
    ['X Retweets', 0.8, 50, 50000],
    ['X Views', 0.05, 500, 1000000],
  ]],
  ['telegram', 'Telegram', '#26A5E4', [
    ['Telegram Channel Members', 1.9, 100, 100000, undefined, 'Real-looking members for channels and groups.'],
    ['Telegram Post Views', 0.03, 500, 2000000],
    ['Telegram Reactions', 0.35, 50, 50000],
    ['Telegram Premium Members', 6.5, 50, 20000],
  ]],
  ['spotify', 'Spotify', '#1DB954', [
    ['Spotify Followers', 1.1, 100, 100000],
    ['Spotify Plays', 0.25, 1000, 1000000],
    ['Spotify Monthly Listeners', 2.8, 500, 100000],
    ['Spotify Playlist Followers', 1.4, 100, 50000],
  ]],
  ['twitch', 'Twitch', '#9146FF', [
    ['Twitch Followers', 1.7, 100, 50000],
    ['Twitch Live Viewers (2h)', 4.8, 50, 5000],
    ['Twitch Clip Views', 0.1, 500, 200000],
  ]],
  ['linkedin', 'LinkedIn', '#0A66C2', [
    ['LinkedIn Followers', 6.9, 100, 20000],
    ['LinkedIn Post Likes', 2.4, 50, 10000],
    ['LinkedIn Connections', 9.5, 100, 10000],
  ]],
  ['pinterest', 'Pinterest', '#BD081C', [
    ['Pinterest Followers', 2.1, 100, 50000],
    ['Pinterest Saves', 0.8, 100, 50000],
    ['Pinterest Pin Views', 0.12, 500, 500000],
  ]],
  ['snapchat', 'Snapchat', '#F7CE00', [
    ['Snapchat Followers', 3.8, 100, 30000],
    ['Snapchat Story Views', 1.2, 100, 20000],
  ]],
  ['reddit', 'Reddit', '#FF4500', [
    ['Reddit Upvotes', 1.5, 10, 10000],
    ['Reddit Followers', 2.9, 100, 20000],
    ['Reddit Members (Subreddit)', 5.5, 100, 10000],
  ]],
  ['discord', 'Discord', '#5865F2', [
    ['Discord Members', 2.6, 100, 100000, undefined, 'Members for your server, smooth delivery.'],
    ['Discord Online Members (30 days)', 18.0, 25, 5000],
    ['Discord Reactions', 0.9, 50, 20000],
  ]],
  ['threads', 'Threads', '#000000', [
    ['Threads Followers', 2.8, 100, 50000],
    ['Threads Likes', 0.55, 50, 50000],
  ]],
  ['whatsapp', 'WhatsApp', '#25D366', [
    ['WhatsApp Channel Members', 3.5, 100, 50000],
    ['WhatsApp Post Reactions', 1.1, 50, 20000],
  ]],
  ['google', 'Google', '#4285F4', [
    ['Google Maps Reviews — Custom (5★)', 32.0, 5, 1000, 'CUSTOM_COMMENTS', '5-star reviews with custom text, one per line.'],
    ['Google Maps Rating', 18.0, 10, 5000],
    ['Google Search Views', 0.9, 500, 100000],
  ]],
  ['trustpilot', 'Trustpilot', '#00B67A', [
    ['Trustpilot Reviews — Custom (5★)', 28.0, 5, 1000, 'CUSTOM_COMMENTS', '5-star reviews with custom text.'],
    ['Trustpilot Followers', 4.2, 50, 10000],
  ]],
  ['vimeo', 'Vimeo', '#1AB7EA', [
    ['Vimeo Views', 0.35, 500, 200000],
    ['Vimeo Likes', 1.0, 50, 20000],
  ]],
  ['soundcloud', 'SoundCloud', '#FF5500', [
    ['SoundCloud Plays', 0.2, 1000, 2000000],
    ['SoundCloud Followers', 1.3, 100, 100000],
    ['SoundCloud Likes', 0.45, 100, 50000],
  ]],
  ['applemusic', 'Apple Music', '#FA243C', [
    ['Apple Music Plays', 0.55, 1000, 500000],
    ['Apple Music Followers', 2.2, 100, 50000],
  ]],
  ['shazam', 'Shazam', '#0088FF', [
    ['Shazam Plays', 0.85, 1000, 200000],
  ]],
  ['kick', 'Kick', '#53FC18', [
    ['Kick Followers', 1.95, 100, 50000],
    ['Kick Live Viewers (2h)', 5.5, 50, 5000],
  ]],
  ['wechat', 'WeChat', '#07C160', [
    ['WeChat Channel Followers', 4.5, 100, 20000],
  ]],
  ['signal', 'Signal', '#3A76F0', [
    ['Signal Group Members', 3.9, 100, 10000],
  ]],
  ['tumblr', 'Tumblr', '#36465D', [
    ['Tumblr Followers', 2.3, 100, 30000],
    ['Tumblr Reblogs', 1.05, 50, 20000],
  ]],
  ['medium', 'Medium', '#111111', [
    ['Medium Followers', 3.1, 100, 20000],
    ['Medium Claps', 1.4, 50, 10000],
  ]],
  ['quora', 'Quora', '#B92B27', [
    ['Quora Followers', 3.6, 100, 20000],
    ['Quora Upvotes', 1.6, 10, 10000],
  ]],
  ['clubhouse', 'Clubhouse', '#FF8A00', [
    ['Clubhouse Room Listeners (1h)', 7.8, 25, 2000],
  ]],
  ['googleplay', 'Google Play', '#34A853', [
    ['Google Play Installs', 1.35, 500, 100000],
    ['Google Play Reviews (5★)', 36.0, 5, 500, 'CUSTOM_COMMENTS'],
  ]],
  ['apple', 'App Store', '#111111', [
    ['App Store Installs', 1.65, 500, 50000],
    ['App Store Reviews (5★)', 38.0, 5, 500, 'CUSTOM_COMMENTS'],
  ]],
]

async function main() {
  const already = await db.setting.findUnique({ where: { key: 'seeded' } })
  if (already) {
    console.log('Already seeded — skipping.')
    return
  }

  // ── Settings ──────────────────────────
  const settings: Record<string, string> = {
    brand_name: 'GrowthRush',
    brand_tagline: 'SMM Panel · Omnichannel CRM · Reseller SaaS',
    landing_theme: 'rush',
    landing_copy: JSON.stringify({
      badge: 'One platform. Three powerful businesses.',
      heroTitle1: 'Launch your own',
      heroTitle2: 'social media marketing',
      heroTitle3: 'business today',
      heroSub: 'Automated SMM orders, a built-in omnichannel CRM, AI-powered automations and white-label reseller plans.',
      ctaPrimary: 'Get started free',
      ctaSecondary: 'See live demo',
      statsOrders: '12.4M',
      statsResellers: '3,180',
      statsServices: '4,920',
      statsUptime: '99.9%',
    }),
    subdomain_base: 'growthrush.io',
    conversion_api_url: '',
    conversion_mode: 'manual',
    external_api_price: '25',
    custom_domain_price: '15',
    seeded: '1',
  }
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
  }

  // ── Currencies ────────────────────────
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, isBase: true },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', rate: 1010 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 5.42 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', rate: 17.08 },
    { code: 'COP', name: 'Colombian Peso', symbol: '$', rate: 4110 },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$', rate: 945 },
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
  ]
  for (const c of currencies) {
    await db.currency.upsert({ where: { code: c.code }, create: c, update: c })
  }

  // ── Reseller plans ────────────────────
  const planData = [
    {
      name: 'Starter', slug: 'starter', monthlyPrice: 29, annualPrice: 290, customDomainPrice: 15, externalApiPrice: 25,
      maxServices: 300, maxOrders: 20000, portalDesigns: 'nova',
      description: 'Launch your first branded SMM panel on a free subdomain.',
      features: JSON.stringify(['Free subdomain + SSL', 'Nova portal design', 'Up to 300 services', 'Built-in CRM inbox', 'WhatsApp + email channels', 'Wallet & ledger', 'Standard support']),
      sortOrder: 1,
    },
    {
      name: 'Pro', slug: 'pro', monthlyPrice: 59, annualPrice: 590, customDomainPrice: 15, externalApiPrice: 25, popular: true,
      maxServices: 1500, maxOrders: 100000, portalDesigns: 'nova,horizon',
      description: 'Grow faster with automations, AI agents and 2 portal designs.',
      features: JSON.stringify(['Everything in Starter', 'Nova + Horizon portal designs', 'Up to 1,500 services', 'AI agents & automations', 'Telegram + Instagram channels', 'Custom domain support', 'Priority support']),
      sortOrder: 2,
    },
    {
      name: 'Agency', slug: 'agency', monthlyPrice: 119, annualPrice: 1190, customDomainPrice: 10, externalApiPrice: 15,
      maxServices: 100000, maxOrders: 1000000, portalDesigns: 'nova,horizon,boost',
      description: 'The full white-label suite: every design, every channel, no limits.',
      features: JSON.stringify(['Everything in Pro', 'All 3 portal designs', 'Unlimited services', 'External API connector discount', 'Team roles & staff', 'API access for your clients', 'Dedicated account manager']),
      sortOrder: 3,
    },
  ]
  const plans: Record<string, string> = {}
  for (const p of planData) {
    const created = await db.plan.upsert({ where: { slug: p.slug }, create: p, update: p })
    plans[p.slug] = created.id
  }

  // ── Users ─────────────────────────────
  await db.user.upsert({
    where: { email: 'admin@growthrush.io' },
    create: { email: 'admin@growthrush.io', password: hashPassword('admin123'), name: 'Victoria Rush', role: 'SUPER_ADMIN', apiKey: apiKey('gr_admin'), balance: 0, language: 'en' },
    update: {},
  })
  const reseller = await db.user.upsert({
    where: { email: 'reseller@growthrush.io' },
    create: { email: 'reseller@growthrush.io', password: hashPassword('reseller123'), name: 'Kaya Social', role: 'RESELLER', apiKey: apiKey('gr_res'), balance: 812.4, language: 'en' },
    update: {},
  })
  const client = await db.user.upsert({
    where: { email: 'client@growthrush.io' },
    create: { email: 'client@growthrush.io', password: hashPassword('client123'), name: 'Martin Duarte', role: 'CLIENT', apiKey: apiKey('gr_cli'), balance: 256.8, language: 'es' },
    update: {},
  })
  const extraClientsData = [
    { email: 'maria@growthrush.io', name: 'María González', balance: 94.2 },
    { email: 'lucas@growthrush.io', name: 'Lucas Ferreira', balance: 41.5 },
    { email: 'sofia.c@growthrush.io', name: 'Sofía Ramírez', balance: 12.0 },
  ]
  const extraClients = []
  for (const c of extraClientsData) {
    extraClients.push(
      await db.user.upsert({
        where: { email: c.email },
        create: { email: c.email, password: hashPassword('client123'), name: c.name, role: 'CLIENT', apiKey: apiKey('gr_cli'), balance: c.balance, language: 'es' },
        update: {},
      })
    )
  }

  // ── Master catalog ────────────────────
  const masterServices: { id: string; name: string }[] = []
  let sort = 0
  for (const [icon, name, color, services] of MASTER) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    let cat = await db.category.findFirst({ where: { platformId: null, slug } })
    if (!cat) {
      cat = await db.category.create({ data: { platformId: null, slug, name, icon, color, sortOrder: sort++ } })
    }
    let sSort = 0
    for (const [sName, rate, min, max, type, desc] of services) {
      const created = await db.service.create({
        data: {
          platformId: null,
          categoryId: cat.id,
          name: sName,
          rate, min, max,
          type: type ?? 'DEFAULT',
          description: desc ?? null,
          dripfeed: true,
          refill: !sName.includes('Bot'),
          featured: sSort === 0,
          sortOrder: sSort++,
        },
      })
      masterServices.push({ id: created.id, name: created.name })
    }
  }

  // ── Reseller platform ─────────────────
  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)
  const platform = await db.platform.upsert({
    where: { ownerId: reseller.id },
    create: {
      ownerId: reseller.id,
      name: 'Kaya Social',
      slug: 'kayasocial',
      planId: plans['pro'],
      theme: 'nova',
      accent: '#7c3aed',
      tagline: 'Grow your socials on autopilot',
      heroTitle: 'Real followers. Real fast.',
      heroSubtitle: 'Premium social media marketing services with instant delivery and 24/7 support.',
      heroCta: 'Boost now',
      currency: 'USD',
      monthlyFee: 59,
      nextBilling,
      settings: JSON.stringify({
        crm: { autoAssignAi: true, businessHours: '9-18', awayMessage: 'Thanks for reaching out! We will reply within a few hours.' },
        integrations: {
          meta: { connected: true }, telegram: { connected: true }, smtp: { connected: true },
          openai: { connected: true, keyMasked: 'sk-***9f2' }, claude: { connected: false }, gemini: { connected: false },
        },
      }),
    },
    update: {},
  })

  await db.user.update({ where: { id: extraClients[0].id }, data: { platformId: platform.id } })
  await db.user.update({ where: { id: extraClients[1].id }, data: { platformId: platform.id } })

  // reseller platform categories/services (25% markup over master)
  let rSort = 0
  const platServices: { id: string; name: string }[] = []
  for (const [icon, name, color] of MASTER.map(([i, n, c]) => [i, n, c] as [string, string, string])) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const cat = await db.category.create({
      data: { platformId: platform.id, slug, name, icon, color, sortOrder: rSort++ },
    })
    const masterCat = await db.category.findFirst({ where: { platformId: null, slug }, include: { services: true } })
    if (!masterCat) continue
    let sSort = 0
    for (const s of masterCat.services) {
      const created = await db.service.create({
        data: {
          platformId: platform.id,
          categoryId: cat.id,
          name: s.name,
          type: s.type,
          rate: Math.round(s.rate * 1.25 * 100) / 100,
          min: s.min,
          max: s.max,
          description: s.description,
          dripfeed: s.dripfeed,
          refill: s.refill,
          featured: sSort === 0,
          sortOrder: sSort++,
        },
      })
      platServices.push({ id: created.id, name: created.name })
    }
  }

  // providers
  await db.provider.create({ data: { platformId: null, name: 'GrowthRush Core API', apiUrl: 'https://api.growthrush.io/v2', markup: 0, balance: 15420.5 } })
  await db.provider.create({ data: { platformId: null, name: 'SMMKingProvider', apiUrl: 'https://smmking.net/api/v2', markup: 18, balance: 2310.0 } })
  await db.provider.create({ data: { platformId: platform.id, name: 'BestSMM Panel API', apiUrl: 'https://bestsmm.io/api/v2', apiKey: 'bsmm_live_***', markup: 22, balance: 640.75 } })

  // ── Orders ────────────────────────────
  const master = masterServices.slice(0, 24)
  const orderSpecs: [number, number, string, string][] = [
    [0, 5000, 'https://instagram.com/martinduarte', 'COMPLETED'],
    [2, 2000, 'https://instagram.com/p/Cx8k2mQpLre', 'COMPLETED'],
    [9, 100000, 'https://tiktok.com/@duarte.dev/video/7281', 'IN_PROGRESS'],
    [12, 1000, 'https://youtube.com/watch?v=dQw4w9WgXcQ', 'IN_PROGRESS'],
    [13, 500, 'https://youtube.com/watch?v=gCNeDWCI0vo', 'COMPLETED'],
    [17, 2000, 'https://t.me/duartechannel', 'PENDING'],
    [19, 10000, 'https://open.spotify.com/track/0VjIjW4GlUZ', 'PARTIAL'],
    [23, 300, 'https://facebook.com/martinduarte', 'CANCELED'],
  ]
  for (const [sIdx, qty, link, status] of orderSpecs) {
    const s = master[sIdx]
    const svc = await db.service.findUnique({ where: { id: s.id } })
    if (!svc) continue
    const charge = Math.round(((qty / 1000) * svc.rate + Math.random() * 0.5) * 100) / 100
    await db.order.create({
      data: {
        userId: client.id,
        serviceId: svc.id,
        serviceName: svc.name,
        link,
        quantity: qty,
        charge,
        startCount: rnd(1200, 80000),
        remains: status === 'COMPLETED' ? 0 : rnd(0, qty),
        status,
        dripfeed: qty > 5000,
        dripRuns: qty > 5000 ? 10 : 1,
        dripInterval: 60,
        createdAt: new Date(Date.now() - rnd(1, 20) * 86400000),
      },
    })
  }
  const plat = platServices.slice(0, 16)
  const platOrderSpecs: [number, number, string, string, string][] = [
    [0, 3000, 'https://instagram.com/mariagonzalez', 'COMPLETED', extraClients[0].id],
    [3, 50000, 'https://tiktok.com/@mariag/video/7231', 'IN_PROGRESS', extraClients[0].id],
    [7, 800, 'https://youtube.com/watch?v=aqz-KE-bpKQ', 'COMPLETED', extraClients[1].id],
    [10, 1200, 'https://t.me/mariagchannel', 'PENDING', extraClients[1].id],
    [14, 5000, 'https://open.spotify.com/album/1DFixLWuPkv3', 'IN_PROGRESS', extraClients[0].id],
  ]
  for (const [sIdx, qty, link, status, userId] of platOrderSpecs) {
    const s = plat[sIdx]
    const svc = await db.service.findUnique({ where: { id: s.id } })
    if (!svc) continue
    const charge = Math.round(((qty / 1000) * svc.rate) * 100) / 100
    await db.order.create({
      data: { platformId: platform.id, userId, serviceId: svc.id, serviceName: svc.name, link, quantity: qty, charge, remains: status === 'COMPLETED' ? 0 : rnd(0, qty), status, createdAt: new Date(Date.now() - rnd(1, 25) * 86400000) },
    })
  }

  // ── Transactions ──────────────────────
  const tx = (userId: string, type: string, amount: number, description: string, daysAgo = 1, method?: string) =>
    db.transaction.create({
      data: { userId, type, amount, description, method, createdAt: new Date(Date.now() - daysAgo * 86400000) },
    })
  await tx(client.id, 'DEPOSIT', 150, 'Deposit via PayPal', 12, 'PayPal')
  await tx(client.id, 'ORDER', -2.6, 'Order #1001 — Instagram Likes', 11)
  await tx(client.id, 'DEPOSIT', 120, 'Deposit via Crypto (Binance Pay)', 6, 'Crypto')
  await tx(client.id, 'ORDER', -7.25, 'Order #1002 — YouTube Views', 5)
  await tx(client.id, 'ORDER', -1.45, 'Order #1003 — Instagram Followers', 3)
  await tx(client.id, 'REFUND', 1.2, 'Partial refund — Order #1003', 2)
  await tx(reseller.id, 'DEPOSIT', 500, 'Deposit via Crypto (Binance Pay)', 20, 'Crypto')
  await tx(reseller.id, 'PLAN', -59, 'Kaya Social — Pro plan subscription', 8, 'Balance')
  await tx(reseller.id, 'ADDON', -25, 'External API connector — monthly', 8, 'Balance')
  await tx(reseller.id, 'DEPOSIT', 400, 'Deposit via PayPal', 2, 'PayPal')

  // ── Gateways ──────────────────────────
  const gatewayData = [
    { name: 'PayPal', type: 'PAYPAL', code: 'PAYPAL', feePercent: 0, sortOrder: 10 },
    { name: 'MercadoPago', type: 'CARD', code: 'MERCADOPAGO', feePercent: 0, sortOrder: 11 },
    { name: 'Pix', type: 'BANK', code: 'PIX', feePercent: 0, sortOrder: 12 },
    { name: 'Cryptomus', type: 'CRYPTO', code: 'CRYPTOMUS', feePercent: 0, sortOrder: 13 },
    { name: 'CoinPayments', type: 'CRYPTO', code: 'COINPAYMENT', feePercent: 0, sortOrder: 14 },
    { name: 'Payoneer', type: 'BANK', code: 'PAYONEER', feePercent: 0, sortOrder: 15 },
    { name: 'Bank Transfer', type: 'BANK', feePercent: 0, instructions: 'Send to IBAN AR30 0170 0911 0000 0012 3456 789 and submit the reference.', sortOrder: 20 },
  ]
  for (const g of gatewayData) await db.gateway.create({ data: { platformId: null, ...g } })
  await db.gateway.create({ data: { platformId: platform.id, name: 'Crypto (USDT TRC20)', type: 'CRYPTO', sortOrder: 2 } })

  // ── Deposits (reseller approval queue) ─
  await db.deposit.create({ data: { platformId: platform.id, userId: extraClients[0].id, amount: 50, method: 'Crypto (USDT)', reference: 'TX-8842', status: 'PENDING', note: 'Sent from TRON wallet' } })
  await db.deposit.create({ data: { platformId: platform.id, userId: extraClients[1].id, amount: 25, method: 'MercadoPago', reference: 'ORD-2231', status: 'PENDING' } })
  await db.deposit.create({ data: { platformId: platform.id, userId: extraClients[1].id, amount: 100, method: 'Crypto (USDT)', reference: 'TX-9910', status: 'APPROVED', createdAt: new Date(Date.now() - 5 * 86400000) } })
  await db.deposit.create({ data: { platformId: platform.id, userId: extraClients[2].id, amount: 18.5, method: 'MercadoPago', reference: 'ORD-2207', status: 'APPROVED', createdAt: new Date(Date.now() - 9 * 86400000) } })
  await db.deposit.create({ data: { platformId: platform.id, userId: extraClients[2].id, amount: 40, method: 'PayPal', reference: 'ORD-2101', status: 'REJECTED', createdAt: new Date(Date.now() - 11 * 86400000), note: 'No payment received' } })

  // ── Tickets ───────────────────────────
  const t1 = await db.ticket.create({
    data: { userId: client.id, subject: 'My followers order is slow', category: 'orders', priority: 'normal', status: 'ANSWERED' },
  })
  await db.ticketMessage.create({ data: { ticketId: t1.id, senderId: client.id, senderName: 'Martin Duarte', body: 'Hi! I ordered 5000 Instagram followers 6 hours ago and only 1200 arrived. Is that normal?' } })
  await db.ticketMessage.create({ data: { ticketId: t1.id, senderName: 'Support Team', isStaff: true, body: 'Hi Martin! Yes — this service uses drip-feed of 10 runs x 60 min. Your order will complete within ~4 more hours. Track it live in Orders.' } })
  const t2 = await db.ticket.create({
    data: { userId: client.id, subject: 'Refund for canceled order', category: 'billing', priority: 'low', status: 'OPEN' },
  })
  await db.ticketMessage.create({ data: { ticketId: t2.id, senderId: client.id, senderName: 'Martin Duarte', body: 'The canceled order was charged. Can you refund to my balance?' } })
  const t3 = await db.ticket.create({
    data: { platformId: platform.id, userId: extraClients[0].id, subject: 'Necesito factura con mi CUIT', category: 'billing', priority: 'high', status: 'OPEN' },
  })
  await db.ticketMessage.create({ data: { ticketId: t3.id, senderId: extraClients[0].id, senderName: 'María González', body: 'Hola! ¿Pueden enviarme la factura con mi CUIT 27-34123456-7?' } })

  // ── CRM for reseller platform ─────────
  const channelData = [
    { type: 'WHATSAPP', name: 'WhatsApp Business', handle: '+54 9 11 5555-0132', status: 'CONNECTED' },
    { type: 'INSTAGRAM', name: 'Instagram DM — @kayasocial', handle: '@kayasocial', status: 'CONNECTED' },
    { type: 'TELEGRAM', name: 'Telegram Bot', handle: '@kayasocial_bot', status: 'CONNECTED' },
    { type: 'MESSENGER', name: 'Facebook Page', handle: 'fb.com/kayasocial', status: 'DISCONNECTED' },
    { type: 'EMAIL', name: 'Support Email', handle: 'help@kayasocial.io', status: 'CONNECTED' },
    { type: 'WEBCHAT', name: 'Website Live Chat', handle: 'kayasocial.growthrush.io', status: 'DISCONNECTED' },
  ]
  for (const c of channelData) await db.channel.create({ data: { platformId: platform.id, ...c } })

  const labels = [
    { name: 'VIP', color: '#f59e0b' },
    { name: 'Lead', color: '#10b981' },
    { name: 'Support', color: '#6366f1' },
    { name: 'Whale', color: '#e11d48' },
  ]
  for (const l of labels) await db.label.create({ data: { platformId: platform.id, ...l } })

  const quickReplies = [
    { title: 'Price list', body: 'Hi! Here is our price list 👇 Instagram followers from $1.8/k, TikTok views from $0.03/k. Full catalog: kayasocial.growthrush.io/services', shortcut: '/prices' },
    { title: 'Payment methods', body: 'We accept Credit/Debit cards and Crypto (USDT TRC20). You can top up in seconds from your wallet 💳', shortcut: '/pay' },
    { title: 'Delivery time', body: 'Most orders start within 0-30 minutes. Big orders are drip-fed automatically to keep your account safe 🚀', shortcut: '/eta' },
    { title: 'Refund policy', body: 'If we cannot deliver your order you get an automatic refund to your balance, no questions asked ✅', shortcut: '/refund' },
    { title: 'Welcome', body: 'Hey! 👋 Welcome to Kaya Social. How can I help you grow today?', shortcut: '/hi' },
  ]
  for (const q of quickReplies) await db.quickReply.create({ data: { platformId: platform.id, ...q } })

  await db.aiAgent.createMany({
    data: [
      { platformId: platform.id, name: 'Sales Nova', provider: 'OPENAI', model: 'gpt-4o-mini', prompt: 'You are Nova, the friendly sales agent for Kaya Social, an SMM panel. Recommend services, quote prices from the catalog and upsell bundles. Always answer in the customer language.', knowledge: 'Instagram followers $1.8/k · TikTok views $0.03/k · YouTube subs $11/k. Bulk discount 10% over $100.', channels: JSON.stringify(['WHATSAPP', 'INSTAGRAM']), active: true, resolved: 412 },
      { platformId: platform.id, name: 'Support Horizon', provider: 'CLAUDE', model: 'claude-3-5-sonnet-latest', prompt: 'You are Horizon, a patient support agent. Help with order status, refills, refunds and wallet issues. Escalate billing disputes to human.', knowledge: 'Orders start 0-30 min. Refills 30 days. Refunds automatic on failure.', channels: JSON.stringify(['WHATSAPP', 'TELEGRAM', 'EMAIL']), active: true, resolved: 289 },
      { platformId: platform.id, name: 'VIP Concierge', provider: 'GEMINI', model: 'gemini-1.5-flash', prompt: 'You are the concierge for VIP customers. White-glove tone, priority handling.', knowledge: 'VIPs get 15% off with code VIP15.', channels: JSON.stringify(['WHATSAPP']), active: false, resolved: 47 },
    ],
  })

  await db.automation.createMany({
    data: [
      { platformId: platform.id, name: 'Welcome new contacts', trigger: 'WELCOME', actions: JSON.stringify([{ type: 'send_message', value: 'Hey! 👋 Welcome to Kaya Social. How can I help you grow today?' }, { type: 'add_label', value: 'Lead' }]), active: true, runs: 1240 },
      { platformId: platform.id, name: 'Keyword: prices', trigger: 'KEYWORD', matchValue: 'price,precios,cost,quanto', actions: JSON.stringify([{ type: 'send_message', value: 'Here is our full price list 👇 https://kayasocial.growthrush.io/services' }]), active: true, runs: 866 },
      { platformId: platform.id, name: 'Away hours (21h-9h)', trigger: 'AWAY_HOURS', matchValue: '21:00-09:00', actions: JSON.stringify([{ type: 'send_message', value: '🌙 We are away right now — an agent will reply first thing in the morning!' }]), active: true, runs: 512 },
      { platformId: platform.id, name: 'No-reply → handoff', trigger: 'NO_REPLY', matchValue: '10', actions: JSON.stringify([{ type: 'assign', value: 'Sofia Álvarez' }]), active: false, runs: 74 },
    ],
  })

  const contactsData = [
    { name: 'Camila Torres', phone: '+54 9 11 3421-8890', email: 'camila.torres@gmail.com', channel: 'WHATSAPP', labels: JSON.stringify(['VIP', 'Whale']), totalSpent: 2140.5, notes: 'Agency owner — buys weekly bundles.' },
    { name: 'Diego Morales', phone: '+54 9 351 812-3344', email: 'diego.morales@outlook.com', channel: 'WHATSAPP', labels: JSON.stringify(['Lead']), totalSpent: 89.0 },
    { name: 'Ana Paula Souza', phone: '+55 11 97654-2211', email: 'anapaula@gmail.com', channel: 'INSTAGRAM', labels: JSON.stringify(['VIP']), totalSpent: 987.25 },
    { name: 'Julián Herrera', phone: '+52 1 55 4321 9087', email: 'julian.h@gmail.com', channel: 'TELEGRAM', labels: JSON.stringify(['Support']), totalSpent: 43.7 },
    { name: 'Valentina Ríos', phone: '+57 320 555 0188', email: 'valentina.rios@gmail.com', channel: 'WHATSAPP', labels: JSON.stringify([]), totalSpent: 0 },
    { name: 'Bruno Almeida', phone: '+55 21 98877-1234', email: 'bruno.almeida@empresa.br', channel: 'EMAIL', labels: JSON.stringify(['Whale']), totalSpent: 5320.0, notes: 'Reseller in Brazil — monthly invoice.' },
    { name: 'Lucía Fernández', phone: '+54 9 11 6789-4412', email: 'lucia.f@gmail.com', channel: 'INSTAGRAM', labels: JSON.stringify(['Support']), totalSpent: 156.8 },
    { name: 'Andrés Silva', phone: '+56 9 8123 4567', email: 'andres.silva@gmail.com', channel: 'TELEGRAM', labels: JSON.stringify(['Lead']), totalSpent: 22.0 },
  ]
  const contactIds: string[] = []
  for (const c of contactsData) {
    const created = await db.contact.create({ data: { platformId: platform.id, ...c, lastSeen: new Date(Date.now() - rnd(0, 72) * 3600000) } })
    contactIds.push(created.id)
  }

  const conversationsData: { contact: number; channel: string; status: string; unread: number; msgs: [string, string, number][] }[] = [
    {
      contact: 0, channel: 'WHATSAPP', status: 'OPEN', unread: 2, msgs: [
        ['IN', 'Hola! Necesito 10k followers para mi cuenta de la agencia 🙌', 130],
        ['OUT', '¡Hola Camila! 🚀 Para 10k te recomiendo el servicio Real HQ: entrega suave y con refill. Queda en USD 18 por cada 1k.', 126],
        ['IN', 'Perfecto, y ¿puedo pagar con USDT?', 40],
        ['OUT', '¡Sí! Aceptamos USDT TRC20. Recargás acá: Finance → Add Funds y el saldo se acredita al instante ✅', 36],
        ['IN', 'Genial, ya recargué. ¿Puedo mandar el pedido ya?', 10],
        ['IN', 'Aprovecho: ¿tienen descuento por volumen? 👀', 8],
      ],
    },
    {
      contact: 1, channel: 'WHATSAPP', status: 'AI', unread: 0, msgs: [
        ['IN', 'hola, cuanto cuesta 1000 likes de instagram?', 300],
        ['OUT', '¡Hola! 👋 Los likes de Instagram salen $0.44 por cada 1.000. ¿Te preparo el pedido?', 298],
        ['IN', 'dale haceme 2000', 290],
        ['OUT', 'Listo 🙌 Te dejo el link para confirmar: kayasocial.growthrush.io/new-order — el servicio queda seleccionado.', 288],
      ],
    },
    {
      contact: 2, channel: 'INSTAGRAM', status: 'OPEN', unread: 1, msgs: [
        ['IN', 'Oi! Meu pedido #1042 tá parcial, pode verificar?', 220],
        ['OUT', 'Oi Ana! Vou verificar agora — seu pedido está em refill automático, faltam ~300 entregas. Finaliza em 2h 💜', 214],
        ['IN', 'Obrigada! Vou aguardar ❤️', 30],
      ],
    },
    {
      contact: 3, channel: 'TELEGRAM', status: 'HANDED', unread: 0, msgs: [
        ['IN', 'Mi tiktok no subió las vistas y ya pasaron 2 horas 😠', 500],
        ['OUT', 'Entiendo tu frustración, Julián. Déjame revisar el pedido con el proveedor y te confirmo en breve.', 495],
        ['OUT', 'Ya hablé con el proveedor: re-lanzaron la entrega. En 30 min debería moverse 📈', 120],
      ],
    },
    {
      contact: 5, channel: 'EMAIL', status: 'CLOSED', unread: 0, msgs: [
        ['IN', 'Hi team, can you send the monthly invoice for our reseller account? Bruno — Almeida Digital LTDA', 900],
        ['OUT', 'Hi Bruno! Invoice #INV-0182 attached. Total USD 5,320 for March. Any questions, just reply here. 🧾', 880],
      ],
    },
    {
      contact: 6, channel: 'INSTAGRAM', status: 'AI', unread: 3, msgs: [
        ['IN', 'hola tienen servicios para spotify?', 60],
        ['OUT', '¡Hola Lucía! 🎧 Sí: plays desde $0.31/k, seguidores $1.63/k y oyentes mensuales. ¿Para artista o playlist?', 55],
        ['IN', 'para artista, quiero llegar a 100k plays este mes', 50],
        ['OUT', 'Excelente meta 🚀 Te armo combo: 60k plays + 15k oyentes + 5k seguidores con 10% off. ¿Te lo separo?', 45],
        ['IN', 'dale!! cuanto sale total?', 12],
      ],
    },
  ]
  for (const conv of conversationsData) {
    const last = conv.msgs[conv.msgs.length - 1]
    const created = await db.conversation.create({
      data: {
        platformId: platform.id,
        contactId: contactIds[conv.contact],
        channel: conv.channel,
        status: conv.status,
        unread: conv.unread,
        lastMessage: last[1],
        lastMessageAt: new Date(Date.now() - last[2] * 60000),
        assignedName: conv.status === 'HANDED' ? 'Sofia Álvarez' : null,
      },
    })
    for (const [dir, body, minsAgo] of conv.msgs) {
      await db.message.create({
        data: { conversationId: created.id, direction: dir, body, createdAt: new Date(Date.now() - minsAgo * 60000), aiGenerated: dir === 'OUT' && conv.status === 'AI' },
      })
    }
  }

  // ── Content ───────────────────────────
  await db.news.createMany({
    data: [
      { platformId: null, title: '🚀 GrowthRush v1.4 — AI agents 2.0 & drip-feed pro', body: 'This release ships smarter AI agents with knowledge-base uploads, drip-feed scheduling per order, and a rebuilt omnichannel inbox with 3x faster load times.', pinned: true },
      { platformId: null, title: 'New payment methods: Binance Pay & PIX', body: 'Your clients can now top up with Binance Pay (zero fees) and Brazilian PIX with instant confirmation.', pinned: false },
      { platformId: null, title: 'Scheduled maintenance — Sunday 03:00 UTC', body: 'Expected downtime: 15 minutes. Orders in progress keep running; API may return 502 briefly.', pinned: false },
    ],
  })
  await db.faq.createMany({
    data: [
      { platformId: null, question: 'How fast do orders start?', answer: 'Most services start within 0-30 minutes. Large orders are drip-fed automatically to keep accounts safe.', category: 'Orders', sortOrder: 0 },
      { platformId: null, question: 'What payment methods do you accept?', answer: 'Credit/debit cards, PayPal, Crypto (Binance Pay, USDT) and bank transfer.', category: 'Payments', sortOrder: 1 },
      { platformId: null, question: 'Do you offer refunds?', answer: 'If we cannot deliver your order, it is refunded to your balance automatically. Partial deliveries are refunded pro-rata.', category: 'Payments', sortOrder: 2 },
      { platformId: null, question: 'Is there an API?', answer: 'Yes — a standard SMM API v2 endpoint is included with every account, plus API docs in your portal.', category: 'API', sortOrder: 3 },
      { platformId: null, question: 'Can I resell with my own brand?', answer: 'Absolutely. Buy a reseller plan and you get your own branded panel on a free subdomain or your custom domain.', category: 'Reseller', sortOrder: 4 },
      { platformId: null, question: 'Do services come with refill?', answer: 'Most services include a 30-day refill guarantee — check the refill badge on each service.', category: 'Orders', sortOrder: 5 },
    ],
  })
  await db.post.createMany({
    data: [
      { platformId: null, title: '10 SMM services every agency should white-label in 2025', slug: 'smm-services-agency-2025', excerpt: 'From Threads views to Google reviews — the services your clients ask for the most.', body: 'The SMM market keeps expanding. In 2025 agencies white-label entire ecosystems of services: followers, views, reviews, plays. The winners pick a niche and bundle services with real margins.' },
      { platformId: null, title: 'How AI agents cut support workload by 70%', slug: 'ai-agents-support-workload', excerpt: 'A practical guide to configuring AI agents that actually resolve tickets.', body: 'The secret is a tight knowledge base plus escalation rules. Start with the 20 questions that cover 80% of tickets...' },
      { platformId: null, title: 'Drip-feed: the safest way to deliver big orders', slug: 'drip-feed-safe-delivery', excerpt: 'Why dripping 10k followers over 48 hours beats instant delivery every time.', body: 'Platforms detect spikes. Drip-feed mimics organic growth and keeps refill rates near zero...' },
    ],
  })
  await db.cmsPage.createMany({
    data: [
      { platformId: null, title: 'About GrowthRush', slug: 'about', body: 'GrowthRush is the all-in-one SMM platform: order automation, omnichannel CRM and a white-label reseller SaaS in one dashboard.' },
      { platformId: null, title: 'Terms of Service', slug: 'terms', body: 'By using GrowthRush you agree to these terms...' },
      { platformId: null, title: 'Privacy Policy', slug: 'privacy', body: 'We process your data according to GDPR and local regulations...' },
      { platformId: null, title: 'Refund Policy', slug: 'refund-policy', body: 'Undelivered orders are refunded to your wallet automatically within 24 hours...' },
    ],
  })
  await db.blacklist.createMany({
    data: [
      { platformId: null, type: 'EMAIL', value: '*@tempmail.com', note: 'Disposable email domains' },
      { platformId: null, type: 'DOMAIN', value: 'competitor-agency.net', note: 'Known scraper' },
      { platformId: platform.id, type: 'KEYWORD', value: 'hack,crack,free followers generator', note: 'Auto-flag in chat' },
    ],
  })

  await db.teamMember.createMany({
    data: [
      { platformId: platform.id, name: 'Sofia Álvarez', email: 'sofia@kayasocial.io', role: 'SUPPORT', permissions: JSON.stringify(['inbox', 'tickets']) },
      { platformId: platform.id, name: 'Martín Costa', email: 'martin@kayasocial.io', role: 'FINANCE', permissions: JSON.stringify(['deposits', 'transactions']) },
      { platformId: platform.id, name: 'Leo Duarte', email: 'leo@kayasocial.io', role: 'CRM', permissions: JSON.stringify(['contacts', 'automations']) },
    ],
  })

  // Demo promo coupons (admin → Promo coupons; clients redeem in Add funds)
  await db.coupon.createMany({
    data: [
      { platformId: null, code: 'WELCOME10', value: 10, maxUses: 50, note: 'Launch campaign — first 50 redemptions' },
      { platformId: null, code: 'BOOST5', value: 5, maxUses: 0, note: 'Evergreen demo coupon' },
      { platformId: platform.id, code: 'KAYA10', value: 5, maxUses: 0, note: 'Storefront hero demo coupon' },
    ],
  })

  console.log('✅ Seed complete')
  console.log('   admin@growthrush.io / admin123')
  console.log('   reseller@growthrush.io / reseller123')
  console.log('   client@growthrush.io / client123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
