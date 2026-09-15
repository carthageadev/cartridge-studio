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
import { LoadingScreen } from './components/LoadingScreen';

const App: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDebug, setIsDebug] = useState(true);

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
      <main key="debug" className="w-full h-screen bg-black overflow-hidden relative animate-[fadeIn_0.35s_ease-out]">
        <UVDebugger />
        <LoadingScreen />
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-2 py-1 z-50 flex items-center gap-2 border border-white/10 select-none">
          <span className="text-[9px] font-mono text-white/50 px-1 uppercase tracking-wider">Diagnostic</span>
          <button
            onClick={() => setIsDebug(false)}
            className="bg-white text-black text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider hover:bg-white/80 transition-colors"
          >
            Exit (D)
          </button>
        </div>
      </main>
    );
  }

  return (
    <main key="home" className="w-full h-screen bg-black overflow-hidden relative selection:bg-indigo-500 selection:text-white animate-[fadeIn_0.35s_ease-out]">
      {/* 3D Layer with Error Boundary */}
      <ErrorBoundary>
        <Scene
          selectedIndex={selectedIndex}
          setSelectedIndex={handleSelectIndex}
        />
      </ErrorBoundary>

      <LoadingScreen />

      {/* UI Layer */}
      <UIOverlay
        game={GAMES[selectedIndex]}
        totalGames={GAMES.length}
        currentIndex={selectedIndex}
        onNext={handleNext}
        onPrev={handlePrev}
      />

      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur px-2 py-1 z-50 flex items-center gap-2 border border-white/10 select-none">
        <span className="text-[9px] font-mono text-white/50 px-1 uppercase tracking-wider">Inspector</span>
        <button
          onClick={() => setIsDebug(true)}
          className="bg-white text-black text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider hover:bg-white/80 transition-colors"
        >
          Debug (D)
        </button>
      </div>

      {/* Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
    </main>
  );
};

export default App;