// Shared ScreenScraper proxy helpers (server-only; never ships to the client).
// Used by api/ss.ts on Vercel and by the dev middleware in vite.config.ts.

const CRED_KEYS = new Set(['devid', 'devpassword', 'softname', 'ssid', 'sspassword'])

export interface SsCreds {
  devid: string
  devpassword: string
  softname: string
}

export function credsFromEnv(env: Record<string, string | undefined>): SsCreds | null {
  const devid = env.SCREENSCRAPER_DEV_ID ?? env.VITE_SCREENSCRAPER_DEV_ID
  const devpassword = env.SCREENSCRAPER_DEV_PASSWORD ?? env.VITE_SCREENSCRAPER_DEV_PASSWORD
  if (!devid || !devpassword) return null
  return {
    devid,
    devpassword,
    softname: env.SCREENSCRAPER_SOFT_NAME ?? env.VITE_SCREENSCRAPER_SOFT_NAME ?? 'CartridgeFlow',
  }
}

/** Copy caller params minus any credential keys, then attach server creds. */
export function buildUpstreamQuery(
  input: Record<string, string | string[] | undefined>,
  creds: SsCreds,
): URLSearchParams {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value == null || CRED_KEYS.has(key)) continue
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
