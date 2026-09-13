// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const MAX_BYTES = 4 * 1024 * 1024 // 4MB — fits Vercel serverless body limits
const ALLOWED = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf', 'text/plain', 'text/csv', 'text/html',
  'application/zip', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

/** POST /api/uploads — multipart file upload → stored in DB, served at /api/media/<id> */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!file || !(file instanceof File)) return jsonError('No file received (send multipart/form-data with a "file" field)')
    if (file.size === 0) return jsonError('File is empty')
    if (file.size > MAX_BYTES) return jsonError(`File too large — max 4MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`)
    const mime = file.type || 'application/octet-stream'
    if (!ALLOWED.includes(mime)) return jsonError(`File type not allowed: ${mime || 'unknown'}`)
    const buf = Buffer.from(await file.arrayBuffer())
    const safeName = (file.name || 'file').replace(/[^\w.\-() ]+/g, '_').slice(0, 120)
    const media = await db.media.create({
      data: { name: safeName, mime, size: buf.length, data: buf, userId: user.id },
      select: { id: true, name: true, mime: true, size: true },
    })
    return jsonOk({ url: `/api/media/${media.id}`, id: media.id, name: media.name, mime: media.mime, size: media.size })
  })
}
