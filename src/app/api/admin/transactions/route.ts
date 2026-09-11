import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, handle, jsonOk } from '@/lib/auth'

/** GET /api/admin/transactions?type=&userId= — latest 200 money movements */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireRole(['SUPER_ADMIN'])
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (userId) where.userId = userId

    const transactions = await db.transaction.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return jsonOk({ transactions })
  })
}
