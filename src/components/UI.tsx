import { useEffect, useState, useCallback, useRef } from "react"
import { useStore } from "../store"
import {
  Search, Heart, Library, X, BatteryMedium, BatteryLow, BatteryFull,
  Wifi, Settings, Clock, ChevronUp, ChevronDown, ZoomIn, Plus, Pencil, Trash2
} from "lucide-react"
import { Button, Badge, Dialog, DialogContent, DialogTitle, DialogDescription, Slider, Switch } from "./primitives"
import { useProgress } from "@react-three/drei"
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

/* -- Console key glyph - sharp bordered hint chip -- */
function KeyGlyph({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 border border-white/20 text-white/60 text-[9px] font-bold">{children}</span>
}

/* -- Top status bar + settings -- */
function StatusBar() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
  const [battery] = useState(84)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetSettings = useStore((s) => s.resetSettings)
  const resetSceneTweaks = useStore((s) => s.resetSceneTweaks)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      {/* -- Top bar - brand and system readouts sit on the left, the carousel owns the right -- */}
      <header className="relative z-20 flex items-center gap-3 sm:gap-5 px-5 sm:px-8 pt-5 pointer-events-none">
        <div className="flex items-center gap-3 shrink-0 pointer-events-auto">
          <div className="w-9 h-9 bg-white flex items-center justify-center">
            <span className="text-black text-sm font-extrabold font-display">64</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display text-white text-base font-bold tracking-wide leading-tight">N64 Flow</h1>
            <p className="font-mono text-white/40 text-[10px] tracking-[0.2em] uppercase">Cartridge OS</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 py-1.5 font-mono pointer-events-auto">
          <Wifi className="w-4 h-4 text-white/60 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium"><BatteryIcon level={battery} /><span className="hidden sm:inline">{battery}%</span></div>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium"><Clock className="w-3.5 h-3.5" /><span className="tabular-nums">{time}</span></div>
          <button onClick={() => setSettingsOpen(true)} className="ml-0.5 p-1.5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" aria-label="Settings"><Settings className="w-4 h-4" /></button>
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent wide tall>
        <div className="flex flex-col h-full">

          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
            <div className="flex items-baseline gap-3 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-display tracking-wide"><Library className="w-4 h-4 text-console" /> Cartridge Library</DialogTitle>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/35 whitespace-nowrap">{visibleGames.length} titles</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={openAdd} className="text-xs"><Plus className="w-4 h-4" /> Add Game</Button>
              <button onClick={onClose} aria-label="Close" className="p-2 text-white/40 hover:text-white hover:bg-white/5 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-5 pt-4">

            {/* Left nav column - filters, console settings style */}
            <aside className="w-full md:w-48 shrink-0 flex flex-col gap-4 md:overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search…" className="w-full bg-white/5 border border-white/10 pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">Sort</p>
                <div className="flex md:flex-col flex-wrap gap-1 md:gap-0">
                  {SORT_MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setSortMode(m.key)}
                      className={cn("text-left px-3 py-2 text-xs font-medium border-l-2 transition-colors whitespace-nowrap", sortMode === m.key ? "border-console text-white bg-white/5" : "border-transparent text-white/45 hover:text-white hover:bg-white/[0.03]")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={cn("flex items-center gap-2 px-3 py-2 text-xs font-medium border-l-2 transition-colors md:mt-auto", onlyFavorites ? "border-console text-white bg-white/5" : "border-transparent text-white/45 hover:text-white hover:bg-white/[0.03]")}
              >
                <Heart className={cn("w-3.5 h-3.5", onlyFavorites && "fill-current")} /> Favorites only
              </button>
            </aside>

            {/* Main column - grid */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              {formOpen && (
                <div className="mb-4 p-5 bg-white/[0.04] border border-white/10 animate-fade-in shrink-0">
                  <div className="flex justify-between mb-4"><div className="font-bold text-white">{editing ? "Edit Cartridge" : "Add New Game"}</div><button onClick={closeForm} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm col-span-2" />
                    <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm" />
                    <input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} placeholder="Genre" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm" />
                    <input value={form.developer} onChange={(e) => setForm({ ...form, developer: e.target.value })} placeholder="Developer" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm col-span-2" />
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm h-16 col-span-2 resize-y" />
                    <input value={form.coverArt} onChange={(e) => setForm({ ...form, coverArt: e.target.value })} placeholder="Cover URL" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm" />
                    <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#Hex color" className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button variant="ghost" onClick={closeForm} className="flex-1">Cancel</Button>
                    <Button onClick={saveForm} className="flex-1">{editing ? "Save" : "Add"}</Button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {visibleGames.map((game: any, i: number) => {
                    const isFav = favorites.includes(game.id)
                    const isSelected = i === selectedIndex
                    return (
                      <div key={game.id} onClick={() => { setSelectedIndex(i); onClose() }} className={cn("group relative border overflow-hidden cursor-pointer transition-colors", isSelected ? "border-console ring-2 ring-console/30" : "border-white/[0.07] hover:border-white/25")}>
                        <div className="relative aspect-[3/4] bg-black/40">
                          <img src={game.coverArt} alt={game.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Quick actions */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); toggleFavorite(game.id) }} className={cn("p-1.5 bg-black/60", isFav ? "text-console" : "text-white/70 hover:text-white")}><Heart className={cn("w-3.5 h-3.5", isFav && "fill-current")} /></button>
                            <button onClick={(e) => { e.stopPropagation(); openEdit(game) }} className="p-1.5 bg-black/60 text-white/70 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => handleRemove(game.id, e)} className="p-1.5 bg-black/60 text-white/70 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>

                          {isSelected && <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 bg-console text-black tracking-wider">NOW</div>}

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="text-white text-xs font-bold leading-tight line-clamp-2 drop-shadow-md">{game.title}</div>
                            <div className="font-mono text-white/55 text-[10px] mt-1 tracking-wide">{game.year} · {game.genre}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* -- Cover rail - vertical thumbnail strip synced to the 3D carousel -- */
function CoverRail({ games, selectedIndex, onSelect }: { games: any[]; selectedIndex: number; onSelect: (i: number) => void }) {
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const rail = railRef.current
    const item = itemRefs.current[selectedIndex]
    if (!rail || !item) return
    const top = item.offsetTop - rail.clientHeight / 2 + item.clientHeight / 2
    rail.scrollTo({ top, behavior: "smooth" })
  }, [selectedIndex])

  return (
    <div ref={railRef} className="rail-scroll overflow-y-auto overflow-x-hidden max-h-[36vh] flex flex-col items-center gap-1.5 py-0.5">
      {games.map((g: any, i: number) => (
        <button
          key={g.id}
          ref={(el) => { itemRefs.current[i] = el }}
          onClick={() => onSelect(i)}
          aria-label={g.title}
          title={g.title}
          className={cn(
            "relative shrink-0 overflow-hidden transition-all duration-300 ease-out",
            i === selectedIndex ? "w-10 h-12 ring-2 ring-console opacity-100" : "w-8 h-10 ring-1 ring-white/10 opacity-40 hover:opacity-90"
          )}
        >
          <img src={g.coverArt} alt="" className="w-full h-full object-cover" draggable={false} />
        </button>
      ))}
    </div>
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
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "d" || e.key === "D") next()
    if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "a" || e.key === "A") prev()
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

  if (!game) return null

  return (
    <div className="absolute inset-0 flex flex-col z-10 select-none pointer-events-none">
      {/* Faint neutral ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 62% 55%, ${game.color}1f 0%, transparent 70%)` }} />
      {/* Dip-to-black veil on zoom toggle - smooth crossfade */}
      <div key={String(inspectMode)} className="absolute inset-0 bg-black pointer-events-none animate-[veil-out_0.5s_ease-out_forwards]" />

      <StatusBar />

      {/* Middle: vertical navigation cluster on the left, plus zoom HUD */}
      <div className="relative flex-1 min-h-0">
        {!inspectMode && visibleGames.length > 1 && (
          <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
            <button
              onClick={prev}
              aria-label="Previous cartridge"
              className="w-10 h-10 shrink-0 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-colors duration-300 pointer-events-auto cursor-pointer"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            <CoverRail games={visibleGames} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />

            <button
              onClick={next}
              aria-label="Next cartridge"
              className="w-10 h-10 shrink-0 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-colors duration-300 pointer-events-auto cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
        {inspectMode && (
          <>
            <div className="absolute inset-x-8 inset-y-6 sm:inset-x-14 sm:inset-y-10 pointer-events-none">
              {["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((pos) => (
                <span key={pos} className={cn("absolute w-5 h-5 border-console/50", pos)} />
              ))}
            </div>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none"><Badge className="bg-black/70 text-white/50 font-mono text-[10px] tracking-[0.2em]">ZOOM · DRAG TO ROTATE</Badge></div>
          </>
        )}
      </div>

      {/* Deck - info anchored bottom left, the carousel owns the right */}
      <div className="relative z-20 shrink-0 border-t border-white/[0.07] bg-gradient-to-t from-black/80 to-transparent">
        <div className={cn("px-5 sm:px-8 pt-4 pb-5 transition-opacity duration-300 ease-out", infoVisible ? "opacity-100" : "opacity-0")}>
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
              <span className="text-console">{game.genre}</span>
              <span className="w-px h-3 bg-white/15" />
              <span>{game.year}</span>
              <span className="w-px h-3 bg-white/15" />
              <span>{game.players}</span>
              <span className="w-px h-3 bg-white/15" />
              <span className="tabular-nums">{String(selectedIndex + 1).padStart(2, "0")} / {String(visibleGames.length).padStart(2, "0")}</span>
            </div>

            <h2 className="mt-2 font-display text-white text-2xl sm:text-[34px] font-bold tracking-tight leading-none truncate">{game.title}</h2>

            <div className="mt-2.5 flex items-center gap-3">
              <span className="text-white/35 text-xs font-medium">{game.developer}</span>
              <span className="w-px h-3 bg-white/10" />
              <Stars rating={game.rating} color={game.color} />
            </div>

            <p className="mt-2.5 text-white/45 text-xs sm:text-sm leading-relaxed line-clamp-2">{game.description}</p>

            <div className="mt-3.5 flex items-center gap-2 pointer-events-auto">
              <Button variant="outline" onClick={() => toggleFavorite(game.id)} className={cn("text-xs", favorites.includes(game.id) && "border-console/50 text-console bg-console/10")}>
                <Heart className={cn("w-4 h-4", favorites.includes(game.id) && "fill-current")} />
                {favorites.includes(game.id) ? "Favorited" : "Favorite"}
              </Button>
              <Button onClick={() => setInspectMode(!inspectMode)} className="text-xs"><ZoomIn className="w-4 h-4" /> {inspectMode ? "Exit Zoom" : "Zoom In"}</Button>
              <Button variant="ghost" onClick={() => setLibraryOpen(true)} className="text-xs"><Library className="w-4 h-4" /> Library</Button>
            </div>

            <div className="mt-3 hidden sm:flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
              {inspectMode ? (
                <>
                  <span className="flex items-center gap-1.5"><KeyGlyph>Drag</KeyGlyph> Rotate</span>
                  <span className="flex items-center gap-1.5"><KeyGlyph>I</KeyGlyph> Exit zoom</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5"><KeyGlyph>↑</KeyGlyph><KeyGlyph>↓</KeyGlyph> Browse</span>
                  <span className="flex items-center gap-1.5"><KeyGlyph>Scroll</KeyGlyph> Spin</span>
                  <span className="flex items-center gap-1.5"><KeyGlyph>Click</KeyGlyph> Select</span>
                  <span className="flex items-center gap-1.5"><KeyGlyph>I</KeyGlyph> Zoom</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <LibraryPanel open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
  )
}

/* -- Loading screen - flat, sharp, real load progress -- */
export function LoadingScreen() {
  const progress = useProgress((s) => s.progress)
  const pct = Math.round(progress)
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 animate-[modal-fade-in_0.4s_ease-out]">
      <div className="w-12 h-12 bg-white flex items-center justify-center">
        <span className="text-black text-lg font-extrabold font-display">64</span>
      </div>
      <p className="mt-5 font-display text-white/90 text-sm font-bold tracking-[0.4em] uppercase pl-1">N64 Flow</p>
      <div className="mt-7 h-[3px] w-52 bg-white/10 overflow-hidden">
        <div className="h-full bg-console transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 w-52 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
        <span>Loading</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
    </div>
  )
}
