import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import { Group, MathUtils } from "three";
import { CartridgeModel } from "./CartridgeModel";
import type { GameEntry } from "../types";

type CarouselSceneProps = {
  games: GameEntry[];
  selectedIndex: number;
  detailsOpen: boolean;
  reflections: boolean;
  consoleGlow: boolean;
  zoom: number;
  inspecting: boolean;
  inspectRotation: { x: number; y: number };
  onFocus: (index: number) => void;
  onActivate: (index: number) => void;
};

function shortestOffset(index: number, selectedIndex: number, total: number) {
  let offset = index - selectedIndex;
  const half = total / 2;

  if (offset > half) {
    offset -= total;
  }

  if (offset < -half) {
    offset += total;
  }

  return offset;
}

function CarouselRig({
  games,
  selectedIndex,
  detailsOpen,
  reflections,
  consoleGlow,
  zoom,
  inspecting,
  inspectRotation,
  onFocus,
  onActivate,
}: CarouselSceneProps) {
  const [mountRadius, setMountRadius] = useState(0);
  const flowRef = useRef<Group>(null);

  useFrame((state) => {
    const flow = flowRef.current;
    const targetCameraZ = 9.15 - zoom * 2.3;

    if (!flow) {
      return;
    }

    state.camera.position.z = MathUtils.lerp(state.camera.position.z, targetCameraZ, 0.055);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, 1.02 - zoom * 0.08, 0.055);
    state.camera.updateProjectionMatrix();

    flow.rotation.y = MathUtils.lerp(flow.rotation.y, state.pointer.x * 0.052, 0.055);
    flow.rotation.x = MathUtils.lerp(flow.rotation.x, -state.pointer.y * 0.018, 0.055);
    flow.position.x = MathUtils.lerp(flow.position.x, state.pointer.x * 0.08, 0.04);
  });

  useEffect(() => {
    setMountRadius(0);

    const timers = [
      window.setTimeout(() => setMountRadius(1), 120),
      window.setTimeout(() => setMountRadius(2), 280),
      window.setTimeout(() => setMountRadius(3), 520),
      window.setTimeout(() => setMountRadius(Number.POSITIVE_INFINITY), 880),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [games.length]);

  const layout = useMemo(
    () =>
      games
        .map((game, index) => {
          const offset = shortestOffset(index, selectedIndex, games.length);
          const abs = Math.abs(offset);
          const focused = offset === 0;

          if (abs > mountRadius) {
            return null;
          }

          if (detailsOpen && focused) {
            return {
              game,
              index,
              focused,
              opacity: 1,
              scale: 1.2,
              position: [2.3, 0.0, 0.18] as [number, number, number],
              rotation: [-0.05, -0.32, 0.04] as [number, number, number],
            };
          }

          if (detailsOpen) {
            return {
              game,
              index,
              focused,
              opacity: Math.max(0.08, 0.5 - abs * 0.075),
              scale: Math.max(0.52, 0.74 - abs * 0.045),
              position: [2.3 + offset * 1.28, -0.1, -1.15 - abs * 0.66] as [number, number, number],
              rotation: [0.02, -offset * 0.32 - 0.22, offset * -0.024] as [number, number, number],
            };
          }

          return {
            game,
            index,
            focused,
            opacity: abs > 5 ? 0.12 : 1 - abs * 0.11,
            scale: focused ? 1.06 : Math.max(0.5, 0.8 - abs * 0.048),
            position: [offset * 1.82, focused ? 0.03 : -0.1, -abs * 0.82] as [number, number, number],
            rotation: [0, -offset * 0.4, offset * -0.024] as [number, number, number],
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [detailsOpen, games, mountRadius, selectedIndex],
  );

  return (
    <>
      <color attach="background" args={["#090a0b"]} />
      <fog attach="fog" args={["#090a0b", 8, 22]} />
      <ambientLight intensity={0.48} />
      <directionalLight position={[-3.8, 5.4, 3.8]} intensity={3.1} color="#fff4dc" castShadow />
      <spotLight position={[3.2, 4.8, 5.2]} angle={0.34} penumbra={0.7} intensity={7.6} color="#f8fdff" castShadow />
      <spotLight position={[-4.8, 2.1, 2.4]} angle={0.52} penumbra={0.86} intensity={2.2} color="#7fd8ff" />
      <pointLight position={[0, 1.4, 3.2]} intensity={1.4} color="#ffffff" />

      <Suspense fallback={null}>
        <group ref={flowRef}>
          {layout.map((item) => (
            <CartridgeModel
              key={item.game.id}
              game={item.game}
              index={item.index}
              position={item.position}
              rotation={item.rotation}
              scale={item.scale}
              opacity={item.opacity}
              focused={item.focused}
              glow={consoleGlow}
              inspecting={inspecting}
              inspectRotation={inspectRotation}
              onClick={() => {
                if (detailsOpen && item.focused) {
                  onActivate(item.index);
                }
              }}
            />
          ))}
        </group>

        <Sparkles count={26} scale={[7, 2.4, 4]} size={1} speed={0.16} color="#fff3b0" opacity={0.18} />
        <Environment resolution={512}>
          <Lightformer position={[0, 5, 4]} scale={[7, 2.2, 1]} intensity={5.8} color="#ffffff" />
          <Lightformer position={[-4.5, 1.8, 1.6]} scale={[1.4, 3.2, 1]} intensity={3.6} color="#8bdfff" />
          <Lightformer position={[4.8, 2.6, 0.8]} scale={[1.8, 4.2, 1]} intensity={2.9} color="#fff1c7" />
          <Lightformer position={[0, -1.1, 3.2]} scale={[9, 1.2, 1]} intensity={1.9} color="#ffffff" />
        </Environment>
      </Suspense>

      {reflections && <ContactShadows position={[0, -1.05, 0]} scale={10} opacity={0.2} blur={3.2} far={4} />}
    </>
  );
}

export function CarouselScene(props: CarouselSceneProps) {
  return (
    <Canvas
      className="flow-canvas"
      dpr={[1, 1.85]}
      shadows
      camera={{ position: [0, 1.02, 9.35], fov: 35, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
    >
      <CarouselRig {...props} />
    </Canvas>
  );
}
