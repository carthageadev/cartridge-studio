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
        <AppErrorBoundary>
          <Routes>
            <Route path="/" element={<><Scene /><UI /></>} />
            {/* Add more routes here as needed */}
          </Routes>
        </AppErrorBoundary>
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
