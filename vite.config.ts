import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// All ScreenScraper traffic (API + media images) is routed through /api2 so the
// browser never hits screenscraper.fr cross-origin. Media URLs returned by the
// API are rewritten client-side to relative /api2/... paths.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api2': {
        target: 'https://www.screenscraper.fr',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
