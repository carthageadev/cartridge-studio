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

import { saveCoverBlob } from "../utils/coverCache"

const CREDS_KEY = 'retroflow.creds.v1'
const N64_SYSTEM_ID = '14'
const REGION_PRIORITY = ['us', 'eu', 'jp', 'ss', 'wor']
const LABEL_MEDIA_TYPE = 'support-texture'

function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return '***'
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

function logScraper(event: string, details: Record<string, unknown>) {
  console.info('[screenscraper]', event, details)
}
function stripDiacritics(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

function cleanSearchTerm(value: string): string {
  return stripDiacritics(value)
    .replace(/\.(zip|rar|7z|gz|rom|iso|bin|cue|img|z64|n64|v64)$/gi, ' ')
    .replace(/[_:+\-\u2013\u2014/\\|]+/g, ' ')
    .replace(/(\.nkit|!|Disc\s+\d+|Rev\s+\w+|Proto|Beta|Sample|Demo|Aftermarket|\s*\([^()]*\)|\s*\[[^\[\]]*\])/gi, ' ')
    .replace(/\b(usa|us|europe|eur|japan|jp|world|wii\s+virtual\s+console|switch\s+online)\b/gi, ' ')
    .replace(/[']/g, '')
    .replace(/\bthe\s+/gi, '')
    .replace(/\.(zip|rar|7z|gz|rom|iso|bin|cue|img)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectPreferredRegions(value: string): string[] {
  const normalized = stripDiacritics(value).toLowerCase()
  const detected: string[] = []
  const rules: Array<[string, RegExp]> = [
    ['us', /\b(usa|u\.s\.a|us|ntsc[-\s]?u|north america)\b/],
    ['eu', /\b(europe|eur|pal|uk|france|germany|de|spain|sp|italy|it|australia|au)\b/],
    ['jp', /\b(japan|jp|ntsc[-\s]?j)\b/],
    ['wor', /\b(world|wor)\b/],
  ]
  for (const [region, pattern] of rules) {
    if (pattern.test(normalized)) detected.push(region)
  }
  return [...new Set([...detected, ...REGION_PRIORITY])]
}

function buildSearchCandidates(query: string): string[] {
  const raw = stripDiacritics(query).trim()
  const parts = [
    raw,
    raw.split(':')[0],
    raw.split(/\s-\s/)[0],
  ]
  return [...new Set(parts.map(cleanSearchTerm).filter((value) => value.length >= 2))]
}

function normalizeForMatch(value: string): string {
  return cleanSearchTerm(value).toLowerCase()
}

function scoreSearchResult(query: string, name: string, preferredRegions: string[], resultRegion?: string): number {
  const left = normalizeForMatch(query)
  const right = normalizeForMatch(name)
  if (!left || !right) return 0
  const regionBonus = resultRegion ? Math.max(0, 5 - preferredRegions.indexOf(resultRegion.toLowerCase())) * 20 : 0
  if (left === right) return 1000 + regionBonus
  if (right.startsWith(left)) return 850 - (right.length - left.length) + regionBonus
  if (left.startsWith(right)) return 800 - (left.length - right.length) + regionBonus
  const leftTokens = left.split(' ')
  const rightTokens = new Set(right.split(' '))
  const tokenHits = leftTokens.filter((token) => rightTokens.has(token)).length
  return tokenHits * 100 - Math.abs(right.length - left.length) + regionBonus
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function pickByRegion<T extends { region?: string }>(items: T[]): T | undefined {
  return pickByPreferredRegions(items, REGION_PRIORITY)
}

function pickByPreferredRegions<T extends { region?: string }>(items: T[], preferredRegions: string[]): T | undefined {
  for (const region of preferredRegions) {
    const hit = items.find((i) => (i.region || '').toLowerCase() === region)
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

function pickLabelUrl(medias: any, preferredRegions: string[]): string | null {
  const textures = asArray<any>(medias).filter((m) => m.type === LABEL_MEDIA_TYPE)
  const best = pickByPreferredRegions(textures, preferredRegions)
  return best?.url ? proxify(best.url) : null
}

function pickLabelUrlFromGame(data: any, preferredRegions: string[]): string | null {
  const jeu = asArray<any>(data?.response?.jeu)[0] ?? data?.response?.jeu ?? null
  if (!jeu) return null
  return pickLabelUrl(jeu.medias, preferredRegions)
}

async function isImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    return contentType.startsWith('image/')
  } catch {
    return false
  }
}

async function downloadImageBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    if (!contentType.startsWith('image/')) return null
    return await res.blob()
  } catch {
    return null
  }
}

async function ssRequest(endpoint: string, params: Record<string, string>) {
  const creds = getCredentials()
  const qs = new URLSearchParams({
    devid: creds.devid,
    devpassword: creds.devpassword,
    softname: creds.softname,
    output: 'json',
    ...params,
  })
  logScraper('request', {
    endpoint,
    devid: creds.devid,
    devpassword: maskSecret(creds.devpassword),
    softname: creds.softname,
    params,
  })

  const res = await fetch(`/api2/${endpoint}?${qs}`)
  const text = await res.text()

  if (!res.ok) {
    console.error('[screenscraper] request_failed', {
      endpoint,
      status: res.status,
      body: text.slice(0, 160),
    })
    const err = new Error(`ScreenScraper ${res.status}: ${text.slice(0, 120)}`)
    ;(err as any).status = res.status
    throw err
  }

  try {
    logScraper('request_ok', {
      endpoint,
      status: res.status,
    })
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
    ssid: '',
    sspassword: '',
  }
}

export function getCredentials(): Credentials {
  try {
    const raw = localStorage.getItem(CREDS_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Credentials>
      const def = getDefaultCredentials()
      const creds = {
        devid: def.devid,
        devpassword: def.devpassword,
        softname: def.softname,
        ssid: '',
        sspassword: '',
      }
      logScraper('credentials_loaded', {
        devid: creds.devid,
        devpassword: maskSecret(creds.devpassword),
        source: 'env_only',
        ignoredSavedKeys: Object.keys(saved),
      })
      return creds
    }
  } catch {
    /* no-op */
  }

  const creds = getDefaultCredentials()
  logScraper('credentials_loaded', {
    devid: creds.devid,
    devpassword: maskSecret(creds.devpassword),
    source: 'env_default',
  })
  return creds
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
    params.delete('ssid')
    params.delete('sspassword')

    return `${path}?${params.toString()}`
  } catch {
    return url
  }
}

export async function searchGames(query: string): Promise<SearchResult[]> {
  const ranked = new Map<string, SearchResult & { score: number }>()
  const preferredRegions = detectPreferredRegions(query)

  for (const candidate of buildSearchCandidates(query)) {
    try {
      const data = await ssRequest('jeuRecherche.php', {
        systemeid: N64_SYSTEM_ID,
        recherche: candidate,
      })
      const jeux = asArray<any>(data?.response?.jeux?.jeu ?? data?.response?.jeux)
      for (const game of jeux) {
        if (game?.id == null) continue
        if (game.systeme?.id != null && String(game.systeme.id) !== N64_SYSTEM_ID) continue
        const result = {
          id: String(game.id),
          name: pickName(game.noms) || 'Unknown title',
          year: pickYear(game.dates),
        }
        const score = scoreSearchResult(query, result.name, preferredRegions, pickByRegion(asArray<any>(game.noms))?.region)
        const existing = ranked.get(result.id)
        if (!existing || score > existing.score) ranked.set(result.id, { ...result, score })
      }
      if (ranked.size > 0) break
    } catch (err: any) {
      if (err?.status === 404) continue
      throw err
    }
  }

  return [...ranked.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...result }) => result)
}

export async function fetchGameInfo(gameId: string): Promise<GameInfo> {
  return fetchGameInfoForTitle(gameId, '')
}

export async function fetchGameInfoForTitle(gameId: string, title: string): Promise<GameInfo> {
  const preferredRegions = detectPreferredRegions(title)
  try {
    const data = await ssRequest('jeuInfos.php', {
      systemeid: N64_SYSTEM_ID,
      gameid: gameId,
    })
    const labelUrl = pickLabelUrlFromGame(data, preferredRegions)
    if (labelUrl && await isImageUrl(labelUrl)) {
      const blob = await downloadImageBlob(labelUrl)
      if (blob) return { labelUrl: await saveCoverBlob(`ss-${gameId}`, blob) }
      return { labelUrl }
    }
  } catch {
    /* fall through to direct media candidates */
  }

  for (const region of preferredRegions) {
    const labelUrl = proxify(`/api2/mediaJeu.php?systemeid=${N64_SYSTEM_ID}&jeuid=${gameId}&media=${LABEL_MEDIA_TYPE}(${region})`)
    if (await isImageUrl(labelUrl)) {
      const blob = await downloadImageBlob(labelUrl)
      if (blob) return { labelUrl: await saveCoverBlob(`ss-${gameId}`, blob) }
      return { labelUrl }
    }
  }

  return { labelUrl: null }
}

export async function getScraperThreads(): Promise<number> {
  return 1
}
