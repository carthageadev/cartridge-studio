import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local dev middleware - mirrors the serverless /api/config and /api/asset
// endpoints so `bun run dev` works without Vercel.
function devApiConfig(): Plugin {
  return {
    name: "dev-api-config",
    configureServer(server) {
      server.middlewares.use("/api/config", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        let assets = null;
        try {
          const raw = JSON.parse(process.env.THREE_D_ASSETS ?? "null");
          if (raw && typeof raw === "object") {
            assets = Object.fromEntries(
              Object.entries(raw as Record<string, string>).map(([k, v]) => [k, `/api/asset?url=${encodeURIComponent(v)}`])
            );
          }
        } catch {}
        res.end(JSON.stringify({ assets }));
      });
      server.middlewares.use("/api/asset", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        const url = new URL(req.url ?? "", "http://localhost").searchParams.get("url");
        if (!url) { res.statusCode = 400; res.end(JSON.stringify({ error: "Missing url" })); return; }
        try {
          const upstream = await fetch(url);
          if (!upstream.ok) { res.statusCode = upstream.status; res.end(JSON.stringify({ error: "Upstream error" })); return; }
          res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
          res.setHeader("Cache-Control", "public, max-age=86400");
          const buf = Buffer.from(await upstream.arrayBuffer());
          res.end(buf);
        } catch (err: any) {
          res.statusCode = 502; res.end(JSON.stringify({ error: err.message || "Proxy error" }));
        }
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
