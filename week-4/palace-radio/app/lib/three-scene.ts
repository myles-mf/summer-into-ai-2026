/**
 * The beacon-ring "Signal Station": an abstract 3D scene (glowing beacons in
 * a void, one per locus, linked by light-arcs) rather than a literal room
 * reconstruction — the same additive-glow-points + bloom technique proven in
 * BIOSPHERE/Perpetual Union, chosen deliberately over photorealistic room
 * rebuilding (the scope failure that sank rivals' more ambitious 3D builds).
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { BeaconNode } from './nodes'

export type SceneAPI = {
  setActive: (index: number | null) => void
  flyTo: (index: number | null, durationMs?: number) => void
  pickAt: (clientX: number, clientY: number) => number | null
  resize: () => void
  dispose: () => void
}

const AMBER = new THREE.Color('#ffb020')
const TEAL = new THREE.Color('#2be3b8')

function glowTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export function createScene(canvas: HTMLCanvasElement, nodes: BeaconNode[]): SceneAPI {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#050607')
  scene.fog = new THREE.FogExp2(0x050607, 0.026)

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 200)
  camera.position.set(0, 4.5, 14)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 4
  controls.maxDistance = 30
  controls.target.set(0, 1, 0)

  const tex = glowTexture()

  // dust field
  const DUST_N = 700
  const positions = new Float32Array(DUST_N * 3)
  for (let i = 0; i < DUST_N; i++) {
    const r = 16 + Math.random() * 34
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.35
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const dustMat = new THREE.PointsMaterial({
    color: 0x2be3b8,
    size: 0.09,
    map: tex,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new THREE.Points(dustGeo, dustMat))

  // floor ring guide
  const radius = nodes[0] ? Math.hypot(nodes[0].position[0], nodes[0].position[2]) || 6 : 6
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.08, radius + 0.08, 72),
    new THREE.MeshBasicMaterial({ color: 0x123033, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
  )
  ring.rotation.x = Math.PI / 2
  scene.add(ring)

  const beaconGroup = new THREE.Group()
  const beaconMeshes: THREE.Mesh[] = []
  const coreMats: THREE.MeshBasicMaterial[] = []
  const glowSprites: THREE.Sprite[] = []

  nodes.forEach((node) => {
    const [x, y, z] = node.position
    const coreMat = new THREE.MeshBasicMaterial({ color: AMBER })
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), coreMat)
    core.position.set(x, y + 1.3, z)
    core.userData.locusIndex = node.index
    beaconGroup.add(core)
    beaconMeshes.push(core)
    coreMats.push(coreMat)

    const pylon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8),
      new THREE.MeshBasicMaterial({ color: 0x123033, transparent: true, opacity: 0.55 })
    )
    pylon.position.set(x, y + 0.05, z)
    beaconGroup.add(pylon)

    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      color: AMBER,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(1.7, 1.7, 1)
    sprite.position.set(x, y + 1.3, z)
    beaconGroup.add(sprite)
    glowSprites.push(sprite)
  })
  scene.add(beaconGroup)

  // arcs linking consecutive beacons through a shared apex
  const arcGroup = new THREE.Group()
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i].position
    const b = nodes[(i + 1) % nodes.length].position
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a[0], a[1] + 1.3, a[2]),
      new THREE.Vector3(0, 2.6, 0),
      new THREE.Vector3(b[0], b[1] + 1.3, b[2]),
    ])
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24))
    arcGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2be3b8, transparent: true, opacity: 0.28 })))
  }
  scene.add(arcGroup)

  scene.add(new THREE.AmbientLight(0x223034, 1.4))

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 0.9, 0.6, 0.15)
  composer.addPass(bloom)

  let activeIndex: number | null = null
  let flyTarget: THREE.Vector3 | null = null
  let flyLookAt: THREE.Vector3 | null = null
  let flyStart = 0
  let flyDuration = 1200
  const flyFromPos = new THREE.Vector3()
  const flyFromTarget = new THREE.Vector3()

  function setActive(index: number | null) {
    activeIndex = index
  }

  function flyTo(index: number | null, durationMs = 1300) {
    flyFromPos.copy(camera.position)
    flyFromTarget.copy(controls.target)
    flyStart = performance.now()
    flyDuration = durationMs
    if (index === null || !nodes[index]) {
      flyTarget = new THREE.Vector3(0, 4.5, 14)
      flyLookAt = new THREE.Vector3(0, 1, 0)
    } else {
      const [x, y, z] = nodes[index].position
      const dir = new THREE.Vector2(x, z).normalize()
      flyTarget = new THREE.Vector3(x + dir.x * 2.6, y + 2.1, z + dir.y * 2.6)
      flyLookAt = new THREE.Vector3(x, y + 1.3, z)
    }
  }

  const raycaster = new THREE.Raycaster()
  function pickAt(clientX: number, clientY: number): number | null {
    const rect = canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObjects(beaconMeshes, false)
    if (!hits.length) return null
    return (hits[0].object.userData.locusIndex as number) ?? null
  }

  let raf = 0
  const clock = new THREE.Clock()
  function animate() {
    raf = requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    beaconMeshes.forEach((mesh, i) => {
      const isActive = i === activeIndex
      const pulse = isActive ? 1 + 0.25 * Math.sin(t * 6) : 1 + 0.05 * Math.sin(t * 1.4 + i)
      mesh.scale.setScalar(pulse)
      coreMats[i].color.copy(isActive ? TEAL : AMBER)
      glowSprites[i].material.color.copy(isActive ? TEAL : AMBER)
      glowSprites[i].scale.setScalar(isActive ? 2.5 : 1.7)
    })

    if (flyTarget && flyLookAt) {
      const elapsed = performance.now() - flyStart
      const p = Math.min(1, elapsed / flyDuration)
      const ease = 1 - Math.pow(1 - p, 3)
      camera.position.lerpVectors(flyFromPos, flyTarget, ease)
      controls.target.lerpVectors(flyFromTarget, flyLookAt, ease)
      if (p >= 1) flyTarget = null
    }

    controls.update()
    composer.render()
  }
  animate()

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
  }

  function dispose() {
    cancelAnimationFrame(raf)
    controls.dispose()
    renderer.dispose()
    dustGeo.dispose()
    dustMat.dispose()
    tex.dispose()
  }

  return { setActive, flyTo, pickAt, resize, dispose }
}
