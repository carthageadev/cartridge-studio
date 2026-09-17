import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { buildUpstreamQuery, credsFromEnv, sanitizeSsJson } from './api/ss'

// All ScreenScraper traffic (API + media images) is routed through /api2 so the
// browser never hits screenscraper.fr cross-origin. Keys are attached by the
// server proxy (api/ss.ts in production, the middleware below locally).
export default defineConfig(({ mode }) => {
  // Server-side keys for local development (gitignored .env.local).
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'screenscraper-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api2', async (req, res) => {
            try {
              const url = new URL(req.url ?? '/', 'http://localhost')
              const slug = url.pathname.replace(/^\/api2\/?/, '')
              if (!slug) { res.statusCode = 400; res.end('Missing slug'); return }
              const creds = credsFromEnv(env)
              if (!creds) { res.statusCode = 503; res.end('ScreenScraper credentials not configured'); return }
              const params = buildUpstreamQuery(Object.fromEntries(url.searchParams), creds)
              if (!params.get('output') && !slug.startsWith('media')) params.set('output', 'json')
              const upstream = await fetch(`https://www.screenscraper.fr/api2/${slug}?${params.toString()}`)
              const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
              if (contentType.includes('json')) {
                res.statusCode = upstream.status
                res.setHeader('content-type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(sanitizeSsJson(await upstream.json())))
                return
              }
              res.statusCode = upstream.status
              res.setHeader('content-type', contentType)
              res.end(Buffer.from(await upstream.arrayBuffer()))
            } catch {
              res.statusCode = 502
              res.end('Proxy request failed')
            }
          })
        },
      },
    ],
  }
})
