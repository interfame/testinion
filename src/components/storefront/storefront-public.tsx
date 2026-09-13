// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// GrowthRush — public white-label storefront (thin data wrapper).
// Fetches the storefront payload, resolves the Landing Studio config stored
// on the platform (settings JSON → `landing`) and hands everything to the
// config-driven <LandingRenderer/> — which draws every section, its order,
// its visibility and the pages linked in the footer.

import { ChevronLeft, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/components/shared/app-context'
import { useApi } from '@/lib/api'
import { defaultLandingConfig, sanitizeConfig, type LandingConfig } from '@/lib/landing-config'
import { LandingRenderer, type StorefrontData } from '@/components/storefront/landing-renderer'

/**
 * Public white-label storefront: visitors browse a reseller's catalog
 * with the reseller's own branding and can sign up under it.
 */
export default function StorefrontPublic() {
  const app = useApp()
  const slug = app.viewStorefrontSlug
  const { data, loading } = useApi<StorefrontData>(slug ? `/api/storefront?slug=${slug}` : null, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900/60">
        <Skeleton className="h-40 w-full max-w-2xl rounded-3xl" />
      </div>
    )
  }

  if (!data?.platform) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
          <Rocket className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-extrabold">Storefront not found</h1>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">This storefront doesn&apos;t exist or is no longer active.</p>
        <Button variant="outline" onClick={() => window.dispatchEvent(new Event('gr:exit'))}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to GrowthRush
        </Button>
      </div>
    )
  }

  // Landing Studio config stored on the platform — fall back to the default
  // layout when the platform has none or the stored shape is invalid.
  const config: LandingConfig = (data.landing && sanitizeConfig(data.landing)) || defaultLandingConfig()

  return <LandingRenderer platform={data.platform} data={data} config={config} />
}
