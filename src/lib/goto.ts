// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useEffect } from 'react'

/**
 * Global deep-link hook — reacts to `gr:goto` CustomEvents dispatched by
 * notification toasts ("View →" action) and other surfaces.
 * The handler receives the raw link (e.g. 'orders', 'crm-inbox:<id>', 'account').
 */
export function useGoto(handler: (link: string) => void) {
  useEffect(() => {
    const onGoto = (e: Event) => {
      const link = (e as CustomEvent).detail
      if (typeof link === 'string' && link) handler(link)
    }
    window.addEventListener('gr:goto', onGoto)
    return () => window.removeEventListener('gr:goto', onGoto)
  }, [handler])
}
