import { defineConfig, loadEnv } from "vite";
import { handleSsUrl } from "./server/screenscraper.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: { port: 3002 },
    plugins: [
      {
        name: "screenscraper-proxy",
        configureServer(server) {
          server.middlewares.use("/api/ss", async (req, res) => {
            try {
              const result = await handleSsUrl(req.url, env);
              res.statusCode = result.status;
              res.setHeader("content-type", result.contentType);
              if (result.cache) res.setHeader("cache-control", result.cache);
              res.end(result.body);
            } catch {
              res.statusCode = 502;
              res.end("proxy error");
            }
          });
        },
      },
    ],
  };
});
