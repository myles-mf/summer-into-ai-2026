/**
 * The Signal Station: an actual enclosed room (floor + holographic walls),
 * not a ring of icons floating in open space. Furniture sits on the floor
 * around the walls, lit + shaded (MeshStandardMaterial, real lights) instead
 * of flat unlit color, with a small emissive glow so it still reads through
 * bloom. A glowing transmitter core hovers at the room's center, wired to
 * every piece of furniture by signal arcs — the room's actual broadcast
 * device. Deliberately still hand-authored primitives (no AI 3D-asset
 * generation, no external model pack) so it stays a single dependency-free
 * file, but real lighting + shading gets most of the way to "looks like a
 * game," the same way Kyle's/Eric's 3D builds read as solid rooms.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { BeaconNode } from './nodes'
import { ROOM } from './nodes'
import { buildGlyph } from './glyphs'

export type SceneAPI = {
  setActive: (index: number | null) => void
  flyTo: (index: number | null, durationMs?: number) => void
  pickAt: (clientX: number, clientY: number) => number | null
  resize: () => void
  dispose: () => void
}

const AMBER = new THREE.Color('#ffb020')
const TEAL = new THREE.Color('#2be3b8')
const PANEL = new THREE.Color('#123033')

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

/** A dim grid texture for the floor/walls — a holographic room shell, not
 * solid walls, so orbiting never feels boxed-in or occludes the furniture. */
function gridTexture(cell: number, lineColor: string, bg: string): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1.5
  const step = size / cell
  for (let i = 0; i <= cell; i++) {
    const p = i * step
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** A small floating call-sign chip so each piece of furniture reads as "what
 * it is" at a glance too — drawn in white so it can be tinted amber/teal via
 * material.color, same trick as the glow sprite. */
function labelTexture(text: string): { texture: THREE.Texture; aspect: number } {
  const dpr = 2
  const fontSize = 36 * dpr
  const padX = 24 * dpr
  const padY = 14 * dpr
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `700 ${fontSize}px "JetBrains Mono", monospace`
  const textW = measure.measureText(text.toUpperCase()).width
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(textW + padX * 2)
  canvas.height = Math.ceil(fontSize + padY * 2)
  const ctx = canvas.getContext('2d')!
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  roundRectPath(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 9 * dpr)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fill()
  ctx.lineWidth = 3 * dpr
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 2 * dpr)
  return { texture: new THREE.CanvasTexture(canvas), aspect: canvas.width / canvas.height }
}

