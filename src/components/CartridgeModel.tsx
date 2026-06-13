import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import type { GLTF } from "three-stdlib";
import type { GameEntry } from "../types";

const FACE_CAMERA_ROTATION_Y = Math.PI;

type CartridgeModelProps = {
  game: GameEntry;
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
  focused: boolean;
  glow: boolean;
  inspecting?: boolean;
  inspectRotation?: { x: number; y: number };
  onClick?: () => void;
};

function prepareTexture(texture: Texture, anisotropy: number, colorTexture = true) {
  texture.flipY = false;
  texture.colorSpace = colorTexture ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
}

export function CartridgeModel({
  game,
  index,
  position,
  rotation,
  scale,
  opacity,
  focused,
  glow,
  inspecting = false,
  inspectRotation = { x: 0, y: 0 },
  onClick,
}: CartridgeModelProps) {
  const groupRef = useRef<Group>(null);
  const { gl } = useThree();
  const gltf = useGLTF("/n64cart.glb", false, false) as GLTF;
  const shellTextures = useTexture(["/diffuse.jpg", "/normal.png", "/roughness.png"]);
  const labelTexture = useTexture(game.coverUrl || "/gameart.png");
  const anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    prepareTexture(shellTextures[0], anisotropy, true);
    prepareTexture(shellTextures[1], anisotropy, false);
    prepareTexture(shellTextures[2], anisotropy, false);
    prepareTexture(labelTexture, anisotropy, true);
  }, [anisotropy, labelTexture, shellTextures]);

  const shellMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: shellTextures[0],
        normalMap: shellTextures[1],
        roughnessMap: shellTextures[2],
        roughness: 0.68,
        metalness: 0.01,
        clearcoat: 0.18,
        clearcoatRoughness: 0.52,
        envMapIntensity: 0.58,
        reflectivity: 0.22,
        specularIntensity: 0.34,
        specularColor: new Color("#ffffff"),
        color: new Color("#ddd8ce"),
        depthWrite: true,
        depthTest: true,
        side: DoubleSide,
        transparent: false,
        opacity: 1,
      }),
    [shellTextures],
  );

  const labelMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: labelTexture,
        roughness: 0.38,
        metalness: 0,
        clearcoat: 0.32,
        clearcoatRoughness: 0.4,
        depthWrite: true,
        depthTest: true,
        envMapIntensity: 0.72,
        reflectivity: 0.18,
        specularIntensity: 0.32,
        specularColor: new Color("#ffffff"),
        emissive: new Color(game.accent),
        emissiveIntensity: glow && focused ? 0.018 : 0,
        side: DoubleSide,
        transparent: false,
        opacity: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [focused, game.accent, glow, labelTexture],
  );

  const { scene, normalizedScale } = useMemo(() => {
    const instance = gltf.scene.clone(true);

    instance.traverse((child) => {
      if (!(child instanceof Mesh)) {
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;
      child.renderOrder = child.name === "boxart" ? 2 : 1;
      child.material = child.name === "boxart" ? labelMaterial : shellMaterial;
    });

    const box = new Box3().setFromObject(instance);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    instance.position.sub(center);

    return {
      scene: instance,
      normalizedScale: 1.68 / Math.max(size.x, size.y, size.z),
    };
  }, [gltf.scene, labelMaterial, shellMaterial]);

  useFrame((state) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const bob = Math.sin(elapsed * 1.25 + index * 0.7) * (focused ? 0.045 : 0.035);
    const targetPosition = new Vector3(position[0], position[1] + bob, position[2]);
    group.position.lerp(targetPosition, 0.11);
    const inspectX = inspecting && focused ? inspectRotation.x : 0;
    const inspectY = inspecting && focused ? inspectRotation.y : 0;
    const hoverX = inspecting ? 0 : Math.sin(elapsed + index) * 0.018;
    group.rotation.x = MathUtils.lerp(group.rotation.x, rotation[0] + hoverX + inspectX, 0.1);
    group.rotation.y = MathUtils.lerp(group.rotation.y, rotation[1] + FACE_CAMERA_ROTATION_Y + inspectY, 0.1);
    group.rotation.z = MathUtils.lerp(
      group.rotation.z,
      rotation[2] + Math.sin(elapsed * 0.8 + index) * 0.01,
      0.1,
    );

    const targetScale = normalizedScale * scale;
    group.scale.lerp(new Vector3(targetScale, targetScale, targetScale), 0.12);
  });

  return (
    <group
      ref={groupRef}
      rotation={[rotation[0], rotation[1] + FACE_CAMERA_ROTATION_Y, rotation[2]]}
      onClick={onClick}
      dispose={null}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/n64cart.glb", false, false);
