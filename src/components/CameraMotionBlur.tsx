import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Effect, EffectAttribute } from "postprocessing"
import { Uniform, Vector2, Vector3 } from "three"

/* ================================================================== */
/*  CameraMotionBlur - velocity-based directional blur that responds  */
/*  to camera movement.                                               */
/*                                                                     */
/*  KEY: must declare CONVOLUTION attribute because this effect        */
/*  samples inputBuffer multiple times per pixel.                     */
/* ================================================================== */

const FRAGMENT = /* glsl */ `
uniform vec2 uVelocity;
uniform float uIntensity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 vel = uVelocity * uIntensity * 0.05;

  vec4 color = inputColor;
  float weight = 1.0;

  for (int i = 1; i <= 6; i++) {
    float t = float(i) / 6.0;
    color += texture2D(inputBuffer, uv - vel * t);
    weight += 1.0;
  }

  outputColor = color / weight;
}
`

class MotionBlurEffect extends Effect {
  constructor() {
    super("MotionBlurEffect", FRAGMENT, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ["uVelocity", new Uniform(new Vector2(0, 0))],
        ["uIntensity", new Uniform(0.3)],
      ]),
    })
  }
}

export function CameraMotionBlur({
  enabled = true,
  intensity = 0.3,
}: {
  enabled?: boolean
  intensity?: number
}) {
  const effect = useMemo(() => new MotionBlurEffect(), [])
  const prevPos = useRef(new Vector3())
  const { camera } = useThree()
  const velocity = useRef(new Vector2(0, 0))

  useEffect(() => {
    const syncPrev = () => {
      prevPos.current.copy(camera.position)
      velocity.current.set(0, 0)
      effect.uniforms.get("uVelocity")!.value.set(0, 0)
    }
    syncPrev()
    const onVisibilityChange = () => {
      if (document.hidden) syncPrev()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [camera, effect])

  useFrame(() => {
    effect.uniforms.get("uIntensity")!.value = enabled ? intensity : 0
    if (!enabled) return

    const pos = camera.position.clone()
    const projected = pos.clone().project(camera)
    const prev = prevPos.current.clone().project(camera)

    const dx = projected.x - prev.x
    const dy = projected.y - prev.y

    velocity.current.x += (dx - velocity.current.x) * 0.2
    velocity.current.y += (dy - velocity.current.y) * 0.2

    effect.uniforms.get("uVelocity")!.value.copy(velocity.current)
    prevPos.current.copy(camera.position)
  })

  return <primitive object={effect} />
}
