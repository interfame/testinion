import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonOk } from '@/lib/auth'

/** GET /api/admin/email/logs?take=100 — latest master-scope email logs */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { searchParams } = new URL(req.url)
    const take = Math.min(300, Math.max(1, parseInt(searchParams.get('take') ?? '') || 100))
    const logs = await db.emailLog.findMany({
      where: { platformId: null },
      orderBy: { createdAt: 'desc' },
      take,
    })
    return jsonOk({ logs })
  })
}
