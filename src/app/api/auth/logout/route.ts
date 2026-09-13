// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { clearSessionCookie, jsonOk, handle } from '@/lib/auth'

export async function POST() {
  return handle(async () => {
    await clearSessionCookie()
    return jsonOk({ ok: true })
  })
}