export function createScene(canvas: HTMLCanvasElement, nodes: BeaconNode[]): SceneAPI {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#050607')
  scene.fog = new THREE.FogExp2(0x050607, 0.032)

  const camera = new THREE.PerspectiveCamera(48, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 200)
  camera.position.set(0, 7.5, 9.5)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 3.5
  controls.maxDistance = 15
  controls.maxPolarAngle = Math.PI * 0.49
  controls.target.set(0, 1, 0)

  const tex = glowTexture()

  // --- the room shell: a lit floor + four holographic grid walls ---
  const floorTex = gridTexture(12, 'rgba(43,227,184,0.4)', '#0a0f10')
  floorTex.repeat.set(ROOM.width / 2, ROOM.depth / 2)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.1 })
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const wallTex = gridTexture(8, 'rgba(255,176,32,0.35)', '#080b0c')
  function makeWall(w: number, h: number, x: number, z: number, rotY: number) {
    const t = wallTex.clone()
    t.needsUpdate = true
    t.repeat.set(w / 2, h / 2)
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: t,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        roughness: 1,
        emissive: 0x0a0f10,
      })
    )
    wall.position.set(x, h / 2, z)
    wall.rotation.y = rotY
    scene.add(wall)
    return wall
  }
  makeWall(ROOM.width, ROOM.height, 0, -ROOM.depth / 2, 0)
  makeWall(ROOM.width, ROOM.height, 0, ROOM.depth / 2, Math.PI)
  makeWall(ROOM.depth, ROOM.height, -ROOM.width / 2, 0, Math.PI / 2)
  makeWall(ROOM.depth, ROOM.height, ROOM.width / 2, 0, -Math.PI / 2)

  // --- lighting: real shading, not flat unlit color ---
  scene.add(new THREE.HemisphereLight(0x2b3a3d, 0x0a0a0d, 0.9))
  const key = new THREE.PointLight(0xfff2d9, 12, 20, 2)
  key.position.set(0, ROOM.height - 0.4, 0)
  scene.add(key)
  const rim = new THREE.PointLight(0x2be3b8, 4, 16, 2)
  rim.position.set(-ROOM.width / 2, 2, ROOM.depth / 2)
  scene.add(rim)

  // --- furniture around the room + a central transmitter core ---
  const beaconGroup = new THREE.Group()
  const pulseGroups: THREE.Group[] = []
  const hitMeshes: THREE.Mesh[] = []
  const glyphMats: THREE.MeshStandardMaterial[] = []
  const glowSprites: THREE.Sprite[] = []
  const labelSprites: THREE.Sprite[] = []
  const labelMats: THREE.SpriteMaterial[] = []
  const labelTextures: THREE.Texture[] = []

  nodes.forEach((node) => {
    const [x, , z] = node.position

    const pulseGroup = new THREE.Group()
    pulseGroup.position.set(x, 0.42, z)
    // face the furniture toward the room center
    pulseGroup.lookAt(0, 0.42, 0)
    beaconGroup.add(pulseGroup)
    pulseGroups.push(pulseGroup)

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false })
    )
    hit.userData.locusIndex = node.index
    pulseGroup.add(hit)
    hitMeshes.push(hit)

    const { group: glyph, material: glyphMat } = buildGlyph(node.locus, AMBER)
    glyph.scale.setScalar(0.95)
    pulseGroup.add(glyph)
    glyphMats.push(glyphMat)

    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      color: AMBER,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(0.9, 0.9, 1)
    sprite.position.set(x, 0.5, z)
    beaconGroup.add(sprite)
    glowSprites.push(sprite)

    const { texture: labelTex, aspect } = labelTexture(node.locus)
    const labelMat = new THREE.SpriteMaterial({
      map: labelTex,
      color: AMBER,
      transparent: true,
      depthTest: false,
    })
    const labelHeight = 0.55
    const label = new THREE.Sprite(labelMat)
    label.scale.set(labelHeight * aspect, labelHeight, 1)
    label.position.set(x, 1.35, z)
    label.renderOrder = 10
    beaconGroup.add(label)
    labelSprites.push(label)
    labelMats.push(labelMat)
    labelTextures.push(labelTex)
  })
  scene.add(beaconGroup)

  // the transmitter core — the room's actual broadcast device
  const coreMat = new THREE.MeshStandardMaterial({
    color: AMBER,
    emissive: AMBER,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.7,
    wireframe: true,
  })
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), coreMat)
  core.position.set(0, 1.9, 0)
  scene.add(core)
  const coreGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, color: AMBER, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  coreGlow.scale.set(1.6, 1.6, 1)
  coreGlow.position.copy(core.position)
  scene.add(coreGlow)

  // signal arcs: every piece of furniture wired to the transmitter core
  const arcGroup = new THREE.Group()
  const arcMats: THREE.LineBasicMaterial[] = []
  nodes.forEach((node) => {
    const [x, , z] = node.position
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.7, z),
      new THREE.Vector3(x * 0.4, 1.5, z * 0.4),
      core.position.clone(),
    ])
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20))
    const mat = new THREE.LineBasicMaterial({ color: PANEL, transparent: true, opacity: 0.5 })
    arcGroup.add(new THREE.Line(geo, mat))
    arcMats.push(mat)
  })
  scene.add(arcGroup)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 0.5, 0.5, 0.35)
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
      flyTarget = new THREE.Vector3(0, 7.5, 9.5)
      flyLookAt = new THREE.Vector3(0, 1, 0)
    } else {
      const [x, , z] = nodes[index].position
      const dir = new THREE.Vector2(x, z).normalize()
      // move IN from the furniture toward the room center (not out through the wall)
      flyTarget = new THREE.Vector3(x - dir.x * 2.6, 2.0, z - dir.y * 2.6)
      flyLookAt = new THREE.Vector3(x, 0.7, z)
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
    const hits = raycaster.intersectObjects(hitMeshes, false)
    if (!hits.length) return null
    return (hits[0].object.userData.locusIndex as number) ?? null
  }

  let raf = 0
  const clock = new THREE.Clock()
  function animate() {
    raf = requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    core.rotation.y = t * 0.4
    core.rotation.x = t * 0.15
    coreMat.emissiveIntensity = 0.7 + 0.25 * Math.sin(t * 2)

    pulseGroups.forEach((grp, i) => {
      const isActive = i === activeIndex
      const pulse = isActive ? 1 + 0.22 * Math.sin(t * 6) : 1 + 0.04 * Math.sin(t * 1.4 + i)
      grp.scale.setScalar(pulse)
      const c = isActive ? TEAL : AMBER
      glyphMats[i].color.copy(c)
      glyphMats[i].emissive.copy(c)
      glowSprites[i].material.color.copy(c)
      glowSprites[i].scale.setScalar(isActive ? 1.3 : 0.9)
      labelMats[i].color.copy(c)
      arcMats[i].color.copy(isActive ? TEAL : PANEL)
      arcMats[i].opacity = isActive ? 0.9 : 0.5
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
    labelMats.forEach((m) => m.dispose())
    labelTextures.forEach((t) => t.dispose())
    glyphMats.forEach((m) => m.dispose())
    floorTex.dispose()
    wallTex.dispose()
    tex.dispose()
  }

  return { setActive, flyTo, pickAt, resize, dispose }
}
