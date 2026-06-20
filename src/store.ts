import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { initialGames, type Game } from "./data/games"
import { sortLibraryGames, type LibrarySortMode } from "./utils/library"
import { fetchGameInfo, searchGames } from "./api/screenscraper"

const NO_IMAGE_COVER = "/no-image.svg"
const SCENE_PRESET_VERSION = 4

interface SceneTweaks {
  ambientIntensity: number
  environmentIntensity: number
  environmentRotationY: number
  toneMappingExposure: number
  targetCenterY: number
  targetLowY: number
  keyIntensity: number
  keyYaw: number
  keyPitch: number
  keyRadius: number
  keyPosX: number
  keyPosY: number
  keyPosZ: number
  fillIntensity: number
  fillPosX: number
  fillPosY: number
  fillPosZ: number
  rimIntensity: number
  rimPosX: number
  rimPosY: number
  rimPosZ: number
  leftAccentIntensity: number
  leftAccentPosX: number
  leftAccentPosY: number
  leftAccentPosZ: number
  rightAccentIntensity: number
  rightAccentPosX: number
  rightAccentPosY: number
  rightAccentPosZ: number
  eyeLightIntensity: number
  showEyeLight: boolean
  eyeLightDistance: number
  eyeLightHeight: number
  eyeLightDepth: number
  keyAngle: number
  keyPenumbra: number
  keyDistance: number
  keyDecay: number
  fillAngle: number
  fillPenumbra: number
  fillDistance: number
  fillDecay: number
  rimAngle: number
  rimPenumbra: number
  rimDistance: number
  rimDecay: number
  floorMirror: number
  floorMetalness: number
  floorColor: string
  floorReflectionSource: "flat" | "environment"
  floorResolution: number
  floorMixStrength: number
  floorRoughness: number
  floorBlurX: number
  floorBlurY: number
  floorDepthScale: number
  floorMinDepthThreshold: number
  floorMaxDepthThreshold: number
  bodyRoughness: number
  bodyEnvIntensity: number
  labelRoughness: number
  labelEnvIntensity: number
  bloomIntensity: number
  bloomRadius: number
  shadowOpacity: number
  shadowScale: number
  shadowBlur: number
  shadowFar: number
}

interface Store {
  library: Game[]
  selectedIndex: number
  setSelectedIndex: (i: number) => void
  next: () => void
  prev: () => void
  visibleCount: number
  setVisibleCount: (count: number) => void
  favorites: number[]
  toggleFavorite: (id: number) => void
  onlyFavorites: boolean
  setOnlyFavorites: (value: boolean) => void
  sortMode: LibrarySortMode
  setSortMode: (mode: LibrarySortMode) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  inspectMode: boolean
  setInspectMode: (value: boolean) => void
  settings: {
    ambienceVolume: number
    sfxVolume: number
    highQuality: boolean
    crtOverlay: boolean
    cameraZoom: number
  }
  updateSettings: (patch: Partial<Store["settings"]>) => void
  resetSettings: () => void
  showLeva: boolean
  toggleLeva: () => void
  setShowLeva: (value: boolean) => void
  sceneTweaks: SceneTweaks
  savedSceneTweaks: SceneTweaks
  scenePresetVersion: number
  updateSceneTweaks: (patch: Partial<SceneTweaks>) => void
  saveSceneTweaks: () => void
  revertSceneTweaks: () => void
  resetSceneTweaks: () => void
  applyPreset: (preset: SceneTweaks) => void
  levaPanelVersion: number
  addGame: (game: Omit<Game, "id">) => void
  removeGame: (id: number) => void
  updateGame: (id: number, patch: Partial<Game>) => void
  getVisibleGames: () => Game[]
}

const defaultSettings: Store["settings"] = {
  ambienceVolume: 0.35,
  sfxVolume: 0.6,
  highQuality: true,
  crtOverlay: false,
  cameraZoom: 13,
}

