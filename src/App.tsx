import { useState, useEffect } from "react"
import { Leva } from "leva"
import { Routes, Route } from "react-router-dom"
import { DebugLightPanel } from "./components/DebugLightPanel"
import { Scene } from "./components/Scene"
import { UI, LoadingScreen } from "./components/UI"
import { startLibraryResolver, useStore } from "./store"

function App() {
  const [loading, setLoading] = useState(true)
  const crtOverlay = useStore((s) => s.settings.crtOverlay)
  const showLeva = useStore((s) => s.showLeva)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    startLibraryResolver()
  }, [])

  return (
    <div className="w-screen h-screen bg-bg overflow-hidden relative">
      {/* Main content - fully edge-to-edge, no border or frame */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${loading ? "opacity-0" : "opacity-100"}`}
      >
        <Routes>
          <Route path="/" element={<><Scene /><UI /></>} />
          {/* Add more routes here as needed */}
        </Routes>
      </div>

      {/* Loading overlay */}
      <div
        className={`absolute inset-0 z-50 transition-opacity duration-1000 ${loading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
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
