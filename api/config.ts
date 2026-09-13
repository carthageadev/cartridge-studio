import type { VercelRequest, VercelResponse } from '@vercel/node'

// Server-side config endpoint.
// Returns pre-built 3D asset URLs from a server-only env var (no VITE_
// prefix), so neither the base URL nor the filenames are baked into
// the frontend bundle.
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

  const base = process.env.THREE_D_BASE_URL ?? ''
  const assets = base ? {
    model: `${base}/model.glb`,
    bodyBase: `${base}/diffuse.jpg`,
    bodyNormal: `${base}/normal.png`,
    bodyRoughness: `${base}/roughness.png`,
  } : null

  return res.status(200).json({ assets })
}