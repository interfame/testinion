// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

import { socialIcon } from '@/lib/social'

type Props = {
  icon: string
  size?: number
  className?: string
  title?: string
}

/**
 * Renders a real social-network logo using the locally bundled
 * Simple Icons SVG (public/brand/*.svg) masked with the official brand color.
 */
export function SocialLogo({ icon, size = 20, className = '', title }: Props) {
  const meta = socialIcon(icon)
  const mask = `url(/brand/${icon}.svg) center / contain no-repeat`
  return (
    <span
      role="img"
      aria-label={title ?? meta.label}
      title={title ?? meta.label}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: meta.color,
        WebkitMask: mask,
        mask,
      }}
    />
  )
}
