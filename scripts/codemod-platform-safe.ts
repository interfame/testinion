// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
//
// Codemod: make every single-line `db.platform.findUnique({ where: { ownerId: X } })`
// in the reseller API routes schema-drift-safe by routing it through
// resilientPlatformForOwner() / resilientPlatformById() (see src/lib/platform-safe.ts).
// Run once: bun scripts/codemod-platform-safe.ts

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = join(process.cwd(), 'src', 'app', 'api', 'reseller')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.ts')) out.push(p)
  }
  return out
}

const files = walk(ROOT)
let totalOwners = 0
let totalIds = 0
const touched: string[] = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  let out = src
  let usedOwner = false
  let usedId = false

  // `db.platform.findUnique({ where: { ownerId: X } })` → resilientPlatformForOwner(X)
  out = out.replace(/db\.platform\.findUnique\(\{\s*where:\s*\{\s*ownerId:\s*([A-Za-z0-9_.]+)\s*\}\s*\}\)/g, (_m, expr) => {
    usedOwner = true
    totalOwners++
    return `resilientPlatformForOwner(${expr})`
  })

  // `db.platform.findUnique({ where: { id: X } })` → resilientPlatformById(X)
  out = out.replace(/db\.platform\.findUnique\(\{\s*where:\s*\{\s*id:\s*([A-Za-z0-9_.]+)\s*\}\s*\}\)/g, (_m, expr) => {
    usedId = true
    totalIds++
    return `resilientPlatformById(${expr})`
  })

  if (!usedOwner && !usedId) continue

  // Add the import right after the last top-of-file import statement.
  if (!out.includes('@/lib/platform-safe')) {
    const names = [usedOwner && 'resilientPlatformForOwner', usedId && 'resilientPlatformById'].filter(Boolean).join(', ')
    const importLine = `import { ${names} } from '@/lib/platform-safe'\n`
    const lines = out.split('\n')
    let lastImport = -1
    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      if (lines[i].startsWith('import ')) lastImport = i
    }
    if (lastImport >= 0) lines.splice(lastImport + 1, 0, importLine.trimEnd())
    else lines.unshift(importLine.trimEnd())
    out = lines.join('\n')
  }

  writeFileSync(file, out)
  touched.push(file.replace(process.cwd() + '/', ''))
}

console.log(`ownerId rewrites: ${totalOwners}, id rewrites: ${totalIds}`)
console.log(touched.map((f) => `  ${f}`).join('\n'))
