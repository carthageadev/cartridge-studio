import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

/* Models live on the legacy branch and are pulled from GitHub through
   jsDelivr, so the hosted site does not bundle them. */
const BASE =
  "https://cdn.jsdelivr.net/gh/carthageadev/cartridge-studio@legacy/public/3d";

const LABELS = [
  "#E52521",
  "#1B8A2A",
  "#C4A000",
  "#4169E1",
  "#FF6B00",
  "#8B4513",
  "#2B8CC4",
  "#C81E3A",
  "#DA4C2A",
  "#7C3AED",
  "#F59E0B",
  "#22C55E",
];

const COLS = 4;
const COUNT = 12;

function Gallery() {
  const gltf = useGLTF(`${BASE}/model.glb`);
  const [map, normalMap, roughnessMap] = useTexture([
    `${BASE}/diffuse.webp`,
    `${BASE}/normal.webp`,
    `${BASE}/roughness.webp`,
  ]);

  const tiles = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false;
    normalMap.flipY = false;
    roughnessMap.flipY = false;

    const body = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      roughnessMap,
      roughness: 0.75,
      metalness: 0,
    });

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 2.8 / Math.max(size.y, 0.001);

    return Array.from({ length: COUNT }, (_, i) => {
      const clone = gltf.scene.clone(true);
      const label = new THREE.MeshStandardMaterial({
        color: LABELS[i % LABELS.length],
        roughness: 0.55,
        metalness: 0,
      });
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.name === "model_2") mesh.material = body;
          else if (mesh.name === "boxart") mesh.material = label;
        }
      });
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return {
        node: clone,
        position: [(col - (COLS - 1) / 2) * 3.1, ((COUNT / COLS - 1) / 2 - row) * 3.4, 0] as const,
        rotationY: Math.PI / 2 + (i % 3 - 1) * 0.18,
        scale,
      };
    });
  }, [gltf, map, normalMap, roughnessMap]);

  return (
    <group>
      {tiles.map((tile, i) => (
        <primitive
          key={i}
          object={tile.node}
          position={tile.position as unknown as THREE.Vector3}
          rotation={[0, tile.rotationY, 0]}
          scale={tile.scale}
        />
      ))}
    </group>
  );
}

export default function App() {
  return (
    <main className="w-screen h-screen bg-black">
      <Canvas camera={{ position: [0, 0.5, 15], fov: 38 }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 6]} intensity={2.2} />
        <directionalLight position={[-6, 3, -4]} intensity={0.8} color="#c8d4ff" />
        <Suspense fallback={null}>
          <Gallery />
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </main>
  );
}
