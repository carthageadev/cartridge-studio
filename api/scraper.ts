import type { VercelRequest, VercelResponse } from '@vercel/node'

const SCREENSCRAPER_BASE = 'https://www.screenscraper.fr/api2'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Extract the endpoint slug from query (Vercel rewrites /api2/* -> /api/scraper?slug=*)
    const slug = req.query.slug as string
    if (!slug) {
      return res.status(400).json({ error: 'Missing slug parameter' })
    }

    // Build the target URL - forward all query params except 'slug'
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'slug') continue
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v))
      } else if (value !== undefined) {
        params.set(key, value)
      }
    }

    const targetUrl = `${SCREENSCRAPER_BASE}/${slug}?${params.toString()}`

    const upstream = await fetch(targetUrl, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'User-Agent': 'CartridgeFlow/1.0',
        ...(req.method === 'POST' && req.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(req.method === 'POST' && req.body ? { body: JSON.stringify(req.body) } : {}),
    })

    const text = await upstream.text()

    // Forward status and content type from upstream
    const contentType = upstream.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', contentType)
    return res.status(upstream.status).send(text)
  } catch (err: any) {
    console.error('Scraper proxy error:', err)
    return res.status(502).json({ error: err.message || 'Proxy request failed' })
  }
}
