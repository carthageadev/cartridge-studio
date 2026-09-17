const UPSTREAM = "https://www.screenscraper.fr/api2";
const CRED_KEYS = new Set(["devid", "devpassword", "softname", "ssid", "sspassword"]);

export function credsFromEnv(env) {
  const devid = env.SCREENSCRAPER_DEV_ID;
  const devpassword = env.SCREENSCRAPER_DEV_PASSWORD;
  const softname = env.SCREENSCRAPER_SOFT_NAME;
  if (!devid || !devpassword || !softname) return null;
  return { devid, devpassword, softname };
}

function upstreamQuery(params, creds) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || CRED_KEYS.has(key)) continue;
    qs.set(key, String(value));
  }
  qs.set("devid", creds.devid);
  qs.set("devpassword", creds.devpassword);
  qs.set("softname", creds.softname);
  return qs;
}

function proxiedMediaUrl(raw) {
  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith("screenscraper.fr")) return raw;
    const keep = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (!CRED_KEYS.has(key)) keep.set(key, value);
    }
    return `/api/ss?path=mediaJeu.php&${keep.toString()}`;
  } catch {
    return raw;
  }
}

function stripMediaCredentials(json) {
  if (!json || typeof json !== 'object') return json;
  if (json.header && json.header.commandRequested) delete json.header.commandRequested;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const value of node) walk(value); return; }
    if (typeof node.url === 'string') node.url = proxiedMediaUrl(node.url);
    for (const value of Object.values(node)) walk(value);
  };
  walk(json);
  /* Search responses ship full media lists the client never uses; drop them. */
  const jeux = json.response && json.response.jeux;
  if (Array.isArray(jeux)) {
    json.response.jeux = jeux.map((j) => ({ id: j.id, noms: j.noms, systeme: j.systeme }));
  }
  return json;
}

export async function handleSsUrl(rawUrl, env) {
  const url = new URL(rawUrl, "http://localhost");
  const params = Object.fromEntries(url.searchParams);
  const path = params.path;
  if (!path) return { status: 400, contentType: "text/plain", body: Buffer.from("missing path") };

  const creds = credsFromEnv(env);
  if (!creds) return { status: 503, contentType: "text/plain", body: Buffer.from("credentials not configured") };

  const media = path === "mediaJeu.php";
  const qs = upstreamQuery(params, creds);
  if (!media) qs.set("output", "json");

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM}/${path}?${qs}`);
  } catch {
    return { status: 502, contentType: "text/plain", body: Buffer.from("upstream unreachable") };
  }
  if (!upstream.ok) {
    return { status: upstream.status, contentType: "text/plain", body: Buffer.from("upstream " + upstream.status) };
  }

  if (media) {
    return {
      status: 200,
      contentType: upstream.headers.get("content-type") || "application/octet-stream",
      cache: "public, max-age=604800, immutable",
      body: Buffer.from(await upstream.arrayBuffer()),
    };
  }

  let json;
  try {
    json = stripMediaCredentials(await upstream.json());
  } catch {
    return { status: 502, contentType: "text/plain", body: Buffer.from("bad upstream response") };
  }
  return {
    status: 200,
    contentType: "application/json; charset=utf-8",
    cache: "public, max-age=86400",
    body: Buffer.from(JSON.stringify(json)),
  };
}
