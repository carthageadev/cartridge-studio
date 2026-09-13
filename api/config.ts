import type { VercelRequest, VercelResponse } from '@vercel/node'

// Server-side config endpoint.
// Returns 3D asset URLs pointing to files in public/3d/.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (_req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({
    assets: {
      model: '/3d/model.glb',
      bodyBase: '/3d/diffuse.jpg',
      bodyNormal: '/3d/normal.png',
      bodyRoughness: '/3d/roughness.png',
    },
  })
}
