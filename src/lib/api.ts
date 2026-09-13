// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'

export class ApiError extends Error {}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`)
  return data as T
}

export const api = {
  get: <T,>(url: string) => request<T>(url),
  post: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T,>(url: string) => request<T>(url, { method: 'DELETE' }),
  /** DELETE with a JSON body (resource id) — plain `del` doesn't support bodies */
  delBody: <T,>(url: string, body: unknown) =>
    request<T>(url, { method: 'DELETE', body: JSON.stringify(body) }),
}

/** Simple data-fetching hook with manual refresh + optional polling */
export function useApi<T>(url: string | null, deps: unknown[] = [], pollMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    if (!url) return
    try {
      setLoading(true)
      const d = await api.get<T>(url)
      if (mounted.current) {
        setData(d)
        setError(null)
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Error')
    } finally {
      if (mounted.current) setLoading(false)
    }
     
  }, [url, ...deps])

  useEffect(() => {
    mounted.current = true
    refresh()
    return () => {
      mounted.current = false
    }
  }, [refresh])

  useEffect(() => {
    if (!pollMs || !url) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') api.get<T>(url).then((d) => { if (mounted.current) setData(d) }).catch(() => {})
    }, pollMs)
    return () => clearInterval(id)
  }, [url, pollMs])

  return { data, loading, error, refresh, setData }
}

/** POST/other mutation with error toast handling */
export async function mutate<T>(
  fn: () => Promise<T>,
  opts?: { success?: string; silent?: boolean }
): Promise<T | null> {
  try {
    const res = await fn()
    if (opts?.success) toast({ title: opts.success })
    return res
  } catch (e) {
    if (!opts?.silent) toast({ title: e instanceof Error ? e.message : 'Error', variant: 'destructive' })
    return null
  }
}
