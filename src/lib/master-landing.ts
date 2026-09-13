// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — Master landing copy
// The canonical landing/hero copy owned by the master platform. When a client
// buys their own platform, this exact copy is cloned into their storefront so
// "their landing looks the same as ours" from day one. They can then edit it
// freely from Reseller → Website → Landing (or re-clone after brand updates).

export const MASTER_LANDING = {
  tagline: 'One platform. Three powerful businesses.',
  heroTitle: 'Launch your own social media marketing business today',
  heroSubtitle:
    'Automated SMM orders, a built-in omnichannel CRM, AI-powered automations and white-label reseller plans. Everything you need to run — and resell — a social media empire.',
  heroCta: 'Get started free',
  heroImage: null as string | null,

  /** Hero stat band (storefront renders these with platform landingCopy.stats ?? this) */
  stats: {
    orders: '12.4M+',
    clients: '3,800+',
    services: '18,500+',
    uptime: '99.9%',
  },

  /** "How it works" — written for a CLIENT store (not the reseller SaaS pitch) */
  steps: [
    {
      n: '01',
      title: 'Create your account',
      desc: 'Sign up in seconds — no credit card required. New accounts get welcome credit to test the catalog for free.',
    },
    {
      n: '02',
      title: 'Add funds safely',
      desc: 'Top up your wallet with cards, PayPal or crypto. Every transaction is encrypted, logged and instantly available.',
    },
    {
      n: '03',
      title: 'Order & watch it grow',
      desc: 'Pick a service, drop your link and track progress live. Delivery starts within minutes, 24/7.',
    },
  ],

  /** Client-facing feature grid — icon is a lucide key resolved by the UI layer */
  features: [
    {
      icon: 'zap',
      title: 'Instant start',
      desc: 'Most orders kick off within 0–30 minutes and complete progressively. Speed is shown per service before you pay.',
    },
    {
      icon: 'refresh',
      title: '30-day refill',
      desc: 'Services marked with refill include an automatic guarantee — trigger a refill yourself from your portal within 30 days.',
    },
    {
      icon: 'shield',
      title: 'Safe & gradual drip-feed',
      desc: 'Spread delivery over days so growth looks natural and stays within platform limits. No password needed — ever.',
    },
    {
      icon: 'headset',
      title: '24/7 real human support',
      desc: 'Real people plus AI agents answer your tickets around the clock — usually in under 15 minutes.',
    },
    {
      icon: 'card',
      title: 'Secure payments',
      desc: 'Pay with credit cards, PayPal or crypto (USDT, BTC and more). Your wallet, ledger and data stay protected.',
    },
    {
      icon: 'code',
      title: 'Public API for agencies',
      desc: 'Automate orders with the standard SMM API v2 (services · add · status · balance) — included free with every account.',
    },
  ] as ReadonlyArray<{ icon: string; title: string; desc: string }>,
}
