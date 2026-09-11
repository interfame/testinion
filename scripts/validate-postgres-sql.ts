/**
 * GrowthRush — validate the web-install SQL files against a REAL Postgres.
 * Uses @electric-sql/pglite (WASM Postgres) — no server needed.
 *
 *   bun scripts/validate-postgres-sql.ts
 *
 * Runs prisma/postgres-schema.sql (structure) + prisma/seed.postgres.sql (demo
 * data) exactly like the Neon SQL Editor would, then checks row counts, demo
 * logins and FK integrity.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'fs'

const structure = readFileSync('prisma/postgres-schema.sql', 'utf8')
const seed = readFileSync('prisma/seed.postgres.sql', 'utf8')

const db = new PGlite()

console.log('1) Running structure (prisma/postgres-schema.sql)…')
await db.exec(structure)
console.log('   ✅ structure OK')

console.log('2) Running demo data (prisma/seed.postgres.sql)…')
await db.exec(seed)
console.log('   ✅ seed OK')

// 3) Row counts per table
const tables = [...seed.matchAll(/INSERT INTO "(\w+)"/g)].map((m) => m[1])
const uniqueTables = [...new Set(tables)]
let total = 0
console.log('3) Row counts:')
for (const t of uniqueTables) {
  const r = await db.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM "${t}"`)
  const n = Number(r.rows[0].n)
  total += n
  console.log(`   ${t.padEnd(20)} ${n}`)
}
console.log(`   TOTAL: ${total} rows`)

// 4) Demo logins
const users = await db.query<{ email: string; role: string; balance: string; platformid: string | null }>(
  `SELECT email, role, balance, "platformId" AS platformid FROM "User" ORDER BY role`,
)
console.log('4) Demo users:')
for (const u of users.rows) console.log(`   ${u.email.padEnd(26)} ${u.role.padEnd(12)} balance=$${u.balance} platform=${u.platformid ?? '—'}`)

// 5) FK integrity spot checks (should all be zero)
const checks: [string, string][] = [
  ['Order → User', `SELECT COUNT(*) AS n FROM "Order" o LEFT JOIN "User" u ON u."id" = o."userId" WHERE u."id" IS NULL`],
  ['Order → Service', `SELECT COUNT(*) AS n FROM "Order" o LEFT JOIN "Service" s ON s."id" = o."serviceId" WHERE s."id" IS NULL`],
  ['Platform → Owner', `SELECT COUNT(*) AS n FROM "Platform" p LEFT JOIN "User" u ON u."id" = p."ownerId" WHERE u."id" IS NULL`],
  ['Service → Category', `SELECT COUNT(*) AS n FROM "Service" s LEFT JOIN "Category" c ON c."id" = s."categoryId" WHERE c."id" IS NULL`],
  ['Referral self-FK', `SELECT COUNT(*) AS n FROM "User" u LEFT JOIN "User" r ON r."id" = u."referredById" WHERE u."referredById" IS NOT NULL AND r."id" IS NULL`],
  ['CouponRedemption → Coupon', `SELECT COUNT(*) AS n FROM "CouponRedemption" cr LEFT JOIN "Coupon" c ON c."id" = cr."couponId" WHERE c."id" IS NULL`],
]
console.log('5) FK integrity:')
let fkBad = 0
for (const [label, sql] of checks) {
  const r = await db.query<{ n: string }>(sql)
  const n = Number(r.rows[0].n)
  if (n > 0) fkBad++
  console.log(`   ${label.padEnd(26)} orphans: ${n}`)
}

// 6) JSON + boolean spot check
const setting = await db.query<{ key: string; value: string }>(`SELECT key, value FROM "Setting" LIMIT 3`)
console.log('6) Settings sample:', setting.rows.map((s) => `${s.key}=${s.value.slice(0, 24)}`).join(' · '))

console.log(fkBad === 0 && total > 300 ? '\n🎉 VALIDATION PASSED — both files are Neon-ready.' : '\n❌ VALIDATION FAILED')
process.exit(fkBad === 0 && total > 300 ? 0 : 1)
