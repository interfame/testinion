// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush portal/landing themes — Nova, Horizon, Boost, Rush
// Each theme drives: accent, gradient, dark tone, radius feel.

export type ThemeKey = 'rush' | 'nova' | 'horizon' | 'boost'

export type ThemePreset = {
  key: ThemeKey
  name: string
  accent: string
  accent2: string
  dark: string
  glow: string
  pattern: 'grid' | 'rings' | 'waves'
  preview: [string, string]
  /** Text color that sits ON TOP of the accent background (WCAG contrast).
   *  Light accents like the lime #c6e508 MUST use black text. */
  onBrand: string
  /** Darkened accent used as TEXT on light (white) surfaces — the raw accent
   *  is often too light to read on white (lime on white ≈ invisible).
   *  Dark mode keeps using --brand, so --brand-ink only targets light mode. */
  ink: string
}

/**
 * WCAG-relative-luminance contrast picker: returns black for light accents
 * (lime, yellow, light green…) and white for dark ones (violet, teal…).
 */
export function onBrandFor(accent: string): string {
  const hex = accent.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  // Contrast of black vs accent ≥ 4.5 → use black, else white
  return L * 0.05 + 0.05 >= 0.1791 ? '#0b0d03' : '#ffffff'
}

export const THEMES: Record<ThemeKey, ThemePreset> = {
  rush: {
    key: 'rush',
    name: 'Rush',
    accent: '#c6e508',
    accent2: '#e2fa4f',
    dark: '#15180a',
    glow: 'rgba(198,229,8,0.35)',
    pattern: 'grid',
    preview: ['#c6e508', '#15180a'],
    onBrand: '#0b0d03', // lime is light — black text always
    ink: '#55650a', // dark olive — lime darkened for white surfaces
  },
  nova: {
    key: 'nova',
    name: 'Nova',
    accent: '#7c3aed',
    accent2: '#a78bfa',
    dark: '#16121f',
    glow: 'rgba(124,58,237,0.35)',
    pattern: 'rings',
    preview: ['#7c3aed', '#16121f'],
    onBrand: '#ffffff',
    ink: '#6d28d9',
  },
  horizon: {
    key: 'horizon',
    name: 'Horizon',
    accent: '#0d9488',
    accent2: '#2dd4bf',
    dark: '#0c1717',
    glow: 'rgba(13,148,136,0.35)',
    pattern: 'waves',
    preview: ['#0d9488', '#0c1717'],
    onBrand: '#ffffff',
    ink: '#0f766e',
  },
  boost: {
    key: 'boost',
    name: 'Boost',
    accent: '#ea580c',
    accent2: '#fb923c',
    dark: '#1a120c',
    glow: 'rgba(234,88,12,0.35)',
    pattern: 'grid',
    preview: ['#ea580c', '#1a120c'],
    onBrand: '#ffffff',
    ink: '#c2410c',
  },
}

export function themeOf(key?: string | null): ThemePreset {
  if (key && key in THEMES) return THEMES[key as ThemeKey]
  return THEMES.rush
}

/** CSS variables to inject on a wrapper element */
export function themeVars(key?: string | null): React.CSSProperties {
  const t = themeOf(key)
  return {
    ['--brand' as string]: t.accent,
    ['--brand-2' as string]: t.accent2,
    ['--brand-dark' as string]: t.dark,
    ['--brand-glow' as string]: t.glow,
    ['--on-brand' as string]: t.onBrand,
    // AA-readable accent for TEXT on white cards. Declared as a "raw" var —
    // globals.css maps it onto --brand-ink per color-scheme (dark mode flips
    // back to the raw accent, which reads fine on dark backgrounds).
    ['--brand-ink-light' as string]: t.ink,
  }
}
