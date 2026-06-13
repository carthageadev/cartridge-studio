export interface GameMeta {
  title: string
  description: string
  genres: string[]
  year: string
  developer: string
  publisher: string
  players: string
  /** ScreenScraper community rating, out of 20. Null when unrated. */
  rating: number | null
}

export type GameStatus = 'pending' | 'loading' | 'ready' | 'error'

export interface GameEntry {
  /** Stable client-side id (React key) - never changes once created. */
  uid: string
  /** ScreenScraper game id once resolved. */
  ssId: string | null
  name: string
  /** Proxied (/api2/...) URL of the cartridge sticker texture. */
  labelUrl: string | null
  meta: GameMeta | null
  status: GameStatus
}

export interface SearchResult {
  id: string
  name: string
  year: string
}
