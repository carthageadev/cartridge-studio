export interface Credentials {
  devid: string
  devpassword: string
  softname: string
}

export interface SearchResult {
  id: string
  name: string
  year: string
}

export interface GameInfo {
  labelUrl: string | null
}

const CREDS_KEY = 'retroflow.creds.v1'
const N64_SYSTEM_ID = '14'
const REGION_PRIORITY = ['wor', 'us', 'eu', 'ss', 'jp']
/* Box art: European labels first, US as the fallback. */
const LABEL_REGION_PRIORITY = ['eu', 'us', 'wor', 'ss', 'jp']

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function pickByRegion<T extends { region?: string }>(items: T[], priority: string[] = REGION_PRIORITY): T | undefined {
  for (const region of priority) {
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
  return (pickByRegion(arr)?.text ?? '').slice(0, 4)
}

function pickLabelUrl(medias: any): string | null {
  const textures = asArray<any>(medias).filter((m) => m.type === 'support-texture')
  const best = pickByRegion(textures, LABEL_REGION_PRIORITY)
  return best?.url ? proxify(best.url) : null
}

async function ssRequest(endpoint: string, params: Record<string, string>) {
  // Keys stay server-side (api/ss.ts in production, dev middleware locally).
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
    throw new Error(text.slice(0, 160) || 'Invalid ScreenScraper response')
  }
}

// Keys live server-side now, so the client carries none. These helpers only
// clear out copies stored by older versions.
export function getDefaultCredentials(): Credentials {
  return { devid: '', devpassword: '', softname: 'CartridgeFlow' }
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

/** Rewrite upstream media URLs to the proxied /api2 path, dropping credentials. */
export function proxify(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.startsWith('/api2') ? parsed.pathname : `/api2${parsed.pathname}`
    const params = new URLSearchParams(parsed.search)
    // Credentials must never travel in page URLs; the proxy attaches them.
    for (const key of ['devid', 'devpassword', 'softname', 'ssid', 'sspassword']) params.delete(key)
    const query = params.toString()
    return query ? `${path}?${query}` : path
  } catch {
    return url
  }
}

export async function searchGames(query: string): Promise<SearchResult[]> {
  try {
    const data = await ssRequest('jeuRecherche.php', {
      systemeid: N64_SYSTEM_ID,
      recherche: query,
    })
    const jeux = asArray<any>(data?.response?.jeux?.jeu ?? data?.response?.jeux)
    return jeux
      .filter((j) => j?.id != null)
      .filter((j) => j.systeme?.id == null || String(j.systeme.id) === N64_SYSTEM_ID)
      .map((j) => ({
        id: String(j.id),
        name: pickName(j.noms) || 'Unknown title',
        year: pickYear(j.dates),
      }))
  } catch (err: any) {
    if (err?.status === 404) return []
    throw err
  }
}

export async function fetchGameInfo(gameId: string): Promise<GameInfo> {
  const data = await ssRequest('jeuInfos.php', { gameid: gameId })
  const jeu = data?.response?.jeu
  if (!jeu) throw new Error('Game not found')

  return {
    labelUrl: pickLabelUrl(jeu.medias),
  }
}
