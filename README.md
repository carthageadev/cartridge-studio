# RetroFlow 64

A Wii Flow-style 3D N64 game library, wrapped in a handheld console OS shell.
Runs entirely in the browser: React Three Fiber carousel of real 3D N64
cartridges with live sticker art and metadata from ScreenScraper.

## Run it

```sh
bun install   # or npm install
bun dev       # or npm run dev
```

Open http://localhost:5173.

## ScreenScraper credentials

Defaults are read from `.env.local`:

```
VITE_SCREENSCRAPER_DEV_ID=...
VITE_SCREENSCRAPER_DEV_PASSWORD=...
VITE_SCREENSCRAPER_SOFT_NAME=...
```

They can be overridden at runtime from the ⚙ settings panel (top right),
which also has a connection test. All API and image traffic is routed
through the Vite dev proxy (`/api2` -> `screenscraper.fr`) to bypass CORS.

## Controls

| Input | Action |
| --- | --- |
| Scroll / drag / ◀ ▶ | Browse the carousel |
| Click cart / `A` / `Enter` | Select game (flips to the right, info panel slides in) |
| `B` / `Esc` | Back to the carousel |
| `+ Add Game` (bottom bar) | Search ScreenScraper and add to your library |

The library is persisted in `localStorage` and seeded with eight N64
classics on first launch; each entry resolves its label art
(`support-texture`, region priority wor -> us -> eu -> ss -> jp) and metadata
in the background.

## 3D model

`public/model.glb` has two meshes (see `3d model and api spec.md`):

- `model_2` - plastic shell -> `diffuse.jpg` + normal + roughness maps
- `boxart` - label face -> per-game sticker texture (`flipY = false`)
