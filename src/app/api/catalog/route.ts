// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/**
 * Returns categories (with brand icons) and services for the user's scope:
 * - users with platformId → that reseller's catalog
 * - everyone else → master GrowthRush catalog (platformId null)
 */
export async function GET(_req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platformId = user.platformId ?? null
    const categories = await db.category.findMany({
      where: { platformId, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      include: {
        services: {
          where: { status: 'ACTIVE' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    const providers = platformId
      ? await db.provider.findMany({ where: { platformId, status: 'ACTIVE' }, select: { id: true, name: true } })
      : await db.provider.findMany({ where: { platformId: null, status: 'ACTIVE' }, select: { id: true, name: true } })
    return jsonOk({ categories, providers })
  })
}
