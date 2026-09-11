'use client'

// CRM Settings — away hours, away message and AI auto-assignment,
// stored inside the platform settings JSON under the `crm` key.

import { useRef, useState } from 'react'
import { Save, Settings } from 'lucide-react'
import { api, mutate, useApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { PageWrap } from './crm-shared'

type CrmSettingsData = { autoAssignAi: boolean; businessHours: string; awayMessage: string }

const FALLBACK: CrmSettingsData = {
  autoAssignAi: true,
  businessHours: '',
  awayMessage: '',
}

export default function CrmSettings({ platformId }: { platformId: string }) {
  const { data, loading } = useApi<{ crm: CrmSettingsData }>('/api/reseller/crm/settings', [platformId])
  // Mutable draft shared between the form fields and the header Save button.
  const draftRef = useRef<CrmSettingsData>(FALLBACK)

  async function save() {
    await mutate(() => api.patch('/api/reseller/crm/settings', draftRef.current), {
      success: 'CRM settings saved',
    })
  }

  return (
    <PageWrap>
      <PanelPageHeader
        title="CRM Settings"
        description="Global behaviour for your inbox: business hours, away message and AI auto-assignment."
        actions={
          <Button
            onClick={save}
            disabled={loading || !data}
            className="rounded-xl text-[var(--on-brand)]"
            style={{ background: 'var(--brand)' }}
          >
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      {loading && !data ? (
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : data?.crm ? (
        <SettingsForm key={platformId} initial={data.crm} draftRef={draftRef} />
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
          Could not load settings. Try refreshing the page.
        </p>
      )}
    </PageWrap>
  )
}

function SettingsForm({
  initial,
  draftRef,
}: {
  initial: CrmSettingsData
  draftRef: React.RefObject<CrmSettingsData>
}) {
  const [autoAssignAi, setAutoAssignAi] = useState(initial.autoAssignAi)
  const [businessHours, setBusinessHours] = useState(initial.businessHours ?? '')
  const [awayMessage, setAwayMessage] = useState(initial.awayMessage ?? '')

  function patchDraft(next: Partial<CrmSettingsData>) {
    draftRef.current = { ...draftRef.current, ...next }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* AI auto-assign */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-zinc-900 dark:text-zinc-50">
              <Settings className="h-4 w-4" style={{ color: 'var(--brand)' }} />
              Auto-assign to AI
            </h2>
            <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              New conversations start in <strong>AI</strong> mode so your most relevant active agent answers
              instantly. Agents can hand the chat back to a human at any time.
            </p>
          </div>
          <Switch
            checked={autoAssignAi}
            onCheckedChange={(v) => {
              setAutoAssignAi(v)
              patchDraft({ autoAssignAi: v })
            }}
            aria-label="Auto-assign to AI"
          />
        </div>
      </section>

      {/* Business hours */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50">Business hours</h2>
        <p className="mb-3 mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
          Shown to customers and used by away-hours automations.
        </p>
        <Label htmlFor="crm-bh" className="sr-only">
          Business hours
        </Label>
        <Input
          id="crm-bh"
          value={businessHours}
          onChange={(e) => {
            setBusinessHours(e.target.value)
            patchDraft({ businessHours: e.target.value })
          }}
          placeholder="09:00 - 21:00 (Mon-Sat)"
          className="rounded-xl"
        />
      </section>

      {/* Away message */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50">Away message</h2>
        <p className="mb-3 mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
          Auto-reply sent when a message arrives outside business hours.
        </p>
        <Label htmlFor="crm-am" className="sr-only">
          Away message
        </Label>
        <Textarea
          id="crm-am"
          rows={4}
          value={awayMessage}
          onChange={(e) => {
            setAwayMessage(e.target.value)
            patchDraft({ awayMessage: e.target.value })
          }}
          placeholder="🌙 We are away right now — an agent will reply first thing during business hours!"
          className="rounded-xl text-[13px]"
        />
        <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">{awayMessage.length}/500 characters</p>
      </section>
    </div>
  )
}
