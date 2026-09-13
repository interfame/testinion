// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// GrowthRush — realtime client bridge (socket.io)
//
// PanelShell opens ONE websocket per panel (subscribed to the user's room)
// and re-broadcasts every server event as a window CustomEvent `gr:rt`, so
// any widget (notification bell, orders table, dashboards) can react without
// opening its own connection.

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type RealtimeEvent = {
  type: string // 'notification' | 'order' | 'refresh' | ...
  [key: string]: unknown
}

/** Opens the panel-wide websocket and mirrors events onto window (`gr:rt`). */
export function useRealtimeBridge(userId: string | undefined, onStatus?: (connected: boolean) => void) {
  const [connected, setConnected] = useState(false)
  const userIdRef = useRef(userId)
  const statusRef = useRef(onStatus)

  useEffect(() => {
    userIdRef.current = userId
    statusRef.current = onStatus
  }, [userId, onStatus])

  useEffect(() => {
    if (!userId) return
    // Sandbox/preview: gateway route (`/?XTransformPort=3032`).
    // Self-hosted/Vercel: set NEXT_PUBLIC_REALTIME_URL to the public URL of the
    // realtime service (e.g. https://realtime.up.railway.app). If the socket
    // can't connect the UI automatically falls back to HTTP polling.
    const rtUrl = process.env.NEXT_PUBLIC_REALTIME_URL || '/?XTransformPort=3032'
    const socket: Socket = io(rtUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 2000,
      timeout: 8000,
    })

    const onConnect = () => {
      socket.emit('subscribe', userIdRef.current)
      setConnected(true)
      statusRef.current?.(true)
    }
    const onDisconnect = () => {
      setConnected(false)
      statusRef.current?.(false)
    }
    const onEvent = (e: RealtimeEvent) => {
      try {
        window.dispatchEvent(new CustomEvent('gr:rt', { detail: e }))
      } catch { /* ignore */ }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('gr:event', onEvent)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('gr:event', onEvent)
      socket.disconnect()
    }
  }, [userId])

  return connected
}

/** Subscribes a component to mirrored realtime events (optionally filtered by type). */
export function useRealtimeEvents(types: string[] | null, handler: (e: RealtimeEvent) => void) {
  const handlerRef = useRef(handler)
  const typesKey = types ? types.join(',') : 'all'

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const list = types ? typesKey.split(',') : null
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as RealtimeEvent
      if (!detail?.type) return
      if (list && !list.includes(detail.type)) return
      handlerRef.current(detail)
    }
    window.addEventListener('gr:rt', onEvent)
    return () => window.removeEventListener('gr:rt', onEvent)
  }, [typesKey])
}

/**
 * Server reachability fallback: pings `/api/health` every 30s ONLY while the
 * realtime socket is down (e.g. self-hosted/Vercel deploys without the
 * realtime service). Keeps the panel "Live" chip truthful — the platform is
 * online even when websockets aren't available.
 */
export function useServerHealth(pollWhen: boolean) {
  const [up, setUp] = useState(false)

  useEffect(() => {
    let dead = false
    const ping = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!dead) setUp(res.ok)
      } catch {
        if (!dead) setUp(false)
      }
    }
    if (pollWhen) {
      void ping()
      const timer = setInterval(ping, 30_000)
      return () => {
        dead = true
        clearInterval(timer)
      }
    }
    // Websocket is back — clear the fallback flag asynchronously (setState
    // inside callbacks keeps the effect lint-clean).
    const t = setTimeout(() => { if (!dead) setUp(false) }, 0)
    return () => {
      dead = true
      clearTimeout(t)
    }
  }, [pollWhen])

  return up
}
