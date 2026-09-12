# Task 16-a — Admin Landing Studio (agent: Z.ai Code)

Date: 2025-11-26 · Branch state: uncommitted worktree shared with other rounds

## What was done

1. **`src/components/admin/admin-appearance.tsx` — full rebuild as "Landing Studio"**
   - Exported name kept: `AppearanceSection` (admin-panel.tsx imports it — untouched).
   - Header: `PanelPageHeader` title "Landing Studio" + "View landing" outline button that dispatches `window.dispatchEvent(new Event('gr:exit'))` (same pattern as admin-panel.tsx:162 / storefront / buy-platform).
   - Layout: 2-col on xl (`xl:grid-cols-[248px_1fr]`). LEFT = vertical section nav (horizontal scroll row on mobile): Hero, Stats bar, How it works, Features header, Pricing header, FAQ header, Final CTA, Theme — each with icon + hint + amber dot when that panel has unsaved edits. RIGHT = editor card for the selected section with a live preview strip.
   - Copy schema (`landing_copy` JSON, Setting key) extended — 12 NEW optional string keys + nested steps array. Admin studio defaults mirror landing.tsx hardcoded strings exactly. Special "empty = inherit default" fields (initialized '', dropped from JSON on save so the landing keeps its i18n/brand-aware/gradient defaults): `featuresTitle`, `pricingTitle`, `pricingSub`, `faqSub`, `ctaTitle`, `ctaSub`, `ctaButton`. Static fields prefilled (hero/stats/steps/eyebrows/faqTitle).
   - Editors: Hero (badge, 3 title lines — hint "line 3 is accent colored" on line 3, subtitle, 2 CTAs + compact hero preview card), Stats (4 fields + preview), Steps (stepsTitle + 3 rows of n/title/desc + preview), Features header (eyebrow+title), Pricing header (eyebrow+title+sub), FAQ header (eyebrow+title+sub), Final CTA (title+sub+button + preview), Theme (exact old THEMES picker, instant PATCH `landing_theme`, kept working).
   - Each copy panel has a Save button (brand bg + `text-[var(--on-brand)]`) that writes the FULL merged copy JSON via `PATCH /api/admin/settings {landing_copy}` (key already whitelisted in ALLOWED_KEYS — verified in route). "Unsaved changes" amber pill when draft ≠ saved; Save disabled when clean/saving.
   - Robust parsing: `normalizeCopy()` tolerates garbage JSON / garbage steps (per-field typeof guards, pads to 3 rows); `buildCopyJson()` drops empty strings + omits all-empty steps → round-trip stable (no phantom dirty after save). Verified in isolation with node (round-trip, garbage-safe, per-index fallback).
   - Uses `useApi('/api/admin/settings')` (GET returns full settings map), `mutate()`, `api.patch`, `refresh()` + `useApp().refreshPublic()` after saves. `useI18n()` for the i18n-backed placeholder/fallback strings.

2. **`src/components/landing/landing.tsx` — consumes the extended copy**
   - `LandingCopy` type extended with the 12 new optional keys + `steps?: {n,title,desc}[]` (new `StepCopy` type). Layout/design untouched — only strings now come from copy with `||` fallback to the EXACT previous hardcoded values (`||` chosen over `??` so an empty string can never blank a header; missing keys behave identically).
   - Replaced: Features SectionHead (eyebrow+title), Pricing SectionHead (eyebrow+title+sub), FAQ SectionHead (eyebrow+title+new optional sub), How-it-works SectionHead title (`stepsTitle`), Final CTA title/sub/button (default title keeps the gradient "SMM empire" span; default sub keeps `{brand}` interpolation). Showcase SectionHead left as-is (no copy fields in spec).
   - `steps`: computed `[0,1,2].map` merging `copy.steps` per-index over the `STEPS` const defaults (up to 3, shorter arrays fall back per-index AND per-field). Map key changed to `` `${i}-${s.n}` `` to avoid duplicate-key crashes with custom copy.

3. **`src/lib/i18n.ts`** — `'admin.appearance'` → `'Landing Studio'` in en/es/pt ONLY (3 lines). No other keys touched.

## Verification

- `bunx eslint admin-appearance.tsx landing.tsx i18n.ts` → 0 errors, 0 warnings.
- `bunx tsc --noEmit --incremental false` filtered `admin-appearance|landing|i18n` → NO errors.
- dev.log: no compile/runtime errors after hot reload; `GET / 200`.
- On-disk integrity asserted via node (bypasses the `[m` output filter): 'use client', no `any`, `text-[var(--on-brand)]` on all brand-bg elements, export name intact, 3× i18n value, 12 fallback sites in landing.tsx.

## Caveats for next agents

- **PRE-EXISTING tsc error (NOT from this task, file outside my allowed list):** `src/components/admin/admin-providers.tsx(164,23): TS2339 Property 'message' does not exist on type 'ImportResult'` — introduced by round 16-b's import dialog. Principal should fix in its own pass.
- The old admin DEFAULT_COPY values ('Grow every…', 'The #1 SMM Panel…') did NOT match the real landing defaults; the studio now uses the landing's true defaults. Stored DB `landing_copy` values still win over defaults (DB currently has a round-saved copy with statsOrders 12.4M etc.).
- Admin hero preview highlights line 3 (per spec, like the old preview) while the landing gradients line 2 — pre-existing mismatch, landing design was explicitly not to be changed.
- Save is per-panel but always serializes the whole merged copy (other sections never lost). Theme saves instantly as before.