const defaultSceneTweaks: SceneTweaks = {
  ambientIntensity: 0,
  environmentIntensity: 0.4,
  environmentRotationY: -0.96,
  toneMappingExposure: 0.2,
  targetCenterY: 2.67,
  targetLowY: 2.58,
  keyIntensity: 1.37,
  keyYaw: 3.14,
  keyPitch: 0.21,
  keyRadius: 20,
  keyPosX: 4.8,
  keyPosY: 7.8,
  keyPosZ: 6.8,
  fillIntensity: 3,
  fillPosX: -6.4,
  fillPosY: 5.1,
  fillPosZ: 14.4,
  rimIntensity: 1.25,
  rimPosX: 0,
  rimPosY: 7.2,
  rimPosZ: -6.2,
  leftAccentIntensity: 0,
  leftAccentPosX: -6.5,
  leftAccentPosY: 1.4,
  leftAccentPosZ: -20,
  rightAccentIntensity: 2.98,
  rightAccentPosX: -20,
  rightAccentPosY: 1.1,
  rightAccentPosZ: -20,
  eyeLightIntensity: 0.14,
  showEyeLight: false,
  eyeLightDistance: 14,
  eyeLightHeight: 2,
  eyeLightDepth: 6.2,
  keyAngle: 0.47,
  keyPenumbra: 1,
  keyDistance: 20,
  keyDecay: 0.94,
  fillAngle: 0.55,
  fillPenumbra: 1,
  fillDistance: 21,
  fillDecay: 0,
  rimAngle: 0.58,
  rimPenumbra: 0.39,
  rimDistance: 18,
  rimDecay: 0.79,
  floorMirror: 1,
  floorMetalness: 0,
  floorColor: "#303c49",
  floorReflectionSource: "flat",
  floorResolution: 384,
  floorMixStrength: 54,
  floorRoughness: 0.21,
  floorBlurX: 0,
  floorBlurY: 0,
  floorDepthScale: 0.68,
  floorMinDepthThreshold: 0.55,
  floorMaxDepthThreshold: 0.96,
  bodyRoughness: 0.75,
  bodyEnvIntensity: 0.45,
  labelRoughness: 0.21,
  labelEnvIntensity: 1.22,
  bloomIntensity: 0.18,
  bloomRadius: 0.5,
  shadowOpacity: 1,
  shadowScale: 80,
  shadowBlur: 6,
  shadowFar: 12,
}

const darkFlowPreset: SceneTweaks = { ...defaultSceneTweaks }

const glassyFlowPreset: SceneTweaks = {
  ...defaultSceneTweaks,
  environmentIntensity: 0.4,
  environmentRotationY: -0.96,
  toneMappingExposure: 0.2,
  ambientIntensity: 0,
  targetCenterY: 2.67,
  targetLowY: 2.58,
  keyIntensity: 1.37,
  keyYaw: 3.14,
  keyPitch: 0.21,
  keyRadius: 20,
  keyPosX: 4.8,
  keyPosY: 7.8,
  keyPosZ: 6.8,
  fillIntensity: 3,
  fillPosX: -6.4,
  fillPosY: 5.1,
  fillPosZ: 14.4,
  rimIntensity: 1.25,
  rimPosX: 0,
  rimPosY: 7.2,
  rimPosZ: -6.2,
  leftAccentIntensity: 0,
  leftAccentPosX: -6.5,
  leftAccentPosY: 1.4,
  leftAccentPosZ: -20,
  rightAccentIntensity: 2.98,
  rightAccentPosX: -20,
  rightAccentPosY: 1.1,
  rightAccentPosZ: -20,
  eyeLightIntensity: 0.14,
  showEyeLight: false,
  eyeLightDistance: 14,
  eyeLightHeight: 2,
  eyeLightDepth: 6.2,
  keyAngle: 0.47,
  keyPenumbra: 1,
  keyDistance: 20,
  keyDecay: 0.94,
  fillAngle: 0.55,
  fillPenumbra: 1,
  fillDistance: 21,
  fillDecay: 0,
  rimAngle: 0.58,
  rimPenumbra: 0.39,
  rimDistance: 18,
  rimDecay: 0.79,
  floorMirror: 0,
  floorMetalness: 0.69,
  floorColor: "#303c49",
  floorReflectionSource: "flat",
  floorResolution: 640,
  floorMixStrength: 9,
  floorRoughness: 0.1,
  floorBlurX: 0,
  floorBlurY: 69,
  floorDepthScale: 1.13,
  floorMinDepthThreshold: 0.11,
  floorMaxDepthThreshold: 1.27,
  bodyRoughness: 0.75,
  bodyEnvIntensity: 0.45,
  labelRoughness: 0.21,
  labelEnvIntensity: 1.22,
  bloomIntensity: 0.2,
  bloomRadius: 0.83,
  shadowOpacity: 0,
  shadowScale: 2,
  shadowBlur: 0.2,
  shadowFar: 1,
}

export const PRESETS = {
  "Dark Flow": darkFlowPreset,
  "Glassy Flow": glassyFlowPreset,
} as const

