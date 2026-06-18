import _extends from "@babel/runtime/helpers/esm/extends"
import * as React from "react"
import {
  Plane,
  Vector3,
  Matrix4,
  Vector4,
  PerspectiveCamera,
  WebGLRenderTarget,
  DepthTexture,
  DepthFormat,
  UnsignedShortType,
  LinearFilter,
  HalfFloatType,
} from "three"
import { extend, useFrame, useThree } from "@react-three/fiber"
import { BlurPass } from "@react-three/drei/materials/BlurPass.js"
import { MeshReflectorMaterial as MeshReflectorMaterialImpl } from "@react-three/drei/materials/MeshReflectorMaterial.js"

type LayeredReflectorMaterialProps = {
  blur?: number | [number, number]
  depthScale?: number
  depthToBlurRatioBias?: number
  distortion?: number
  distortionMap?: any
  includeEnvironment?: boolean
  layer?: number
  maxDepthThreshold?: number
  minDepthThreshold?: number
  mirror?: number
  mixBlur?: number
  mixContrast?: number
  mixStrength?: number
  reflectorOffset?: number
  resolution?: number
  [key: string]: any
}

export const LayeredReflectorMaterial = React.forwardRef<any, LayeredReflectorMaterialProps>(({
  mixBlur = 0,
  mixStrength = 1,
  resolution = 256,
  blur = [0, 0],
  minDepthThreshold = 0.9,
  maxDepthThreshold = 1,
  depthScale = 0,
  depthToBlurRatioBias = 0.25,
  mirror = 0,
  distortion = 1,
  mixContrast = 1,
  distortionMap,
  includeEnvironment = false,
  reflectorOffset = 0,
  layer = 1,
  ...props
}, ref) => {
  extend({ MeshReflectorMaterialImpl })

  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)

  const normalizedBlur = Array.isArray(blur) ? blur : [blur, blur]
  const hasBlur = normalizedBlur[0] + normalizedBlur[1] > 0
  const blurX = normalizedBlur[0]
  const blurY = normalizedBlur[1]
  const materialRef = React.useRef<any>(null)
  React.useImperativeHandle(ref, () => materialRef.current, [])

  const [reflectorPlane] = React.useState(() => new Plane())
  const [normal] = React.useState(() => new Vector3())
  const [reflectorWorldPosition] = React.useState(() => new Vector3())
  const [cameraWorldPosition] = React.useState(() => new Vector3())
  const [rotationMatrix] = React.useState(() => new Matrix4())
  const [lookAtPosition] = React.useState(() => new Vector3(0, 0, -1))
  const [clipPlane] = React.useState(() => new Vector4())
  const [view] = React.useState(() => new Vector3())
  const [target] = React.useState(() => new Vector3())
  const [q] = React.useState(() => new Vector4())
  const [textureMatrix] = React.useState(() => new Matrix4())
  const [virtualCamera] = React.useState(() => new PerspectiveCamera())

  const beforeRender = React.useCallback(() => {
    const parent = materialRef.current?.parent || materialRef.current?.__r3f?.parent?.object
    if (!parent) return false

    reflectorWorldPosition.setFromMatrixPosition(parent.matrixWorld)
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)
    rotationMatrix.extractRotation(parent.matrixWorld)
    normal.set(0, 0, 1)
    normal.applyMatrix4(rotationMatrix)
    reflectorWorldPosition.addScaledVector(normal, reflectorOffset)
    view.subVectors(reflectorWorldPosition, cameraWorldPosition)

    if (view.dot(normal) > 0) return false

    view.reflect(normal).negate()
    view.add(reflectorWorldPosition)
    rotationMatrix.extractRotation(camera.matrixWorld)
    lookAtPosition.set(0, 0, -1)
    lookAtPosition.applyMatrix4(rotationMatrix)
    lookAtPosition.add(cameraWorldPosition)
    target.subVectors(reflectorWorldPosition, lookAtPosition)
    target.reflect(normal).negate()
    target.add(reflectorWorldPosition)

    virtualCamera.position.copy(view)
    virtualCamera.up.set(0, 1, 0)
    virtualCamera.up.applyMatrix4(rotationMatrix)
    virtualCamera.up.reflect(normal)
    virtualCamera.lookAt(target)
    virtualCamera.layers.set(layer)
    virtualCamera.far = camera.far
    virtualCamera.updateMatrixWorld()
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix)

    textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0)
    textureMatrix.multiply(virtualCamera.projectionMatrix)
    textureMatrix.multiply(virtualCamera.matrixWorldInverse)
    textureMatrix.multiply(parent.matrixWorld)

    reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition)
    reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse)
    clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant)

    const projectionMatrix = virtualCamera.projectionMatrix
    q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
    q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
    q.z = -1
    q.w = (1 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]
    clipPlane.multiplyScalar(2 / clipPlane.dot(q))
    projectionMatrix.elements[2] = clipPlane.x
    projectionMatrix.elements[6] = clipPlane.y
    projectionMatrix.elements[10] = clipPlane.z + 1
    projectionMatrix.elements[14] = clipPlane.w
    return true
  }, [camera, clipPlane, layer, lookAtPosition, normal, q, reflectorOffset, reflectorPlane, reflectorWorldPosition, rotationMatrix, target, textureMatrix, view, virtualCamera, cameraWorldPosition])

  const [fbo1, fbo2, blurpass, reflectorProps] = React.useMemo(() => {
    const parameters = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      type: HalfFloatType,
    }
    const targetA = new WebGLRenderTarget(resolution, resolution, parameters)
    targetA.depthBuffer = true
    targetA.depthTexture = new DepthTexture(resolution, resolution)
    targetA.depthTexture.format = DepthFormat
    targetA.depthTexture.type = UnsignedShortType
    const targetB = new WebGLRenderTarget(resolution, resolution, parameters)
    const blurPass = new BlurPass({
      gl,
      resolution,
      width: blurX,
      height: blurY,
      minDepthThreshold,
      maxDepthThreshold,
      depthScale,
      depthToBlurRatioBias,
    })
    return [
      targetA,
      targetB,
      blurPass,
      {
        mirror,
        textureMatrix,
        mixBlur,
        tDiffuse: targetA.texture,
        tDepth: targetA.depthTexture,
        tDiffuseBlur: targetB.texture,
        hasBlur,
        mixStrength,
        minDepthThreshold,
        maxDepthThreshold,
        depthScale,
        depthToBlurRatioBias,
        distortion,
        distortionMap,
        mixContrast,
        "defines-USE_BLUR": hasBlur ? "" : undefined,
        "defines-USE_DEPTH": depthScale > 0 ? "" : undefined,
        "defines-USE_DISTORTION": distortionMap ? "" : undefined,
      },
    ]
  }, [depthScale, depthToBlurRatioBias, distortion, distortionMap, gl, blurX, blurY, hasBlur, maxDepthThreshold, minDepthThreshold, mirror, mixBlur, mixContrast, mixStrength, resolution, textureMatrix])

  useFrame(() => {
    const parent = materialRef.current?.parent || materialRef.current?.__r3f?.parent?.object
    if (!parent) return
    if (!beforeRender()) return

    parent.visible = false
    const currentXrEnabled = gl.xr.enabled
    const currentShadowAutoUpdate = gl.shadowMap.autoUpdate
    const currentBackground = scene.background
    const currentEnvironment = scene.environment
    const currentBackgroundBlurriness = (scene as any).backgroundBlurriness
    const currentBackgroundIntensity = (scene as any).backgroundIntensity
    const currentEnvironmentIntensity = (scene as any).environmentIntensity

    gl.xr.enabled = false
    gl.shadowMap.autoUpdate = false
    if (!includeEnvironment) {
      scene.background = null
      scene.environment = null
      ;(scene as any).backgroundBlurriness = 0
      ;(scene as any).backgroundIntensity = 0
      ;(scene as any).environmentIntensity = 0
    }

    gl.setRenderTarget(fbo1)
    gl.state.buffers.depth.setMask(true)
    if (!gl.autoClear) gl.clear()
    gl.render(scene, virtualCamera)
    if (hasBlur) blurpass.render(gl, fbo1, fbo2)

    if (!includeEnvironment) {
      scene.background = currentBackground
      scene.environment = currentEnvironment
      ;(scene as any).backgroundBlurriness = currentBackgroundBlurriness
      ;(scene as any).backgroundIntensity = currentBackgroundIntensity
      ;(scene as any).environmentIntensity = currentEnvironmentIntensity
    }
    gl.xr.enabled = currentXrEnabled
    gl.shadowMap.autoUpdate = currentShadowAutoUpdate
    parent.visible = true
    gl.setRenderTarget(null)
  })

  return React.createElement("meshReflectorMaterialImpl", _extends({
    attach: "material",
    key: "isolated-reflector" + reflectorProps["defines-USE_BLUR"] + reflectorProps["defines-USE_DEPTH"] + reflectorProps["defines-USE_DISTORTION"],
    ref: materialRef,
  }, reflectorProps, props))
})
