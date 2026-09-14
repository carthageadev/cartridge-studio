import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { Loader2 } from 'lucide-react'
import { canLoop, useStore } from '../../store'
import type { GameEntry } from '../../types'
import { CartridgeModel } from './Cartridge'

// -- Flow layout tuning --------------------------------------------------------
const X_SPACING = 1.95
const Z_RECEDE = 1.45 // how far side carts sink back
const Y_DIP = 0.07 // side carts dip slightly
const MAX_TILT = 0.62 // coverflow Y tilt of side carts
const FOCUS_POP = 1.05 // focused cart comes toward camera
const FOCUS_SCALE = 1.16
const SIDE_SCALE = 0.88
const VISIBLE_RANGE = 4.6 // carts beyond this offset are culled

// Detail-view (selected) staging
const SELECT_POS = new THREE.Vector3(1.62, 0.28, 1.9)
const SELECT_SCALE = 1.12

const damp = THREE.MathUtils.damp

interface SharedFlow {
  scroll: number
  target: number
  count: number
  loop: boolean
}

/** Signed distance from scroll to this index, going the short way around the
 *  ring when looping. */
function flowOffset(raw: number, flow: SharedFlow): number {
  if (!flow.loop || flow.count === 0) return raw
  const n = flow.count
  let o = raw % n
  if (o > n / 2) o -= n
  if (o < -n / 2) o += n
  return o
}

function CartridgeRig({
  game,
  index,
  flow,
}: {
  game: GameEntry
  index: number
  flow: SharedFlow
}) {
  const group = useRef<THREE.Group>(null)
  const spin = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const fetching = game.status === 'pending' || game.status === 'loading'

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return

    const t = state.clock.elapsedTime
    const selectedUid = useStore.getState().selectedUid
    const isSelected = selectedUid === game.uid
    const somethingSelected = selectedUid !== null

    const offset = flowOffset(index - flow.scroll, flow)

    // Cull carts deep on the ring's far side - saves both render and damp work
    const visible = isSelected || somethingSelected || Math.abs(offset) <= VISIBLE_RANGE
    if (g.visible !== visible) g.visible = visible
    if (!visible) {
      // Park it at its slot so it doesn't glide across the screen on re-entry
      g.position.set(offset * X_SPACING, 0, -Math.abs(offset) * Z_RECEDE)
      return
    }

    const focusT = THREE.MathUtils.smoothstep(1 - Math.min(Math.abs(offset), 1), 0, 1)

    let tx: number, ty: number, tz: number, trotY: number, tscale: number

    if (isSelected) {
      // Cinematic: flip + swoop to the right, hold with a gentle idle sway
      spin.current = damp(spin.current, Math.PI * 2, 3.2, delta)
      tx = SELECT_POS.x
      ty = SELECT_POS.y + Math.sin(t * 1.1) * 0.05
      tz = SELECT_POS.z
      trotY = spin.current - 0.32 + Math.sin(t * 0.55) * 0.09
      tscale = SELECT_SCALE
    } else if (somethingSelected) {
      // Everyone else recedes into the fog while the detail view is open
      spin.current = damp(spin.current, 0, 3.2, delta)
      tx = offset * (X_SPACING + 0.4) - 0.6
      ty = -0.25
      tz = -5.2
      trotY = -Math.sign(offset || 1) * 0.4
      tscale = 0.8
    } else {
      // Wii Flow carousel
      spin.current = damp(spin.current, 0, 4, delta)
      const dist = Math.abs(offset)
      tx = offset * X_SPACING
      ty = -dist * Y_DIP + focusT * 0.06
      tz = -dist * Z_RECEDE + focusT * FOCUS_POP
      trotY =
        -Math.sign(offset) * Math.min(dist * 1.15, 1) * MAX_TILT + spin.current
      tscale = SIDE_SCALE + (FOCUS_SCALE - SIDE_SCALE) * focusT
      if (hovered) tscale *= 1.04
    }

    // Gentle floating - every cart breathes, the focused one a little more
    const floatAmp = isSelected ? 0.045 : 0.018 + focusT * 0.03
    ty += Math.sin(t * 1.6 + index * 1.7) * floatAmp
    const rotZ = Math.sin(t * 0.9 + index * 2.3) * 0.012

    const speed = 11
    g.position.x = damp(g.position.x, tx, speed, delta)
    g.position.y = damp(g.position.y, ty, speed * 0.85, delta)
    g.position.z = damp(g.position.z, tz, speed, delta)
    g.rotation.y = damp(g.rotation.y, trotY, speed * 0.95, delta)
    g.rotation.z = damp(g.rotation.z, rotZ, 6, delta)
    const s = damp(g.scale.x, tscale, speed, delta)
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta > 6) return // it was a drag, not a click
        const { selectedUid, select, setFocus } = useStore.getState()
        if (selectedUid) {
          select(null)
          return
        }
        const offset = flowOffset(index - flow.target, flow)
        if (Math.abs(Math.round(offset)) === 0) {
          select(game.uid)
        } else {
          setFocus(Math.round(flow.target + offset))
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Invisible hitbox: a 12-triangle raycast target instead of the GLB */}
      <mesh visible={false}>
        <boxGeometry args={[2.15, 1.5, 0.5]} />
      </mesh>
      <CartridgeModel labelUrl={game.labelUrl} />
      {fetching && (
        <Html center position={[0, 0.95, 0.3]} zIndexRange={[12, 0]} distanceFactor={4.5}>
          <div className="cart-badge">
            <Loader2 size={13} className="spin" />
            FETCHING ART
          </div>
        </Html>
      )}
    </group>
  )
}

