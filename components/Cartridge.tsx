import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCursor, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CartridgeProps } from '../types';

// Augment the global JSX namespace to include Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      extrudeGeometry: any;
      meshStandardMaterial: any;
      planeGeometry: any;
    }
  }
}

// Spring-like interpolation helper
const damp = (target: number, current: number, speed: number, delta: number) => {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
};

export const Cartridge: React.FC<CartridgeProps> = ({ data, isActive, offset, onClick }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  useCursor(hovered);

  // Load texture with fallback logic if needed. 
  // Using useTexture.preload() or just letting Suspense handle it.
  // We'll use a solid color fallback material if texture fails or while loading (handled by Suspense parent).
  const texture = useTexture(data.coverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80');
  texture.anisotropy = 16;
  
  // Create N64 Cartridge Shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const w = 1.6;  // Width
    const h = 1.1;  // Height of rectangular part
    
    // Start bottom left
    s.moveTo(-w/2, -h/2);
    // Bottom right
    s.lineTo(w/2, -h/2);
    // Top right before curve
    s.lineTo(w/2, h/2);
    // Top Curve
    s.absarc(0, h/2, w/2, 0, Math.PI, false);
    // Close shape
    s.lineTo(-w/2, -h/2);
    
    return s;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 0.25,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 4
  }), []);

  // Animation Frame
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const group = meshRef.current;

    // --- Configuration for the Flow ---
    const xSpacing = 2.0; // Horizontal spread
    const zDepth = 1.8;   // How far back side items go
    const yRotation = 0.7; // Max rotation in radians

    // Target Positions
    const targetX = offset * xSpacing;
    const targetZ = -Math.abs(offset) * zDepth;
    
    // Rotation: Face inward towards the center
    const targetRotY = -Math.sign(offset) * Math.min(Math.abs(offset) * 0.8, 1) * yRotation;

    // Scales
    const hoverScale = hovered && isActive ? 1.05 : 1.0;
    const activeScale = isActive ? 1.1 : 0.9;
    const targetScale = hoverScale * activeScale;

    // Apply smooth interpolation
    group.position.x = damp(targetX, group.position.x, 8, delta);
    group.position.z = damp(targetZ, group.position.z, 8, delta);
    
    // Floating effect
    const time = state.clock.getElapsedTime();
    const floatIntensity = isActive ? 0.05 : 0.02;
    const floatingY = Math.sin(time * 2 + parseInt(data.id)) * floatIntensity;
    group.position.y = damp(floatingY, group.position.y, 4, delta);

    group.rotation.y = damp(targetRotY, group.rotation.y, 8, delta);
    group.rotation.x = damp(isActive ? 0 : 0.1, group.rotation.x, 6, delta);
    group.scale.setScalar(damp(targetScale, group.scale.x, 8, delta));
  });

  return (
    <group 
      ref={meshRef} 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {/* The Cartridge Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial 
            color="#2a2a2a" 
            roughness={0.4} 
            metalness={0.6} 
        />
      </mesh>

      {/* The Label/Sticker */}
      <mesh position={[0, 0.2, 0.31]}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshStandardMaterial 
            map={texture}
            roughness={0.3}
            metalness={0.0}
            color="white"
        />
      </mesh>
      
      {/* Back label placeholder */}
      <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
         <planeGeometry args={[1.2, 0.8]} />
         <meshStandardMaterial color="#1a1a1a" />
      </mesh>

    </group>
  );
};