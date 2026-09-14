// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.

// Base URL of the WhatsApp QR bridge used by the panel-hosted mode.
//
// Priority: WA_BRIDGE_URL env var (set it in Vercel → Settings → Environment
// Variables to the public Railway URL of your bridge) → local companion
// service on the same host (sandbox / VPS deployments).
export function waBridgeBase(): string {
  const url = (process.env.WA_BRIDGE_URL || '').trim().replace(/\/+$/, '')
  return url || 'http://127.0.0.1:3040'
}

/** The sentinel the frontend stores in channel config for "panel-hosted bridge". */
export const WA_BRIDGE_PANEL = '@panel'
