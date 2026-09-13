// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { notify } from '@/lib/notify'

/**
 * GrowthRush Public API v2 — standard SMM panel API.
 * POST application/x-www-form-urlencoded or JSON:
 *   key, action = services | add | status | balance
 */
async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = req.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    const j = await req.json().catch(() => ({}))
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]))
  }
  const fd = await req.formData().catch(() => null)
  if (fd) return Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]))
  const text = await req.text()
  return Object.fromEntries(new URLSearchParams(text))
}

const bad = (msg: string) => NextResponse.json({ error: msg })

export async function POST(req: NextRequest) {
  const p = await parseBody(req)
  const key = p.key
  if (!key) return bad('Invalid API key')

  const user = await db.user.findUnique({ where: { apiKey: key } })
  if (!user || user.status !== 'ACTIVE') return bad('Invalid API key')

  switch (p.action) {
    case 'services': {
      const platformId = user.platformId ?? null
      const services = await db.service.findMany({
        where: { platformId, status: 'ACTIVE' },
        include: { category: true },
        orderBy: { sortOrder: 'asc' },
      })
      return NextResponse.json(
        services.map((s) => ({
          service: s.id,
          name: s.name,
          type: s.type === 'CUSTOM_COMMENTS' ? 'Custom Comments' : 'Default',
          category: s.category.name,
          rate: s.rate.toFixed(2),
          min: String(s.min),
          max: String(s.max),
          refill: s.refill,
          cancel: s.cancel,
          dripfeed: s.dripfeed,
        }))
      )
    }

    case 'add': {
      const serviceId = p.service
      const link = p.link
      const quantity = parseInt(p.quantity)
      if (!serviceId || !link || !quantity) return bad('service, link and quantity are required')
      const service = await db.service.findFirst({
        where: { id: serviceId, platformId: user.platformId ?? null, status: 'ACTIVE' },
      })
      if (!service) return bad('Incorrect service ID')
      if (quantity < service.min || quantity > service.max) return bad(`Quantity must be between ${service.min} and ${service.max}`)
      const charge = Math.round((quantity / 1000) * service.rate * 100) / 100
      if (user.balance < charge) return bad('Insufficient balance')
      const order = await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { balance: { decrement: charge } } })
        await tx.transaction.create({
          data: { userId: user.id, type: 'ORDER', amount: -charge, description: `API order — ${service.name}` },
        })
        return tx.order.create({
          data: {
            platformId: service.platformId,
            userId: user.id,
            serviceId: service.id,
            serviceName: service.name,
            link,
            quantity,
            charge,
            remains: quantity,
            status: 'IN_PROGRESS',
          },
        })
      })
      await notify(user.id, "ORDER", "API order placed ⚡", `${service.name} — ${quantity.toLocaleString()} units for $${charge.toFixed(2)}`, "orders")
      return NextResponse.json({ order: order.id })
    }

    case 'status': {
      const ids = (p.orders || p.order || '').split(',').filter(Boolean)
      if (!ids.length) return bad('order(s) required')
      const out: Record<string, unknown> = {}
      for (const id of ids) {
        const order = await db.order.findFirst({ where: { id, userId: user.id } })
        if (!order) {
          out[id] = { error: 'Incorrect order ID' }
        } else {
          out[id] = {
            charge: order.charge.toFixed(2),
            start_count: String(order.startCount),
            status: order.status === 'IN_PROGRESS' ? 'In progress' : order.status.charAt(0) + order.status.slice(1).toLowerCase(),
            remains: String(order.remains),
            currency: 'USD',
          }
        }
      }
      return NextResponse.json(ids.length === 1 ? out[ids[0]] : out)
    }

    case 'balance':
      return NextResponse.json({ balance: user.balance.toFixed(2), currency: 'USD' })

    default:
      return bad('Invalid action')
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'GrowthRush Public API v2',
    usage: 'POST /api/v2 with key & action (services, add, status, balance)',
  })
}
