import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handle, jsonOk } from '@/lib/auth'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const slug = (new URL(req.url).searchParams.get('slug') || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
    if (slug.length < 3) return jsonOk({ available: false, reason: 'Min 3 characters' })
    const taken = await db.platform.findUnique({ where: { slug } })
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'smtp', 'growthrush', 'panel']
    if (taken || reserved.includes(slug)) return jsonOk({ available: false, reason: `"${slug}" is not available` })
    return jsonOk({ available: true })
  })
}
