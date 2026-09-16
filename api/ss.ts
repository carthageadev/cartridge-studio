import { buildUpstreamQuery, credsFromEnv, sanitizeSsJson } from './_ss'

const SCREENSCRAPER_BASE = 'https://www.screenscraper.fr/api2'

// Vercel rewrites /api2/:slug* here; dev middleware mirrors the contract.
export default async function handler(req: any, res: any) {
  const slug: string | undefined = req.query?.slug
  if (!slug) {
    res.status(400).json({ error: 'Missing slug parameter' })
    return
  }
  const creds = credsFromEnv(process.env)
  if (!creds) {
    res.status(503).json({ error: 'ScreenScraper credentials not configured' })
    return
  }

  try {
    const params = buildUpstreamQuery(req.query ?? {}, creds)
    if (!params.get('output') && !slug.startsWith('media')) params.set('output', 'json')

    const upstream = await fetch(`${SCREENSCRAPER_BASE}/${slug}?${params.toString()}`, {
      headers: { 'User-Agent': 'CartridgeFlow/1.0' },
    })

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    if (contentType.includes('json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.status(upstream.status).json(sanitizeSsJson(await upstream.json()))
      return
    }
    res.setHeader('Content-Type', contentType)
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()))
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Proxy request failed' })
  }
}
