// Growthrush SMM Suite — © 2026 Growthrush. All rights reserved.
// Minimal SMM Panel API v2 mock — proves the import pipeline end-to-end.
Bun.serve({
  port: 3099,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname !== '/api/v2') return new Response('not found', { status: 404 })
    let action = ''
    if (req.method === 'POST') {
      const ct = req.headers.get('content-type') ?? ''
      if (ct.includes('json')) {
        const b = await req.json().catch(() => ({}))
        action = String(b.action ?? '')
      } else {
        const f = await req.formData().catch(() => null)
        action = String(f?.get('action') ?? '')
      }
    }
    if (action === 'balance') {
      return Response.json({ balance: '128.45', currency: 'USD' })
    }
    if (action === 'services') {
      return Response.json([
        { service: '1001', name: 'Instagram Followers — Real', type: 'Default', rate: '0.0102', min: 100, max: 100000, category: 'Instagram', dripfeed: false, refill: true, cancel: true },
        { service: '1002', name: 'Instagram Likes — Fast', type: 'Default', rate: '0.0035', min: 50, max: 50000, category: 'Instagram', refill: true },
        { service: '2001', name: 'TikTok Views — HQ', type: 'Default', rate: '0.0009', min: 500, max: 10000000, category: 'TikTok', refill: false },
        { service: '2002', name: 'TikTok Followers — Real', type: 'Default', rate: '0.021', min: 100, max: 15000, category: 'TikTok', refill: true },
        { service: '3001', name: 'YouTube Subscribers', type: 'Default', rate: '0.85', min: 50, max: 5000, category: 'YouTube', refill: true },
        { service: '4001', name: 'Custom Comments — IG', type: 'Custom Comments', rate: '0.24', min: 10, max: 500, category: 'Custom Comments', refill: false },
      ])
    }
    return Response.json({ error: 'invalid action' }, { status: 400 })
  },
})
console.log('mock SMM provider on :3099')
