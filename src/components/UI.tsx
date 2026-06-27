import { useEffect, useState, useCallback } from "react"
import { useStore, PRESETS, clearLibraryCoverCache, refreshLibraryCovers } from "../store"
import { clearCredentials } from "../api/screenscraper"
import { saveCoverFile } from "../utils/coverCache"
import {
  Search, Heart, Library, Info, X, BatteryMedium, BatteryLow, BatteryFull,
  Wifi, Settings, Clock, ChevronLeft, ChevronRight, ZoomIn, Plus, Pencil, Trash2, Upload
} from "lucide-react"
import { Button, Badge, Dialog, DialogContent, DialogTitle, DialogDescription, Tabs, TabsList, TabsTrigger, Slider, Switch } from "./primitives"
import { cn } from "../utils/cn"

const SORT_MODES = [
  { key: "featured", label: "Featured" },
  { key: "favorites", label: "Favorites" },
  { key: "rating", label: "Top Rated" },
  { key: "year", label: "Newest" },
  { key: "alpha", label: "A-Z" },
] as const
const NO_IMAGE_COVER = "/no-image.svg"

/* -- Star rating -- */
function Stars({ rating, color }: { rating: number; color: string }) {
  const filled = Math.round(rating / 2)
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < filled ? color : "none"} stroke={color} strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-white/40 text-[11px] ml-1.5 font-medium">{rating.toFixed(1)}</span>
    </div>
  )
}

/* -- Battery icon -- */
function BatteryIcon({ level }: { level: number }) {
  if (level > 70) return <BatteryFull className="w-4 h-4 text-emerald-400" />
  if (level > 30) return <BatteryMedium className="w-4 h-4 text-yellow-400" />
  return <BatteryLow className="w-4 h-4 text-red-400" />
}

