import { useRef, useState } from "react"
import { useStore } from "../store"

const MAX_PITCH = 1.4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toDegrees(radians: number) {
  return Math.round((radians * 180) / Math.PI)
}

export function DebugLightPanel() {
  const showLeva = useStore((s) => s.showLeva)
  const sceneTweaks = useStore((s) => s.sceneTweaks)
  const updateSceneTweaks = useStore((s) => s.updateSceneTweaks)
  const saveSceneTweaks = useStore((s) => s.saveSceneTweaks)
  const revertSceneTweaks = useStore((s) => s.revertSceneTweaks)
  const resetSceneTweaks = useStore((s) => s.resetSceneTweaks)
  const padRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  if (!showLeva) return null

  const syncFromPointer = (clientX: number, clientY: number) => {
    if (!padRef.current) return
    const rect = padRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let dx = (clientX - centerX) / (rect.width / 2)
    let dy = (clientY - centerY) / (rect.height / 2)
    const length = Math.hypot(dx, dy)
    if (length > 1) {
      dx /= length
      dy /= length
    }
    updateSceneTweaks({
      keyYaw: dx * Math.PI,
      keyPitch: clamp(-dy * MAX_PITCH, -MAX_PITCH, MAX_PITCH),
    })
  }

  const handleX = clamp(sceneTweaks.keyYaw / Math.PI, -1, 1)
  const handleY = clamp(-sceneTweaks.keyPitch / MAX_PITCH, -1, 1)

  return (
    <div className="fixed right-6 bottom-6 z-[70] pointer-events-auto">
      <div className="w-[320px] rounded-3xl border border-white/12 bg-[#07111c]/92 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-wide">Key Light Debug</div>
            <div className="text-[11px] text-white/45">Drag the orb to steer the main glare light.</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
            Live
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            ref={padRef}
            className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0d1b2a]"
            style={{
              touchAction: "none",
              backgroundImage:
                "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 30%, rgba(5,10,18,0.9) 75%), linear-gradient(180deg, rgba(80,120,160,0.12), rgba(4,8,14,0.95))",
            }}
            onPointerDown={(event) => {
              event.preventDefault()
              setDragging(true)
              event.currentTarget.setPointerCapture(event.pointerId)
              syncFromPointer(event.clientX, event.clientY)
            }}
            onPointerMove={(event) => {
              if (!dragging) return
              syncFromPointer(event.clientX, event.clientY)
            }}
            onPointerUp={(event) => {
              setDragging(false)
              event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={(event) => {
              setDragging(false)
              event.currentTarget.releasePointerCapture(event.pointerId)
            }}
          >
            <div className="absolute inset-[12%] rounded-full border border-white/8" />
            <div className="absolute inset-[28%] rounded-full border border-white/6" />
            <div className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-white/8" />
            <div className="absolute top-1/2 left-3 right-3 h-px -translate-y-1/2 bg-white/8" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20" />
            <div
              className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffd79a]/70 bg-[#ffcc7a] shadow-[0_0_24px_rgba(255,208,138,0.55)]"
              style={{
                left: `${50 + handleX * 38}%`,
                top: `${50 + handleY * 38}%`,
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/60">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="text-white/35">Yaw</div>
                <div className="mt-0.5 text-base font-semibold text-white">{toDegrees(sceneTweaks.keyYaw)}°</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="text-white/35">Pitch</div>
                <div className="mt-0.5 text-base font-semibold text-white">{toDegrees(sceneTweaks.keyPitch)}°</div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                <span>Radius</span>
                <span>{sceneTweaks.keyRadius.toFixed(1)}</span>
              </div>
              <input
                className="w-full accent-[#ffcc7a]"
                type="range"
                min={2}
                max={20}
                step={0.1}
                value={sceneTweaks.keyRadius}
                onChange={(event) => updateSceneTweaks({ keyRadius: Number(event.target.value) })}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                <span>Intensity</span>
                <span>{sceneTweaks.keyIntensity.toFixed(2)}</span>
              </div>
              <input
                className="w-full accent-[#ffcc7a]"
                type="range"
                min={0}
                max={4}
                step={0.01}
                value={sceneTweaks.keyIntensity}
                onChange={(event) => updateSceneTweaks({ keyIntensity: Number(event.target.value) })}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                <span>HDRI Brightness</span>
                <span>{sceneTweaks.environmentIntensity.toFixed(2)}</span>
              </div>
              <input
                className="w-full accent-[#7dd3fc]"
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={sceneTweaks.environmentIntensity}
                onChange={(event) => updateSceneTweaks({ environmentIntensity: Number(event.target.value) })}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                <span>HDRI Rotation</span>
                <span>{toDegrees(sceneTweaks.environmentRotationY)}°</span>
              </div>
              <input
                className="w-full accent-[#7dd3fc]"
                type="range"
                min={-3.14}
                max={3.14}
                step={0.01}
                value={sceneTweaks.environmentRotationY}
                onChange={(event) => updateSceneTweaks({ environmentRotationY: Number(event.target.value) })}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                <span>Exposure</span>
                <span>{sceneTweaks.toneMappingExposure.toFixed(2)}</span>
              </div>
              <input
                className="w-full accent-[#7dd3fc]"
                type="range"
                min={0.2}
                max={1.5}
                step={0.01}
                value={sceneTweaks.toneMappingExposure}
                onChange={(event) => updateSceneTweaks({ toneMappingExposure: Number(event.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            className="rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
            onClick={() => saveSceneTweaks()}
          >
            Save
          </button>
          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
            onClick={() => revertSceneTweaks()}
          >
            Revert Saved
          </button>
          <button
            className="rounded-2xl border border-amber-400/25 bg-amber-500/12 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            onClick={() => resetSceneTweaks()}
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
