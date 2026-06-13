import type { GameEntry, ScreenScraperConfig, SearchResult } from "../types";

const CONFIG_KEY = "retroflow.screenscraper.config";
const N64_SYSTEM_ID = "14";
const REGION_ORDER = ["wor", "us", "eu", "ss", "jp", "fr"];

const envConfig: ScreenScraperConfig = {
  devId: import.meta.env.VITE_SCREENSCRAPER_DEV_ID ?? "",
  devPassword: import.meta.env.VITE_SCREENSCRAPER_DEV_PASSWORD ?? "",
  softName: import.meta.env.VITE_SCREENSCRAPER_SOFT_NAME ?? "CartridgeFlow",
  userId: import.meta.env.VITE_SCREENSCRAPER_USER_ID ?? "",
  userPassword: import.meta.env.VITE_SCREENSCRAPER_USER_PASSWORD ?? "",
};

function sanitizeSearchQuery(query: string) {
  return query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\b(?:the|a)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readStoredConfig(): Partial<ScreenScraperConfig> {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "{}") as Partial<ScreenScraperConfig>;
  } catch {
    return {};
  }
}

export function getScreenScraperConfig(): ScreenScraperConfig {
  return {
    ...envConfig,
    ...readStoredConfig(),
  };
}

export function saveScreenScraperConfig(config: ScreenScraperConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function hasScreenScraperCredentials(config = getScreenScraperConfig()) {
  return Boolean(config.devId && config.devPassword && config.softName);
}

function baseParams(config = getScreenScraperConfig()) {
  const params = new URLSearchParams({
    devid: config.devId,
    devpassword: config.devPassword,
    softname: config.softName,
    output: "json",
  });

  if (config.userId) {
    params.set("ssid", config.userId);
  }

  if (config.userPassword) {
    params.set("sspassword", config.userPassword);
  }

  return params;
}

async function requestJson(path: string, params: URLSearchParams) {
  const response = await fetch(`/api2/${path}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`ScreenScraper returned ${response.status}`);
  }

  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed || trimmed === "NOMEDIA") {
    throw new Error("ScreenScraper did not return data for that request.");
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("ScreenScraper returned an invalid JSON response.");
  }
}

function valuesFromUnknown(value: unknown): unknown[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }

  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function pickRegionalValue(record: unknown, prefix: string) {
  if (Array.isArray(record)) {
    for (const region of REGION_ORDER) {
      const match = record.find((entry) => {
        const source = asRecord(entry);
        return firstString(source.region, source.regionshortname).toLowerCase() === region;
      });

      const value = firstString(asRecord(match).text, asRecord(match)[prefix], asRecord(match).nom);
      if (value) {
        return value;
      }
    }

    for (const entry of record) {
      const source = asRecord(entry);
      const value = firstString(source.text, source[prefix], source.nom);
      if (value) {
        return value;
      }
    }
  }

  const source = asRecord(record);

  for (const region of REGION_ORDER) {
    const value = source[`${prefix}_${region}`];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return firstString(source[`${prefix}_en`], source[`${prefix}_ss`], source[prefix]);
}

function pickTitle(game: Record<string, unknown>) {
  return pickRegionalValue(game.noms, "nom") || firstString(game.nom, game.name) || "Unknown N64 Game";
}

function pickYear(game: Record<string, unknown>) {
  const dates = asRecord(game.dates);
  const rawDate = firstString(dates.date_us, dates.date_eu, dates.date_wor, dates.date_jp, dates.date_fr);
  return rawDate.match(/\d{4}/)?.[0] ?? "N64";
}

function pickSynopsis(game: Record<string, unknown>) {
  return (
    pickRegionalValue(game.synopsis, "synopsis") ||
    "Metadata is ready to fill in from ScreenScraper once this game is found. Use the add panel to refresh its cartridge art and details."
  );
}

function pickGenre(game: Record<string, unknown>) {
  const genres = asRecord(game.genres);
  const genreArray = Array.isArray(game.genres) ? game.genres : null;
  const regionalGenres = genreArray ?? valuesFromUnknown(genres.genres_en ?? genres.genres_us ?? genres.genres_fr);
  const genreNames = regionalGenres
    .map((entry) => {
      const record = asRecord(entry);
      return firstString(record.genre_en, record.genre_us, record.genre_fr, record.genre, record.text);
    })
    .filter(Boolean);

  if (genreNames.length) {
    return genreNames.slice(0, 2).join(" / ");
  }

  return firstString(game.genre, game.genres) || "N64";
}

type MediaCandidate = {
  type: string;
  region: string;
  url: string;
};

function rewriteMediaUrl(url: string) {
  try {
    const parsed = new URL(url);
    const apiIndex = parsed.pathname.indexOf("/api2/");

    if (parsed.hostname.includes("screenscraper") && apiIndex >= 0) {
      return `${parsed.pathname.slice(apiIndex)}${parsed.search}`;
    }
  } catch {
    return url;
  }

  return url;
}

function collectMediaCandidates(value: unknown, parentKey = ""): MediaCandidate[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectMediaCandidates(entry, parentKey));
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const directUrl = firstString(record.url, record.url_download, record.media, record.link);
  const directType = firstString(record.type, record.media_type, parentKey);
  const directRegion = firstString(record.region, record.regionshortname, record.country);
  const directCandidates: MediaCandidate[] = [];

  if (directUrl) {
    directCandidates.push({
      type: directType,
      region: directRegion,
      url: rewriteMediaUrl(directUrl),
    });
  }

  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "string" && /^https?:\/\//.test(entry)) {
      const keyParts = key.split("_");

      directCandidates.push({
        type: key,
        region: keyParts[keyParts.length - 1] ?? "",
        url: rewriteMediaUrl(entry),
      });
    } else {
      directCandidates.push(...collectMediaCandidates(entry, key));
    }
  }

  return directCandidates;
}

function pickMedia(game: Record<string, unknown>, intent: "label" | "background") {
  const candidates = collectMediaCandidates(game.medias);
  const typePriority =
    intent === "label"
      ? [
          "support-texture",
          "support_texture",
          "support-2d",
          "support_2d",
          "box-texture",
          "box_texture",
          "box-2d",
          "box_2d",
          "steamgrid",
          "sstitle",
        ]
      : ["fanart", "background", "ss", "sstitle", "screenshot"];

  const normalizedCandidates = candidates.map((candidate) => ({
    ...candidate,
    normalizedType: candidate.type.toLowerCase().replace(/-/g, "_"),
  }));

  for (const type of typePriority) {
    const normalizedType = type.replace(/-/g, "_");
    const matches = normalizedCandidates.filter((candidate) => candidate.normalizedType.includes(normalizedType));

    for (const region of REGION_ORDER) {
      const regional = matches.find((candidate) => candidate.region.toLowerCase().includes(region));
      if (regional) {
        return regional.url;
      }
    }

    if (matches[0]) {
      return matches[0].url;
    }
  }

  return candidates[0]?.url;
}

function toSearchResults(data: unknown): SearchResult[] {
  const response = asRecord(asRecord(data).response);
  const gamesNode = response.jeux ?? response.jeu ?? asRecord(data).jeux;
  const games = valuesFromUnknown(gamesNode);

  return games
    .map((entry) => {
      const game = asRecord(entry);
      const id = firstString(game.id, game.gameid, game.jeuid);

      if (!id) {
        return null;
      }

      return {
        id,
        title: pickTitle(game),
        subtitle: [pickYear(game), firstString(game.developpeur, game.editeur)].filter(Boolean).join(" - "),
        source: "screenscraper" as const,
      };
    })
    .filter((entry): entry is SearchResult => Boolean(entry));
}

function toGameEntry(data: unknown, fallbackTitle = "Unknown N64 Game"): GameEntry {
  const response = asRecord(asRecord(data).response);
  const game = asRecord(response.jeu ?? data);
  const id = firstString(game.id, game.gameid, game.jeuid) || fallbackTitle;
  const title = pickTitle(game) || fallbackTitle;
  const note = firstString(game.note);
  const classification = firstString(
    asRecord(game.classifications).classifications_esrb,
    asRecord(game.classifications).classification_esrb,
  );

  return {
    id: `ss-${id}`,
    title,
    description: pickSynopsis(game),
    genre: pickGenre(game),
    releaseYear: pickYear(game),
    developer: firstString(game.developpeur) || "Unknown",
    publisher: firstString(game.editeur) || "Unknown",
    rating: classification || (note ? `${note}/20` : "Unrated"),
    players: firstString(game.joueurs) || "1",
    coverUrl: pickMedia(game, "label"),
    backgroundUrl: pickMedia(game, "background"),
    accent: "#5fe0c4",
    source: "screenscraper",
    screenScraperId: id,
  };
}

export async function searchN64Games(query: string) {
  const config = getScreenScraperConfig();

  if (!hasScreenScraperCredentials(config)) {
    throw new Error("Add ScreenScraper developer credentials in settings or .env.local first.");
  }

  const params = baseParams(config);
  params.set("systemeid", N64_SYSTEM_ID);
  params.set("recherche", sanitizeSearchQuery(query) || query);

  return toSearchResults(await requestJson("jeuRecherche.php", params)).slice(0, 8);
}

export async function fetchN64GameDetails(gameId: string, fallbackTitle?: string) {
  const config = getScreenScraperConfig();

  if (!hasScreenScraperCredentials(config)) {
    throw new Error("Add ScreenScraper developer credentials in settings or .env.local first.");
  }

  const params = baseParams(config);
  params.set("systemeid", N64_SYSTEM_ID);
  params.set("gameid", gameId);

  return toGameEntry(await requestJson("jeuInfos.php", params), fallbackTitle);
}
