'use client'

// GrowthRush — client-side CSV export helper.
// Builds a CSV string (RFC-4180-ish: quotes, commas, CRLF, BOM for Excel)
// and triggers a browser download without any server round-trip.

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  // BOM keeps Excel happy with UTF-8 (names, currencies, emoji…)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Uniform file names like `growthrush-orders-2026-09-11.csv` */
export function csvName(scope: string) {
  const d = new Date().toISOString().slice(0, 10)
  return `growthrush-${scope}-${d}.csv`
}