export type PresetName = keyof typeof PRESETS

function normalizeSceneTweaks(tweaks?: Partial<SceneTweaks> | null): SceneTweaks {
  return { ...defaultSceneTweaks, ...(tweaks ?? {}) }
}

const seededGames: Game[] = initialGames.map((game) => ({
  ...game,
  coverArt: NO_IMAGE_COVER,
  ssId: null,
  status: "pending",
}))

function isLegacySeedCover(coverArt: string | undefined) {
  return typeof coverArt === "string" && coverArt.startsWith("/images/")
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      await sleep(700 * (i + 1))
    }
  }
  throw lastErr
}

function queryVariants(name: string): string[] {
  const variants = [name]
  const noPunct = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  variants.push(noPunct)
  if (name.includes(":")) {
    const [main, sub] = name.split(":").map((s) => s.trim())
    if (sub) variants.push(sub)
    if (main) variants.push(main)
  }
  variants.push(noPunct.replace(/^the\s+/i, ""))
  return [...new Set(variants.map((variant) => variant.trim()).filter((variant) => variant.length >= 2))]
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      library: seededGames,
      selectedIndex: 0,
      setSelectedIndex: (i: number) => {
        const visible = get().getVisibleGames()
        if (i >= 0 && i < visible.length) {
          set({ selectedIndex: i })
        }
      },
      next: () =>
        set((s) => {
          const visible = s.getVisibleGames()
          return { selectedIndex: Math.min(s.selectedIndex + 1, Math.max(visible.length - 1, 0)) }
        }),
      prev: () =>
        set((s) => ({
          selectedIndex: Math.max(s.selectedIndex - 1, 0),
        })),
      visibleCount: initialGames.length,
      setVisibleCount: (count: number) =>
        set((s) => ({
          visibleCount: Math.max(1, count),
          selectedIndex: Math.min(s.selectedIndex, Math.max(1, count) - 1),
        })),
      favorites: [1, 2, 3, 4, 5, 7],
      toggleFavorite: (id: number) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((favId) => favId !== id)
            : [...s.favorites, id],
        })),
      onlyFavorites: false,
      setOnlyFavorites: (value: boolean) => set({ onlyFavorites: value }),
      sortMode: "featured",
      setSortMode: (mode: LibrarySortMode) => set({ sortMode: mode }),
      searchQuery: "",
      setSearchQuery: (q: string) => set({ searchQuery: q.trimStart() }),
      inspectMode: false,
      setInspectMode: (value: boolean) => set({ inspectMode: value }),
      settings: defaultSettings,
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: defaultSettings }),
      showLeva: false,
      toggleLeva: () => set((s) => ({ showLeva: !s.showLeva })),
      setShowLeva: (value: boolean) => set({ showLeva: value }),
      sceneTweaks: { ...defaultSceneTweaks },
      savedSceneTweaks: { ...defaultSceneTweaks },
      scenePresetVersion: SCENE_PRESET_VERSION,
      updateSceneTweaks: (patch) => set((s) => ({ sceneTweaks: normalizeSceneTweaks({ ...s.sceneTweaks, ...patch }) })),
      saveSceneTweaks: () => set((s) => ({ savedSceneTweaks: normalizeSceneTweaks(s.sceneTweaks) })),
      revertSceneTweaks: () => set((s) => ({ sceneTweaks: { ...normalizeSceneTweaks(s.savedSceneTweaks) }, levaPanelVersion: s.levaPanelVersion + 1 })),
      resetSceneTweaks: () => set(() => ({
        sceneTweaks: { ...defaultSceneTweaks },
        savedSceneTweaks: { ...defaultSceneTweaks },
        scenePresetVersion: SCENE_PRESET_VERSION,
        levaPanelVersion: Date.now(),
      })),
      applyPreset: (preset) => {
        const normalized = normalizeSceneTweaks(preset)
        set(() => ({
          sceneTweaks: { ...normalized },
          savedSceneTweaks: { ...normalized },
          scenePresetVersion: SCENE_PRESET_VERSION,
          levaPanelVersion: Date.now(),
        }))
      },
      levaPanelVersion: 0,
      addGame: (partial) => {
        set((s) => {
          const maxId = Math.max(0, ...s.library.map((g) => g.id))
          const newGame: Game = {
            id: maxId + 1,
            ssId: null,
            status: "pending",
            coverArt: NO_IMAGE_COVER,
            ...partial,
          } as Game
          return { library: [...s.library, newGame] }
        })
        startLibraryResolver()
      },
      removeGame: (id) =>
        set((s) => {
          if (s.library.length <= 1) return s
          const newLib = s.library.filter((g) => g.id !== id)
          const visible = sortLibraryGames(newLib, {
            favorites: s.favorites,
            onlyFavorites: s.onlyFavorites,
            sortMode: s.sortMode,
            searchQuery: s.searchQuery,
          })
          const newIndex = Math.min(s.selectedIndex, Math.max(visible.length - 1, 0))
          return { library: newLib, selectedIndex: newIndex }
        }),
      updateGame: (id, patch) =>
        set((s) => ({
          library: s.library.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      getVisibleGames: () => {
        const s = get()
        return sortLibraryGames(s.library, {
          favorites: s.favorites,
          onlyFavorites: s.onlyFavorites,
          sortMode: s.sortMode,
          searchQuery: s.searchQuery,
        })
      },
    }),
    {
      name: "cartridge-flow-store-v1",
      version: 6,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState

        if (!Array.isArray(persistedState.library)) {
          return {
            ...persistedState,
            sceneTweaks: defaultSceneTweaks,
            savedSceneTweaks: defaultSceneTweaks,
            levaPanelVersion: 0,
            showLeva: false,
          }
        }

        const shouldResetScenePreset =
          version < 6 || persistedState.scenePresetVersion !== SCENE_PRESET_VERSION

        const baseState = {
          ...persistedState,
          sceneTweaks: normalizeSceneTweaks(shouldResetScenePreset ? defaultSceneTweaks : persistedState.sceneTweaks),
          savedSceneTweaks: normalizeSceneTweaks(shouldResetScenePreset ? defaultSceneTweaks : persistedState.savedSceneTweaks),
          scenePresetVersion: SCENE_PRESET_VERSION,
          levaPanelVersion: 0,
          showLeva: false,
        }

        return {
          ...baseState,
          library: persistedState.library.map((game: Game) => ({
            ...game,
            coverArt: isLegacySeedCover(game.coverArt) ? NO_IMAGE_COVER : (game.coverArt || NO_IMAGE_COVER),
            status:
              isLegacySeedCover(game.coverArt) || !game.coverArt
                ? "pending"
                : (game.status ?? "pending"),
          })),
        }
      },
      partialize: (s) => ({
        library: s.library,
        selectedIndex: s.selectedIndex,
        favorites: s.favorites,
        onlyFavorites: s.onlyFavorites,
        sortMode: s.sortMode,
        searchQuery: s.searchQuery,
        inspectMode: s.inspectMode,
        settings: s.settings,
        showLeva: s.showLeva,
        savedSceneTweaks: s.savedSceneTweaks,
        scenePresetVersion: s.scenePresetVersion,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.setShowLeva(false)
        state.revertSceneTweaks()
      },
    }
  )
)

