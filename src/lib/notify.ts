import { db } from '@/lib/db'
import { emitToUsers } from '@/lib/realtime-server'

/** Fire-and-forget notification helper (never throws). Pushes over websocket too. */
export async function notify(userId: string, type: 'ORDER' | 'DEPOSIT' | 'TICKET' | 'MONEY' | 'CRM' | 'SYSTEM', title: string, body?: string, link?: string) {
  try {
    const notification = await db.notification.create({
      data: { userId, type, title, body: body ?? null, link: link ?? null },
    })
    emitToUsers([userId], {
      type: 'notification',
      notification: {
        id: notification.id,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
        read: false,
        createdAt: notification.createdAt,
      },
    })
  } catch (e) {
    console.error('[notify]', e)
  }
}
