import type { GameMeta, SearchResult } from '../types'

// -- Credentials ---------------------------------------------------------------
// Keys live server-side now (api/ss.ts in production, dev middleware locally),
// so the client carries none. These helpers only clear out copies stored by
// older versions.

const CREDS_KEY = 'retroflow.creds.v1'

export interface Credentials {
  devid: string
  devpassword: string
  softname: string
}

export function getDefaultCredentials(): Credentials {
  return { devid: '', devpassword: '', softname: 'CartridgeStudio' }
}

export function getCredentials(): Credentials {
  return getDefaultCredentials()
}

/** @deprecated keys are no longer stored client-side */
export function saveCredentials(_creds: Credentials) {
  clearCredentials()
}

export function clearCredentials() {
  try {
    localStorage.removeItem(CREDS_KEY)
  } catch {
    /* no-op */
  }
}

// -- Core fetch ----------------------------------------------------------------

const N64_SYSTEM_ID = '14'
const REGION_PRIORITY = ['wor', 'us', 'eu', 'ss', 'jp']

async function ssRequest(endpoint: string, params: Record<string, string>) {
  // Keys stay server-side; the proxy attaches them.
  const qs = new URLSearchParams({ output: 'json', ...params })
  const res = await fetch(`/api2/${endpoint}?${qs}`)
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`ScreenScraper ${res.status}: ${text.slice(0, 120)}`)
    ;(err as any).status = res.status
    throw err
  }
  try {
    return JSON.parse(text)
  } catch {
    // ScreenScraper reports auth/quota errors as plain text with HTTP 200
    throw new Error(text.slice(0, 160) || 'Invalid ScreenScraper response')
  }
}

/** Rewrite an absolute ScreenScraper URL to a relative /api2/... path so it
 *  goes through the server proxy (CORS bypass, per spec 3.4), dropping any
 *  credentials. The proxy attaches them server-side. */
export function proxify(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.startsWith('/api2') ? u.pathname : `/api2${u.pathname}`
    const params = new URLSearchParams(u.search)
    for (const key of ['devid', 'devpassword', 'softname', 'ssid', 'sspassword']) params.delete(key)
    const query = params.toString()
    return query ? `${path}?${query}` : path
  } catch {
    return url
  }
}

// -- Response parsing helpers --------------------------------------------------

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function pickByRegion<T extends { region?: string }>(items: T[]): T | undefined {
  for (const region of REGION_PRIORITY) {
    const hit = items.find((i) => i.region === region)
    if (hit) return hit
  }
  return items[0]
}

function pickName(noms: any): string {
  const arr = asArray<any>(noms)
  return pickByRegion(arr)?.text ?? arr[0]?.text ?? ''
}

function pickYear(dates: any): string {
  const arr = asArray<any>(dates)
  const text: string = pickByRegion(arr)?.text ?? ''
  return text.slice(0, 4)
}

function pickSynopsis(synopsis: any): string {
  const arr = asArray<any>(synopsis)
  return (
    arr.find((s) => s.langue === 'en')?.text ??
    arr[0]?.text ??
    ''
  )
}

function pickGenres(genres: any): string[] {
  return asArray<any>(genres)
    .map((g) => {
      const noms = asArray<any>(g.noms)
      return noms.find((n) => n.langue === 'en')?.text ?? noms[0]?.text ?? ''
    })
    .filter(Boolean)
    .slice(0, 3)
}

/** Spec 3 phase 3: find the cropped cartridge label (`support-texture`),
 *  preferring wor -> us -> eu -> ss -> jp. */
function pickLabelUrl(medias: any): string | null {
  const textures = asArray<any>(medias).filter((m) => m.type === 'support-texture')
  const best = pickByRegion(textures)
  return best?.url ? proxify(best.url) : null
}

// -- Public API ----------------------------------------------------------------

export async function searchGames(query: string): Promise<SearchResult[]> {
  let data: any
  try {
    data = await ssRequest('jeuRecherche.php', {
      systemeid: N64_SYSTEM_ID,
      recherche: query,
    })
  } catch (err: any) {
    if (err?.status === 404) return [] // "game not found" - not an error
    throw err
  }
  const jeux = asArray<any>(data?.response?.jeux?.jeu ?? data?.response?.jeux)
  return jeux
    // Empty searches can come back as [{}] - a row without an id is not a game
    .filter((j) => j?.id != null)
    .filter((j) => j.systeme?.id == null || String(j.systeme.id) === N64_SYSTEM_ID)
    .map((j) => ({
      id: String(j.id),
      name: pickName(j.noms) || 'Unknown title',
      year: pickYear(j.dates),
    }))
}

export interface GameInfo {
  labelUrl: string | null
  meta: GameMeta
}

export async function fetchGameInfo(gameId: string): Promise<GameInfo> {
  const data = await ssRequest('jeuInfos.php', { gameid: gameId })
  const jeu = data?.response?.jeu
  if (!jeu) throw new Error('Game not found')

  const ratingText = jeu.note?.text
  const rating = ratingText ? parseFloat(ratingText) : NaN

  return {
    labelUrl: pickLabelUrl(jeu.medias),
    meta: {
      title: pickName(jeu.noms),
      description: pickSynopsis(jeu.synopsis),
      genres: pickGenres(jeu.genres),
      year: pickYear(jeu.dates),
      developer: jeu.developpeur?.text ?? '',
      publisher: jeu.editeur?.text ?? '',
      players: jeu.joueurs?.text ?? '',
      rating: Number.isFinite(rating) ? rating : null,
    },
  }
}
