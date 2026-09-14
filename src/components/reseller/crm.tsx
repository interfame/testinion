// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// CRM Router — entry point for the reseller omnichannel CRM suite.
// Contract: export default CrmRouter({ section, onOpenInbox }).
// The platform is resolved INSIDE via useApp().user.platform (never via props).

import { useApp } from '@/components/shared/app-context'
import { themeVars } from '@/lib/themes'
import { NoPlatform } from './crm-shared'
import CrmInbox from './crm-inbox'
import CrmChannels from './crm-channels'
import CrmAgents from './crm-agents'
import CrmAutomations from './crm-automations'
import CrmContacts from './crm-contacts'
import CrmLabels from './crm-labels'
import CrmQuickReplies from './crm-quick-replies'
import CrmReports from './crm-reports'
import CrmSettings from './crm-settings'

export default function CrmRouter({
  section,
  onOpenInbox,
  focusConversationId,
  onFocusConsumed,
}: {
  section: string
  onOpenInbox?: () => void
  focusConversationId?: string | null
  onFocusConsumed?: () => void
}) {
  const { user } = useApp()
  const platform = user.platform ?? null

  if (!platform) return <NoPlatform />

  const pid = platform.id
  let content: React.ReactNode
  switch (section) {
    case 'channels':
      content = <CrmChannels platformId={pid} />
      break
    case 'agents':
      content = <CrmAgents platformId={pid} />
      break
    case 'automations':
      content = <CrmAutomations platformId={pid} />
      break
    case 'contacts':
      content = <CrmContacts platformId={pid} />
      break
    case 'labels':
      content = <CrmLabels platformId={pid} />
      break
    case 'quick-replies':
      content = <CrmQuickReplies platformId={pid} />
      break
    case 'reports':
      content = <CrmReports platformId={pid} />
      break
    case 'settings':
      content = <CrmSettings platformId={pid} />
      break
    case 'inbox':
    default:
      content = (
        <CrmInbox
          platformId={pid}
          onOpenInbox={onOpenInbox}
          focusConversationId={focusConversationId}
          onFocusConsumed={onFocusConsumed}
        />
      )
  }

  // Re-assert the theme vars so every CRM surface can rely on var(--brand).
  return (
    <div style={themeVars(platform.theme)} className="min-h-full">
      {content}
    </div>
  )
}
