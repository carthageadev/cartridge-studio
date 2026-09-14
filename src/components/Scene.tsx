import { useRef, useMemo, useEffect, useState, Suspense, use } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, useCursor, useGLTF, useTexture, Environment, Sparkles, ContactShadows } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import * as THREE from "three"
import { button, folder, useControls } from "leva"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { LayeredReflectorMaterial } from "./LayeredReflectorMaterial"
import { type Game } from "../data/games"
import { startLibraryResolver, useStore } from "../store"
import { isCoverCacheKey, isCustomCoverKey, loadCoverObjectUrl, releaseCoverObjectUrl } from "../utils/coverCache"

/* ================================================================== */
/*  Asset URLs                                                         */
/* ================================================================== */

// 3D asset URLs are served at runtime from the serverless config
// endpoint (/api/config), which reads a server-only env var
// (THREE_D_BASE_URL). Filenames are resolved server-side so no asset
// paths are baked into the frontend bundle.

interface AssetUrls {
  model: string
  bodyBase: string
  bodyNormal: string
  bodyRoughness: string
}

let assetUrlsPromise: Promise<AssetUrls> | null = null

function getAssetUrls(): Promise<AssetUrls> {
  if (!assetUrlsPromise) {
    assetUrlsPromise = (async () => {
      const res = await fetch("/api/config")
      const data = (await res.json()) as { assets?: AssetUrls }
      if (!data.assets) throw new Error("3D asset URLs not configured")
      return data.assets
    })()
  }
  return assetUrlsPromise
}

function useAssetUrls() {
  return use(getAssetUrls())
}

const SCENE_BG = "#07111c"

const TARGET_HEIGHT = 2.8
const LERP_SPEED = 5
const CARTRIDGE_FACE_ROTATION = Math.PI / 2
const CAROUSEL_GAP = 4.15
/* Slots farther than this from the selected one are fully culled (offscreen anyway). */
const CULL_RADIUS = 6
const CAROUSEL_DEPTH_STEP = 0.52
const REFLECTION_LAYER = 1

function clampFrameDelta(delta: number) {
  return Math.min(delta, 1 / 30)
}

function getOrbitPosition(yaw: number, pitch: number, radius: number, targetY: number): [number, number, number] {
  const cosPitch = Math.cos(pitch)
  return [
    Math.sin(yaw) * cosPitch * radius,
    targetY + Math.sin(pitch) * radius,
    Math.cos(yaw) * cosPitch * radius,
  ]
}

/* ================================================================== */
/*  Texture helpers                                                    */
/* ================================================================== */

function useFlippedTexture(url: string): THREE.Texture {
  const texture = useTexture(url)
  useEffect(() => {
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])
  return texture
}

function useFlippedDataTexture(url: string): THREE.Texture {
  const texture = useTexture(url)
  useEffect(() => {
    texture.flipY = false
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])
  return texture
}

function useCoverTexture(game: Game): THREE.Texture {
  const updateGame = useStore((s) => s.updateGame)
  const [resolvedUrl, setResolvedUrl] = useState(TEXTURE_FALLBACK_COVER)
  useEffect(() => {
    let cancelled = false
    const url = game.coverArt
    if (!url || url === "/no-image.svg") {
      setResolvedUrl(TEXTURE_FALLBACK_COVER)
      return
    }
    if (isCoverCacheKey(url)) {
      loadCoverObjectUrl(url).then((objectUrl) => {
        if (cancelled) return
        if (!objectUrl) {
          setResolvedUrl(TEXTURE_FALLBACK_COVER)
          updateGame(game.id, {
            status: "pending",
            coverState: "queued",
            coverArt: "/no-image.svg",
            error: undefined,
          })
          startLibraryResolver()
          return
        }
        setResolvedUrl(objectUrl)
      })
      return () => {
        cancelled = true
        releaseCoverObjectUrl(url)
      }
    }
    const probe = new Image()
    probe.crossOrigin = "anonymous"
    probe.onload = () => {
      if (!cancelled) setResolvedUrl(url)
    }
    probe.onerror = () => {
      if (cancelled) return
      setResolvedUrl(TEXTURE_FALLBACK_COVER)
      if (game.coverState === "cached") {
        updateGame(game.id, {
          status: "pending",
          coverState: "queued",
          coverArt: "/no-image.svg",
          error: undefined,
        })
        startLibraryResolver()
        return
      }
      if (game.coverState === "fetched") {
        updateGame(game.id, {
          status: "error",
          coverState: "error",
          coverArt: "/no-image.svg",
          error: "Cover URL failed",
        })
      }
    }
    probe.src = url
    return () => { cancelled = true }
  }, [game, updateGame])
  return useFlippedTexture(resolvedUrl)
}

