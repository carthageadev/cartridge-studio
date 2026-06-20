import { useRef, useMemo } from "react"
import { useFrame, useThree, extend } from "@react-three/fiber"
import {
  Effect,
  EffectComposer,
  Pass,
} from "postprocessing"
import { Camera, HalfFloatType, Uniform, Vector2, WebGLRenderTarget } from "three"

/* ================================================================== */
/*  CameraMotionBlurEffect - a lightweight velocity-based motion blur  */
/*  that tracks camera movement between frames and applies directional */
/*  blur in screen-space.                                             */
/* ================================================================== */

const FRAGMENT_SHADER = `
uniform sampler2D tColor;
uniform vec2 velocity;
uniform float intensity;
uniform float samples;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 vel = velocity * intensity;
  float total = 0.0;
  vec4 color = vec4(0.0);

  float s = max(1.0, samples);
  for (float i = 0.0; i < 16.0; i++) {
    if (i >= s) break;
    float t = (i / s) - 0.5;
    color += texture2D(tColor, uv + vel * t);
    total += 1.0;
  }

  outputColor = color / total;
}
`

class CameraMotionBlurEffect extends Effect {
  constructor() {
    super("CameraMotionBlurEffect", FRAGMENT_SHADER, {
      uniforms: new Map([
        ["velocity", new Uniform(new Vector2(0, 0))],
        ["intensity", new Uniform(0.3)],
        ["samples", new Uniform(8)],
      ]),
    })
  }
}

/* ================================================================== */
/*  React component - tracks camera velocity and passes to the effect */
/* ================================================================== */

export function CameraMotionBlur({
  enabled = true,
  intensity = 0.3,
}: {
  enabled?: boolean
  intensity?: number
}) {
  const effect = useMemo(() => new CameraMotionBlurEffect(), [])
  const prevPos = useRef(new Vector2(0, 0))
  const { camera, size } = useThree()

  useFrame(() => {
    effect.uniforms.get("intensity")!.value = enabled ? intensity : 0

    if (!enabled) return

    // Project camera position to screen-space velocity
    const pos = camera.position.clone()
    const projected = pos.project(camera as Camera)
    const screenX = (projected.x + 1) / 2
    const screenY = (projected.y + 1) / 2

    const dx = screenX - prevPos.current.x
    const dy = screenY - prevPos.current.y

    // Smooth the velocity a bit for stability
    const vel = effect.uniforms.get("velocity")!.value as Vector2
    vel.x = vel.x * 0.7 + dx * 0.3
    vel.y = vel.y * 0.7 + dy * 0.3

    prevPos.current.set(screenX, screenY)
  })

  return <primitive object={effect} />
}
