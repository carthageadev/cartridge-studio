import React from 'react';
import { GameData } from '../types';
import { ChevronLeft, ChevronRight, Gamepad2, Calendar, Tags } from 'lucide-react';

interface UIOverlayProps {
  game: GameData;
  totalGames: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  game, 
  totalGames, 
  currentIndex, 
  onNext, 
  onPrev 
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 z-10">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl">
            <h1 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-indigo-400" />
                RETROFLOW<span className="text-indigo-500">3D</span>
            </h1>
        </div>
        
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/60 font-mono text-sm transition-all duration-300">
            COLLECTION {currentIndex + 1} / {totalGames}
        </div>
      </header>

      {/* Bottom Info Panel */}
      <footer className="w-full flex flex-col md:flex-row items-end md:items-center justify-between gap-6 pointer-events-auto">
        <div className="flex-1 max-w-2xl perspective-[1000px]">
            {/* Keyed div triggers animation on change */}
            <div 
                key={game.id}
                className="bg-black/60 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl transform transition-all duration-300 origin-bottom-left animate-[fadeInSlideUp_0.4s_ease-out_forwards]"
            >
                <div className="flex items-center gap-4 mb-2 text-xs font-bold tracking-widest uppercase text-white/50">
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                        <Calendar className="w-3 h-3" /> {game.year}
                    </span>
                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-indigo-300">
                        <Tags className="w-3 h-3" /> {game.genre}
                    </span>
                </div>
                
                {/* Fixed height header to prevent jumping if title length varies greatly (1 vs 2 lines) */}
                <div className="min-h-[3rem] md:min-h-[4rem] flex items-center mb-4">
                  <h2 className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight drop-shadow-lg">
                      {game.title}
                  </h2>
                </div>
                
                {/* Fixed height description container with hidden scrollbar */}
                <div className="h-24 md:h-28 overflow-y-auto no-scrollbar mb-2">
                  <p className="text-lg text-gray-300 leading-relaxed max-w-lg">
                      {game.description}
                  </p>
                </div>

                <div className="mt-4 flex gap-3 opacity-0 animate-[fadeIn_0.4s_ease-out_0.2s_forwards]">
                     <button className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-indigo-400 hover:text-white transition-colors duration-200">
                        Start Game
                     </button>
                     <button className="bg-white/10 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/20 transition-colors duration-200 backdrop-blur-sm">
                        Details
                     </button>
                </div>
            </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex gap-4 items-center">
            <button 
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-white/10 disabled:hover:text-white transition-all duration-200 backdrop-blur-md"
            >
                <ChevronLeft size={32} />
            </button>
            <button 
                onClick={onNext}
                disabled={currentIndex === totalGames - 1}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-white/10 disabled:hover:text-white transition-all duration-200 backdrop-blur-md"
            >
                <ChevronRight size={32} />
            </button>
        </div>
      </footer>
      
      <style>{`
        @keyframes fadeInSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
};