/* ================================================================== */
/*  Cartridge3D - real PBR plastic material                            */
/*  ----------------------------------------------------------------  */
/*  Plastic is NOT metal.  We respect the textures by:                */
/*    - metalness = 0 (plastic never has metallic reflection)         */
/*    - roughness ~ 0.55 (plastic is mostly matte, slightly glossy)   */
/*    - roughness MAP modulates that base value (textile patterns,    */
/*      worn edges, polished corners - exactly what the artist baked) */
/*    - envMapIntensity 0.45 so the env adds subtle realism, not glare*/
/* ================================================================== */

/* One body material shared by every cartridge - same model, same textures.
   Only the boxart material is unique per game (different cover art).
   Cuts ~N material instances and avoids re-creating them on every tweak. */
let sharedBodyMaterial: THREE.MeshStandardMaterial | null = null
function getSharedBodyMaterial(
  baseTex: THREE.Texture,
  normalTex: THREE.Texture,
  roughTex: THREE.Texture
): THREE.MeshStandardMaterial {
  if (!sharedBodyMaterial) {
    sharedBodyMaterial = new THREE.MeshStandardMaterial({
      map: baseTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: roughTex,
      metalness: 0.0,
      color: new THREE.Color(0xffffff),
    })
  }
  return sharedBodyMaterial
}

function Cartridge3D({ game }: { game: Game }) {
  const { model, bodyBase, bodyNormal, bodyRoughness } = useAssetUrls()
  const gltf = useGLTF(model, true)
  const scene = gltf.scene
  const tweaks = useStore((s) => s.sceneTweaks)

  const bodyBaseTex = useFlippedTexture(bodyBase)
  const bodyNormalTex = useFlippedDataTexture(bodyNormal)
  const bodyRoughnessTex = useFlippedDataTexture(bodyRoughness)
  const gameArt = useCoverTexture(game)

  const clone = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = TARGET_HEIGHT / Math.max(size.y, 0.001)
    c.scale.multiplyScalar(s)
    const scaled = new THREE.Box3().setFromObject(c)
    const centre = new THREE.Vector3()
    scaled.getCenter(centre)
    c.position.set(-centre.x, -scaled.min.y, -centre.z)
    c.rotation.y = CARTRIDGE_FACE_ROTATION
    return c
  }, [scene])

  useEffect(() => {
    // Shared body material - one instance across all cartridges, updated in place
    const bodyMat = getSharedBodyMaterial(bodyBaseTex, bodyNormalTex, bodyRoughnessTex)
    bodyMat.roughness = tweaks.bodyRoughness
    bodyMat.envMapIntensity = tweaks.bodyEnvIntensity

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.layers.enable(REFLECTION_LAYER)

        if (mesh.name === "model_2") {
          // -- PBR PLASTIC (shared) --
          mesh.material = bodyMat
          mesh.castShadow = true
          mesh.receiveShadow = true
        } else if (mesh.name === "boxart") {
          // -- PAPER STICKER (unique per game) --
          // Matte paper with subtle laminate sheen.
          mesh.material = new THREE.MeshStandardMaterial({
            map: gameArt,
            roughness: tweaks.labelRoughness,
            metalness: 0.0,
            envMapIntensity: tweaks.labelEnvIntensity,
            color: new THREE.Color(0xffffff),
          })
          mesh.castShadow = true
          mesh.receiveShadow = true
        }
      }
    })
  }, [clone, bodyBaseTex, bodyNormalTex, bodyRoughnessTex, gameArt, tweaks.bodyEnvIntensity, tweaks.bodyRoughness, tweaks.labelEnvIntensity, tweaks.labelRoughness])

  return <primitive object={clone} />
}

/* ================================================================== */
/*  CartridgeSlot                                                      */
/*  ----------------------------------------------------------------  */
/*  Default: positions itself in carousel based on offset.            */
/*  If THIS slot is selected -> enables drag-to-rotate.                */
/*  On release -> smoothly snaps back to identity rotation.            */
/* ================================================================== */

function getCoverBadge(game: Game) {
  if (isCustomCoverKey(game.coverArt)) {
    return {
      className: "cart-badge cart-badge--custom",
      icon: <CheckCircle2 size={13} />,
      label: "CUSTOM COVER",
    }
  }
  if (game.coverState === "fetching") {
    return {
      className: "cart-badge cart-badge--loading",
      icon: <Loader2 size={13} className="spin" />,
      label: "FETCHING ART",
    }
  }
  if (game.coverState === "cached") {
    return {
      className: "cart-badge cart-badge--cached",
      icon: <CheckCircle2 size={13} />,
      label: "FROM CACHE",
    }
  }
  if (game.coverState === "fetched") {
    return {
      className: "cart-badge cart-badge--success",
      icon: <CheckCircle2 size={13} />,
      label: "COVER READY",
    }
  }
  if (game.coverState === "missing") {
    return {
      className: "cart-badge cart-badge--error",
      icon: <AlertTriangle size={13} />,
      label: game.error || "NO COVER",
    }
  }
  if (game.coverState === "error") {
    return {
      className: "cart-badge cart-badge--error",
      icon: <AlertTriangle size={13} />,
      label: game.error || "FETCH FAILED",
    }
  }
  return {
    className: "cart-badge cart-badge--pending",
    icon: <span className="cart-badge__dot" />,
    label: "QUEUED",
  }
}

