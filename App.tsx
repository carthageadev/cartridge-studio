import React, { Component, useState, useCallback, useEffect, ReactNode, ErrorInfo } from 'react';
import { Scene } from './components/Scene';
import { UIOverlay } from './components/UIOverlay';
import { GAMES } from './constants';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("3D Scene Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Fallback gracefully (UI might still show, or just empty background)
    }
    return this.props.children;
  }
}

import { UVDebugger } from './components/UVDebugger';

const App: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDebug, setIsDebug] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd') {
        setIsDebug(prev => !prev);
      }
      if (isDebug) return;
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => Math.min(prev + 1, GAMES.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebug]);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, GAMES.length - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSelectIndex = useCallback((index: number) => {
    if (index >= 0 && index < GAMES.length) {
      setSelectedIndex(index);
    }
  }, []);

  if (isDebug) {
    return (
      <main className="w-full h-screen bg-[#111] overflow-hidden relative">
        <UVDebugger />
        {/* Yellow diagnostic zone with black-themed exit button */}
        <div className="absolute top-4 right-4 bg-amber-400 p-1 rounded shadow-md z-50 flex items-center gap-1.5 border border-amber-500 select-none">
          <span className="text-[9px] font-mono font-black text-black px-1.5 uppercase tracking-wider">🛠️ DIAGNOSTIC</span>
          <button
            onClick={() => setIsDebug(false)}
            className="bg-black hover:bg-neutral-800 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all uppercase tracking-wider border border-neutral-700"
          >
            EXIT (D)
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full h-screen bg-[#111] overflow-hidden relative selection:bg-indigo-500 selection:text-white">
      {/* 3D Layer with Error Boundary */}
      <ErrorBoundary>
        <Scene
          selectedIndex={selectedIndex}
          setSelectedIndex={handleSelectIndex}
        />
      </ErrorBoundary>

      {/* UI Layer */}
      <UIOverlay
        game={GAMES[selectedIndex]}
        totalGames={GAMES.length}
        currentIndex={selectedIndex}
        onNext={handleNext}
        onPrev={handlePrev}
      />

      {/* Yellow diagnostic zone with black-themed debug button in bottom-left */}
      <div className="absolute bottom-4 left-4 bg-amber-400 p-1 rounded shadow-md z-50 flex items-center gap-1.5 border border-amber-500 select-none">
        <span className="text-[9px] font-mono font-black text-black px-1.5 uppercase tracking-wider">🛠️ INSPECT</span>
        <button
          onClick={() => setIsDebug(true)}
          className="bg-black hover:bg-neutral-800 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all uppercase tracking-wider border border-neutral-700"
        >
          DEBUG (D)
        </button>
      </div>

      {/* Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
    </main>
  );
};

export default App;