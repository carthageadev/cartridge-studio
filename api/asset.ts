import type { VercelRequest, VercelResponse } from '@vercel/node'

// Proxies a remote 3D asset with CORS headers.
// Called as /api/asset?url=<encoded upstream URL>.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const url = req.query.url as string
  if (!url) return res.status(400).json({ error: 'Missing url parameter' })

  try {
    const upstream = await fetch(url)
    if (!upstream.ok || !upstream.body) return res.status(upstream.status || 502).json({ error: 'Upstream error' })

    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')

    const reader = upstream.body.getReader()
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read()
      if (done) { res.end(); return }
      res.write(value)
      return pump()
    }
    await pump()
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Proxy error' })
  }
}
