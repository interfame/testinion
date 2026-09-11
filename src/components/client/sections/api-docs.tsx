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
          title="Your API key"
          sub="Keep it secret — anyone with this key can spend your balance"
          right={
            onRegenerateKey && (
              <Button variant="outline" size="sm" className="h-8 min-h-[32px] gap-1 rounded-full text-[12px] font-bold" onClick={onRegenerateKey}>
                <RefreshCw className="h-3 w-3" /> Regenerate
              </Button>
            )
          }
        />
        <CopyField value={user.apiKey} />
        <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
          Endpoint: <code className="rounded-md bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 font-mono text-[11.5px] font-bold">POST {ENDPOINT}</code>
          {' '}· All requests are HTTP POST with JSON body and return JSON. Replace the host in the examples with your panel URL.
        </p>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-white dark:bg-zinc-900 p-1 shadow-sm">
          <TabsTrigger value="services" className="min-h-[32px] rounded-lg text-[12px] font-bold">Services</TabsTrigger>
          <TabsTrigger value="add" className="min-h-[32px] rounded-lg text-[12px] font-bold">Add order</TabsTrigger>
          <TabsTrigger value="status" className="min-h-[32px] rounded-lg text-[12px] font-bold">Order status</TabsTrigger>
          <TabsTrigger value="balance" className="min-h-[32px] rounded-lg text-[12px] font-bold">Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ActionDoc
            title="services"
            desc="Fetch the full service list available to your account — id, category, rate, min/max and features."
            params={[
              { name: 'key', type: 'string', desc: 'Your API key', required: true },
              { name: 'action', type: 'string', desc: 'Must be "services"', required: true },
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
            desc="Place a new order. The charge is deducted from your wallet balance instantly."
            params={[
              { name: 'key', type: 'string', desc: 'Your API key', required: true },
              { name: 'action', type: 'string', desc: 'Must be "add"', required: true },
              { name: 'service', type: 'integer', desc: 'Service ID from the services call', required: true },
              { name: 'link', type: 'string', desc: 'Target link (profile, post, video…)', required: true },
              { name: 'quantity', type: 'integer', desc: 'Quantity between min and max', required: true },
              { name: 'comments', type: 'string', desc: 'Custom comments, one per line (custom-comment services only)' },
              { name: 'dripfeed', type: 'boolean', desc: 'Enable drip-feed (optional, service must support it)' },
              { name: 'runs', type: 'integer', desc: 'Number of drip-feed runs (when dripfeed=true)' },
              { name: 'interval', type: 'integer', desc: 'Minutes between runs (when dripfeed=true)' },
            ]}
            code={curl(`{"key":"${user.apiKey}","action":"add","service":101,"link":"https://instagram.com/yourprofile","quantity":1000}`)}
            response={`{ "order": 23501 }`}
          />
        </TabsContent>

        <TabsContent value="status">
          <ActionDoc
            title="status"
            desc="Check the delivery status of one order (id) or all your recent orders (id=all)."
            params={[
              { name: 'key', type: 'string', desc: 'Your API key', required: true },
              { name: 'action', type: 'string', desc: 'Must be "status"', required: true },
              { name: 'id', type: 'string', desc: 'Order ID, or "all" for every recent order', required: true },
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
            desc="Check your current wallet balance."
            params={[
              { name: 'key', type: 'string', desc: 'Your API key', required: true },
              { name: 'action', type: 'string', desc: 'Must be "balance"', required: true },
            ]}
            code={curl(`{"key":"${user.apiKey}","action":"balance"}`)}
            response={`{ "balance": "42.50", "currency": "USD" }`}
          />
        </TabsContent>
      </Tabs>

      <Card className="mt-4">
        <CardHead icon={Terminal} title="Response codes" sub="How to handle errors from the API" />
        <div className="flex flex-wrap gap-2">
          <Pill tone="emerald">200 — Success</Pill>
          <Pill tone="amber">400 — Bad request / missing params</Pill>
          <Pill tone="rose">401 — Invalid API key</Pill>
          <Pill tone="zinc">429 — Rate limited</Pill>
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
  return (
    <div className="space-y-4">
      <Card>
        <CardHead icon={Code2} title={`action: ${title}`} sub={desc} />
        <TableWrap>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <th className="py-2.5 pr-3">Parameter</th>
                <th className="py-2.5 pr-3">Type</th>
                <th className="py-2.5">Description</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.name} className="border-b border-zinc-100 dark:border-zinc-800/70">
                  <td className="py-2.5 pr-3 font-mono text-[12px] font-bold text-[var(--brand)]">{p.name}{p.required && <span className="ml-1 text-rose-500">*</span>}</td>
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
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Example request</p>
          <CodeBlock code={code} />
        </Card>
        <Card className="p-4 sm:p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Example response</p>
          <CodeBlock code={response} />
        </Card>
      </div>
    </div>
  )
}
