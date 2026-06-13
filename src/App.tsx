import { useEffect } from 'react'
import { Scene } from './components/three/Scene'
import { TopBar } from './components/shell/TopBar'
import { BottomBar } from './components/shell/BottomBar'
import { GamePanel } from './components/shell/GamePanel'
import { AddGameModal } from './components/shell/AddGameModal'
import { SettingsPanel } from './components/shell/SettingsPanel'
import { BootSplash } from './components/shell/BootSplash'
import { startLibraryResolver, useStore, wrapIndex } from './store'

/** Floating title of the focused game, Wii Flow style. */
function FocusTitle() {
  const games = useStore((s) => s.games)
  const focus = useStore((s) => s.focus)
  const selectedUid = useStore((s) => s.selectedUid)
  const game = games[wrapIndex(focus, games.length)]

  if (!game || selectedUid) return null
  const sub = [game.meta?.year, game.meta?.genres?.[0]].filter(Boolean).join(' · ')

  return (
    <div className="focus-title" key={game.uid}>
      <h2>{game.meta?.title || game.name}</h2>
      {sub && <p>{sub}</p>}
    </div>
  )
}

export default function App() {
  // Resolve seed/added games against ScreenScraper in the background
  useEffect(() => {
    startLibraryResolver()
  }, [])

  // Console-style global controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') useStore.getState().setAddOpen(false)
        return
      }
      const s = useStore.getState()
      switch (e.key) {
        case 'Escape':
          if (s.addOpen) s.setAddOpen(false)
          else if (s.settingsOpen) s.setSettingsOpen(false)
          else s.select(null)
          break
        case 'b':
        case 'B':
          s.select(null)
          break
        case 'ArrowLeft':
          if (!s.selectedUid && !s.addOpen) s.moveFocus(-1)
          break
        case 'ArrowRight':
          if (!s.selectedUid && !s.addOpen) s.moveFocus(1)
          break
        case 'Enter':
        case ' ':
        case 'a':
        case 'A': {
          if (s.addOpen || s.settingsOpen) return
          if (!s.selectedUid) {
            const g = s.games[wrapIndex(s.focus, s.games.length)]
            if (g) s.select(g.uid)
          }
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="console">
      <TopBar />
      <main className="screen">
        <div className="screen-bg" />
        <div className="canvas-wrap">
          <Scene />
        </div>
        <div className="screen-vignette" />
        <FocusTitle />
        <GamePanel />
        <AddGameModal />
        <SettingsPanel />
        <BootSplash />
      </main>
      <BottomBar />
    </div>
  )
}
