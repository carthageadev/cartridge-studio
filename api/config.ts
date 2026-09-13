import type { VercelRequest, VercelResponse } from '@vercel/node'

// Server-side config endpoint.
// Returns 3D asset URLs entirely from a single server-only env var,
// so nothing is baked into the frontend bundle or committed to the repo.
//
// Set THREE_D_ASSETS in your Vercel project env (or .env.local for
// local dev) as a JSON string:
//   {"model":"https://...glb","bodyBase":"https://...jpg","bodyNormal":"https://...png","bodyRoughness":"https://...png"}
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (_req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  let assets = null
  try {
    const raw = JSON.parse(process.env.THREE_D_ASSETS ?? 'null')
    if (raw && typeof raw === 'object') {
      assets = Object.fromEntries(
        Object.entries(raw as Record<string, string>).map(([k, v]) => [k, `/api/asset?url=${encodeURIComponent(v)}`])
      )
    }
  } catch {
    // invalid JSON - leave assets null
  }

  return res.status(200).json({ assets })
}