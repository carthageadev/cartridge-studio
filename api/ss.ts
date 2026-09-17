// Serverless ScreenScraper proxy used by the Vercel deployment.
// Keys are attached here, never in page URLs. Vercel rewrites /api2/:slug* to
// this function. The helpers below are also imported by the dev proxy in
// vite.config.ts, so production and local share one implementation.
//
// Everything lives in this file on purpose: the api directory is an ES module
// package, and a relative import such as './_ss' is not resolved by Node at
// runtime. Keeping the function self-contained avoids that failure entirely.

const SCREENSCRAPER_BASE = 'https://api.screenscraper.fr/api2'
const CRED_KEYS = new Set(['devid', 'devpassword', 'softname', 'ssid', 'sspassword'])
// 'slug' is the rewritten route, not an upstream parameter.
const SKIP_PARAMS = new Set([...CRED_KEYS, 'slug'])

export interface SsCreds {
  devid: string
  devpassword: string
  softname: string
}

export function credsFromEnv(env: Record<string, string | undefined>): SsCreds | null {
  const devid = env.SCREENSCRAPER_DEV_ID
  const devpassword = env.SCREENSCRAPER_DEV_PASSWORD
  const softname = env.SCREENSCRAPER_SOFT_NAME
  if (!devid || !devpassword || !softname) return null
  return { devid, devpassword, softname }
}

/** Copy caller params minus any credential keys, then attach server creds. */
export function buildUpstreamQuery(
  input: Record<string, string | string[] | undefined>,
  creds: SsCreds,
): URLSearchParams {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value == null || SKIP_PARAMS.has(key)) continue
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v))
    else qs.set(key, value)
  }
  qs.set('devid', creds.devid)
  qs.set('devpassword', creds.devpassword)
  qs.set('softname', creds.softname)
  return qs
}

/** Full upstream media URL -> proxied /api2 path with credentials removed. */
export function proxiedMediaPath(raw: string): string {
  try {
    const url = new URL(raw)
    if (!url.hostname.endsWith('screenscraper.fr')) return raw
    const keep = new URLSearchParams()
    for (const [key, value] of url.searchParams) {
      if (!CRED_KEYS.has(key)) keep.set(key, value)
    }
    const path = url.pathname.startsWith('/api2') ? url.pathname : `/api2${url.pathname}`
    const query = keep.toString()
    return query ? `${path}?${query}` : path
  } catch {
    return raw
  }
}

/** Remove credential echoes and unused payload weight from upstream JSON. */
export function sanitizeSsJson<T>(json: T): T {
  if (!json || typeof json !== 'object') return json
  const root = json as Record<string, any>
  if (root.header && typeof root.header === 'object') delete root.header.commandRequested
  const walk = (node: any): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { for (const value of node) walk(value); return }
    if (typeof node.url === 'string') node.url = proxiedMediaPath(node.url)
    for (const value of Object.values(node)) walk(value)
  }
  walk(root)
  const jeux = root.response?.jeux
  if (Array.isArray(jeux)) {
    root.response.jeux = jeux.map((j: any) => ({ id: j?.id, noms: j?.noms, systeme: j?.systeme }))
  }
  return root as T
}

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
      headers: { 'User-Agent': `${creds.softname}/1.0` },
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