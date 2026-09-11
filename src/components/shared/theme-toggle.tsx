'use client'

// GrowthRush — light/dark mode toggle (persisted via next-themes).
// Icon visibility is CSS-driven from html.dark, so there is no hydration
// mismatch and no mounted-state dance.

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      className={className ?? 'gr-theme-toggle h-9 w-9 rounded-full'}
      onClick={() => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      title="Dark mode"
    >
      <Sun className="gr-tt-sun h-4 w-4 transition-transform hover:rotate-45" />
      <Moon className="gr-tt-moon h-4 w-4 absolute" />
      <style>{`
        .gr-theme-toggle .gr-tt-moon { display: none; }
        html.dark .gr-theme-toggle .gr-tt-sun { display: none; }
        html.dark .gr-theme-toggle .gr-tt-moon { display: block; }
      `}</style>
    </Button>
  )
}
