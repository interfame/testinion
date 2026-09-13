// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { db } from '@/lib/db'
import { jsonOk, handle } from '@/lib/auth'

export async function GET() {
  return handle(async () => {
    const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })
    return jsonOk({ plans })
  })
}
