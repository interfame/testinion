/**
 * Round UP (ceil) to 2 decimals — the single pricing rounding used everywhere
 * markups and charges are computed. Keeps client-facing prices clean (2 decimals)
 * while guaranteeing the platform never loses margin on fractional cents.
 *
 * Float-noise safe: values that are mathematically exact cents (3.0000000000000004)
 * snap back to 3 → 0.03 instead of incorrectly ceiling to 0.04.
 */
export function ceil2(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  const scaled = n * 100
  const snapped = Math.abs(scaled - Math.round(scaled)) < 1e-9 ? Math.round(scaled) : scaled
  return Math.ceil(snapped) / 100
}
