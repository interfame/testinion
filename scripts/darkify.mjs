#!/usr/bin/env node
// GrowthRush dark-mode class transformer.
// Appends `dark:` variants to light-only Tailwind classes, preserving exact
// light-mode rendering. Variant-prefix aware (hover:/group-hover:/focus:),
// skips tokens already preceded by dark:, never matches across '/' suffixes
// (bg-white/[0.07], bg-zinc-50/70 keep their own dedicated rules), idempotent.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CWD = '/home/z/my-project'
process.chdir(CWD)

const ROOTS = [
  'src/components/client',
  'src/components/reseller',
  'src/components/admin',
  'src/components/shared',
  'src/components/landing',
  'src/components/storefront',
  'src/components/app-root.tsx',
]
const SKIP_FILES = ['landing-mocks.tsx']

// [base token, dark base token (without the dark: prefix)]
const PAIRS = [
  ['bg-white/85', 'bg-zinc-900/80'],
  ['bg-white/70', 'bg-zinc-900/70'],
  ['bg-white/60', 'bg-zinc-900/60'],
  ['bg-white', 'bg-zinc-900'],
  ['bg-zinc-50/70', 'bg-zinc-900/50'],
  ['bg-zinc-50/60', 'bg-zinc-900/40'],
  ['bg-zinc-50', 'bg-zinc-900/60'],
  ['bg-zinc-100', 'bg-zinc-800/60'],
  ['bg-zinc-200', 'bg-zinc-800'],
  ['border-zinc-200', 'border-zinc-800'],
  ['border-zinc-100', 'border-zinc-800/70'],
  ['border-zinc-300', 'border-zinc-700'],
  ['divide-zinc-50', 'divide-zinc-800/60'],
  ['divide-zinc-100', 'divide-zinc-800/70'],
  ['text-zinc-900', 'text-zinc-50'],
  ['text-zinc-800', 'text-zinc-100'],
  ['text-zinc-700', 'text-zinc-200'],
  ['text-zinc-600', 'text-zinc-300'],
  ['text-zinc-500', 'text-zinc-400'],
  ['text-zinc-400', 'text-zinc-500'],
  ['text-zinc-300', 'text-zinc-600'],
  ['bg-rose-50', 'bg-rose-950/40'],
  ['bg-rose-100', 'bg-rose-950/60'],
  ['text-rose-700', 'text-rose-400'],
  ['text-rose-600', 'text-rose-400'],
  ['border-rose-300', 'border-rose-800'],
  ['border-rose-200', 'border-rose-900/60'],
  ['bg-emerald-50', 'bg-emerald-950/40'],
  ['text-emerald-700', 'text-emerald-400'],
  ['text-emerald-600', 'text-emerald-400'],
  ['border-emerald-200', 'border-emerald-900/60'],
  ['bg-amber-50', 'bg-amber-950/40'],
  ['text-amber-700', 'text-amber-400'],
  ['text-amber-600', 'text-amber-400'],
  ['border-amber-200', 'border-amber-900/60'],
  ['border-amber-300', 'border-amber-800'],
  ['bg-sky-50', 'bg-sky-950/40'],
  ['text-sky-700', 'text-sky-400'],
  ['text-sky-600', 'text-sky-400'],
  ['border-sky-200', 'border-sky-900/60'],
  ['bg-violet-50', 'bg-violet-950/40'],
  ['text-violet-700', 'text-violet-400'],
  ['text-violet-600', 'text-violet-400'],
  ['border-violet-200', 'border-violet-900/60'],
  ['bg-orange-50', 'bg-orange-950/40'],
  ['text-orange-700', 'text-orange-400'],
  ['text-orange-600', 'text-orange-400'],
  ['border-orange-200', 'border-orange-900/60'],
  ['bg-[#f6f6f8]', 'bg-zinc-950'],
  ['bg-[#fbf7f4]', 'bg-zinc-950'],
  ['ring-zinc-900', 'ring-zinc-100'],
  ['ring-zinc-100', 'ring-zinc-800'],
  ['from-zinc-700', 'from-zinc-800'],
  ['to-zinc-900', 'to-zinc-950'],
]

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (full.endsWith('.tsx')) yield full
  }
}

const files = []
for (const r of ROOTS) {
  try {
    const s = statSync(r)
    if (s.isDirectory()) files.push(...walk(r))
    else if (r.endsWith('.tsx')) files.push(r)
  } catch { /* not found */ }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
let totalChanges = 0
let touchedFiles = 0

for (const file of files) {
  if (SKIP_FILES.some((s) => file.includes(s))) continue
  const src = readFileSync(file, 'utf8')
  let out = src
  let changes = 0

  for (const [base, darkBase] of PAIRS) {
    // boundary (start/space/quote/backtick) + optional NON-dark variant prefix,
    // token must not be followed by word char, '/', ']', '[' (keeps opacity/arbitrary
    // suffixes intact) and not already followed by its dark: variant.
    // The variant prefix itself must not be 'dark:' (would re-process dark tokens).
    const re = new RegExp(
      `((?:^|[\\s"'\\\`])((?!dark:)[a-z][a-z-]*:)?)(${esc(base)})(?![\\w/\\]\\[-])(?! ?dark:)`,
      'g',
    )
    out = out.replace(re, (m, _pre, variant, _tok) => {
      const v = variant ?? ''
      changes++
      return `${m} dark:${v}${darkBase}`
    })
  }

  if (changes > 0) {
    writeFileSync(file, out)
    totalChanges += changes
    touchedFiles++
    console.log(`${file}: ${changes}`)
  }
}
console.log(`\nDone — ${totalChanges} class updates across ${touchedFiles} files`)
