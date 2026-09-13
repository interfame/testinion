// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { jsonOk, handle } from '@/lib/auth'

export async function GET() {
  return handle(async () => {
    const currencies = await db.currency.findMany({ orderBy: { code: 'asc' } })
    return jsonOk({ currencies })
  })
}
