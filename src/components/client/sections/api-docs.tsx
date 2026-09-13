// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
'use client'

// Client portal — API documentation (SMM API v2)

import { useApp } from '@/components/shared/app-context'
import { useI18n } from '@/lib/i18n'
import { Code2, KeyRound, RefreshCw, Terminal } from 'lucide-react'
import { PanelPageHeader } from '@/components/shared/panel-shell'
import { CopyField } from '@/components/shared/chips'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock, Card, CardHead, Pill, TableWrap } from '../bits'

const ENDPOINT = '/api/v2'
const PUBLIC_HOST = 'https://your-panel.com'

type Param = { name: string; type: string; desc: string; required?: boolean }

export default function ApiDocsSection({ onRegenerateKey }: { onRegenerateKey?: () => void }) {
  const { user } = useApp()
  const { t } = useI18n()

  const curl = (body: string) =>
    `curl -X POST ${PUBLIC_HOST}${ENDPOINT} \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PanelPageHeader
        title={t('client.apiDocs')}
        description={t('client.apiDesc')}
      />

      {/* API key */}
      <Card className="mb-4">
        <CardHead
          icon={KeyRound}
          title={t('capi.keyTitle')}
          sub={t('capi.keySub')}
          right={
            onRegenerateKey && (
              <Button variant="outline" size="sm" className="h-8 min-h-[32px] gap-1 rounded-full text-[12px] font-bold" onClick={onRegenerateKey}>
                <RefreshCw className="h-3 w-3" /> {t('cacc.regenerate')}
              </Button>
            )
          }
        />
        <CopyField value={user.apiKey} />
        <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
          {t('capi.endpoint')} <code className="rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 font-mono text-[11.5px] font-bold">POST {ENDPOINT}</code>
          {' '}· {t('capi.endpointDesc')}
        </p>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-white dark:bg-zinc-900 p-1 shadow-sm">
          <TabsTrigger value="services" className="min-h-[32px] rounded-lg text-[12px] font-bold">{t('capi.tabServices')}</TabsTrigger>
          <TabsTrigger value="add" className="min-h-[32px] rounded-lg text-[12px] font-bold">{t('capi.tabAdd')}</TabsTrigger>
          <TabsTrigger value="status" className="min-h-[32px] rounded-lg text-[12px] font-bold">{t('capi.tabStatus')}</TabsTrigger>
          <TabsTrigger value="balance" className="min-h-[32px] rounded-lg text-[12px] font-bold">{t('capi.tabBalance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ActionDoc
            title="services"
            desc={t('capi.servicesDesc')}
            params={[
              { name: 'key', type: 'string', desc: t('capi.paramKey'), required: true },
              { name: 'action', type: 'string', desc: t('capi.paramMust').replace('{a}', 'services'), required: true },
            ]}
            code={curl(`{"key":"${user.apiKey}","action":"services"}`)}
            response={`[
  {
    "service": "101",
    "name": "Instagram Followers | Real | 30 days refill",
    "category": "Instagram",
    "rate": "1.85",
    "min": "100",
    "max": "500000",
    "refill": true,
    "dripfeed": true
  }
]`}
          />
        </TabsContent>

        <TabsContent value="add">
          <ActionDoc
            title="add"
            desc={t('capi.addDesc')}
            params={[
              { name: 'key', type: 'string', desc: t('capi.paramKey'), required: true },
              { name: 'action', type: 'string', desc: t('capi.paramMust').replace('{a}', 'add'), required: true },
              { name: 'service', type: 'integer', desc: t('capi.paramService'), required: true },
              { name: 'link', type: 'string', desc: t('capi.paramLink'), required: true },
              { name: 'quantity', type: 'integer', desc: t('capi.paramQty'), required: true },
              { name: 'comments', type: 'string', desc: t('capi.paramComments') },
              { name: 'dripfeed', type: 'boolean', desc: t('capi.paramDrip') },
              { name: 'runs', type: 'integer', desc: t('capi.paramRuns') },
              { name: 'interval', type: 'integer', desc: t('capi.paramInterval') },
            ]}
            code={curl(`{"key":"${user.apiKey}","action":"add","service":101,"link":"https://instagram.com/yourprofile","quantity":1000}`)}
            response={`{ "order": 23501 }`}
          />
        </TabsContent>

        <TabsContent value="status">
          <ActionDoc
            title="status"
            desc={t('capi.statusDesc')}
            params={[
              { name: 'key', type: 'string', desc: t('capi.paramKey'), required: true },
              { name: 'action', type: 'string', desc: t('capi.paramMust').replace('{a}', 'status'), required: true },
              { name: 'id', type: 'string', desc: t('capi.paramId'), required: true },
            ]}
            code={curl(`{"key":"${user.apiKey}","action":"status","id":23501}`)}
            response={`{
  "charge": "1.85",
  "start_count": "1250",
  "status": "In progress",
  "remains": "420",
  "currency": "USD"
}`}
          />
        </TabsContent>

        <TabsContent value="balance">
          <ActionDoc
            title="balance"
            desc={t('capi.balanceDesc')}
            params={[
              { name: 'key', type: 'string', desc: t('capi.paramKey'), required: true },
              { name: 'action', type: 'string', desc: t('capi.paramMust').replace('{a}', 'balance'), required: true },
            ]}
            code={curl(`{"key":"${user.apiKey}","action":"balance"}`)}
            response={`{ "balance": "42.50", "currency": "USD" }`}
          />
        </TabsContent>
      </Tabs>

      <Card className="mt-4">
        <CardHead icon={Terminal} title={t('capi.codesTitle')} sub={t('capi.codesSub')} />
        <div className="flex flex-wrap gap-2">
          <Pill tone="emerald">{t('capi.c200')}</Pill>
          <Pill tone="amber">{t('capi.c400')}</Pill>
          <Pill tone="rose">{t('capi.c401')}</Pill>
          <Pill tone="zinc">{t('capi.c429')}</Pill>
        </div>
      </Card>
    </div>
  )
}

function ActionDoc({ title, desc, params, code, response }: {
  title: string
  desc: string
  params: Param[]
  code: string
  response: string
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <Card>
        <CardHead icon={Code2} title={`action: ${title}`} sub={desc} />
        <TableWrap>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="py-2.5 pr-3">{t('capi.parameter')}</th>
                <th className="py-2.5 pr-3">{t('capi.type')}</th>
                <th className="py-2.5">{t('cord.description')}</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.name} className="border-b border-zinc-100 dark:border-zinc-800/70">
                  <td className="py-2.5 pr-3 font-mono text-[12px] font-bold text-[var(--brand-ink)] dark:text-[var(--brand)]">{p.name}{p.required && <span className="ml-1 text-rose-500">*</span>}</td>
                  <td className="py-2.5 pr-3 text-zinc-500 dark:text-zinc-400">{p.type}</td>
                  <td className="py-2.5 text-zinc-600 dark:text-zinc-300">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('capi.exampleReq')}</p>
          <CodeBlock code={code} />
        </Card>
        <Card className="p-4 sm:p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('capi.exampleRes')}</p>
          <CodeBlock code={response} />
        </Card>
      </div>
    </div>
  )
}
