// Cover art cache: each label is downloaded once and the blob kept in
// IndexedDB, so refreshes never hit ScreenScraper for the same image again.
// ScreenScraper sends cache-control: no-cache, so the HTTP cache cannot help.

const DB_NAME = 'retroflow-covers'
const STORE_NAME = 'covers'
const IDB_PREFIX = 'idb://cover/'

const objectUrlCache = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function makeCoverCacheKey(key: string): string {
  return `${IDB_PREFIX}${key}`
}

export function isCoverCacheKey(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(IDB_PREFIX)
}

export function readCoverCacheKey(value: string): string {
  return value.slice(IDB_PREFIX.length)
}

export async function saveCoverBlob(key: string, blob: Blob): Promise<string> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(blob, key)
  await runRequest(tx.objectStore(STORE_NAME).get(key))
  return makeCoverCacheKey(key)
}

/** Download a cover once and store it. Returns the cache token, or null on failure. */
export async function cacheCoverFromUrl(key: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.size) return null
    return await saveCoverBlob(key, blob)
  } catch {
    return null
  }
}

/** Resolve a cache token back to an object URL. Object URLs are kept for the
 *  session (shared across every cartridge showing the same game). */
export async function loadCoverObjectUrl(keyOrToken: string): Promise<string | null> {
  const key = isCoverCacheKey(keyOrToken) ? readCoverCacheKey(keyOrToken) : keyOrToken
  const cached = objectUrlCache.get(key)
  if (cached) return cached
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const blob = await runRequest(
    tx.objectStore(STORE_NAME).get(key) as IDBRequest<Blob | undefined>
  )
  if (!blob) return null
  const objectUrl = URL.createObjectURL(blob)
  objectUrlCache.set(key, objectUrl)
  return objectUrl
}