export interface Credentials {
  devid: string
  devpassword: string
  softname: string
  ssid: string
  sspassword: string
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

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
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
  return (pickByRegion(arr)?.text ?? '').slice(0, 4)
}

function pickLabelUrl(medias: any): string | null {
  const textures = asArray<any>(medias).filter((m) => m.type === 'support-texture')
  const best = pickByRegion(textures)
  return best?.url ? proxify(best.url) : null
}

async function ssRequest(endpoint: string, params: Record<string, string>) {
  const creds = getCredentials()
  const qs = new URLSearchParams({
    devid: creds.devid,
    devpassword: creds.devpassword,
    softname: creds.softname,
    ssid: creds.ssid,
    sspassword: creds.sspassword,
    output: 'json',
    ...params,
  })

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

export function getDefaultCredentials(): Credentials {
  return {
    devid: import.meta.env.VITE_SCREENSCRAPER_DEV_ID ?? '',
    devpassword: import.meta.env.VITE_SCREENSCRAPER_DEV_PASSWORD ?? '',
    softname: import.meta.env.VITE_SCREENSCRAPER_SOFT_NAME ?? 'CartridgeFlow',
    ssid: import.meta.env.VITE_SCREENSCRAPER_SS_ID ?? '',
    sspassword: import.meta.env.VITE_SCREENSCRAPER_SS_PASSWORD ?? '',
  }
}

export function getCredentials(): Credentials {
  try {
    const raw = localStorage.getItem(CREDS_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Credentials>
      const def = getDefaultCredentials()
      return {
        devid: saved.devid || def.devid,
        devpassword: saved.devpassword || def.devpassword,
        softname: saved.softname || def.softname,
        ssid: saved.ssid || def.ssid,
        sspassword: saved.sspassword || def.sspassword,
      }
    }
  } catch {
    /* no-op */
  }

  return getDefaultCredentials()
}

export function saveCredentials(creds: Credentials) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds))
}

export function clearCredentials() {
  localStorage.removeItem(CREDS_KEY)
}

/** Rewrite API media URLs to route through the Vite proxy. */
export function proxify(url: string): string {
  try {
    const creds = getCredentials()
    let path: string
    let params: URLSearchParams

    // Handle both full URLs and relative paths
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      path = parsed.pathname.startsWith('/api2') ? parsed.pathname : `/api2${parsed.pathname}`
      params = new URLSearchParams(parsed.search)
    } else {
      // Relative path like /api2/mediaJeu.php?...
      const qIndex = url.indexOf('?')
      path = qIndex >= 0 ? url.slice(0, qIndex) : url
      if (!path.startsWith('/api2')) path = `/api2${path}`
      params = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '')
    }

    // Inject current credentials into the media URL so empty ones get replaced
    if (creds.devid) params.set('devid', creds.devid)
    if (creds.devpassword) params.set('devpassword', creds.devpassword)
    if (creds.softname) params.set('softname', creds.softname)
    if (creds.ssid) params.set('ssid', creds.ssid)
    if (creds.sspassword) params.set('sspassword', creds.sspassword)

    return `${path}?${params.toString()}`
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