function CartridgeSlot({ game, index }: { game: Game; index: number }) {
  const ref = useRef<THREE.Group>(null!)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const setSelectedIndex = useStore((s) => s.setSelectedIndex)
  const setInspectMode = useStore((s) => s.setInspectMode)
  const [hovered, setHovered] = useState(false)
  const isSelected = index === selectedIndex
  const isNear = Math.abs(index - selectedIndex) <= CULL_RADIUS
  const showCoverBadges = useStore((s) => s.settings.showCoverBadges)
  useCursor(hovered)

  // Drag rotation state (only used when selected)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })   // current rotation offset from base
  const lastPointer = useRef({ x: 0, y: 0 })

  const target = useMemo(() => {
    const offset = index - selectedIndex
    if (offset === 0) return { x: 0, y: 0.28, z: 1.95, rotY: 0, scale: 1.09, hoverYaw: 0 }
    const sign = Math.sign(offset)
    const abs = Math.abs(offset)
    const hoverYaw = sign * 0.13
    return {
      x: sign * (CAROUSEL_GAP + (abs - 1) * 1.32),
      y: 0.04,
      z: -0.9 - (abs - 1) * CAROUSEL_DEPTH_STEP,
      rotY: -sign * Math.PI * 0.26,
      scale: Math.max(0.61, 0.83 - (abs - 1) * 0.05),
      hoverYaw,
    }
  }, [index, selectedIndex])

  // Global pointer listeners while dragging the selected cartridge
  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      dragOffset.current.y += dx * 0.008
      dragOffset.current.x = Math.max(-0.55, Math.min(0.55, dragOffset.current.x + dy * 0.005))
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp) }
  }, [isDragging])

  useFrame((state, delta) => {
    if (!ref.current) return

    // Cull slots far from the selected one - skips draw, shadow & per-frame work.
    // They pop back in at the screen edge, long before they're visible.
    ref.current.visible = isNear
    if (!isNear) return

    const dt = clampFrameDelta(delta)
    const l = THREE.MathUtils.lerp
    const sp = LERP_SPEED

    // When not dragging the selected one: decay the rotation offset toward 0 (snap-back)
    if (isSelected && !isDragging) {
      dragOffset.current.x = l(dragOffset.current.x, 0, 3.5 * dt)
      dragOffset.current.y = l(dragOffset.current.y, 0, 3.5 * dt)
    }

    // Position
    ref.current.position.x = l(ref.current.position.x, target.x, sp * dt)
    ref.current.position.z = l(ref.current.position.z, target.z, sp * dt)
    let ty = target.y
    if (isSelected && !isDragging) ty += Math.sin(state.clock.elapsedTime * 1.85) * 0.04
    if (hovered && !isSelected) ty += 0.18
    ref.current.position.y = l(ref.current.position.y, ty, sp * dt)

    // Rotation (base from carousel + face rotation + drag offset)
    let targetRotY = target.rotY + CARTRIDGE_FACE_ROTATION
    let targetRotX = 0
    if (isSelected) {
      targetRotY += dragOffset.current.y
      targetRotX = dragOffset.current.x
    } else if (hovered) {
      targetRotY += target.hoverYaw
    }
    ref.current.rotation.y = l(ref.current.rotation.y, targetRotY, (isDragging ? 12 : sp) * dt)
    ref.current.rotation.x = l(ref.current.rotation.x, targetRotX, (isDragging ? 12 : sp) * dt)

    // Scale
    const ts = hovered && !isSelected ? target.scale * 1.06 : target.scale
    ref.current.scale.x = l(ref.current.scale.x, ts, sp * dt)
    ref.current.scale.y = l(ref.current.scale.y, ts, sp * dt)
    ref.current.scale.z = l(ref.current.scale.z, ts, sp * dt)
  })

  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (isSelected) {
          // Begin drag-rotate on the selected cartridge
          setIsDragging(true)
          lastPointer.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
        } else {
          // Click side cartridge -> bring it to centre
          setSelectedIndex(index)
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setSelectedIndex(index)
        setInspectMode(true) // double-click = enter zoom/inspect
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = isSelected ? "grab" : "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = "default"
      }}
    >
      <Suspense fallback={null}>
        <Cartridge3D game={game} />
      </Suspense>
      {isNear && showCoverBadges && (
        <Html center position={[0, 0.95, 0.3]} zIndexRange={[12, 0]} distanceFactor={4.5}>
          <div className={getCoverBadge(game).className}>
            {getCoverBadge(game).icon}
            {getCoverBadge(game).label}
          </div>
        </Html>
      )}
    </group>
  )
}

