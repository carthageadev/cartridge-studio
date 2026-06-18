import type { Game } from "../data/games"

export type LibrarySortMode = "featured" | "favorites" | "rating" | "year" | "alpha"

export interface LibraryFilters {
  favorites: number[]
  onlyFavorites: boolean
  sortMode: LibrarySortMode
  searchQuery?: string
}

export function sortLibraryGames(games: Game[], filters: LibraryFilters): Game[] {
  const { favorites, onlyFavorites, sortMode, searchQuery } = filters
  const favSet = new Set(favorites)

  let filtered = onlyFavorites ? games.filter((game) => favSet.has(game.id)) : [...games]

  const q = searchQuery?.trim().toLowerCase()
  if (q) {
    filtered = filtered.filter(
      (game) =>
        game.title.toLowerCase().includes(q) ||
        game.genre.toLowerCase().includes(q) ||
        game.developer.toLowerCase().includes(q)
    )
  }

  if (filtered.length === 0) {
    return [...games]
  }

  const baseIndex = new Map<number, number>()
  games.forEach((game, index) => baseIndex.set(game.id, index))

  const byFeatured = (a: Game, b: Game) => (baseIndex.get(a.id) ?? 0) - (baseIndex.get(b.id) ?? 0)

  const sorted = filtered.sort((a, b) => {
    if (sortMode === "favorites") {
      const aFav = favSet.has(a.id) ? 0 : 1
      const bFav = favSet.has(b.id) ? 0 : 1
      if (aFav !== bFav) return aFav - bFav
      return byFeatured(a, b)
    }

    if (sortMode === "rating") {
      const ratingDelta = b.rating - a.rating
      if (ratingDelta !== 0) return ratingDelta
      return byFeatured(a, b)
    }

    if (sortMode === "year") {
      const yearDelta = Number(b.year) - Number(a.year)
      if (yearDelta !== 0) return yearDelta
      return byFeatured(a, b)
    }

    if (sortMode === "alpha") {
      const titleDelta = a.title.localeCompare(b.title)
      if (titleDelta !== 0) return titleDelta
      return byFeatured(a, b)
    }

    return byFeatured(a, b)
  })

  return sorted
}
