/**
 * A lightweight first-person walker: WASD/arrows to move, drag to look
 * (mouse or touch — no pointer-lock, so clicking furniture still works),
 * with simple circle/rectangle collision against the room walls and every
 * piece of furniture. Deliberately NOT OrbitControls — a manually-moved
 * camera and an orbit target fight each other, so this replaces it outright.
 */
import * as THREE from 'three'

export type CollisionCircle = { x: number; z: number; radius: number }

export type WalkControlsOptions = {
  eyeHeight?: number
  speed?: number
  bounds: { halfWidth: number; halfDepth: number; margin?: number }
  collisions?: CollisionCircle[]
  spawn?: { x: number; z: number; yaw: number }
  onClick?: (clientX: number, clientY: number) => void
}

export type WalkControls = {
  update: (dt: number) => void
  setLookAt: (position: THREE.Vector3, lookAt: THREE.Vector3) => void
  setEnabled: (enabled: boolean) => void
  dispose: () => void
}

const CLICK_MOVE_THRESHOLD = 5
const CLICK_TIME_THRESHOLD = 400

export function createWalkControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  opts: WalkControlsOptions
): WalkControls {
  const eyeHeight = opts.eyeHeight ?? 1.6
  const speed = opts.speed ?? 4.0
  const margin = opts.bounds.margin ?? 0.55

  let yaw = opts.spawn?.yaw ?? Math.PI
  let pitch = -0.06
  const position = new THREE.Vector3(opts.spawn?.x ?? 0, eyeHeight, opts.spawn?.z ?? 0)

  const keys = new Set<string>()
  let enabled = true
  let dragging = false
  let dragMoved = false
  let lastX = 0
  let lastY = 0
  let downX = 0
  let downY = 0
  let downTime = 0

  function isTypingTarget(target: EventTarget | null) {
    const tag = (target as HTMLElement | null)?.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA'
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return
    keys.add(e.key.toLowerCase())
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key.toLowerCase())
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  function onPointerDown(e: PointerEvent) {
    dragging = true
    dragMoved = false
    lastX = downX = e.clientX
    lastY = downY = e.clientY
    downTime = performance.now()
    try {
      domElement.setPointerCapture(e.pointerId)
    } catch (_) {}
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging || !enabled) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    if (Math.abs(e.clientX - downX) > CLICK_MOVE_THRESHOLD || Math.abs(e.clientY - downY) > CLICK_MOVE_THRESHOLD) {
      dragMoved = true
    }
    yaw -= dx * 0.0032
    pitch -= dy * 0.0032
    pitch = Math.max(-1.2, Math.min(1.2, pitch))
  }
  function onPointerUp(e: PointerEvent) {
    dragging = false
    const elapsed = performance.now() - downTime
    if (!dragMoved && elapsed < CLICK_TIME_THRESHOLD) {
      opts.onClick?.(e.clientX, e.clientY)
    }
  }
  domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)

  function resolveCollision(pos: THREE.Vector3) {
    const { halfWidth, halfDepth } = opts.bounds
    pos.x = Math.max(-halfWidth + margin, Math.min(halfWidth - margin, pos.x))
    pos.z = Math.max(-halfDepth + margin, Math.min(halfDepth - margin, pos.z))
    for (const c of opts.collisions ?? []) {
      const dx = pos.x - c.x
      const dz = pos.z - c.z
      const dist = Math.hypot(dx, dz)
      if (dist < c.radius && dist > 1e-4) {
        const push = c.radius - dist
        pos.x += (dx / dist) * push
        pos.z += (dz / dist) * push
      }
    }
  }

  function update(dt: number) {
    if (!enabled) return
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2))
    const move = new THREE.Vector3()
    if (keys.has('w') || keys.has('arrowup')) move.add(forward)
    if (keys.has('s') || keys.has('arrowdown')) move.sub(forward)
    if (keys.has('d') || keys.has('arrowright')) move.add(right)
    if (keys.has('a') || keys.has('arrowleft')) move.sub(right)
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt)
      const next = position.clone().add(move)
      resolveCollision(next)
      position.x = next.x
      position.z = next.z
    }

    camera.position.set(position.x, eyeHeight, position.z)
    const lookDir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
    camera.lookAt(position.x + lookDir.x, eyeHeight + lookDir.y, position.z + lookDir.z)
  }

  function setLookAt(pos: THREE.Vector3, lookAt: THREE.Vector3) {
    position.set(pos.x, eyeHeight, pos.z)
    const dir = lookAt.clone().sub(pos).normalize()
    yaw = Math.atan2(dir.x, dir.z)
    pitch = Math.max(-1.2, Math.min(1.2, Math.asin(Math.max(-1, Math.min(1, dir.y)))))
  }

  function setEnabled(v: boolean) {
    enabled = v
    if (!v) dragging = false
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    domElement.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  return { update, setLookAt, setEnabled, dispose }
}
