import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildUpstreamQuery, credsFromEnv, sanitizeSsJson } from './_ss'

const SCREENSCRAPER_BASE = 'https://api.screenscraper.fr/api2'

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
    const creds = credsFromEnv(process.env)
    if (!creds) {
      return res.status(503).json({ error: 'ScreenScraper credentials not configured' })
    }

    const params = buildUpstreamQuery(
      req.query as Record<string, string | string[] | undefined>,
      creds,
    )
    if (!params.get('output') && !slug.startsWith('media')) params.set('output', 'json')

    const isPost = req.method === 'POST'
    const upstream = await fetch(`${SCREENSCRAPER_BASE}/${slug}?${params.toString()}`, {
      method: isPost ? 'POST' : 'GET',
      headers: {
        'User-Agent': 'CartridgeFlow/1.0',
        ...(isPost && req.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(isPost && req.body ? { body: JSON.stringify(req.body) } : {}),
    })

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    if (contentType.includes('json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      return res.status(upstream.status).json(sanitizeSsJson(await upstream.json()))
    }
    res.setHeader('Content-Type', contentType)
    res.status(upstream.status)
    return res.send(Buffer.from(await upstream.arrayBuffer()))
  } catch (err: any) {
    console.error('Scraper proxy error:', err)
    return res.status(502).json({ error: err.message || 'Proxy request failed' })
  }
}
