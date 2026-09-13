// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// GrowthRush — Payment gateway provider registry
// Shared by admin gateways, reseller "My Payment Methods" and checkout.
// Each provider defines the API credential fields the store owner must configure.
// Secret fields are masked on any GET response (never returned to the client).

export type GatewayField = {
  key: string
  label: string
  placeholder?: string
  secret?: boolean
  kind?: 'text' | 'select'
  options?: string[]
  hint?: string
  /** Optional fields never block isConfigured() / connect validation (default: required). */
  required?: boolean
}

export type GatewayProvider = {
  code: string
  name: string
  tagline: string
  icon: 'wallet' | 'card' | 'qr' | 'bitcoin' | 'coins' | 'landmark'
  fields: GatewayField[]
}

export const GATEWAY_PROVIDERS: Record<string, GatewayProvider> = {
  PAYPAL: {
    code: 'PAYPAL',
    name: 'PayPal',
    tagline: 'Global wallet & card checkout (REST API v2)',
    icon: 'wallet',
    fields: [
      { key: 'email', label: 'Business email', placeholder: 'billing@yourstore.com', required: false },
      { key: 'clientId', label: 'Client ID', placeholder: 'AeA1QIZX…', hint: 'Developer → Apps & Credentials' },
      { key: 'clientSecret', label: 'Client secret', secret: true, placeholder: 'EGnHDxD_qRPd…' },
      { key: 'mode', label: 'Mode', kind: 'select', options: ['SANDBOX', 'LIVE'] },
    ],
  },
  MERCADOPAGO: {
    code: 'MERCADOPAGO',
    name: 'MercadoPago',
    tagline: 'Checkout Pro + API (LatAm cards, Pix, OTC)',
    icon: 'card',
    fields: [
      { key: 'accessToken', label: 'Access token', secret: true, placeholder: 'APP_USR-…', hint: 'Tus integraciones → Credenciales de producción' },
      {
        key: 'currency', label: 'Currency', kind: 'select', required: false,
        options: ['USD', 'ARS', 'BRL', 'MXN', 'COP', 'CLP', 'PEN', 'UYU'],
        hint: 'Moneda con la que se cobra en MercadoPago (el monto se cobra 1:1 en esta moneda)',
      },
      { key: 'publicKey', label: 'Public key', placeholder: 'APP_USR_…', required: false },
      { key: 'webhookSecret', label: 'Webhook secret', secret: true, required: false, hint: 'Opcional: MP verifica pagos consultando la API' },
    ],
  },
  PIX: {
    code: 'PIX',
    name: 'Pix',
    tagline: 'Instant Brazilian bank transfers (QR dinámico)',
    icon: 'qr',
    fields: [
      { key: 'pixKey', label: 'Clave Pix', placeholder: 'email / CPF / EVP' },
      { key: 'holderName', label: 'Nombre del titular', placeholder: 'Juan Pérez' },
      { key: 'bank', label: 'Banco', placeholder: 'Nubank / BB / Mercado Pago' },
    ],
  },
  CRYPTOMUS: {
    code: 'CRYPTOMUS',
    name: 'Cryptomus',
    tagline: 'BTC, USDT, TON y 100+ criptos con liquidación automática',
    icon: 'bitcoin',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', placeholder: 'UUID del comercio' },
      { key: 'apiKey', label: 'API key', secret: true, placeholder: '****' },
      { key: 'webhookSecret', label: 'Webhook secret', secret: true, required: false },
    ],
  },
  COINPAYMENT: {
    code: 'COINPAYMENT',
    name: 'CoinPayments',
    tagline: '1900+ cryptocurrencies with IPN verification',
    icon: 'coins',
    fields: [
      { key: 'publicKey', label: 'Public key', placeholder: 'Client ID / public key' },
      { key: 'privateKey', label: 'Private key', secret: true },
      { key: 'ipnSecret', label: 'IPN secret', secret: true },
    ],
  },
  PAYONEER: {
    code: 'PAYONEER',
    name: 'Payoneer',
    tagline: 'Cross-border payouts & receiving accounts',
    icon: 'landmark',
    fields: [
      // Payoneer has no automated integration — every field is optional and the
      // gateway always behaves as a manual-instructions method.
      { key: 'payoneerId', label: 'Payoneer account ID', placeholder: '1042…', required: false },
      { key: 'email', label: 'Account email', placeholder: 'finance@yourstore.com', required: false },
      { key: 'apiUser', label: 'API user', placeholder: 'Program Partner API', required: false },
      { key: 'apiPassword', label: 'API password', secret: true, required: false },
    ],
  },
}

export const PROVIDER_CODES = Object.keys(GATEWAY_PROVIDERS)

export function providerOf(code?: string | null): GatewayProvider | null {
  if (!code) return null
  return GATEWAY_PROVIDERS[code] ?? null
}

/** Parse the gateway config JSON safely. */
export function parseConfig(json?: string | null): Record<string, string> {
  if (!json) return {}
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/**
 * True when every REQUIRED credential has a value. Selects are never required
 * (they carry UI defaults) and fields flagged `required: false` are optional —
 * e.g. MercadoPago runs real checkout with just the access token (+ currency).
 */
export function isConfigured(code: string, config: Record<string, unknown>): boolean {
  const p = GATEWAY_PROVIDERS[code]
  if (!p) return Object.keys(config).length > 0
  return p.fields.every(
    (f) =>
      f.required === false ||
      f.kind === 'select' ||
      String(config[f.key] ?? '').trim().length > 0,
  )
}

/** Required credential fields still missing from a config (connect validation). */
export function missingRequired(code: string, config: Record<string, string>): GatewayField[] {
  const p = GATEWAY_PROVIDERS[code]
  if (!p) return []
  return p.fields.filter(
    (f) => f.required !== false && f.kind !== 'select' && !String(config[f.key] ?? '').trim(),
  )
}

/** Mask secret fields so credentials never leave the server in clear text. */
export function maskConfig(code: string, config: Record<string, string>): Record<string, string> {
  const p = GATEWAY_PROVIDERS[code]
  const out: Record<string, string> = {}
  for (const f of p?.fields ?? Object.keys(config).map((k) => ({ key: k, label: k, secret: true }))) {
    const raw = String(config[f.key] ?? '')
    if (!raw) continue
    if (!f.secret) {
      out[f.key] = raw
      continue
    }
    if (raw.length <= 4) out[f.key] = '••••'
    else out[f.key] = `${raw.slice(0, 2)}••••${raw.slice(-4)}`
  }
  return out
}

/** Keep only known fields, coerce to string, cap length (server-side input hardening). */
export function sanitizeConfig(code: string, input: unknown): Record<string, string> {
  const p = GATEWAY_PROVIDERS[code]
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const f of p?.fields ?? []) {
    if (src[f.key] === undefined || src[f.key] === null) continue
    out[f.key] = String(src[f.key]).trim().slice(0, 400)
  }
  return out
}
