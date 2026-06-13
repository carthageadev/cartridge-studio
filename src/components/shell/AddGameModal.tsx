import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Search, X } from 'lucide-react'
import { searchGames } from '../../api/screenscraper'
import { useStore } from '../../store'
import type { SearchResult } from '../../types'

export function AddGameModal() {
  const open = useStore((s) => s.addOpen)
  const setOpen = useStore((s) => s.setAddOpen)
  const addGame = useStore((s) => s.addGame)
  const games = useStore((s) => s.games)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setError('')
      setTouched(false)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  // Debounced search-as-you-type
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setBusy(false)
      return
    }
    setBusy(true)
    setError('')
    const mySeq = ++seq.current
    const id = setTimeout(async () => {
      try {
        const found = await searchGames(q)
        if (seq.current !== mySeq) return
        setResults(found)
        setTouched(true)
      } catch (err: any) {
        if (seq.current !== mySeq) return
        setError(err?.message ?? 'Search failed')
        setResults([])
      } finally {
        if (seq.current === mySeq) setBusy(false)
      }
    }, 450)
    return () => clearTimeout(id)
  }, [query, open])

  if (!open) return null

  const inLibrary = new Set(games.map((g) => g.ssId).filter(Boolean))

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Add to Library</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="search-row">
          <Search size={17} className="search-icon" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search Nintendo 64 games…"
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
          {busy && <Loader2 size={17} className="spin" />}
        </div>

        <div className="results">
          {error && <p className="results-msg fail">{error}</p>}
          {!error && touched && !busy && results.length === 0 && query.trim().length >= 2 && (
            <p className="results-msg">No N64 games found for “{query.trim()}”.</p>
          )}
          {!error && query.trim().length < 2 && (
            <p className="results-msg dim">
              Type a game name - results come straight from ScreenScraper, filtered
              to Nintendo 64.
            </p>
          )}
          {results.map((r) => {
            const owned = inLibrary.has(r.id)
            return (
              <button
                key={r.id}
                className={`result-row ${owned ? 'owned' : ''}`}
                disabled={owned}
                onClick={() => addGame(r)}
              >
                <span className="result-name">{r.name}</span>
                <span className="result-meta">
                  {r.year && <span className="result-year">{r.year}</span>}
                  {owned ? (
                    <span className="result-owned">IN LIBRARY</span>
                  ) : (
                    <Plus size={16} />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
