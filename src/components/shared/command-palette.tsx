'use client'

// GrowthRush — global command palette (⌘K / Ctrl+K).
// Mounted once inside PanelShell so every panel (client, reseller, admin)
// gets instant fuzzy navigation + quick actions. Also openable via the
// topbar search chip or the `gr:palette` window event.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  ArrowLeft, LogOut, Moon, RefreshCw, Search, Sun, ShoppingCart,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { SocialLogo } from '@/components/shared/social-logo'
import type { NavSection } from '@/components/shared/panel-shell'

export type PaletteService = {
  id: string
  name: string
  category: string
  categoryId: string
  icon?: string | null
  rate: number
}

export type ServiceSearch = {
  load: () => Promise<PaletteService[]>
  pick: (s: PaletteService) => void
}

export function CommandPalette({
  nav, onSelect, onExit, onLogout, serviceSearch,
}: {
  nav: NavSection[]
  onSelect: (key: string) => void
  onExit?: () => void
  onLogout: () => void
  serviceSearch?: ServiceSearch
}) {
  const [open, setOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const [services, setServices] = useState<PaletteService[] | null>(null)
  const servicesAt = useRef(0)

  const openPalette = useCallback(() => setOpen(true), [])

  // Lazily load the service catalog the first time the palette opens (TTL 60s)
  useEffect(() => {
    if (!open || !serviceSearch) return
    if (services && Date.now() - servicesAt.current < 60_000) return
    serviceSearch
      .load()
      .then((list) => {
        setServices(list)
        servicesAt.current = Date.now()
      })
      .catch(() => setServices(null))
  }, [open, serviceSearch, services])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onEvent = () => openPalette()
    window.addEventListener('keydown', onKey)
    window.addEventListener('gr:palette', onEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('gr:palette', onEvent)
    }
  }, [openPalette])

  const run = useCallback((fn: () => void) => {
    setOpen(false)
    // let the dialog close before mutating the view underneath
    setTimeout(fn, 60)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  const quick = [
    {
      label: 'Toggle dark mode', icon: resolvedTheme === 'dark' ? Sun : Moon,
      shortcut: '', run: toggleTheme,
      keywords: 'theme dark light mode oscuro',
    },
    ...(onExit ? [{
      label: 'Back to website', icon: ArrowLeft, shortcut: '',
      run: () => run(onExit), keywords: 'site home landing exit salir',
    }] : []),
    {
      label: 'Refresh panel data', icon: RefreshCw, shortcut: '',
      run: () => run(() => window.dispatchEvent(new CustomEvent('gr:refresh'))),
      keywords: 'reload sync update refrescar',
    },
    {
      label: 'Log out', icon: LogOut, shortcut: '',
      run: () => run(onLogout), keywords: 'signout exit salir cerrar sesion',
    },
  ]

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  const kbd = isMac ? '⌘K' : 'Ctrl K'

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search pages and quick actions"
      className="sm:max-w-[520px] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800"
    >
      <CommandInput placeholder="Type a page or action…" />
      <CommandList className="gr-scroll max-h-[340px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          {quick.map((q) => (
            <CommandItem
              key={q.label}
              value={`${q.label} ${q.keywords}`}
              onSelect={() => { setOpen(false); setTimeout(q.run, 60) }}
              className="gap-2.5 rounded-lg aria-selected:bg-[var(--brand)]/10 aria-selected:text-[var(--brand)]"
            >
              <q.icon className="h-4 w-4" />
              <span className="text-[13px] font-medium">{q.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {serviceSearch && services && services.length > 0 && (
          <CommandGroup heading="Order a service">
            {services.slice(0, 60).map((s) => (
              <CommandItem
                key={s.id}
                value={`service ${s.name} ${s.category} order buy`}
                onSelect={() => run(() => serviceSearch.pick(s))}
                className="gap-2.5 rounded-lg aria-selected:bg-[var(--brand)]/10 aria-selected:text-[var(--brand)]"
              >
                {s.icon ? (
                  <SocialLogo icon={s.icon} size={15} title={s.category} />
                ) : (
                  <ShoppingCart className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{s.name}</span>
                <CommandShortcut className="shrink-0 text-[10px] uppercase tracking-wide">
                  {s.category} · ${s.rate.toFixed(2)}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {nav.map((section, i) => (
          <CommandGroup
            key={i}
            heading={section.title ? `Go to · ${section.title}` : 'Go to'}
          >
            {section.items.map((item) => (
              <CommandItem
                key={item.key}
                value={`${item.label} ${item.key} ${section.title ?? ''}`}
                onSelect={() => run(() => onSelect(item.key))}
                className="gap-2.5 rounded-lg aria-selected:bg-[var(--brand)]/10 aria-selected:text-[var(--brand)]"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[13px] font-medium">{item.label}</span>
                {section.title ? (
                  <CommandShortcut className="text-[10px] uppercase tracking-wide">
                    {section.title}
                  </CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* hidden trigger for external callers + a11y description */}
      <button onClick={openPalette} className="sr-only" aria-label="Open command palette" tabIndex={-1} />
      <span className="sr-only">Press {kbd} to open the command palette</span>
      <Search className="hidden" aria-hidden />
    </CommandDialog>
  )
}

/** Compact topbar chip that opens the palette (icon-only on mobile). */
export function PaletteTrigger({ className }: { className?: string }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('gr:palette'))}
      aria-label="Search (Command palette)"
      title="Search — ⌘K"
      className={
        'group hidden h-9 items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-3 pr-2 text-[12px] font-semibold text-zinc-400 dark:text-zinc-500 transition hover:border-[var(--brand)]/40 hover:text-[var(--brand)] sm:flex ' +
        (className ?? '')
      }
    >
      <Search className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
      <span className="hidden md:inline">Search…</span>
      <kbd className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  )
}

/** Mobile-only icon trigger (keeps the topbar clean on small screens). */
export function PaletteTriggerMobile({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('gr:palette'))}
      aria-label="Search"
      title="Search"
      className={
        'flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 transition hover:border-[var(--brand)]/40 hover:text-[var(--brand)] sm:hidden ' +
        (className ?? '')
      }
    >
      <Search className="h-4 w-4" />
    </button>
  )
}
