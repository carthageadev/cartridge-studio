import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api2": {
        target: "https://www.screenscraper.fr",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
