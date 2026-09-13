// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'

/**
 * Referral program configuration (Admin → Settings → Referral program).
 *
 * Settings keys (all optional, safe defaults):
 *   ref_enabled         "0" | "1"   master switch — when off, new signups are not attributed
 *                                   and first-order bonuses stop accruing (default on)
 *   ref_bonus_amount    number      USD credited to the referrer on the referred user's
 *                                   FIRST completed order (default 1)
 *   ref_welcome_credit  number      USD welcome credit every new account receives (default 1)
 */

export const REFERRAL_KEYS = ['ref_enabled', 'ref_bonus_amount', 'ref_welcome_credit'] as const

export type ReferralConfig = {
  enabled: boolean
  bonusAmount: number
  welcomeCredit: number
}

const DEFAULTS: ReferralConfig = { enabled: true, bonusAmount: 1, welcomeCredit: 1 }

function parseAmount(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback
}

/** Read the referral config from the settings table (single small query). */
export async function getReferralConfig(): Promise<ReferralConfig> {
  const rows = await db.setting.findMany({ where: { key: { in: [...REFERRAL_KEYS] } } })
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return {
    enabled: map.ref_enabled !== '0',
    bonusAmount: parseAmount(map.ref_bonus_amount, DEFAULTS.bonusAmount),
    welcomeCredit: parseAmount(map.ref_welcome_credit, DEFAULTS.welcomeCredit),
  }
}

/** Format an amount as a plain USD label used across referral copy: "$1" / "$2.50" */
export function usdLabel(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}
