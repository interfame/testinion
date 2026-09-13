// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, handle, jsonError, jsonOk } from '@/lib/auth'

const INTEGRATION_META: Record<string, { name: string; desc: string; requiresExternalApi?: boolean }> = {
  meta: { name: 'Meta / WhatsApp', desc: 'WhatsApp Business Cloud API + Instagram DM.' },
  telegram: { name: 'Telegram Bot', desc: 'Bot API for support and order notifications.' },
  smtp: { name: 'SMTP Email', desc: 'Transactional emails for your storefront.' },
  openai: { name: 'OpenAI', desc: 'GPT models for your AI agents.' },
  claude: { name: 'Claude', desc: 'Anthropic models for your AI agents.' },
  gemini: { name: 'Gemini', desc: 'Google models for your AI agents.' },
  customProvider: { name: 'Custom SMM Provider API', desc: 'Connect any external SMM provider API.', requiresExternalApi: true },
  conversionApi: { name: 'Currency Conversion API', desc: 'Live FX rates for multi-currency.', requiresExternalApi: true },
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform', 404)
    let integrations: Record<string, { connected: boolean; keyMasked?: string }> = {}
    try {
      integrations = JSON.parse(platform.settings || '{}').integrations ?? {}
    } catch { /* empty */ }
    return jsonOk({ integrations, meta: INTEGRATION_META, externalApi: platform.externalApi })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser()
    const platform = await db.platform.findUnique({ where: { ownerId: user.id } })
    if (!platform) return jsonError('No platform', 404)
    const { key, connected, apiKey } = await req.json()
    if (!key || !(key in INTEGRATION_META)) return jsonError('Unknown integration')
    if (INTEGRATION_META[key].requiresExternalApi && connected && !platform.externalApi)
      return jsonError('This integration requires the External API add-on', 403)

    let settings: Record<string, unknown> = {}
    try { settings = JSON.parse(platform.settings || '{}') } catch { /* empty */ }
    const integrations = (settings.integrations as Record<string, { connected: boolean; keyMasked?: string }>) ?? {}
    integrations[key] = { connected: !!connected, ...(apiKey ? { keyMasked: `${String(apiKey).slice(0, 4)}***${String(apiKey).slice(-3)}` } : {}) }
    settings.integrations = integrations
    await db.platform.update({ where: { id: platform.id }, data: { settings: JSON.stringify(settings) } })
    return jsonOk({ integrations })
  })
}
