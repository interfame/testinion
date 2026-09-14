// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — real outbound delivery for CRM channels.
//
// WHATSAPP  → WhatsApp Cloud API (Graph v21.0): needs accessToken + phoneNumberId.
// TELEGRAM  → Bot API sendMessage: needs botToken. chat_id = contact handle.
// Others    → persisted in the inbox only (no external provider configured yet).
//
// Channel credentials live in Channel.config (JSON, encrypted at rest by the
// channels route). Everything here is server-side only.

export type ChannelCreds = {
  accessToken?: string
  phoneNumberId?: string
  botToken?: string
  verifyToken?: string
  [k: string]: unknown
}

export function parseChannelConfig(raw: string | null | undefined): ChannelCreds {
  try {
    const parsed = JSON.parse(raw || '{}')
    return typeof parsed === 'object' && parsed ? (parsed as ChannelCreds) : {}
  } catch {
    return {}
  }
}

export type SendResult = { sent: boolean; via: 'whatsapp' | 'telegram' | 'inbox-only'; error?: string }

/**
 * Send an outbound message through the channel's real provider API.
 * Returns sent=false (with no throw) when the channel has no API integration
 * — the message is still persisted so the CRM stays the source of truth.
 */
export async function sendChannelMessage(
  channelType: string,
  config: string | null | undefined,
  to: string | null | undefined,
  body: string
): Promise<SendResult> {
  const creds = parseChannelConfig(config)
  const text = body.slice(0, 4000)

  if (channelType === 'WHATSAPP') {
    const { accessToken, phoneNumberId } = creds
    if (!accessToken || !phoneNumberId || !to) return { sent: false, via: 'inbox-only' }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(String(phoneNumberId))}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${String(accessToken)}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        return { sent: false, via: 'whatsapp', error: err?.error?.message || `WhatsApp API error ${res.status}` }
      }
      return { sent: true, via: 'whatsapp' }
    } catch (e) {
      return { sent: false, via: 'whatsapp', error: e instanceof Error ? e.message : 'WhatsApp request failed' }
    }
  }

  if (channelType === 'TELEGRAM') {
    const { botToken } = creds
    if (!botToken || !to) return { sent: false, via: 'inbox-only' }
    try {
      const res = await fetch(`https://api.telegram.org/bot${String(botToken)}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: to, text }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string }
      if (!res.ok || !data.ok) return { sent: false, via: 'telegram', error: data.description || `Telegram API error ${res.status}` }
      return { sent: true, via: 'telegram' }
    } catch (e) {
      return { sent: false, via: 'telegram', error: e instanceof Error ? e.message : 'Telegram request failed' }
    }
  }

  return { sent: false, via: 'inbox-only' }
}

/**
 * Validate channel credentials against the provider's live API.
 * Called when the reseller presses "Connect" — a channel only becomes
 * CONNECTED if the provider answers OK.
 */
export async function validateChannel(
  channelType: string,
  creds: ChannelCreds
): Promise<{ ok: boolean; detail: string; handle?: string }> {
  if (channelType === 'TELEGRAM') {
    const { botToken } = creds
    if (!botToken) return { ok: false, detail: 'Bot token is required' }
    try {
      const res = await fetch(`https://api.telegram.org/bot${String(botToken)}/getMe`)
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { username?: string }; description?: string }
      if (data.ok && data.result?.username) {
        return { ok: true, detail: `Bot @${data.result.username} verified`, handle: `@${data.result.username}` }
      }
      return { ok: false, detail: data.description || 'Telegram rejected this token' }
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'Could not reach Telegram' }
    }
  }

  if (channelType === 'WHATSAPP') {
    const { accessToken, phoneNumberId } = creds
    if (!accessToken || !phoneNumberId) return { ok: false, detail: 'Access token and phone number ID are required' }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(String(phoneNumberId))}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(String(accessToken))}`
      )
      const data = (await res.json().catch(() => ({}))) as {
        display_phone_number?: string
        verified_name?: string
        error?: { message?: string }
      }
      if (res.ok && (data.display_phone_number || data.verified_name)) {
        return {
          ok: true,
          detail: `WhatsApp number ${data.display_phone_number ?? phoneNumberId} verified`,
          handle: data.display_phone_number ?? undefined,
        }
      }
      return { ok: false, detail: data.error?.message || 'Meta rejected these credentials' }
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'Could not reach Meta Graph API' }
    }
  }

  // INSTAGRAM / MESSENGER / EMAIL / WEBCHAT — no external validation yet;
  // WEBCHAT is always valid (widget handled by this app), the rest need
  // credentials entered but are accepted as PENDING until Meta review completes.
  if (channelType === 'WEBCHAT') return { ok: true, detail: 'Web chat widget enabled' }
  return { ok: true, detail: 'Credentials saved — pending provider review' }
}
