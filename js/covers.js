import * as THREE from "three";

/* Cover art: ScreenScraper lookup with download + local cache.
   Keys live in ../config.local.js (gitignored, copy config.example.js).
   Without keys everything stays procedural. If the browser blocks the
   API (CORS), covers stay procedural too - run a tiny proxy instead. */

const SYSTEM = "14";
const LABEL_ORDER = ["eu", "us", "wor", "ss", "jp"];
const DB_NAME = "epsilon-covers";

function apiBase() {
  return window.SS_API || "https://www.screenscraper.fr/api2";
}

/* Route media downloads through the dev proxy when one is configured,
   same as the API calls. Media URLs already live under /api2, so keep
   the path as is. Direct otherwise. */
function proxify(url) {
  if (window.SS_API === "/api2") {
    try {
      const u = new URL(url);
      if (u.hostname.includes("screenscraper.fr")) return u.pathname + u.search;
    } catch { /* fall through to direct */ }
  }
  return url;
}

const mem = new Map();
let warned = false;
let configLoaded = false;
function warnOnce(msg) {
  if (!warned) { warned = true; console.warn("[covers] " + msg); }
}

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

function creds() {
  const c = window.SS_CONFIG || {};
  return c.devid && c.devpassword
    ? { devid: c.devid, devpassword: c.devpassword, softname: c.softname || "EpsilonGallery" }
    : null;
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

async function api(endpoint, params, c) {
  const qs = new URLSearchParams({
    devid: c.devid, devpassword: c.devpassword, softname: c.softname,
    output: "json", ...params,
  });
  const res = await fetch(`${apiBase()}/${endpoint}?${qs}`);
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
  const c = creds();
  if (!c) return null;
  const found = await api("jeuRecherche.php", { systemeid: SYSTEM, recherche: title }, c);
  const jeux = asArray(found?.response?.jeux?.jeu ?? found?.response?.jeux)
    .filter((j) => j?.id != null)
    .filter((j) => j.systeme?.id == null || String(j.systeme.id) === SYSTEM);
  if (!jeux.length) return null;
  const info = await api("jeuInfos.php", { gameid: String(jeux[0].id) }, c);
  const url = pickLabel(info?.response?.jeu?.medias);
  if (!url) return null;
  const res = await fetch(proxify(url));
  if (!res.ok) throw new Error("http " + res.status);
  return res.blob();
}

async function coverTexture(title) {
  if (mem.has(title)) return mem.get(title);
  const p = (async () => {
    if (!configLoaded) { configLoaded = true; await loadScript("./config.local.js"); }
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
