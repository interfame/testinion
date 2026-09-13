// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/** News for user's scope (reseller platform news if member, else master news). */
export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platformId = user.platformId ?? null
    const news = await db.news.findMany({
      where: { platformId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    })
    return jsonOk({ news })
  })
}
