/**
 * GrowthRush — generate prisma/seed.postgres.sql from a freshly seeded SQLite DB.
 *
 * The output can be pasted into the Neon SQL Editor (or psql) — no terminal needed
 * on the user's side: structure comes from prisma/postgres-schema.sql and the demo
 * data from this file.
 *
 * Usage:
 *   DATABASE_URL=file:/tmp/gr-seed.db bun scripts/seed.ts        # seed a fresh sqlite db
 *   bun scripts/dump-seed-sql.ts /tmp/gr-seed.db prisma/seed.postgres.sql
 *
 * How it works:
 *  1. Parses prisma/schema.postgres.prisma (scalar columns + relation FK edges).
 *  2. Reads every table from the SQLite file (bun:sqlite).
 *  3. Topologically orders tables so FKs are satisfied; nullable FKs that close
 *     a cycle (User.platformId ↔ Platform.ownerId) or self-references are inserted
 *     as NULL and patched with UPDATE statements at the end.
 *  4. Converts values: epoch-ms → 'ISO-8601' for TIMESTAMP(3), 0/1 → TRUE/FALSE
 *     for BOOLEAN, JSON text validated before quoting, strings escaped.
 */
import { Database } from 'bun:sqlite'
import { readFileSync, writeFileSync, statSync } from 'fs'

const SQLITE = process.argv[2] ?? '/tmp/gr-seed.db'
const OUT = process.argv[3] ?? 'prisma/seed.postgres.sql'

// ── 1. Parse the Postgres Prisma schema ──────────────────────────────────────
type Field = { name: string; type: string; nullable: boolean }
type Edge = { from: string; fk: string; target: string }
type Model = { name: string; scalars: Map<string, Field>; edges: Edge[] }

const models = new Map<string, Model>()
const schemaText = readFileSync('prisma/schema.postgres.prisma', 'utf8')
for (const m of schemaText.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
  const name = m[1]
  const scalars = new Map<string, Field>()
  const edges: Edge[] = []
  for (let line of m[2].split('\n')) {
    line = line.trim()
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue
    const fm = line.match(/^(\w+)\s+(String|Int|Float|Boolean|DateTime|Json)(\?)?(?=\s|\[@|$)/)
    if (fm) {
      scalars.set(fm[1], { name: fm[1], type: fm[2], nullable: fm[3] === '?' })
      continue
    }
    const rm = line.match(/^(\w+)\s+(\w+)\??\s+@relation\(([^)]*)\)/)
    if (rm) {
      const fkm = rm[3].match(/fields:\s*\[([^\]]+)\]/)
      if (fkm) for (const fk of fkm[1].split(',').map((s) => s.trim())) edges.push({ from: name, fk, target: rm[2] })
    }
  }
  models.set(name, { name, scalars, edges })
}

