const DB_NAME = "cartridge-flow-covers"
const STORE_NAME = "covers"
const DB_VERSION = 1
const IDB_PREFIX = "idb://cover/"

const objectUrlCache = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
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

export function isCoverCacheKey(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith(IDB_PREFIX)
}

export function readCoverCacheKey(value: string): string {
  return value.slice(IDB_PREFIX.length)
}

export function isCustomCoverKey(value: string | undefined): boolean {
  return isCoverCacheKey(value) && readCoverCacheKey(value).startsWith("custom-")
}

export async function saveCoverBlob(key: string, blob: Blob): Promise<string> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).put(blob, key)
  await runRequest(tx.objectStore(STORE_NAME).get(key))
  return makeCoverCacheKey(key)
}

export async function saveCoverFile(key: string, file: File): Promise<string> {
  return saveCoverBlob(key, file)
}

export async function loadCoverObjectUrl(keyOrToken: string): Promise<string | null> {
  const key = isCoverCacheKey(keyOrToken) ? readCoverCacheKey(keyOrToken) : keyOrToken
  const cached = objectUrlCache.get(key)
  if (cached) return cached
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readonly")
  const blob = await runRequest(tx.objectStore(STORE_NAME).get(key) as IDBRequest<Blob | undefined>)
  if (!blob) return null
  const objectUrl = URL.createObjectURL(blob)
  objectUrlCache.set(key, objectUrl)
  return objectUrl
}

export function releaseCoverObjectUrl(keyOrToken: string) {
  const key = isCoverCacheKey(keyOrToken) ? readCoverCacheKey(keyOrToken) : keyOrToken
  const objectUrl = objectUrlCache.get(key)
  if (!objectUrl) return
  URL.revokeObjectURL(objectUrl)
  objectUrlCache.delete(key)
}

export async function clearCoverCacheStore() {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url)
  objectUrlCache.clear()
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).clear()
  await runRequest(tx.objectStore(STORE_NAME).getAllKeys())
}
