// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — symmetric encryption helpers for secrets at rest
// (AI-agent API keys, channel tokens). AES-256-GCM with a server-side key.
//
// The key comes from APP_SECRET (or CRON_SECRET as a fallback). Never expose
// plaintext secrets through the API: store encrypt() output, read with decrypt(),
// and only ever RETURN mask() to clients.

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function key(): Buffer {
  const secret = process.env.APP_SECRET || process.env.CRON_SECRET || 'growthrush-dev-secret-key'
  // Derive a stable 32-byte key from whatever secret is configured.
  return crypto.createHash('sha256').update(secret).digest()
}

/** Encrypt a plaintext secret → "v1.<iv>.<tag>.<cipher>" (base64url parts). */
export function encryptSecret(plain: string): string {
  if (!plain) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.')
}

/** Decrypt a value produced by encryptSecret. Returns '' on any failure. */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return ''
  try {
    const [v, ivB64, tagB64, dataB64] = payload.split('.')
    if (v !== 'v1' || !ivB64 || !tagB64 || !dataB64) return ''
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

/** Human-safe preview of a secret: "sk-…9f2a" — safe to return to clients. */
export function maskSecret(payload: string | null | undefined): string | null {
  const plain = decryptSecret(payload)
  if (!plain) return null
  const tail = plain.slice(-4)
  const head = plain.slice(0, Math.min(3, Math.max(0, plain.length - 4)))
  return `${head}${'•'.repeat(6)}${tail}`
}
