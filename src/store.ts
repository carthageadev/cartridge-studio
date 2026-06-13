import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GameEntry } from './types'
import { searchGames, fetchGameInfo } from './api/screenscraper'
import type { SearchResult } from './types'

/** The carousel wraps around once there are enough carts to feel like a ring. */
export const MIN_LOOP = 4

export const canLoop = (n: number) => n >= MIN_LOOP

/** Map an unbounded focus value onto a real library index. */
export const wrapIndex = (i: number, n: number) => (n > 0 ? ((i % n) + n) % n : 0)

interface AppState {
  games: GameEntry[]
  /** Index of the cartridge currently centered in the carousel. */
  focus: number
  /** uid of the cartridge in detail view, null while browsing. */
  selectedUid: string | null
  settingsOpen: boolean
  addOpen: boolean
  booted: boolean

  setFocus: (i: number) => void
  moveFocus: (dir: 1 | -1) => void
  select: (uid: string | null) => void
  addGame: (result: SearchResult) => void
  removeGame: (uid: string) => void
  updateGame: (uid: string, patch: Partial<GameEntry>) => void
  setSettingsOpen: (v: boolean) => void
  setAddOpen: (v: boolean) => void
  setBooted: (v: boolean) => void
  resetLibrary: () => void
}

const SEED_TITLES = [
  'Super Mario 64',
  'The Legend of Zelda: Ocarina of Time',
  'Mario Kart 64',
  'GoldenEye 007',
  'Star Fox 64',
  'Banjo-Kazooie',
  'F-Zero X',
  'Donkey Kong 64',
]

function seedEntries(): GameEntry[] {
  return SEED_TITLES.map((name, i) => ({
    uid: `seed-${i}`,
    ssId: null,
    name,
    labelUrl: null,
    meta: null,
    status: 'pending',
  }))
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      games: seedEntries(),
      focus: 0,
      selectedUid: null,
      settingsOpen: false,
      addOpen: false,
      booted: false,

      // Focus is unbounded while looping (the carousel wraps); clamped otherwise.
      setFocus: (i) =>
        set((s) => ({
          focus: canLoop(s.games.length)
            ? i
            : Math.max(0, Math.min(s.games.length - 1, i)),
        })),
      moveFocus: (dir) =>
        set((s) => ({
          focus: canLoop(s.games.length)
            ? s.focus + dir
            : Math.max(0, Math.min(s.games.length - 1, s.focus + dir)),
        })),
      select: (uid) => set({ selectedUid: uid }),

      addGame: (result) => {
        const { games, focus } = get()
        const existing = games.findIndex((g) => g.ssId === result.id)
        if (existing >= 0) {
          set({ focus: nearestFocus(focus, existing, games.length), addOpen: false })
          return
        }
        const entry: GameEntry = {
          uid: `g-${result.id}`,
          ssId: result.id,
          name: result.name,
          labelUrl: null,
          meta: null,
          status: 'pending',
        }
        const next = [...games, entry]
        set({
          games: next,
          focus: nearestFocus(focus, next.length - 1, next.length),
          addOpen: false,
        })
        void resolveLibrary()
      },

      removeGame: (uid) =>
        set((s) => {
          const games = s.games.filter((g) => g.uid !== uid)
          return {
            games,
            selectedUid: s.selectedUid === uid ? null : s.selectedUid,
            focus: canLoop(games.length)
              ? s.focus
              : Math.max(0, Math.min(games.length - 1, s.focus)),
          }
        }),

      updateGame: (uid, patch) =>
        set((s) => ({
          games: s.games.map((g) => (g.uid === uid ? { ...g, ...patch } : g)),
        })),

      setSettingsOpen: (v) => set({ settingsOpen: v }),
      setAddOpen: (v) => set({ addOpen: v }),
      setBooted: (v) => set({ booted: v }),

      resetLibrary: () =>
        set({ games: seedEntries(), focus: 0, selectedUid: null }),
    }),
    {
      name: 'retroflow.library.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ games: s.games }),
    }
  )
)

// -- Background resolver -------------------------------------------------------
// Walks the library and fills in any entry still missing its ScreenScraper
// data (seeds resolve name -> id -> info; added games resolve id -> info).
// Sequential with a small gap to stay friendly with API quotas.

/** Shortest signed hop from the (unbounded) current focus to library index
 *  `idx`, so the ring rotates the short way round. */
function nearestFocus(cur: number, idx: number, n: number): number {
  if (!canLoop(n)) return idx
  let d = (idx - wrapIndex(cur, n)) % n
  if (d > n / 2) d -= n
  if (d < -n / 2) d += n
  return cur + d
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      await sleep(700 * (i + 1)) // ScreenScraper 500s are usually transient throttling
    }
  }
  throw lastErr
}

/** ScreenScraper's search is strict about punctuation and subtitles, so try
 *  progressively looser variants: full name -> punctuation stripped -> subtitle
 *  alone -> main title alone -> without a leading "The". */
function queryVariants(name: string): string[] {
  const variants = [name]
  const noPunct = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  variants.push(noPunct)
  if (name.includes(':')) {
    const [main, sub] = name.split(':').map((s) => s.trim())
    if (sub) variants.push(sub)
    if (main) variants.push(main)
  }
  variants.push(noPunct.replace(/^the\s+/i, ''))
  return [...new Set(variants.map((v) => v.trim()).filter((v) => v.length >= 2))]
}

let resolving = false

export async function resolveLibrary() {
  if (resolving) return
  resolving = true
  try {
    for (;;) {
      const store = useStore.getState()
      const next = store.games.find((g) => g.status === 'pending')
      if (!next) break
      store.updateGame(next.uid, { status: 'loading' })
      try {
        let ssId = next.ssId
        if (!ssId) {
          for (const q of queryVariants(next.name)) {
            try {
              const results = await withRetry(() => searchGames(q), 2)
              if (results[0]) {
                ssId = results[0].id
                break
              }
            } catch {
              /* 404 = no match for this variant - try the next one */
            }
            await sleep(250)
          }
        }
        if (!ssId) throw new Error('No match found')
        const info = await withRetry(() => fetchGameInfo(ssId!))
        useStore.getState().updateGame(next.uid, {
          ssId,
          name: info.meta.title || next.name,
          labelUrl: info.labelUrl,
          meta: info.meta,
          status: 'ready',
        })
      } catch (err) {
        console.warn(`[retroflow] could not resolve "${next.name}":`, err)
        useStore.getState().updateGame(next.uid, { status: 'error' })
      }
      await sleep(350)
    }
  } finally {
    resolving = false
  }
}

/** Called once on app start: requeue entries interrupted mid-load (and give
 *  previously failed ones a fresh chance), then kick off the resolver. */
export function startLibraryResolver() {
  const store = useStore.getState()
  for (const g of store.games) {
    if (g.status === 'loading' || g.status === 'error') {
      store.updateGame(g.uid, { status: 'pending' })
    }
  }
  void resolveLibrary()
}