function Carousel({ items }: { items: Game[] }) {
  return <group>{items.map((game, i) => <CartridgeSlot key={game.id} game={game} index={i} />)}</group>
}

/* ================================================================== */
/*  Inspect (Zoom) Scene - ultra close-up examination                  */
/*  Same drag behaviour, but the camera pulls in significantly.       */
/* ================================================================== */

function InspectScene({ game }: { game: Game }) {
  const groupRef = useRef<THREE.Group>(null!)
  const [isDragging, setIsDragging] = useState(false)
  const rotation = useRef({ x: 0.12, y: 0 })
  const lastPointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      rotation.current.y += dx * 0.009
      rotation.current.x = Math.max(-0.7, Math.min(0.7, rotation.current.x + dy * 0.006))
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp) }
  }, [isDragging])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const dt = clampFrameDelta(delta)
    if (!isDragging) rotation.current.y += dt * 0.18
    const l = THREE.MathUtils.lerp
    groupRef.current.rotation.x = l(groupRef.current.rotation.x, rotation.current.x, 10 * dt)
    groupRef.current.rotation.y = l(groupRef.current.rotation.y, rotation.current.y, 10 * dt)
  })

  return (
    <group
      ref={groupRef}
      position={[0, 0.35, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        setIsDragging(true)
        lastPointer.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
      }}
    >
      <Suspense fallback={null}>
        <Cartridge3D game={game} />
      </Suspense>
    </group>
  )
}

/* ================================================================== */
/*  Floor - subtle reflective                                          */
/* ================================================================== */

function Floor() {
  const tweaks = useStore((s) => s.sceneTweaks)
  return (
    <>
      {tweaks.floorReflectionEnabled && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[80, 42]} />
          <LayeredReflectorMaterial
            includeEnvironment={tweaks.floorReflectionSource === "environment"}
            layer={REFLECTION_LAYER}
            blur={[tweaks.floorBlurX, tweaks.floorBlurY]}
            resolution={tweaks.floorResolution}
            mixBlur={1.8}
            mixStrength={tweaks.floorMixStrength}
            roughness={tweaks.floorRoughness}
            depthScale={tweaks.floorDepthScale}
            minDepthThreshold={tweaks.floorMinDepthThreshold}
            maxDepthThreshold={tweaks.floorMaxDepthThreshold}
            color={tweaks.floorColor}
            metalness={tweaks.floorMetalness}
            envMapIntensity={0}
            mirror={tweaks.floorMirror}
            fovMultiplier={tweaks.floorFovMultiplier}
          />
        </mesh>
      )}
      <ContactShadows
        position={[0, 0.0, 0]}
        opacity={tweaks.shadowOpacity}
        scale={tweaks.shadowScale}
        blur={tweaks.shadowBlur}
        far={tweaks.shadowFar}
        resolution={512}
        color="#000000"
      />
    </>
  )
}

function Particles() {
  return (
    <>
      <Sparkles count={50} scale={[22, 11, 16]} size={1.2} speed={0.13} opacity={0.15} color="#a5b4fc" />
      <Sparkles count={25} scale={[22, 11, 16]} size={0.9} speed={0.09} opacity={0.08} color="#f0abfc" />
    </>
  )
}

/* ================================================================== */
/*  Camera controller                                                  */
/*  Distance comes from settings.cameraZoom - user-tunable.           */
/* ================================================================== */

function CameraController({ inspectMode }: { inspectMode: boolean }) {
  const { camera } = useThree()
  const cameraZoom = useStore((s) => s.settings.cameraZoom)

  useFrame((_, delta) => {
    const dt = clampFrameDelta(delta)
    const browseZ = cameraZoom        // user-tunable browse distance
    const browseY = 2.5 + (cameraZoom - 9) * 0.12
    const targetPos = inspectMode
      ? new THREE.Vector3(0, 0.5, 5.2)
      : new THREE.Vector3(0, browseY, browseZ)
    camera.position.lerp(targetPos, 2.5 * dt)
    const targetLook = inspectMode ? new THREE.Vector3(0, 0.35, 0) : new THREE.Vector3(0, 1.3, 0)
    camera.lookAt(targetLook)
  })
  return null
}