// ── 2. Read the SQLite DB ────────────────────────────────────────────────────
const sq = new Database(SQLITE, { readonly: true })
const tables = (sq.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%'").all() as { name: string }[]).map((r) => r.name).sort()
const data = new Map<string, { cols: string[]; rows: Record<string, unknown>[]; pk: string }>()
for (const t of tables) {
  const model = models.get(t)
  if (!model) throw new Error(`SQLite table "${t}" has no matching model in schema.postgres.prisma`)
  const info = sq.query(`PRAGMA table_info("${t}")`).all() as { name: string; pk: number }[]
  const pk = info.find((c) => c.pk)?.name ?? 'id'
  const cols = info.map((c) => c.name)
  for (const c of cols) {
    if (!model.scalars.has(c)) throw new Error(`Column "${t}.${c}" not found in Postgres model (drift or @map?)`)
  }
  const rows = sq.query(`SELECT * FROM "${t}"`).all() as Record<string, unknown>[]
  data.set(t, { cols, rows, pk })
}

// ── 3. Ordering: topo sort + nullable-edge handling for cycles/self-refs ────
const edges: Edge[] = []
for (const t of tables) for (const e of models.get(t)!.edges) if (data.has(e.target)) edges.push(e)

const depsOf = new Map<string, Set<string>>() // t -> targets it depends on
for (const t of tables) depsOf.set(t, new Set())
for (const e of edges) depsOf.get(e.from)!.add(e.target)

// Kahn over non-self edges: a table is ready when all its dependency targets are placed
const order: string[] = []
const indeg = new Map<string, number>()
const dependents = new Map<string, Set<string>>()
for (const t of tables) {
  indeg.set(t, 0)
  dependents.set(t, new Set())
}
for (const e of edges) {
  if (e.target === e.from) continue
  indeg.set(e.from, (indeg.get(e.from) ?? 0) + 1)
  dependents.get(e.target)!.add(e.from)
}
const ready = tables.filter((t) => (indeg.get(t) ?? 0) === 0)
while (ready.length) {
  const t = ready.shift()!
  order.push(t)
  for (const f of dependents.get(t)!) {
    indeg.set(f, (indeg.get(f) ?? 1) - 1)
    if ((indeg.get(f) ?? 0) === 0 && !order.includes(f) && !ready.includes(f)) ready.push(f)
  }
}
const leftover = tables.filter((t) => !order.includes(t))
// Leftover = cycle members (e.g. User ↔ Platform). Order them while ignoring
// NULLABLE edges — those FKs get inserted as NULL and patched with UPDATEs.
if (leftover.length) {
  const isNullableEdge = (from: string, to: string) =>
    edges.some((e) => e.from === from && e.target === to && models.get(from)!.scalars.get(e.fk)!.nullable)
  const placed = new Set<string>()
  const canPlace = (t: string) =>
    [...depsOf.get(t)!]
      .filter((d) => leftover.includes(d) && d !== t)
      .every((d) => placed.has(d) || isNullableEdge(t, d))
  const lready = leftover.filter(canPlace)
  while (lready.length) {
    const t = lready.shift()!
    order.push(t)
    placed.add(t)
    for (const t2 of leftover) if (!placed.has(t2) && !lready.includes(t2) && canPlace(t2)) lready.push(t2)
  }
  for (const t of leftover) if (!placed.has(t)) throw new Error(`Cannot order cyclic table "${t}" (non-nullable cycle FK?)`)
}

// Decide deferred FKs: any edge whose target table is not fully inserted before.
const pos = new Map(order.map((t, i) => [t, i]))
const deferred: Edge[] = []
const deferSet = new Set<string>() // `${from}.${fk}`
for (const e of edges) {
  const sameOrLater = (pos.get(e.target) ?? 0) >= (pos.get(e.from) ?? 0)
  const selfRef = e.target === e.from
  if (sameOrLater || selfRef) {
    const field = models.get(e.from)!.scalars.get(e.fk)!
    if (!field.nullable) throw new Error(`Cannot defer non-nullable FK ${e.from}.${e.fk} → ${e.target}: reorder needed`)
    deferred.push(e)
    deferSet.add(`${e.from}.${e.fk}`)
  }
}

// ── 4. Value conversion + SQL emission ───────────────────────────────────────
const q = (s: string) => `'${s.replace(/'/g, "''")}'`
function value(col: Field, v: unknown, ctx: string): string {
  if (v === null || v === undefined) return 'NULL'
  switch (col.type) {
    case 'Int':
      return String(Math.trunc(v as number))
    case 'Float':
      return String(v)
    case 'Boolean':
      return v ? 'TRUE' : 'FALSE'
    case 'DateTime': {
      const d = typeof v === 'number' ? new Date(v) : new Date(String(v))
      if (isNaN(d.getTime())) throw new Error(`Bad date at ${ctx}: ${v}`)
      return q(d.toISOString())
    }
    case 'Json': {
      const s = typeof v === 'string' ? v : JSON.stringify(v)
      JSON.parse(s) // validate
      return q(s)
    }
    default:
      return q(String(v))
  }
}

const lines: string[] = []
lines.push(`-- ─────────────────────────────────────────────────────────────`)
lines.push(`-- GrowthRush — demo data seed (PostgreSQL / Neon.tech)`)
lines.push(`-- Paste this AFTER prisma/postgres-schema.sql in the Neon SQL Editor.`)
lines.push(`-- Demo logins: admin@growthrush.io/admin123 · reseller@growthrush.io/reseller123 · client@growthrush.io/client123`)
lines.push(`-- ─────────────────────────────────────────────────────────────`)
lines.push(`BEGIN;`)

let insertCount = 0
for (const t of order) {
  const { cols, rows, pk } = data.get(t)!
  if (!rows.length) continue
  const model = models.get(t)!
  const effCols = cols.filter((c) => !deferSet.has(`${t}.${c}`) || true) // all cols; deferred ones forced NULL per row
  lines.push(``)
  lines.push(`-- ${t} (${rows.length})`)
  for (const row of rows) {
    const vals = effCols.map((c) => {
      const field = model.scalars.get(c)!
      const v = deferSet.has(`${t}.${c}`) ? null : row[c]
      return value(field, v, `${t}.${c}`)
    })
    lines.push(`INSERT INTO "${t}" (${effCols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`)
    insertCount++
  }
}

// Deferred FK patches
if (deferred.length) {
  lines.push(``)
  lines.push(`-- Deferred FKs (cycles / self-references)`)
  for (const e of deferred) {
    const { rows } = data.get(e.from)!
    for (const row of rows) {
      const v = row[e.fk]
      if (v === null || v === undefined) continue
      lines.push(`UPDATE "${e.from}" SET "${e.fk}" = ${value(models.get(e.from)!.scalars.get(e.fk)!, v, `${e.from}.${e.fk}`)} WHERE "${data.get(e.from)!.pk}" = ${q(String(row[data.get(e.from)!.pk]))};`)
      insertCount++
    }
  }
}

lines.push(``)
lines.push(`COMMIT;`)
lines.push(``)
writeFileSync(OUT, lines.join('\n'))

// ── 5. Report ────────────────────────────────────────────────────────────────
console.log(`✅ ${OUT} written (${Math.round(statSync(OUT).size / 1024)} KB)`)
console.log(`   tables: ${order.length} · rows+updates: ${insertCount} · deferred FK columns: ${deferSet.size ? [...deferSet].join(', ') : 'none'}`)
console.log(`   order: ${order.join(' → ')}`)
