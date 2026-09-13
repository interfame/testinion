import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonError, jsonOk } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Database self-check + one-click repair (SUPER_ADMIN only).
//
// Deploys can expect columns/tables that an older database does not have yet
// (e.g. Service."cost"). When that happens every affected query fails with
// "Internal server error". This endpoint reports exactly what is missing and
// applies the idempotent upgrade DDL (the same statements as
// prisma/postgres-upgrade.sql) without touching existing data.
// ─────────────────────────────────────────────────────────────────────────────

type Expected = { table: string; column: string }

// (table, column) pairs the current code expects to exist.
const EXPECTED_COLUMNS: Expected[] = [
  { table: 'Service', column: 'cost' },
  { table: 'TicketMessage', column: 'fileUrl' },
  { table: 'TicketMessage', column: 'fileName' },
  { table: 'TicketMessage', column: 'fileMime' },
  { table: 'TicketMessage', column: 'fileSize' },
  { table: 'CmsPage', column: 'metaTitle' },
  { table: 'CmsPage', column: 'metaDescription' },
]

const EXPECTED_TABLES = ['Media']

// Idempotent repair statements — safe to run any number of times.
const REPAIR_STATEMENTS: { label: string; sql: string }[] = [
  { label: 'Service.cost', sql: 'ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cost" DOUBLE PRECISION' },
  { label: 'TicketMessage.fileUrl', sql: 'ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT' },
  { label: 'TicketMessage.fileName', sql: 'ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileName" TEXT' },
  { label: 'TicketMessage.fileMime', sql: 'ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileMime" TEXT' },
  { label: 'TicketMessage.fileSize', sql: 'ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER' },
  { label: 'CmsPage.metaTitle', sql: 'ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT' },
  { label: 'CmsPage.metaDescription', sql: 'ALTER TABLE "CmsPage" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT' },
  {
    label: 'Media (table)',
    sql: `CREATE TABLE IF NOT EXISTS "Media" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "mime" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "data" BYTEA NOT NULL,
      "userId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
    )`,
  },
  { label: 'Media_id_key (index)', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "Media_id_key" ON "Media"("id")' },
]

async function missingItems(): Promise<string[]> {
  const missing: string[] = []

  // tables
  const tables = await db.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  )
  const have = new Set(tables.map((r) => r.table_name))
  for (const t of EXPECTED_TABLES) if (!have.has(t)) missing.push(`${t} (table)`)

  // columns
  const cols = await db.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
  )
  const colSet = new Set(cols.map((r) => `${r.table_name}.${r.column_name}`))
  for (const e of EXPECTED_COLUMNS) if (!colSet.has(`${e.table}.${e.column}`)) missing.push(`${e.table}.${e.column}`)

  return missing
}

/** True when the app runs on the local SQLite dev database (no repair needed there). */
async function isSqlite(): Promise<boolean> {
  try {
    await db.$queryRawUnsafe(`SELECT sqlite_version()`)
    return true
  } catch {
    return false
  }
}

/** GET /api/admin/system/db — { ok, missing: string[] } */
export async function GET() {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    if (await isSqlite()) return jsonOk({ ok: true, missing: [], managed: true })
    try {
      const missing = await missingItems()
      return jsonOk({ ok: missing.length === 0, missing })
    } catch {
      // information_schema itself failed — the DB may predate core tables
      return jsonOk({ ok: false, missing: ['unknown — could not read schema information'] })
    }
  })
}

/** POST /api/admin/system/db — run the idempotent upgrade, return per-item results */
export async function POST(_req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    if (await isSqlite()) {
      return jsonOk({
        ok: true,
        repaired: 0,
        failed: [],
        missing: [],
        note: 'Local SQLite database — its schema is managed automatically (prisma db push); repair is only needed for PostgreSQL/Neon.',
      })
    }

    const results: { label: string; ok: boolean; error?: string }[] = []

    for (const stmt of REPAIR_STATEMENTS) {
      try {
        await db.$executeRawUnsafe(stmt.sql)
        results.push({ label: stmt.label, ok: true })
      } catch (e) {
        results.push({ label: stmt.label, ok: false, error: e instanceof Error ? e.message : 'failed' })
      }
    }

    const repaired = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok)
    let missing: string[] = []
    try {
      missing = await missingItems()
    } catch {
      /* keep empty — repair results already reported */
    }
    return jsonOk({ ok: failed.length === 0 && missing.length === 0, repaired, failed, missing })
  })
}
