import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { buildUpstreamQuery, credsFromEnv, sanitizeSsJson } from "./api/ss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side keys for local development (gitignored .env.local).
  const env = loadEnv(mode, process.cwd(), "");
  return {
  plugins: [react(), tailwindcss(), viteSingleFile(),
    {
      name: "screenscraper-dev-proxy",
      configureServer(server) {
        // Same contract as api/ss.ts: keys attached here, never in page URLs.
        server.middlewares.use("/api2", async (req, res) => {
          try {
            const url = new URL(req.url ?? "/", "http://localhost");
            const slug = url.pathname.replace(/^\/api2\/?/, "");
            if (!slug) { res.statusCode = 400; res.end("Missing slug"); return; }
            const creds = credsFromEnv(env);
            if (!creds) { res.statusCode = 503; res.end("ScreenScraper credentials not configured"); return; }
            const params = buildUpstreamQuery(Object.fromEntries(url.searchParams), creds);
            if (!params.get("output") && !slug.startsWith("media")) params.set("output", "json");
            const upstream = await fetch(`https://www.screenscraper.fr/api2/${slug}?${params.toString()}`);
            const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
            if (contentType.includes("json")) {
              res.statusCode = upstream.status;
              res.setHeader("content-type", "application/json; charset=utf-8");
              res.end(JSON.stringify(sanitizeSsJson(await upstream.json())));
              return;
            }
            res.statusCode = upstream.status;
            res.setHeader("content-type", contentType);
            res.end(Buffer.from(await upstream.arrayBuffer()));
          } catch {
            res.statusCode = 502;
            res.end("Proxy request failed");
          }
        });
      },
    },
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  };
});
