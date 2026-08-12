# RetroFlow 64

A browser based N64 game library with a 3D carousel of cartridges. Built with React Three Fiber and pulls cover art and metadata from ScreenScraper.

## Run it

```
bun install
bun dev
```

Open http://localhost:5173

## ScreenScraper

Add your credentials to `.env.local`:

```
VITE_SCREENSCRAPER_DEV_ID=...
VITE_SCREENSCRAPER_DEV_PASSWORD=...
VITE_SCREENSCRAPER_SOFT_NAME=...
```

You can also set these from the settings panel and run a connection test. Image requests go through the Vite dev proxy to avoid CORS.

## Controls

Scroll or drag to browse. Click a cartridge or press A to open it. Press B or Esc to go back. Use the Add Game button to search ScreenScraper and grow your library.

Your library is saved in localStorage and starts with eight N64 games.

## 3D model

The cartridge model lives at `public/model.glb`. It has a shell mesh that uses `diffuse.jpg` with normal and roughness maps, and a label mesh that shows per game sticker art.
