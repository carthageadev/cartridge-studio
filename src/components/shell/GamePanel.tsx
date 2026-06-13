import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Loader2, Star, Trash2, X } from 'lucide-react'
import { useStore } from '../../store'
import type { GameEntry } from '../../types'

/** Frosted-glass detail panel that slides in from the left when a cartridge
 *  is selected. Mounts/unmounts around a GSAP in/out timeline. */
export function GamePanel() {
  const selectedUid = useStore((s) => s.selectedUid)
  const games = useStore((s) => s.games)
  const select = useStore((s) => s.select)
  const removeGame = useStore((s) => s.removeGame)

  // Keep the last selected game around while animating out
  const [shown, setShown] = useState<GameEntry | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const live = games.find((g) => g.uid === selectedUid) ?? null

  useEffect(() => {
    if (live) {
      setShown(live)
    } else if (shown && panelRef.current) {
      const el = panelRef.current
      gsap.to(el, {
        x: -60,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => setShown(null),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUid])

  // Keep panel content in sync while open (e.g. metadata resolves late)
  useEffect(() => {
    if (live && shown && live !== shown) setShown(live)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games])

  useEffect(() => {
    if (shown && live && panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { x: -80, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.25 }
      )
      const items = panelRef.current.querySelectorAll('.panel-stagger')
      gsap.fromTo(
        items,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out', delay: 0.4 }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown?.uid])

  if (!shown) return null

  const meta = shown.meta
  const stars = meta?.rating != null ? Math.round((meta.rating / 20) * 5) : null

  return (
    <div className="game-panel glass" ref={panelRef}>
      <div className="panel-header panel-stagger">
        <span className="panel-kicker">NINTENDO 64</span>
        <button className="icon-btn" aria-label="Close details" onClick={() => select(null)}>
          <X size={18} />
        </button>
      </div>

      <h1 className="panel-title panel-stagger">{meta?.title || shown.name}</h1>

      {shown.status === 'loading' || shown.status === 'pending' ? (
        <p className="panel-loading panel-stagger">
          <Loader2 size={16} className="spin" /> Fetching game data…
        </p>
      ) : (
        <>
          <div className="panel-badges panel-stagger">
            {meta?.year && <span className="badge">{meta.year}</span>}
            {meta?.genres.map((g) => (
              <span className="badge" key={g}>
                {g}
              </span>
            ))}
            {meta?.players && <span className="badge">{meta.players}P</span>}
          </div>

          {stars != null && (
            <div className="panel-rating panel-stagger">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={17}
                  className={i < stars ? 'star filled' : 'star'}
                />
              ))}
              <span className="rating-num">{meta!.rating!.toFixed(1)} / 20</span>
            </div>
          )}

          <div className="panel-rows panel-stagger">
            {meta?.developer && (
              <div className="panel-row">
                <span>Developer</span>
                <strong>{meta.developer}</strong>
              </div>
            )}
            {meta?.publisher && (
              <div className="panel-row">
                <span>Publisher</span>
                <strong>{meta.publisher}</strong>
              </div>
            )}
          </div>

          <p className="panel-desc panel-stagger">
            {meta?.description || 'No description available for this title.'}
          </p>
        </>
      )}

      <div className="panel-actions panel-stagger">
        <button className="btn primary" onClick={() => select(null)}>
          <span className="key key-b inline">B</span> Back to Library
        </button>
        <button
          className="btn danger ghost"
          onClick={() => removeGame(shown.uid)}
          title="Remove from library"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
