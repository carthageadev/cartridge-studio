# 3D Model and API Spec

## 3D Model

The cartridge model lives at `public/model.glb`. It has two meshes:

- `model_2` - the plastic shell. Uses `diffuse.jpg` as the base color, plus normal and roughness maps.
- `boxart` - the label face. Shows per-game sticker art as a texture (`flipY = false`).

### Texture maps

| Map | File |
| --- | --- |
| Base color | `diffuse.jpg` |
| Normal | `normal.png` |
| Roughness | `roughness.png` |

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