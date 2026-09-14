// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Growthrush — client error boundary.
//
// In production React unmounts the whole tree when a component throws, which
// looks like a blank white page to the user. This boundary catches render
// errors and shows a friendly recovery card (with the error message for
// support) instead of nothing.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw, LifeBuoy } from 'lucide-react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in the console so support can diagnose from a screenshot
    console.error('[Growthrush] render error:', error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf7f4] p-6 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </span>
          <h1 className="mt-4 text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Something went wrong
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            The page hit an unexpected error. Reloading usually fixes it — your data is safe.
          </p>
          {error?.message && (
            <p className="mt-3 max-h-24 overflow-y-auto rounded-lg bg-zinc-50 px-3 py-2 text-left text-[11.5px] font-medium text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400" style={{ scrollbarWidth: 'thin' }}>
              {error.message}
            </p>
          )}
          <button
            onClick={this.reset}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold text-[var(--on-brand)] transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-200 px-4 py-2.5 text-[13px] font-bold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <LifeBuoy className="h-4 w-4" />
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
