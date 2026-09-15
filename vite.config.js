import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3002,
    proxy: {
      "/api2": {
        target: "https://www.screenscraper.fr",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
