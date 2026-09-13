# 3D Model and API Spec

## 3D Model

The cartridge model and texture files are loaded from `THREE_D_BASE_URL` at runtime. For example:

```
THREE_D_BASE_URL=https://archive.org/download/7535476
```

This loads the following public Internet Archive files:

- `https://archive.org/download/7535476/model.glb`
- `https://archive.org/download/7535476/diffuse.webp`
- `https://archive.org/download/7535476/normal.webp`
- `https://archive.org/download/7535476/roughness.webp`

The model has two meshes:

- `model_2` - the plastic shell. Uses `diffuse.webp` as the base color, plus normal and roughness maps.
- `boxart` - the label face. Shows per-game sticker art as a texture (`flipY = false`).

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