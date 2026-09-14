// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.

// Growthrush — schema-drift-safe Platform reads.
//
// Deploys can ship code that expects newer columns (e.g. Platform."expiresAt")
// before the production database has been upgraded. A plain `findUnique`
// without an explicit select then fails with "column does not exist", which
// nukes /api/me and — worst case — leaves the whole panel blank for a logged
// in user. These helpers degrade gracefully instead:
//
//   1. try the full row (all current columns + plan)
//   2. on error, retry selecting only the long-standing columns + plan
//   3. on error again, return null (no platform — the UI already handles that)

import { db } from '@/lib/db'
import type { Plan, Platform } from '@prisma/client'

type PlatformWithPlan = Platform & { plan: Plan | null }

/** Long-standing columns every Platform table has had since the first release. */
const LEGACY_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  slug: true,
  domainType: true,
  customDomain: true,
  domainStatus: true,
  planId: true,
  status: true,
  theme: true,
  accent: true,
  logoUrl: true,
  tagline: true,
  heroTitle: true,
  heroSubtitle: true,
  heroCta: true,
  heroImage: true,
  currency: true,
  externalApi: true,
  cycle: true,
  monthlyFee: true,
  nextBilling: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
  plan: true,
} as const

/** Fetch a platform by owner id — never throws, returns null only when absent. */
export async function resilientPlatformForOwner(ownerId: string): Promise<PlatformWithPlan | null> {
  try {
    return await db.platform.findUnique({ where: { ownerId }, include: { plan: true } })
  } catch {
    try {
      // Database predates newer columns (expiresAt / suspendedAt) — use the
      // legacy subset so the session and panel keep working.
      return await db.platform.findUnique({
        where: { ownerId },
        select: { ...LEGACY_SELECT },
      }) as PlatformWithPlan | null
    } catch {
      return null
    }
  }
}

/** Fetch a platform by id — never throws, returns null when absent or drifted. */
export async function resilientPlatformById(id: string): Promise<PlatformWithPlan | null> {
  try {
    return await db.platform.findUnique({ where: { id }, include: { plan: true } })
  } catch {
    try {
      return await db.platform.findUnique({
        where: { id },
        select: { ...LEGACY_SELECT },
      }) as PlatformWithPlan | null
    } catch {
      return null
    }
  }
}
