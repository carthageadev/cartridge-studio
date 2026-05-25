import React, { useState, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, Stars, Sparkles, Loader } from '@react-three/drei';
import { GAMES } from '../constants';
import { Cartridge } from './Cartridge';

// Augment the global JSX namespace to include Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      fog: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      group: any;
    }
  }
}

interface SceneProps {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

const Carousel: React.FC<SceneProps> = ({ selectedIndex, setSelectedIndex }) => {
  const { viewport } = useThree();
  
  // Handle wheel for scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Threshold to prevent ultra-fast scrolling
      if (Math.abs(e.deltaY) > 10 || Math.abs(e.deltaX) > 10) {
        const direction = Math.sign(e.deltaY || e.deltaX);
        if (direction > 0) {
           setSelectedIndex(Math.min(selectedIndex + 1, GAMES.length - 1));
        } else {
           setSelectedIndex(Math.max(selectedIndex - 1, 0));
        }
      }
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [selectedIndex, setSelectedIndex]);

  return (
    <group position={[0, -0.5, 0]}>
      {GAMES.map((game, i) => (
        <Cartridge
          key={game.id}
          data={game}
          isActive={i === selectedIndex}
          offset={i - selectedIndex}
          onClick={() => setSelectedIndex(i)}
        />
      ))}
    </group>
  );
};

export const Scene: React.FC<SceneProps> = (props) => {
  return (
    <>
      <div className="w-full h-full absolute top-0 left-0 -z-10">
        <Canvas shadows camera={{ position: [0, 0, 7], fov: 35 }}>
          <Suspense fallback={null}>
            <fog attach="fog" args={['#050505', 5, 25]} />
            <ambientLight intensity={0.5} />
            <spotLight 
              position={[5, 10, 7]} 
              angle={0.5} 
              penumbra={1} 
              intensity={2} 
              castShadow 
              shadow-bias={-0.0001}
            />
            <pointLight position={[-5, 0, 5]} intensity={1} color="#6366f1" />
            
            <Carousel {...props} />

            <ContactShadows 
                resolution={1024} 
                scale={50} 
                blur={2.5} 
                opacity={0.7} 
                far={10} 
                color="#000" 
                position={[0, -2, 0]}
            />
            
            <Environment preset="night" />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
            <Sparkles count={80} scale={12} size={2} speed={0.2} opacity={0.3} color="#fff" />
          </Suspense>
        </Canvas>
      </div>
      <Loader />
    </>
  );
};