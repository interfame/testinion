import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError } from '@/lib/auth'

/** GET /api/media/<id> — streams an uploaded file (auth required, same-origin <img>/<a> send cookies). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser()
    const { id } = await params
    const media = await db.media.findUnique({ where: { id } })
    if (!media) return jsonError('File not found', 404)
    const buf = Buffer.from(media.data)
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': media.mime,
        'Content-Length': String(buf.length),
        'Content-Disposition': `inline; filename="${media.name.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  })
}
