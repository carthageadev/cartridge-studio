import type { VercelRequest, VercelResponse } from '@vercel/node'

// Server-side config endpoint.
// Returns pre-built 3D asset URLs entirely from server-only env vars,
// so neither the base URL nor the filenames are baked into the frontend
// bundle or committed to the repo.
//
// Required env vars:
//   THREE_D_BASE_URL          - base directory URL (e.g. S3 bucket or Archive item)
//   THREE_D_MODEL             - model filename
//   THREE_D_BODY_BASE         - base color texture filename
//   THREE_D_BODY_NORMAL       - normal map filename
//   THREE_D_BODY_ROUGHNESS    - roughness map filename
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (_req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const base = (process.env.THREE_D_BASE_URL ?? '').replace(/\/+$/, '')
  const model = process.env.THREE_D_MODEL ?? ''
  const bodyBase = process.env.THREE_D_BODY_BASE ?? ''
  const bodyNormal = process.env.THREE_D_BODY_NORMAL ?? ''
  const bodyRoughness = process.env.THREE_D_BODY_ROUGHNESS ?? ''

  const assets = base && model ? {
    model: `${base}/${model}`,
    bodyBase: `${base}/${bodyBase}`,
    bodyNormal: `${base}/${bodyNormal}`,
    bodyRoughness: `${base}/${bodyRoughness}`,
  } : null

  return res.status(200).json({ assets })
}