function ToneMappingController() {
  const gl = useThree((state) => state.gl)
  const exposure = useStore((s) => s.sceneTweaks.toneMappingExposure)

  useEffect(() => {
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}

/* ================================================================== */
/*  STUDIO LIGHTING                                                    */
/*  Proper 3-point film/photography rig with REAL targets so each     */
/*  light aims precisely at the cartridge.  Cinematic, balanced,      */
/*  not harsh.  This is what makes the PBR materials feel real.       */
/* ================================================================== */

function StudioLighting() {
  const tweaks = useStore((s) => s.sceneTweaks)
  // Persistent target objects. Each SpotLight references one.
  const tCentre = useMemo(() => new THREE.Object3D(), [])
  const tLow = useMemo(() => new THREE.Object3D(), [])
  const keyRef = useRef<THREE.SpotLight>(null)
  const fillRef = useRef<THREE.SpotLight>(null)
  const rimRef = useRef<THREE.SpotLight>(null)
  const leftAccentRef = useRef<THREE.PointLight>(null)
  const rightAccentRef = useRef<THREE.PointLight>(null)
  const eyeRef = useRef<THREE.PointLight>(null)

  // Add targets to the scene exactly once
  const { scene } = useThree()
  useEffect(() => {
    scene.add(tCentre); scene.add(tLow)
    return () => { scene.remove(tCentre); scene.remove(tLow) }
  }, [scene, tCentre, tLow])

  useEffect(() => {
    tCentre.position.set(0, tweaks.targetCenterY, 0)
    tLow.position.set(0, tweaks.targetLowY, 0)
  }, [tCentre, tLow, tweaks.targetCenterY, tweaks.targetLowY])

  useEffect(() => {
    keyRef.current?.layers.enable(REFLECTION_LAYER)
    fillRef.current?.layers.enable(REFLECTION_LAYER)
    rimRef.current?.layers.enable(REFLECTION_LAYER)
    leftAccentRef.current?.layers.enable(REFLECTION_LAYER)
    rightAccentRef.current?.layers.enable(REFLECTION_LAYER)
    eyeRef.current?.layers.enable(REFLECTION_LAYER)
  }, [])

  const keyPosition = getOrbitPosition(tweaks.keyYaw, tweaks.keyPitch, tweaks.keyRadius, tweaks.targetCenterY)

  return (
    <>
      <ambientLight intensity={tweaks.ambientIntensity} />

      <spotLight
        ref={keyRef}
        target={tCentre}
        position={keyPosition}
        angle={tweaks.keyAngle}
        penumbra={tweaks.keyPenumbra}
        intensity={tweaks.keyIntensity}
        distance={tweaks.keyDistance}
        decay={tweaks.keyDecay}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />

      <spotLight
        ref={fillRef}
        target={tCentre}
        position={[tweaks.fillPosX, tweaks.fillPosY, tweaks.fillPosZ]}
        angle={tweaks.fillAngle}
        penumbra={tweaks.fillPenumbra}
        intensity={tweaks.fillIntensity}
        distance={tweaks.fillDistance}
        decay={tweaks.fillDecay}
        color="#eef0ff"
      />

      <spotLight
        ref={rimRef}
        target={tLow}
        position={[tweaks.rimPosX, tweaks.rimPosY, tweaks.rimPosZ]}
        angle={tweaks.rimAngle}
        penumbra={tweaks.rimPenumbra}
        intensity={tweaks.rimIntensity}
        distance={tweaks.rimDistance}
        decay={tweaks.rimDecay}
        color="#c8d4ff"
      />

      <pointLight ref={leftAccentRef} position={[tweaks.leftAccentPosX, tweaks.leftAccentPosY, tweaks.leftAccentPosZ]} intensity={tweaks.leftAccentIntensity} color="#7dd3fc" decay={2} distance={18} />
      <pointLight ref={rightAccentRef} position={[tweaks.rightAccentPosX, tweaks.rightAccentPosY, tweaks.rightAccentPosZ]} intensity={tweaks.rightAccentIntensity} color="#f9a8d4" decay={2} distance={18} />
      {tweaks.showEyeLight && (
        <pointLight
          ref={eyeRef}
          position={[0, tweaks.eyeLightHeight, tweaks.eyeLightDepth]}
          intensity={tweaks.eyeLightIntensity}
          color="#ffffff"
          decay={2}
          distance={tweaks.eyeLightDistance}
        />
      )}
    </>
  )
}

function SceneLevaControls() {
  const sceneTweaks = useStore((s) => s.sceneTweaks)
  const updateSceneTweaks = useStore((s) => s.updateSceneTweaks)
  const saveSceneTweaks = useStore((s) => s.saveSceneTweaks)
  const revertSceneTweaks = useStore((s) => s.revertSceneTweaks)
  const resetSceneTweaks = useStore((s) => s.resetSceneTweaks)

  useControls("Scene", {
    Environment: folder({
      environmentIntensity: { value: sceneTweaks.environmentIntensity, min: 0, max: 2, step: 0.01, onChange: (value) => updateSceneTweaks({ environmentIntensity: value }) },
      environmentRotationY: { value: sceneTweaks.environmentRotationY, min: -Math.PI, max: Math.PI, step: 0.01, onChange: (value) => updateSceneTweaks({ environmentRotationY: value }) },
      toneMappingExposure: { value: sceneTweaks.toneMappingExposure, min: 0.2, max: 1.5, step: 0.01, onChange: (value) => updateSceneTweaks({ toneMappingExposure: value }) },
    }),
    Lighting: folder({
      ambientIntensity: { value: sceneTweaks.ambientIntensity, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ ambientIntensity: value }) },
      targetCenterY: { value: sceneTweaks.targetCenterY, min: -2, max: 4, step: 0.05, onChange: (value) => updateSceneTweaks({ targetCenterY: value }) },
      targetLowY: { value: sceneTweaks.targetLowY, min: -2, max: 4, step: 0.05, onChange: (value) => updateSceneTweaks({ targetLowY: value }) },
      keyIntensity: { value: sceneTweaks.keyIntensity, min: 0, max: 4, step: 0.01, onChange: (value) => updateSceneTweaks({ keyIntensity: value }) },
      keyYaw: { value: sceneTweaks.keyYaw, min: -Math.PI, max: Math.PI, step: 0.01, onChange: (value) => updateSceneTweaks({ keyYaw: value }) },
      keyPitch: { value: sceneTweaks.keyPitch, min: -1.4, max: 1.4, step: 0.01, onChange: (value) => updateSceneTweaks({ keyPitch: value }) },
      keyRadius: { value: sceneTweaks.keyRadius, min: 2, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ keyRadius: value }) },
      keyAngle: { value: sceneTweaks.keyAngle, min: 0.05, max: 1.2, step: 0.01, onChange: (value) => updateSceneTweaks({ keyAngle: value }) },
      keyPenumbra: { value: sceneTweaks.keyPenumbra, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ keyPenumbra: value }) },
      keyDistance: { value: sceneTweaks.keyDistance, min: 5, max: 60, step: 1, onChange: (value) => updateSceneTweaks({ keyDistance: value }) },
      keyDecay: { value: sceneTweaks.keyDecay, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ keyDecay: value }) },
      fillIntensity: { value: sceneTweaks.fillIntensity, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ fillIntensity: value }) },
      fillPosX: { value: sceneTweaks.fillPosX, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ fillPosX: value }) },
      fillPosY: { value: sceneTweaks.fillPosY, min: -5, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ fillPosY: value }) },
      fillPosZ: { value: sceneTweaks.fillPosZ, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ fillPosZ: value }) },
      fillAngle: { value: sceneTweaks.fillAngle, min: 0.05, max: 1.2, step: 0.01, onChange: (value) => updateSceneTweaks({ fillAngle: value }) },
      fillPenumbra: { value: sceneTweaks.fillPenumbra, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ fillPenumbra: value }) },
      fillDistance: { value: sceneTweaks.fillDistance, min: 5, max: 60, step: 1, onChange: (value) => updateSceneTweaks({ fillDistance: value }) },
      fillDecay: { value: sceneTweaks.fillDecay, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ fillDecay: value }) },
      rimIntensity: { value: sceneTweaks.rimIntensity, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ rimIntensity: value }) },
      rimPosX: { value: sceneTweaks.rimPosX, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ rimPosX: value }) },
      rimPosY: { value: sceneTweaks.rimPosY, min: -5, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ rimPosY: value }) },
      rimPosZ: { value: sceneTweaks.rimPosZ, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ rimPosZ: value }) },
      rimAngle: { value: sceneTweaks.rimAngle, min: 0.05, max: 1.2, step: 0.01, onChange: (value) => updateSceneTweaks({ rimAngle: value }) },
      rimPenumbra: { value: sceneTweaks.rimPenumbra, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ rimPenumbra: value }) },
      rimDistance: { value: sceneTweaks.rimDistance, min: 5, max: 60, step: 1, onChange: (value) => updateSceneTweaks({ rimDistance: value }) },
      rimDecay: { value: sceneTweaks.rimDecay, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ rimDecay: value }) },
      leftAccentIntensity: { value: sceneTweaks.leftAccentIntensity, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ leftAccentIntensity: value }) },
      leftAccentPosX: { value: sceneTweaks.leftAccentPosX, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ leftAccentPosX: value }) },
      leftAccentPosY: { value: sceneTweaks.leftAccentPosY, min: -5, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ leftAccentPosY: value }) },
      leftAccentPosZ: { value: sceneTweaks.leftAccentPosZ, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ leftAccentPosZ: value }) },
      rightAccentIntensity: { value: sceneTweaks.rightAccentIntensity, min: 0, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ rightAccentIntensity: value }) },
      rightAccentPosX: { value: sceneTweaks.rightAccentPosX, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ rightAccentPosX: value }) },
      rightAccentPosY: { value: sceneTweaks.rightAccentPosY, min: -5, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ rightAccentPosY: value }) },
      rightAccentPosZ: { value: sceneTweaks.rightAccentPosZ, min: -20, max: 20, step: 0.1, onChange: (value) => updateSceneTweaks({ rightAccentPosZ: value }) },
      showEyeLight: { value: sceneTweaks.showEyeLight, onChange: (value) => updateSceneTweaks({ showEyeLight: value }) },
      eyeLightIntensity: { value: sceneTweaks.eyeLightIntensity, min: 0, max: 2, step: 0.01, onChange: (value) => updateSceneTweaks({ eyeLightIntensity: value }) },
      eyeLightDistance: { value: sceneTweaks.eyeLightDistance, min: 4, max: 30, step: 0.5, onChange: (value) => updateSceneTweaks({ eyeLightDistance: value }) },
      eyeLightHeight: { value: sceneTweaks.eyeLightHeight, min: -1, max: 6, step: 0.1, onChange: (value) => updateSceneTweaks({ eyeLightHeight: value }) },
      eyeLightDepth: { value: sceneTweaks.eyeLightDepth, min: -2, max: 16, step: 0.1, onChange: (value) => updateSceneTweaks({ eyeLightDepth: value }) },
    }),
    Materials: folder({
      bodyRoughness: { value: sceneTweaks.bodyRoughness, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ bodyRoughness: value }) },
      bodyEnvIntensity: { value: sceneTweaks.bodyEnvIntensity, min: 0, max: 2, step: 0.01, onChange: (value) => updateSceneTweaks({ bodyEnvIntensity: value }) },
      labelRoughness: { value: sceneTweaks.labelRoughness, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ labelRoughness: value }) },
      labelEnvIntensity: { value: sceneTweaks.labelEnvIntensity, min: 0, max: 2, step: 0.01, onChange: (value) => updateSceneTweaks({ labelEnvIntensity: value }) },
    }),
    Floor: folder({
      floorReflectionEnabled: { value: sceneTweaks.floorReflectionEnabled, onChange: (value) => updateSceneTweaks({ floorReflectionEnabled: value }) },
      floorReflectionSource: {
        value: sceneTweaks.floorReflectionSource,
        options: { Flat: "flat", Environment: "environment" },
        onChange: (value) => updateSceneTweaks({ floorReflectionSource: value as "flat" | "environment" }),
      },
      floorMirror: { value: sceneTweaks.floorMirror, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ floorMirror: value }) },
      floorMetalness: { value: sceneTweaks.floorMetalness, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ floorMetalness: value }) },
      floorColor: { value: sceneTweaks.floorColor, onChange: (value) => updateSceneTweaks({ floorColor: value }) },
      floorResolution: { value: sceneTweaks.floorResolution, min: 128, max: 2048, step: 128, onChange: (value) => updateSceneTweaks({ floorResolution: value }) },
      floorMixStrength: { value: sceneTweaks.floorMixStrength, min: 0, max: 80, step: 1, onChange: (value) => updateSceneTweaks({ floorMixStrength: value }) },
      floorRoughness: { value: sceneTweaks.floorRoughness, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ floorRoughness: value }) },
      floorBlurX: { value: sceneTweaks.floorBlurX, min: 0, max: 600, step: 1, onChange: (value) => updateSceneTweaks({ floorBlurX: value }) },
      floorBlurY: { value: sceneTweaks.floorBlurY, min: 0, max: 200, step: 1, onChange: (value) => updateSceneTweaks({ floorBlurY: value }) },
      floorDepthScale: { value: sceneTweaks.floorDepthScale, min: 0.2, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ floorDepthScale: value }) },
      floorMinDepthThreshold: { value: sceneTweaks.floorMinDepthThreshold, min: 0, max: 2, step: 0.01, onChange: (value) => updateSceneTweaks({ floorMinDepthThreshold: value }) },
      floorMaxDepthThreshold: { value: sceneTweaks.floorMaxDepthThreshold, min: 0.1, max: 3, step: 0.01, onChange: (value) => updateSceneTweaks({ floorMaxDepthThreshold: value }) },
      floorFovMultiplier: { value: sceneTweaks.floorFovMultiplier, min: 1, max: 6, step: 0.1, onChange: (value) => updateSceneTweaks({ floorFovMultiplier: value }) },
      shadowOpacity: { value: sceneTweaks.shadowOpacity, min: 0, max: 1, step: 0.01, onChange: (value) => updateSceneTweaks({ shadowOpacity: value }) },
      shadowScale: { value: sceneTweaks.shadowScale, min: 2, max: 80, step: 0.5, onChange: (value) => updateSceneTweaks({ shadowScale: value }) },
      shadowBlur: { value: sceneTweaks.shadowBlur, min: 0.2, max: 6, step: 0.1, onChange: (value) => updateSceneTweaks({ shadowBlur: value }) },
      shadowFar: { value: sceneTweaks.shadowFar, min: 1, max: 12, step: 0.1, onChange: (value) => updateSceneTweaks({ shadowFar: value }) },
    }),
    Post: folder({
      bloomIntensity: { value: sceneTweaks.bloomIntensity, min: 0, max: 1.5, step: 0.01, onChange: (value) => updateSceneTweaks({ bloomIntensity: value }) },
      bloomRadius: { value: sceneTweaks.bloomRadius, min: 0, max: 1.5, step: 0.01, onChange: (value) => updateSceneTweaks({ bloomRadius: value }) },
    }),
    Vignette: folder({
      vignetteEnabled: { value: sceneTweaks.vignetteEnabled, onChange: (value) => updateSceneTweaks({ vignetteEnabled: value }) },
      vignetteIntensity: { value: sceneTweaks.vignetteIntensity, min: 0, max: 5, step: 0.01, onChange: (value) => updateSceneTweaks({ vignetteIntensity: value }) },
    }),
    Actions: folder({
      save: button(() => saveSceneTweaks()),
      revert: button(() => revertSceneTweaks()),
      resetDefaults: button(() => resetSceneTweaks()),
    }),
  })

  return null
}

