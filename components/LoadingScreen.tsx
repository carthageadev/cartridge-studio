import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

/* -- Loading screen - plain black, wordmark, thin progress line, fades only -- */
export const LoadingScreen: React.FC = () => {
  const progress = useProgress((s) => s.progress);
  const active = useProgress((s) => s.active);
  const [phase, setPhase] = useState<'in' | 'show' | 'out' | 'gone'>('in');

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p === 'in' ? 'show' : p)), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!active && progress > 99) {
      const t1 = setTimeout(() => setPhase('out'), 400);
      const t2 = setTimeout(() => setPhase('gone'), 1150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [active, progress]);

  if (phase === 'gone') return null;
  const done = phase === 'out';

  return (
    <div
      className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-700"
      style={{ opacity: phase === 'in' ? 0 : done ? 0 : 1, pointerEvents: done ? 'none' : 'auto' }}
    >
      <div className="text-white/80 text-sm font-bold tracking-[0.35em] uppercase pl-2">RetroFlow 3D</div>
      <div className="mt-6 h-px w-40 bg-white/10 overflow-hidden">
        <div className="h-full bg-white/80 transition-[width] duration-300 ease-out" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <div className="mt-3 text-white/30 text-[11px] font-mono tabular-nums">{Math.round(progress)}%</div>
    </div>
  );
};
