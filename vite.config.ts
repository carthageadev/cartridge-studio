import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local dev middleware - mirrors the serverless /api/config endpoint
// so `bun run dev` works without Vercel.
function devApiConfig(): Plugin {
  return {
    name: "dev-api-config",
    configureServer(server) {
      server.middlewares.use("/api/config", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        let assets = null;
        try { assets = JSON.parse(process.env.THREE_D_ASSETS ?? "null"); } catch {}
        res.end(JSON.stringify({ assets }));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), devApiConfig()],
  server: {
    port: 3000,
    proxy: {
      '/api2': {
        target: 'https://api.screenscraper.fr',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