/* ================================================================== */
/*  Scene content                                                      */
/* ================================================================== */

function SceneContent() {
  const getVisibleGames = useStore((s) => s.getVisibleGames)
  const setVisibleCount = useStore((s) => s.setVisibleCount)
  const inspectMode = useStore((s) => s.inspectMode)
  const levaPanelVersion = useStore((s) => s.levaPanelVersion)
  const sceneTweaks = useStore((s) => s.sceneTweaks)
  const visibleGames = getVisibleGames()

  useEffect(() => { setVisibleCount(visibleGames.length) }, [setVisibleCount, visibleGames.length])

  const selectedGame = visibleGames[useStore((s) => s.selectedIndex)] ?? visibleGames[0]

  return (
    <>
      <SceneLevaControls key={levaPanelVersion} />
      <StudioLighting />
      <Environment
        preset="studio"
        background={false}
        resolution={256}
        environmentIntensity={sceneTweaks.environmentIntensity}
        environmentRotation={[0, sceneTweaks.environmentRotationY, 0]}
      />

      <ToneMappingController />
      <CameraController inspectMode={inspectMode} />
      <Floor />
      <Particles />

      {inspectMode ? <InspectScene game={selectedGame} /> : <Carousel items={visibleGames} />}

      <EffectComposer multisampling={8}>
        <Bloom
          intensity={sceneTweaks.bloomIntensity}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.35}
          mipmapBlur
          radius={sceneTweaks.bloomRadius}
        />
        <Vignette
          eskil={false}
          offset={0.5}
          darkness={sceneTweaks.vignetteEnabled ? sceneTweaks.vignetteIntensity : 0}
        />
      </EffectComposer>
    </>
  )
}

