import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useGLTF, useTexture } from '@react-three/drei'

// 3D assets are served from this app's own public/3d folder (copied from the
// main branch): model.glb plus the diffuse, normal and roughness webp maps.
const ASSET_PREFIX = '/3d'

function useAssetUrls() {
  return {
    model: `${ASSET_PREFIX}/model.glb`,
    bodyBase: `${ASSET_PREFIX}/diffuse.webp`,
    bodyNormal: `${ASSET_PREFIX}/normal.webp`,
    bodyRoughness: `${ASSET_PREFIX}/roughness.webp`,
  }
}

const FALLBACK_LABEL = '/no-image.webp'

/** Final width of a cartridge in world units after auto-fit. */
export const CART_WIDTH = 2.1

function configureColorTexture(t: THREE.Texture) {
  // Spec 2 note: flipY must be false for textures applied to the GLB meshes.
  t.flipY = false
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
}

function configureDataTexture(t: THREE.Texture) {
  t.flipY = false
  t.anisotropy = 8
  t.needsUpdate = true
}

/** Loads the sticker art for one cartridge, falling back to the bundled
 *  example label while loading or on failure. */
function useLabelTexture(url: string | null): THREE.Texture {
  const fallback = useTexture(FALLBACK_LABEL, (t) =>
    configureColorTexture(t as THREE.Texture)
  )
  const [tex, setTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    setTex(null)
    if (!url) return
    let alive = true
    let loaded: THREE.Texture | null = null
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (!alive) {
          t.dispose()
          return
        }
        configureColorTexture(t)
        t.anisotropy = 4 // labels are small on screen; keep sampling cheap
        loaded = t
        setTex(t)
      },
      undefined,
      () => {
        /* keep fallback on error */
      }
    )
    return () => {
      alive = false
      loaded?.dispose()
    }
  }, [url])

  return tex ?? (fallback as THREE.Texture)
}

interface CartridgeModelProps {
  labelUrl: string | null
}

/**
 * Pure visual: the two-mesh N64 cartridge (spec 2).
 *  - `model_2`  -> plastic shell with the newbase PBR set
 *  - `boxart`   -> sticker face with the per-game label texture
 * The raw GLB is ~9 units wide with the label facing -Z, so we auto-fit it
 * (measured Box3 -> centered, CART_WIDTH wide) and spin it 180° to face camera.
 */
export function CartridgeModel({ labelUrl }: CartridgeModelProps) {
  const { model, bodyBase, bodyNormal, bodyRoughness } = useAssetUrls()
  const gltf = useGLTF(model)
  const labelTex = useLabelTexture(labelUrl)

  const shellMaps = useTexture({
    map: bodyBase,
    normalMap: bodyNormal,
    roughnessMap: bodyRoughness,
  })

  const { root, scale, center, labelMat } = useMemo(() => {
    // Textures are cached by drei, so configuring them repeatedly is harmless.
    configureColorTexture(shellMaps.map)
    configureDataTexture(shellMaps.normalMap)
    configureDataTexture(shellMaps.roughnessMap)

    const root = gltf.scene.clone(true)

    const bodyMat = new THREE.MeshStandardMaterial({
      map: shellMaps.map,
      normalMap: shellMaps.normalMap,
      roughnessMap: shellMaps.roughnessMap,
      metalness: 0.05,
      envMapIntensity: 0.9,
    })
    const labelMat = new THREE.MeshStandardMaterial({
      roughness: 0.32,
      metalness: 0,
      envMapIntensity: 0.55,
    })

    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh
        if (mesh.name === 'model_2') mesh.material = bodyMat
        else if (mesh.name === 'boxart') mesh.material = labelMat
        // Pointer events hit the rig's invisible box instead - raycasting the
        // full cartridge geometry on every mousemove is what causes stutter.
        mesh.raycast = () => {}
      }
    })

    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    return { root, scale: CART_WIDTH / size.x, center, labelMat }
  }, [gltf, shellMaps])

  useEffect(() => {
    labelMat.map = labelTex
    labelMat.needsUpdate = true
  }, [labelMat, labelTex])

  useEffect(() => () => {
    labelMat.dispose()
  }, [labelMat])

  return (
    <group rotation-y={Math.PI} scale={scale}>
      <group position={[-center.x, -center.y, -center.z]}>
        <primitive object={root} />
      </group>
    </group>
  )
}

// Preload the model and textures.
useGLTF.preload(`${ASSET_PREFIX}/model.glb`)
useTexture.preload(FALLBACK_LABEL)
useTexture.preload(`${ASSET_PREFIX}/diffuse.webp`)
useTexture.preload(`${ASSET_PREFIX}/normal.webp`)
useTexture.preload(`${ASSET_PREFIX}/roughness.webp`)
