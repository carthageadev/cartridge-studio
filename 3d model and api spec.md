# 3D Model and API Spec

## 3D Model

The cartridge model and its texture maps live in this repo under `public/3d/`:

- `public/3d/model.glb`
- `public/3d/diffuse.webp`
- `public/3d/normal.webp`
- `public/3d/roughness.webp`

The frontend asks the serverless config endpoint `/api/config` for the asset URLs, and it returns these local paths.

The model has two meshes:

- `model_2`: the plastic shell. Uses `diffuse.webp` as the base color, plus normal and roughness maps.
- `boxart`: the label face. Shows per-game sticker art as a texture (`flipY = false`).

### Texture maps

| Map | File |
| --- | --- |
| Base color | `diffuse.webp` |
| Normal | `normal.webp` |
| Roughness | `roughness.webp` |

## ScreenScraper API

Cover art and metadata are pulled from ScreenScraper.

### Credentials

Read from `.env.local`:

```
VITE_SCREENSCRAPER_DEV_ID=...
VITE_SCREENSCRAPER_DEV_PASSWORD=...
VITE_SCREENSCRAPER_SOFT_NAME=...
```

### Region priority

Label art resolves in this order: `wor` -> `us` -> `eu` -> `ss` -> `jp`.

### Proxy

All API and image traffic goes through the Vite dev proxy (`/api2` -> `screenscraper.fr`) to bypass CORS.