/* ================================================================== */
/*  Exported Scene                                                     */
/* ================================================================== */

export function Scene() {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.86,
      }}
      dpr={[1, 2]}
      camera={{ position: [0, 2.6, 9.0], fov: 32, near: 0.1, far: 80 }}
    >
      <fog attach="fog" args={[SCENE_BG, 18, 40]} />
      <color attach="background" args={[SCENE_BG]} />
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}

// Preload the model once the base URL is resolved.
getAssetUrls().then((urls) => {
  useGLTF.preload(urls.model)
})
function createPlaceholderCoverUrl() {
  if (typeof document === "undefined") return "/no-image.svg"
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext("2d")
  if (!ctx) return "/no-image.svg"
  const gradient = ctx.createLinearGradient(0, 0, 512, 512)
  gradient.addColorStop(0, "#121726")
  gradient.addColorStop(1, "#06070d")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth = 10
  ctx.strokeRect(54, 54, 404, 404)
  ctx.fillStyle = "rgba(255,255,255,0.92)"
  ctx.font = "700 54px Arial"
  ctx.textAlign = "center"
  ctx.fillText("NO COVER", 256, 250)
  ctx.fillStyle = "rgba(255,255,255,0.45)"
  ctx.font = "24px Arial"
  ctx.fillText("ScreenScraper", 256, 292)
  return canvas.toDataURL("image/png")
}

const TEXTURE_FALLBACK_COVER = createPlaceholderCoverUrl()
