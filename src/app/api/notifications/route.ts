import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonOk } from '@/lib/auth'

/** Notification feed for the logged-in user (computed + stored events). */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)

    if (searchParams.get('unreadOnly') === '1') {
      const unread = await db.notification.count({ where: { userId: user.id, read: false } })
      return jsonOk({ unread })
    }

    const [notifications, unread] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.notification.count({ where: { userId: user.id, read: false } }),
    ])
    return jsonOk({ notifications, unread })
  })
}

/** Mark all (or one) notification as read */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const { id } = await req.json().catch(() => ({})) as { id?: string }
    if (id) {
      await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } })
    } else {
      await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
    }
    return jsonOk({ ok: true })
  })
}
