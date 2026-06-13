import { Loader2, Plus } from 'lucide-react'
import { useStore, wrapIndex } from '../../store'

export function BottomBar() {
  const games = useStore((s) => s.games)
  const focus = useStore((s) => s.focus)
  const selectedUid = useStore((s) => s.selectedUid)
  const select = useStore((s) => s.select)
  const setAddOpen = useStore((s) => s.setAddOpen)

  const focusedGame = games[wrapIndex(focus, games.length)]
  const unresolved = games.filter(
    (g) => g.status === 'pending' || g.status === 'loading'
  ).length
  const done = games.length - unresolved

  return (
    <footer className="bottombar">
      <div className="bottombar-left">
        <span className="game-counter">
          <span className="counter-dot" />
          {games.length} {games.length === 1 ? 'GAME' : 'GAMES'}
        </span>
        {unresolved > 0 && (
          <span className="sync">
            <Loader2 size={13} className="spin" />
            SYNCING {done}/{games.length}
            <span className="sync-bar">
              <span
                className="sync-bar-fill"
                style={{ width: `${(done / games.length) * 100}%` }}
              />
            </span>
          </span>
        )}
      </div>
      <div className="bottombar-right">
        <button className="hint" onClick={() => setAddOpen(true)}>
          <span className="key key-plus">
            <Plus size={13} strokeWidth={3} />
          </span>
          Add Game
        </button>
        <span className="hint static">
          <span className="key key-pad">◂ ▸</span>
          Browse
        </span>
        <button
          className="hint"
          onClick={() => {
            if (!selectedUid && focusedGame) select(focusedGame.uid)
          }}
        >
          <span className="key key-a">A</span>
          Details
        </button>
        <button className="hint" onClick={() => select(null)}>
          <span className="key key-b">B</span>
          Back
        </button>
      </div>
    </footer>
  )
}