/* -- Top status bar + settings -- */
function StatusBar({ onLibrary, inspectMode, setInspectMode }: { onLibrary: () => void; inspectMode: boolean; setInspectMode: (v: boolean) => void }) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
  const [battery] = useState(84)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetSettings = useStore((s) => s.resetSettings)
  const sortMode = useStore((s) => s.sortMode)
  const setSortMode = useStore((s) => s.setSortMode)
  const onlyFavorites = useStore((s) => s.onlyFavorites)
  const setOnlyFavorites = useStore((s) => s.setOnlyFavorites)
  const resetSceneTweaks = useStore((s) => s.resetSceneTweaks)
  const applyPreset = useStore((s) => s.applyPreset)
  const sceneTweaks = useStore((s) => s.sceneTweaks)
  const updateSceneTweaks = useStore((s) => s.updateSceneTweaks)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 1000)
    return () => clearInterval(t)
  }, [])

  const clearCoverCache = () => {
    clearCredentials()
    void clearLibraryCoverCache()
  }

  return (
    <>
      {/* -- Top bar -- */}
      <header className="relative z-20 flex items-center justify-between gap-3 px-5 sm:px-8 pt-5 pointer-events-none">
        <div className="flex items-center gap-3 shrink-0 pointer-events-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/25 ring-1 ring-white/10">
            <span className="text-white text-sm font-extrabold">64</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-white text-base font-bold tracking-wide leading-tight">N64 Flow</h1>
            <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase font-medium">Cartridge OS</p>
          </div>
        </div>

        <div className="hidden md:flex flex-1 justify-center min-w-0 pointer-events-auto">
          <div className="flex items-center gap-1 glass rounded-2xl p-1">
            {SORT_MODES.map((m) => (
              <button key={m.key} onClick={() => setSortMode(m.key)} className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap", sortMode === m.key ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white hover:bg-white/5")}>
                {m.label}
              </button>
            ))}
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => setOnlyFavorites(!onlyFavorites)} className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap", onlyFavorites ? "bg-pink-500 text-white shadow-md" : "text-white/50 hover:text-white hover:bg-white/5")}>
              <Heart className={cn("w-3 h-3", onlyFavorites && "fill-current")} /> Favs
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          <Button variant="outline" onClick={onLibrary} className="rounded-xl px-2.5 sm:px-3 py-2 text-xs"><Library className="w-4 h-4" /><span className="hidden md:inline">Library</span></Button>
          <Button variant={inspectMode ? "primary" : "outline"} onClick={() => setInspectMode(!inspectMode)} className="rounded-xl px-2.5 sm:px-3 py-2 text-xs"><ZoomIn className="w-4 h-4" /><span className="hidden md:inline">{inspectMode ? "Exit Zoom" : "Zoom"}</span></Button>

          <div className="flex items-center gap-2.5 glass rounded-2xl px-3 py-1.5 ml-1">
            <Wifi className="w-4 h-4 text-white/60 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium"><BatteryIcon level={battery} /><span className="hidden sm:inline">{battery}%</span></div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium"><Clock className="w-3.5 h-3.5" /><span className="tabular-nums">{time}</span></div>
            <button onClick={() => setSettingsOpen(true)} className="ml-0.5 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" aria-label="Settings"><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* -- Settings modal -- */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-white/70" /> System Settings</DialogTitle>
          <DialogDescription className="mb-5">Tune your handheld experience.</DialogDescription>

          {/* -- Audio -- */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">Audio</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/70"><span>Ambience Volume</span><span className="tabular-nums text-white/50">{Math.round(settings.ambienceVolume * 100)}%</span></div>
                <Slider value={[settings.ambienceVolume * 100]} max={100} step={1} onValueChange={(v) => updateSettings({ ambienceVolume: v[0] / 100 })} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/70"><span>SFX Volume</span><span className="tabular-nums text-white/50">{Math.round(settings.sfxVolume * 100)}%</span></div>
                <Slider value={[settings.sfxVolume * 100]} max={100} step={1} onValueChange={(v) => updateSettings({ sfxVolume: v[0] / 100 })} />
              </div>
            </div>
          </div>

          {/* -- Camera -- */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">Camera</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>Zoom Distance</span>
                <span className="tabular-nums text-white/50">{settings.cameraZoom.toFixed(1)}</span>
              </div>
              <Slider value={[settings.cameraZoom]} min={6} max={14} step={0.1} onValueChange={(v) => updateSettings({ cameraZoom: v[0] })} />
              <div className="flex justify-between text-[10px] text-white/30 px-0.5">
                <span>Close</span>
                <span>Default 13.0</span>
                <span>Far</span>
              </div>
            </div>
          </div>

          {/* -- Display -- */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">Display</p>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.06]">
              <div className="flex items-center justify-between px-4 py-3"><span className="text-sm text-white/80">High Quality Textures</span><Switch checked={settings.highQuality} onCheckedChange={(checked) => updateSettings({ highQuality: checked })} /></div>
              <div className="flex items-center justify-between px-4 py-3"><span className="text-sm text-white/80">CRT Scanline Overlay</span><Switch checked={settings.crtOverlay} onCheckedChange={(checked) => updateSettings({ crtOverlay: checked })} /></div>
              <div className="flex items-center justify-between px-4 py-3"><span className="text-sm text-white/80">Cover Status Badges</span><Switch checked={settings.showCoverBadges} onCheckedChange={(checked) => updateSettings({ showCoverBadges: checked })} /></div>
            </div>
          </div>

          {/* -- Visual Effects -- */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">Visual Effects</p>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.06]">
              <div className="flex items-center justify-between px-4 py-3"><span className="text-sm text-white/80">Vignette</span><Switch checked={sceneTweaks.vignetteEnabled} onCheckedChange={(checked) => updateSceneTweaks({ vignetteEnabled: checked })} /></div>
              <div className="flex items-center justify-between px-4 py-3"><span className="text-sm text-white/80">Motion Blur</span><Switch checked={sceneTweaks.motionBlurEnabled} onCheckedChange={(checked) => updateSceneTweaks({ motionBlurEnabled: checked })} /></div>
            </div>
          </div>

          {/* -- Scene Presets -- */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">Scene Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(PRESETS).map((name) => (
                <Button
                  key={name}
                  variant="ghost"
                  onClick={() => applyPreset(PRESETS[name as keyof typeof PRESETS])}
                  className="text-xs"
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3">ScreenScraper</p>
            <div className="space-y-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-xs text-white/50">Developer keys come from `.env.local`. Fetched cover URLs are cached in the library state, so normal reloads should reuse them without refetching.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={refreshLibraryCovers} className="flex-1 text-xs">Refetch Covers</Button>
                <Button variant="ghost" onClick={clearCoverCache} className="flex-1 text-xs">Clear Cover Cache</Button>
              </div>
            </div>
          </div>

          {/* -- Reset -- */}
          <div className="pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={() => { resetSettings(); resetSceneTweaks() }} className="w-full text-xs">Reset All to Defaults</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* -- Library panel - everything inline, no nested portals -- */
function LibraryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const sortMode = useStore((s) => s.sortMode)
  const setSortMode = useStore((s) => s.setSortMode)
  const onlyFavorites = useStore((s) => s.onlyFavorites)
  const setOnlyFavorites = useStore((s) => s.setOnlyFavorites)
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const setSelectedIndex = useStore((s) => s.setSelectedIndex)
  const getVisibleGames = useStore((s) => s.getVisibleGames)
  const visibleGames = getVisibleGames()

  const addGame = useStore((s) => s.addGame)
  const removeGame = useStore((s) => s.removeGame)
  const updateGame = useStore((s) => s.updateGame)

  const [editing, setEditing] = useState<any | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ title: "", year: "1998", genre: "3D Platformer", developer: "Nintendo", description: "", coverArt: NO_IMAGE_COVER, rating: 9.0, players: "1 Player", color: "#6366f1" })

  const openAdd = () => { setEditing(null); setForm({ title: "", year: "1998", genre: "3D Platformer", developer: "Nintendo", description: "", coverArt: NO_IMAGE_COVER, rating: 9.0, players: "1 Player", color: "#6366f1" }); setFormOpen(true) }
  const openEdit = (g: any) => { setEditing(g); setForm({ ...g }); setFormOpen(true) }
  const closeForm = () => { setFormOpen(false); setEditing(null) }
  const saveForm = () => { if (editing) updateGame(editing.id, form); else addGame(form); closeForm() }
  const handleRemove = (id: number, e: React.MouseEvent) => { e.stopPropagation(); if (confirm("Remove this cartridge?")) removeGame(id) }
  const handleCustomCoverForGame = async (game: any, file: File) => {
    const cacheKey = await saveCoverFile(`custom-${game.id}`, file)
    updateGame(game.id, {
      coverArt: cacheKey,
      status: "ready",
      coverState: "cached",
      error: undefined,
    })
  }
  const handleCustomCoverForForm = async (file: File) => {
    const cacheKey = await saveCoverFile(`custom-form-${editing?.id ?? Date.now()}`, file)
    setForm((current) => ({ ...current, coverArt: cacheKey }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent wide tall>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl"><Library className="w-5 h-5 text-indigo-400" /> Cartridge Library</DialogTitle>
            <DialogDescription>Add, edit or remove games from your personal collection.</DialogDescription>
          </div>
          <Button onClick={openAdd} className="rounded-xl text-xs"><Plus className="w-4 h-4" /> Add Game</Button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search titles, genres, developers…" className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <Button variant="outline" onClick={() => setOnlyFavorites(!onlyFavorites)} className={cn(onlyFavorites && "border-pink-500/40 text-pink-300 bg-pink-500/10")}><Heart className={cn("w-4 h-4", onlyFavorites && "fill-current")} /> Favorites</Button>
        </div>

        <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)} className="mb-4">
          <TabsList>{SORT_MODES.map((m) => <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>)}</TabsList>
        </Tabs>

        {/* Add/Edit form inline (no nested portal - clean, no clipping) */}
        {formOpen && (
          <div className="mb-4 p-5 rounded-2xl bg-white/[0.04] border border-white/10 animate-float-in">
            <div className="flex justify-between mb-4"><div className="font-bold text-white">{editing ? "Edit Cartridge" : "Add New Game"}</div><button onClick={closeForm} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm col-span-2" />
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
              <input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Genre" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
              <input value={form.developer} onChange={(e) => setForm({ ...form, developer: e.target.value })} placeholder="Developer" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm col-span-2" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm h-16 col-span-2 resize-y" />
              <input value={form.coverArt} onChange={(e) => setForm({ ...form, coverArt: e.target.value })} placeholder="Cover URL" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
              <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#Hex color" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
              <label className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-white/70 cursor-pointer transition-all hover:border-white/30 hover:bg-white/[0.06] hover:-translate-y-0.5">
                <Upload className="w-4 h-4" />
                Upload custom cover
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCustomCoverForForm(file) }} />
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="ghost" onClick={closeForm} className="flex-1">Cancel</Button>
              <Button onClick={saveForm} className="flex-1">{editing ? "Save" : "Add"}</Button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleGames.map((game: any, i: number) => {
              const isFav = favorites.includes(game.id)
              const isSelected = i === selectedIndex
              return (
                <div key={game.id} onClick={() => { setSelectedIndex(i); onClose() }} className={cn("group relative rounded-2xl border overflow-hidden cursor-pointer transition-all", isSelected ? "border-indigo-400/50 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-500/10" : "border-white/[0.06] hover:border-white/20")}>
                  <div className="relative aspect-[3/4] bg-black/40">
                    <img src={game.coverArt} alt={game.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Quick actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(game.id) }} className={cn("p-1.5 rounded-lg bg-black/50 backdrop-blur", isFav ? "text-pink-400" : "text-white/70 hover:text-white")}><Heart className={cn("w-3.5 h-3.5", isFav && "fill-current")} /></button>
                      <label onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg bg-black/50 backdrop-blur text-white/70 hover:text-white cursor-pointer transition-transform hover:-translate-y-0.5">
                        <Upload className="w-3.5 h-3.5" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCustomCoverForGame(game, file) }} />
                      </label>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(game) }} className="p-1.5 rounded-lg bg-black/50 backdrop-blur text-white/70 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => handleRemove(game.id, e)} className="p-1.5 rounded-lg bg-black/50 backdrop-blur text-white/70 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    {isSelected && <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-500 text-white tracking-wider shadow-lg">NOW</div>}

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="text-white text-xs font-bold leading-tight line-clamp-2 drop-shadow-md">{game.title}</div>
                      <div className="text-white/60 text-[10px] mt-0.5">{game.year} · {game.genre}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* -- Main UI -- */
export function UI() {
  const selectedIndex = useStore((s) => s.selectedIndex)
  const next = useStore((s) => s.next)
  const prev = useStore((s) => s.prev)
  const setSelectedIndex = useStore((s) => s.setSelectedIndex)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const inspectMode = useStore((s) => s.inspectMode)
  const setInspectMode = useStore((s) => s.setInspectMode)
  const toggleLeva = useStore((s) => s.toggleLeva)

  const [libraryOpen, setLibraryOpen] = useState(false)
  const [infoVisible, setInfoVisible] = useState(true)

  const getVisibleGames = useStore((s) => s.getVisibleGames)
  const visibleGames = getVisibleGames()
  const game = visibleGames[selectedIndex] ?? visibleGames[0]

  useEffect(() => { setInfoVisible(false); const t = setTimeout(() => setInfoVisible(true), 150); return () => clearTimeout(t) }, [selectedIndex])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") next()
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") prev()
    if (e.key === "i" || e.key === "I") setInspectMode(!inspectMode)
    if (e.key === "h" || e.key === "H") toggleLeva()
  }, [next, prev, inspectMode, setInspectMode, toggleLeva])

  useEffect(() => { window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey) }, [handleKey])

  useEffect(() => {
    let lastTime = 0
    const h = (e: WheelEvent) => { const n = Date.now(); if (n - lastTime < 280) return; lastTime = n; if (e.deltaY > 30) next(); else if (e.deltaY < -30) prev() }
    window.addEventListener("wheel", h, { passive: true })
    return () => window.removeEventListener("wheel", h)
  }, [next, prev])

  if (!game) {
    return (
      <div className="absolute inset-0 flex flex-col z-10 select-none pointer-events-none">
        <StatusBar onLibrary={() => setLibraryOpen(true)} inspectMode={inspectMode} setInspectMode={setInspectMode} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="pointer-events-auto rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center">
            <div className="text-lg font-bold text-white">No cartridges available</div>
            <p className="mt-2 text-sm text-white/55">Open the library or refresh the saved state.</p>
            <div className="mt-4">
              <Button onClick={() => setLibraryOpen(true)} className="rounded-xl text-sm">Open Library</Button>
            </div>
          </div>
        </div>
        <LibraryPanel open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col z-10 select-none pointer-events-none">
      {/* Faint neutral ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(180,190,255,0.06) 0%, transparent 70%)` }} />

      <StatusBar onLibrary={() => setLibraryOpen(true)} inspectMode={inspectMode} setInspectMode={setInspectMode} />

      {/* Middle: arrows + inspect hint */}
      <div className="relative flex-1 min-h-0">
        {!inspectMode && (
          <>
            <button className={cn("absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 pointer-events-auto cursor-pointer hover:scale-110 active:scale-95", selectedIndex === 0 && "opacity-0 pointer-events-none")} onClick={prev}><ChevronLeft className="w-6 h-6" /></button>
            <button className={cn("absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 pointer-events-auto cursor-pointer hover:scale-110 active:scale-95", selectedIndex === visibleGames.length - 1 && "opacity-0 pointer-events-none")} onClick={next}><ChevronRight className="w-6 h-6" /></button>
          </>
        )}
        {inspectMode && <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none"><Badge className="bg-white/10 text-white/60 border-white/10 tracking-wider">ZOOM MODE · DRAG TO ROTATE</Badge></div>}
      </div>

      {/* Bottom info - ultra clean, no heavy gradient, the beautiful 3D cartridges are the star */}
      <div className={cn("relative transition-all duration-500 ease-out", infoVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
        <div className="px-5 sm:px-8 pt-1 pb-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center flex-wrap gap-1.5 mb-3 pointer-events-auto">
              {visibleGames.map((_: any, i: number) => <button key={i} onClick={() => setSelectedIndex(i)} className={cn("h-1.5 rounded-full transition-all duration-500", i === selectedIndex ? "bg-white w-7 shadow-lg shadow-white/20" : "bg-white/15 w-1.5 hover:bg-white/30")} />)}
            </div>

            <div className="flex items-end gap-5 sm:gap-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge color={game.color}>{game.genre}</Badge>
                  <span className="text-white/40 text-xs">{game.year}</span>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-xs">{game.players}</span>
                </div>
                <h2 className="text-white text-2xl sm:text-4xl font-extrabold mb-1 tracking-tight leading-tight truncate" style={{ textShadow: `0 0 55px rgba(180,190,255,0.15), 0 2px 14px rgba(0,0,0,0.35)` }}>{game.title}</h2>
                <p className="text-white/55 text-xs sm:text-sm leading-relaxed max-w-xl line-clamp-2">{game.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-white/35 text-xs font-medium">{game.developer}</span>
                  <span className="w-px h-3 bg-white/10" />
                  <Stars rating={game.rating} color={game.color} />
                </div>
                <div className="mt-3 flex items-center gap-2 pointer-events-auto">
                  <Button variant="outline" onClick={() => toggleFavorite(game.id)} className={cn("text-xs rounded-xl", favorites.includes(game.id) && "border-pink-500/40 text-pink-300 bg-pink-500/10")}><Heart className={cn("w-4 h-4", favorites.includes(game.id) && "fill-current")} />{favorites.includes(game.id) ? "Favorited" : "Favorite"}</Button>
                  <Button variant="ghost" onClick={() => setInspectMode(!inspectMode)} className="text-xs rounded-xl"><Info className="w-4 h-4" />{inspectMode ? "Exit Zoom" : "Zoom In"}</Button>
                </div>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <div className="text-[60px] font-black leading-none tracking-tighter" style={{ color: `${game.color}08` }}>{String(selectedIndex + 1).padStart(2, "0")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LibraryPanel open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
  )
}

/* -- Loading screen -- */
export function LoadingScreen() {
  const [dots, setDots] = useState("")
  useEffect(() => { const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400); return () => clearInterval(id) }, [])
  return (
    <div className="absolute inset-0 bg-[#08081a] flex flex-col items-center justify-center z-50">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-400" style={{ animation: "spin 1.2s linear infinite reverse" }} />
        <div className="absolute inset-4 rounded-full border-2 border-pink-500/20 border-l-pink-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-indigo-400/60 animate-pulse" /></div>
      </div>
      <p className="text-white/50 text-sm tracking-[0.3em] uppercase font-medium">Loading{dots}</p>
      <p className="text-white/20 text-xs mt-2 tracking-wider">Preparing your collection</p>
    </div>
  )
}
