import { handleSsUrl } from "../server/screenscraper.js";

export default async function handler(req, res) {
  const result = await handleSsUrl(req.url, process.env);
  res.statusCode = result.status;
  res.setHeader("content-type", result.contentType);
  if (result.cache) res.setHeader("cache-control", result.cache);
  res.end(result.body);
}
