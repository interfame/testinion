// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Landing — "See live demo" interactive product tour.
// Auto-cycles through the five product mocks inside a fake browser frame;
// clicking a tab pauses the tour. CTA hands off to the one-click demo login.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MousePointerClick, Rocket, Sparkles } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { WindowDots, PanelDashboardMock, ClientPortalMock, InboxMock, AdminCommandMock, StorefrontMock } from './landing-mocks'

type DemoTab = {
  key: string
  host: string
  label: string
  node: React.ReactNode
}

export function DemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n()
  const [tab, setTab] = useState(0)
  const [auto, setAuto] = useState(true)

  const TABS: DemoTab[] = [
    { key: 'dashboard', host: 'panel.growthrush.io/dashboard', label: t('landing.demo.dashboard'), node: <PanelDashboardMock /> },
    { key: 'client', host: 'panel.growthrush.io/new-order', label: t('landing.demo.order'), node: <ClientPortalMock /> },
    { key: 'inbox', host: 'crm.growthrush.io/inbox', label: t('landing.demo.inbox'), node: <InboxMock /> },
    { key: 'admin', host: 'admin.growthrush.io', label: t('landing.demo.admin'), node: <AdminCommandMock /> },
    { key: 'storefront', host: 'kayasocial.growthrush.io', label: t('landing.demo.storefront'), node: <StorefrontMock /> },
  ]

  // Auto-tour while open (interval only — resets happen in handleOpenChange on close)
  useEffect(() => {
    if (!open || !auto) return
    const id = setInterval(() => setTab((v) => (v + 1) % TABS.length), 4800)
    return () => clearInterval(id)
  }, [open, auto])

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setTab(0)
      setAuto(true)
    }
    onOpenChange(v)
  }

  const pick = (i: number) => {
    setTab(i)
    setAuto(false)
  }

  const tryDemo = () => {
    handleOpenChange(false)
    window.dispatchEvent(new CustomEvent('gr:auth', { detail: 'login' }))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(96vw,920px)] gap-0 overflow-hidden rounded-3xl border-zinc-200/80 p-0 dark:border-zinc-800">
        <DialogHeader className="space-y-0 border-b border-zinc-100 dark:border-zinc-800/70 bg-[#fbf7f4] dark:bg-zinc-950 px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-black tracking-tight text-[var(--on-brand)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Rocket className="h-3.5 w-3.5" />
            </span>
            {t('landing.demo.title')}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {t('landing.demo.sub')}
          </DialogDescription>
        </DialogHeader>

        {/* Tab rail */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800/70 bg-white dark:bg-zinc-900 px-3 py-2 gr-scroll">
          {TABS.map((tb, i) => {
            const active = i === tab
            return (
              <button
                key={tb.key}
                onClick={() => pick(i)}
                className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                style={active ? { background: 'var(--brand)' } : undefined}
                aria-pressed={active}
              >
                {tb.label}
              </button>
            )
          })}
          {auto && (
            <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 sm:flex">
              <MousePointerClick className="h-3 w-3" />
              {t('landing.demo.hint')}
            </span>
          )}
        </div>

        {/* Fake browser frame with crossfading mocks */}
        <div className="relative bg-gradient-to-br from-[#f6f1ec] to-[#efe7df] dark:from-zinc-900 dark:to-zinc-950 p-4 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_30px_80px_-30px_rgba(23,20,26,0.45)] dark:border-zinc-800">
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-3 py-2">
              <WindowDots />
              <div className="mx-auto flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                {TABS[tab]?.host}
              </div>
              <span className="w-10" aria-hidden />
            </div>
            <div className="relative min-h-[300px] bg-white dark:bg-zinc-900">
              <AnimatePresence mode="wait">
                <motion.div
                  key={TABS[tab]?.key}
                  initial={{ opacity: 0, y: 14, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.32, ease: [0.21, 0.47, 0.32, 0.98] }}
                >
                  {TABS[tab]?.node}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800/70 bg-[#fbf7f4] dark:bg-zinc-950 px-5 py-4 sm:flex-row">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand-ink)' }} />
            {t('landing.demo.live')}
          </p>
          <Button
            onClick={tryDemo}
            className="h-10 rounded-full px-5 text-[13px] font-bold text-[var(--on-brand)] transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--brand)', boxShadow: '0 10px 30px -10px var(--brand-glow)' }}
          >
            {t('landing.demo.try')} <span className="ml-1.5">→</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
