/**
 * Generates prisma/schema.postgres.prisma from prisma/schema.prisma:
 *  - provider sqlite → postgresql (Neon.tech compatible)
 *  - PostgreSQL maps String to native TEXT automatically, so no @db.* changes
 *    are needed. A square-brackets enum-safe datasource block is emitted.
 *
 * Run: bun scripts/make-postgres-schema.ts
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dir, '..')
const src = fs.readFileSync(path.join(ROOT, 'prisma/schema.prisma'), 'utf8')

let result = src
result = result.replace('// Prisma schema (SQLite)', '// Prisma schema (PostgreSQL — Neon.tech)')
result = result.replace(/datasource db \{[\s\S]*?\}/, `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`)

fs.writeFileSync(path.join(ROOT, 'prisma/schema.postgres.prisma'), result)
console.log('schema.postgres.prisma written')
