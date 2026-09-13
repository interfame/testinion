// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// Brand icons (Simple Icons, CC0) served locally from /brand/*.svg
// Rendered with CSS mask + official brand color.

export type SocialIcon = { label: string; color: string }

export const SOCIAL_ICONS: Record<string, SocialIcon> = {
  instagram: { label: 'Instagram', color: '#E1306C' },
  tiktok: { label: 'TikTok', color: '#010101' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  x: { label: 'X (Twitter)', color: '#000000' },
  telegram: { label: 'Telegram', color: '#26A5E4' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  spotify: { label: 'Spotify', color: '#1DB954' },
  twitch: { label: 'Twitch', color: '#9146FF' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  pinterest: { label: 'Pinterest', color: '#BD081C' },
  snapchat: { label: 'Snapchat', color: '#F7CE00' },
  reddit: { label: 'Reddit', color: '#FF4500' },
  discord: { label: 'Discord', color: '#5865F2' },
  threads: { label: 'Threads', color: '#000000' },
  google: { label: 'Google', color: '#4285F4' },
  trustpilot: { label: 'Trustpilot', color: '#00B67A' },
  vimeo: { label: 'Vimeo', color: '#1AB7EA' },
  soundcloud: { label: 'SoundCloud', color: '#FF5500' },
  applemusic: { label: 'Apple Music', color: '#FA243C' },
  shazam: { label: 'Shazam', color: '#0088FF' },
  apple: { label: 'Apple', color: '#111111' },
  googleplay: { label: 'Google Play', color: '#34A853' },
  kick: { label: 'Kick', color: '#53FC18' },
  clubhouse: { label: 'Clubhouse', color: '#FF8A00' },
  wechat: { label: 'WeChat', color: '#07C160' },
  signal: { label: 'Signal', color: '#3A76F0' },
  tumblr: { label: 'Tumblr', color: '#36465D' },
  medium: { label: 'Medium', color: '#111111' },
  quora: { label: 'Quora', color: '#B92B27' },
}

export function socialIcon(icon: string): SocialIcon {
  return SOCIAL_ICONS[icon] ?? { label: icon, color: '#64748b' }
}
