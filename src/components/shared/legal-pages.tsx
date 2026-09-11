'use client'

// GrowthRush — Legal pages (Terms of Service, Privacy Policy, Liability &
// Trademark Disclaimer). Full-text documents in EN + ES from src/lib/legal.ts.

import { useMemo } from 'react'
import { ArrowLeft, ChevronLeft, Rocket, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { legalDoc, LEGAL, type LegalKey } from '@/lib/legal'
import { themeVars } from '@/lib/themes'

export function isLegalDoc(v: string): v is LegalKey {
  return v === 'terms' || v === 'privacy' || v === 'responsibility'
}

export default function LegalPages({ doc }: { doc: LegalKey }) {
  const { lang } = useApp()
  const { t } = useI18n()
  const content = useMemo(() => legalDoc(doc, lang), [doc, lang])
  const meta = t(`legal.${doc}.title` as const)

  return (
    <div className="min-h-screen" style={themeVars('rush')}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button
            className="flex items-center gap-2"
            onClick={() => window.dispatchEvent(new Event('gr:exit'))}
            aria-label="Back to site"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
              <Rocket className="h-4 w-4 text-[var(--on-brand)]" />
            </span>
            <span className="font-extrabold tracking-tight">GrowthRush</span>
          </button>
          <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event('gr:exit'))}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {t('legal.back')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Title block */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--on-brand)]" style={{ background: 'var(--brand)' }}>
            <ShieldCheck className="h-6 w-6 text-[var(--on-brand)]" />
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{content.title}</h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
              {meta} · {t('legal.updated')}: {content.updated}
            </p>
          </div>
        </div>

        {/* Language switch between EN/ES full text */}
        <div className="mt-6 flex items-center gap-2 text-[12px]">
          <span className="font-bold text-zinc-500 dark:text-zinc-400">{t('legal.language')}:</span>
          {(Object.keys(LEGAL) as Array<'en' | 'es'>).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('gr:lang', { detail: l }))}
              className={`rounded-full border px-3 py-1 font-bold uppercase transition ${
                lang === l
                  ? 'border-transparent text-zinc-950'
                  : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
              }`}
              style={lang === l ? { background: 'var(--brand)' } : undefined}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Intro */}
        <div className="mt-6 rounded-2xl border bg-white dark:bg-zinc-900 p-5 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          {content.intro}
        </div>

        {/* Sections */}
        <article className="mt-6 space-y-4">
          {content.sections.map((s) => (
            <section key={s.h} className="rounded-2xl border bg-white dark:bg-zinc-900 p-5 sm:p-6">
              <h2 className="text-[16px] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{s.h}</h2>
              {s.ps?.map((p, i) => (
                <p key={i} className="mt-2.5 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">{p}</p>
              ))}
              {s.bullets && (
                <ul className="mt-2.5 space-y-1.5">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                      <ChevronLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 -scale-x-100" style={{ color: 'var(--brand)' }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        {/* Cross-links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(LEGAL.en) as LegalKey[]).filter((k) => k !== doc).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('gr:legal', { detail: k }))}
              className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-[12.5px] font-bold text-zinc-600 transition hover:border-zinc-400 dark:text-zinc-300"
            >
              {t(`legal.${k}.title`)}
            </button>
          ))}
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center dark:border-zinc-800">
        <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
          © {new Date().getFullYear()} GrowthRush · {t('legal.back')}
        </p>
      </footer>
    </div>
  )
}
