import * as THREE from "three";

/* Cover art: cartridge labels pulled from ScreenScraper through a small
   proxy that keeps the keys server side (api/ss.js in production, the
   vite middleware in development). Results are cached in IndexedDB. */

const ENDPOINT = "/api/ss";
const SYSTEM = "14";
const LABEL_ORDER = ["eu", "us", "wor", "ss", "jp"];
const DB_NAME = "epsilon-covers";

const mem = new Map();
let warned = false;

function warnOnce(msg) {
  if (!warned) { warned = true; console.warn("[covers] " + msg); }
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function pickLabel(medias) {
  const tex = asArray(medias).filter((m) => m.type === "support-texture");
  for (const region of LABEL_ORDER) {
    const hit = tex.find((m) => m.region === region);
    if (hit && hit.url) return hit.url;
  }
  return null;
}

async function api(path, params) {
  const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ path, ...params })}`);
  if (!res.ok) throw new Error("http " + res.status);
  return res.json();
}

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("covers");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await idb();
    return await new Promise((resolve) => {
      const tx = db.transaction("covers").objectStore("covers").get(key);
      tx.onsuccess = () => resolve(tx.result || null);
      tx.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(key, blob) {
  try {
    const db = await idb();
    db.transaction("covers", "readwrite").objectStore("covers").put(blob, key);
  } catch { /* cache is best effort */ }
}

async function downloadLabel(title) {
  const found = await api("jeuRecherche.php", { systemeid: SYSTEM, recherche: title });
  const jeux = asArray(found && found.response && found.response.jeux)
    .filter((j) => j && j.id != null)
    .filter((j) => !j.systeme || j.systeme.id == null || String(j.systeme.id) === SYSTEM);
  if (!jeux.length) return null;
  const info = await api("jeuInfos.php", { gameid: String(jeux[0].id) });
  const url = pickLabel(info && info.response && info.response.jeu && info.response.jeu.medias);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error("http " + res.status);
  return res.blob();
}

async function coverTexture(title) {
  if (mem.has(title)) return mem.get(title);
  const p = (async () => {
    const cached = await idbGet(title);
    const blob = cached || await downloadLabel(title).catch((err) => {
      warnOnce("cover lookup failed, keeping procedural art (" + err.message + ")");
      return null;
    });
    if (!blob) return null;
    if (!cached) idbSet(title, blob);
    const tex = await new THREE.TextureLoader().loadAsync(URL.createObjectURL(blob));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.anisotropy = 8;
    return tex;
  })();
  mem.set(title, p);
  return p;
}

/* Fire and forget: swaps the procedural sticker for the downloaded
   cover when it arrives. Never throws. */
export function upgradeSticker(material, title) {
  coverTexture(title).then((tex) => {
    if (!tex || material.disposed) return;
    material.map = tex;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  });
}