const sleepQueue = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function resolveLibrary() {
  for (;;) {
    const current = useStore.getState()
    const next = current.library.find((g) => g.status === "pending")
    if (!next) break

    useStore.getState().updateGame(next.id, { status: "loading" })

    try {
      let ssId = next.ssId
      if (!ssId) {
        for (const query of queryVariants(next.title)) {
          try {
            const found = await withRetry(() => searchGames(query), 2)
            if (found[0]) {
              ssId = found[0].id
              break
            }
          } catch {
            /* try next variant */
          }
          await sleepQueue(250)
        }
      }

      if (!ssId) throw new Error("No match found")

      const info = await withRetry(() => fetchGameInfo(ssId), 2)
      const patch: Partial<Game> = {
        ssId,
        status: "ready",
        coverArt: info.labelUrl || NO_IMAGE_COVER,
      }
      useStore.getState().updateGame(next.id, patch)
    } catch (err) {
      console.warn(`[retroflow] could not resolve art for "${next.title}":`, err)
      useStore.getState().updateGame(next.id, { status: "error", coverArt: NO_IMAGE_COVER })
    }

    await sleepQueue(350)
  }
}

let runningResolver = false

export function startLibraryResolver() {
  if (runningResolver) return
  const store = useStore.getState()

  for (const g of store.library) {
    if (g.status === "loading" || g.status === "error" || isLegacySeedCover(g.coverArt) || !g.coverArt) {
      store.updateGame(g.id, { status: "pending", coverArt: NO_IMAGE_COVER })
    }
  }

  runningResolver = true
  resolveLibrary().finally(() => {
    runningResolver = false
  })
}