export function Carousel() {
  const games = useStore((s) => s.games)
  const focus = useStore((s) => s.focus)
  const gl = useThree((s) => s.gl)

  const flow = useMemo<SharedFlow>(
    () => ({ scroll: 0, target: 0, count: 0, loop: false }),
    []
  )
  flow.target = focus
  flow.count = games.length
  flow.loop = canLoop(games.length)

  // Wheel browsing (window-level so it works anywhere over the screen)
  useEffect(() => {
    let lastStep = 0
    const onWheel = (e: WheelEvent) => {
      const s = useStore.getState()
      if (s.selectedUid || s.addOpen || s.settingsOpen) return
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (Math.abs(d) < 8) return
      const now = performance.now()
      if (now - lastStep < 140) return
      lastStep = now
      s.moveFocus(d > 0 ? 1 : -1)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  // Pointer drag to swipe through the flow
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let startX = 0
    let startScroll = 0

    const down = (e: PointerEvent) => {
      const s = useStore.getState()
      if (s.selectedUid || s.addOpen || s.settingsOpen) return
      dragging = true
      startX = e.clientX
      startScroll = flow.target
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      const perPx = 4.5 / el.clientWidth // ~4.5 carts across the screen
      const raw = startScroll - dx * perPx
      flow.target = flow.loop
        ? raw
        : THREE.MathUtils.clamp(raw, 0, Math.max(0, flow.count - 1))
    }
    const up = () => {
      if (!dragging) return
      dragging = false
      useStore.getState().setFocus(Math.round(flow.target))
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl, flow])

  useFrame((state, delta) => {
    flow.scroll = damp(flow.scroll, flow.target, 9, delta)

    // Subtle camera parallax following the pointer - keeps the scene alive
    const px = state.pointer.x
    const py = state.pointer.y
    state.camera.position.x = damp(state.camera.position.x, px * 0.28, 3, delta)
    state.camera.position.y = damp(state.camera.position.y, 0.42 + py * 0.16, 3, delta)
    state.camera.lookAt(0, 0.1, 0)
  })

  return (
    <group position={[0, -0.05, 0]}>
      {games.map((game, i) => (
        <CartridgeRig key={game.uid} game={game} index={i} flow={flow} />
      ))}
    </group>
  )
}
