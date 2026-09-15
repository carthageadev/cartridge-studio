import { Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
  Sparkles,
  Stars,
} from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Carousel } from './Carousel'

/** Drops render resolution when the frame rate dips, restores it when it
 *  recovers - keeps the carousel smooth on weaker GPUs. */
function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr)
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setDpr(1)}
      onIncline={() => setDpr(Math.min(window.devicePixelRatio, 1.25))}
    />
  )
}

const FLOOR_Y = -1.18

/** The reflective stage floor - the Wii Flow signature. */
function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        resolution={512}
        blur={[180, 60]}
        mixBlur={0.8}
        mixStrength={50}
        roughness={0.85}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#0a0b14"
        metalness={0.55}
        mirror={0.6}
      />
    </mesh>
  )
}

/** Procedural studio environment - no external HDR needed. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer
        form="rect"
        intensity={3.4}
        position={[0, 4, 6]}
        scale={[12, 5, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        position={[-6, 1.5, 3]}
        rotation-y={Math.PI / 3.2}
        scale={[5, 7, 1]}
        color="#8a96ff"
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        position={[6, 1.5, 3]}
        rotation-y={-Math.PI / 3.2}
        scale={[5, 7, 1]}
        color="#6fe3ff"
      />
      <Lightformer
        form="ring"
        intensity={2.6}
        position={[0, 7, 0]}
        rotation-x={Math.PI / 2}
        scale={8}
        color="#ffffff"
      />
    </Environment>
  )
}

export function Scene() {
  return (
    <Canvas
      dpr={[1, 1.25]}
      camera={{ position: [0, 0.42, 6.3], fov: 38 }}
      gl={{
        antialias: false, // the composer's MSAA handles it
        alpha: true,
        powerPreference: 'high-performance',
      }}
    >
      <Suspense fallback={null}>
        <fog attach="fog" args={['#06060e', 8.5, 19]} />

        <ambientLight intensity={0.35} />
        <spotLight
          position={[4, 8, 6]}
          angle={0.55}
          penumbra={1}
          intensity={1.6}
          color="#ffffff"
        />
        <pointLight position={[-6, 2, 4]} intensity={14} color="#6c5cff" />
        <pointLight position={[6, 1, 3]} intensity={10} color="#37c8f0" />

        <Carousel />
        <Floor />
        <Studio />

        <Stars
          radius={70}
          depth={40}
          count={900}
          factor={3.4}
          saturation={0}
          fade
          speed={0.4}
        />
        <Sparkles
          count={40}
          scale={[14, 6, 8]}
          position={[0, 1, -2]}
          size={1.8}
          speed={0.25}
          opacity={0.35}
          color="#bcd2ff"
        />

        <AdaptiveQuality />
        <EffectComposer multisampling={2}>
          <Bloom
            mipmapBlur
            intensity={0.42}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.25}
            radius={0.72}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
