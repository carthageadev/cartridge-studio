import React, { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { Leva } from "leva"
import { Routes, Route } from "react-router-dom"
import { DebugLightPanel } from "./components/DebugLightPanel"
import { Scene } from "./components/Scene"
import { UI, LoadingScreen } from "./components/UI"
import { startLibraryResolver, useStore } from "./store"

class AppErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || "Unknown render error" }
  }

  componentDidCatch(error: Error) {
    console.error("App render failed:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#05050c] px-6 text-center text-white">
          <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-bold">Render failed</h1>
            <p className="mt-2 text-sm text-white/60">{this.state.message}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/35">Refresh after fixes or clear broken local state</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const [loading, setLoading] = useState(true)
  const crtOverlay = useStore((s) => s.settings.crtOverlay)
  const showLeva = useStore((s) => s.showLeva)
  const sceneReady = useStore((s) => s.sceneReady)
  const triggerIntro = useStore((s) => s.triggerIntro)
  const getVisibleGames = useStore((s) => s.getVisibleGames)

  // Minimum time the loading screen stays up (let the shimmer breathe)
  const [minTime, setMinTime] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setMinTime(true), 2200)
    return () => clearTimeout(timer)
  }, [])

  // Don't reveal until cover art has finished streaming (with a hard cap so a
  // slow/failing network can never trap the user on the loading screen)
  const [coversReady, setCoversReady] = useState(false)
  useEffect(() => {
    const check = () => {
      const games = getVisibleGames()
      setCoversReady(games.every((g) => g.coverState !== "fetching"))
    }
    check()
    const t = setInterval(check, 300)
    return () => clearInterval(t)
  }, [getVisibleGames])

  const reveal = () => {
    setLoading(false)
    triggerIntro()
  }

  // Reveal when everything is ready; hard cap at 10s regardless
  useEffect(() => {
    if (loading && minTime && coversReady && sceneReady) reveal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, minTime, coversReady, sceneReady])
  useEffect(() => {
    if (!loading) return
    const cap = setTimeout(reveal, 10000)
    return () => clearTimeout(cap)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  useEffect(() => {
    startLibraryResolver()
  }, [])

  return (
    <div className="w-screen h-screen bg-bg overflow-hidden relative">
      {/* Main content - fully edge-to-edge, no border or frame.
          Always at full opacity; the loading overlay simply covers it,
          so the reveal is one cheap layer fade instead of a full crossfade. */}
      <div className="absolute inset-0">
        <AppErrorBoundary>
          <Routes>
            <Route path="/" element={<><Scene /><UI /></>} />
            {/* Add more routes here as needed */}
          </Routes>
        </AppErrorBoundary>
      </div>

      {/* Loading overlay */}
      <div
        className={`absolute inset-0 z-50 bg-[#05050c] transition-opacity duration-1000 ease-out ${loading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <LoadingScreen />
      </div>

      {/* Optional CRT scanline overlay */}
      {crtOverlay && (
        <div
          className="absolute inset-0 pointer-events-none z-40 opacity-[0.07] mix-blend-overlay"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          }}
        />
      )}

      <DebugLightPanel />
      <Leva hidden={!showLeva} collapsed={false} />
    </div>
  )
}

export default App
