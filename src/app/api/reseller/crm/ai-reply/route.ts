// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'
import { generateAgentReply } from '@/lib/ai-agent'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform found for this account', 404)

    const body = await req.json().catch(() => ({}))
    const { conversationId } = body
    if (!conversationId) return jsonError('conversationId is required')

    const result = await generateAgentReply(String(conversationId))
    if (!result.ok) {
      if (result.reason === 'Conversation not found') return jsonError(result.reason, 404)
      if (result.reason === 'No active AI agent')
        return jsonError('No active AI agent configured. Create one in AI Agents.', 400)
      return jsonError(result.reason, 400)
    }

    return jsonOk({ message: result.message, agent: { name: result.agentName } })
  })
}
