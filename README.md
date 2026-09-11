# GrowthRush — SMM Panel · Omnichannel CRM · Reseller SaaS

Complete social media marketing platform: super-admin panel, reseller panel
with **Landing Studio** (visual landing editor + custom pages), white-label
storefronts, CRM inbox, blog, automated emails, multi-currency, multi-language
and multi-theme.

**Stack:** Next.js 16 (Node) + Prisma + PostgreSQL on **Neon.tech**.

## Install

Full installation guide (Neon.tech PostgreSQL + Node.js 20+):

**→ [INSTALL.md](./INSTALL.md)**

Quick start:

```bash
cp .env.example .env                            # set your Neon DATABASE_URL
npm install
npx prisma db push --schema prisma/schema.postgres.prisma
npx prisma generate --schema prisma/schema.postgres.prisma
npx tsx scripts/seed.ts                         # optional demo data
npm run build
npm run start:node                              # http://localhost:3000
```

Demo accounts (change immediately): `admin@growthrush.io / admin123` ·
`reseller@growthrush.io / reseller123` · `client@growthrush.io / client123`
