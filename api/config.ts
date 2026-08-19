import type { VercelRequest, VercelResponse } from '@vercel/node'

// Server-side config endpoint.
// Returns the 3D asset base URL from a server-only env var (no VITE_
// prefix), so the URL is never baked into the frontend bundle.
//
// Set THREE_D_BASE_URL in your Vercel project env (or .env.local for
// local dev). For a private S3 bucket, point this at an endpoint that
// returns short-lived presigned URLs instead of a static base URL.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (_req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const baseUrl = process.env.THREE_D_BASE_URL ?? ''
  return res.status(200).json({ baseUrl })
}