/**
 * The Signal Station: one fixed, fully-furnished room (the "house" in
 * house.ts) — real walls, a real ceiling, a door you can actually walk
 * through — not objects spawned per word. Every one of the house's ~16
 * props is always present; a memorized word CLAIMS one of them (see
 * claim.ts) rather than creating new geometry, so adding more words never
 * needs "new space" — you're just lighting up more of a room that was
 * always fully furnished. Claimed props get a glow halo + label +
 * click-to-select; the rest sit there as plain, real furniture (Kenney
 * "Furniture Kit", CC0, public/models/, async GLTFLoader, real-world scale
 * — see model-glyph.ts) making the space read as a lived-in room instead of
 * a sparse scatter of exactly N items. Walls are plain dark matte panels
 * with a thin glowing baseboard trim, not a busy grid texture — a grid
 * across a whole wall competes with the furniture sitting in front of it.
 * A glowing wireframe transmitter core hovers at the room's center, wired
 * to every CLAIMED prop by signal arcs.
 */
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ROOM } from './nodes'
import type { RoomTemplate } from './house'
import { PROP_SURFACE_Y } from './house'
import type { ClaimedNode } from './claim'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loadModel } from './model-glyph'
import { createWalkControls } from './walk-controls'
import { buildDecoration } from './decorations'
import { getModel, modelKey } from './model-store'

export type SceneAPI = {
  setActive: (propId: string | null) => void
  flyTo: (propId: string | null, durationMs?: number) => void
  pickAt: (clientX: number, clientY: number) => string | null
  resize: () => void
  dispose: () => void
}

// Shared across every room template -- the claimed/active signal color is
// semantically distinct from a room's own palette, not part of its decor.
const AMBER = new THREE.Color('#ffb020')

/** Wall-mounted architectural fixtures -- the ambient "breathing" scale pulse
 * (below) reads as a broken height-bounce on something rigid and built-in
 * like a door, even though it looks fine on a chair or a lamp. These keep
 * the color-tint/glow feedback when claimed, just not the scale animation. */
const ARCHITECTURAL = new Set(['door', 'window', 'mirror'])

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

/** Real flooring instead of a pure hologram grid -- reclaimed-wood planks
 * tinted from the template's own base color, each row a slightly different
 * random shade with a few random vertical seam breaks so it doesn't tile as
 * an obvious repeat. */
function woodFloorTexture(base: string): THREE.Texture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  const rows = 10
  const plankH = size / rows
  for (let i = 0; i < rows; i++) {
    const shade = 20 + Math.floor(Math.random() * 14)
    ctx.fillStyle = `rgb(${shade + 14},${shade + 9},${shade + 5})`
    ctx.fillRect(0, i * plankH, size, plankH - 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, i * plankH + plankH - 1)
    ctx.lineTo(size, i * plankH + plankH - 1)
    ctx.stroke()
    const breaks = 1 + Math.floor(Math.random() * 2)
    for (let b = 0; b < breaks; b++) {
      const bx = Math.random() * size
      ctx.beginPath()
      ctx.moveTo(bx, i * plankH)
      ctx.lineTo(bx, (i + 1) * plankH - 2)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    for (let g = 0; g < 3; g++) {
      const gy = i * plankH + 3 + Math.random() * (plankH - 8)
      ctx.beginPath()
      ctx.moveTo(0, gy)
      for (let gx = 0; gx <= size; gx += 24) ctx.lineTo(gx, gy + (Math.random() - 0.5) * 2.5)
      ctx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** A soft gradient "there's something out there" glow for behind the window
 * -- the window model is mounted flush against a solid wall panel, so
 * without this it just shows flat wall material through the glass, which
 * doesn't read as a window at all. A dim horizon-glow strip low in the frame
 * suggests distant signal-space beyond the wall, without needing a real
 * cutout + skybox. */
function windowGlowTexture(): THREE.Texture {
  const w = 256
  const h = 320
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#050a0b')
  g.addColorStop(0.55, '#0c1f21')
  g.addColorStop(0.82, '#1f4a44')
  g.addColorStop(1, '#3fa88c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // a few faint distant points of light, like windows of other stations
  ctx.fillStyle = 'rgba(255,210,140,0.55)'
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * w
    const y = h * 0.5 + Math.random() * h * 0.35
    ctx.fillRect(x, y, 2, 2)
  }
  return new THREE.CanvasTexture(canvas)
}

/** A "wallpaper" for the walls instead of a flat color -- mottled paint
 * noise plus a faint vertical pinstripe motif, kept low-contrast so it
 * reads as a real papered surface without competing with the furniture
 * standing in front of it (same restraint as the trim strips). */
function plasterTexture(base: string): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n))
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n))
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let x = 12; x < size; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 2)
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

/** A small floating call-sign chip so each claimed prop reads as "what it
 * is" at a glance — shows the PROP's own name (e.g. "DESK"), not the
 * original word that claimed it, since those can differ (an open-ended word
 * with no matching prop still claims *some* spot). Drawn in white so it can
 * be tinted amber/teal via material.color, same trick as the glow sprite. */
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

/** The AI-picked glyph for a claimed spot's specific vivid detail (e.g. 💡
 * for "a lightbulb hangs where the door should be") -- the room can't
 * literally grow a crack or a lightbulb, but canvas can draw an emoji
 * straight from its font, so this is the cheap bridge between what the
 * narration describes and what you actually see, reusing the exact same
 * canvas-texture-sprite technique as labelTexture() above. */
function emojiTexture(emoji: string): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.font = `${size * 0.72}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04)
  return new THREE.CanvasTexture(canvas)
}

/** A plain, hand-built archway -- used for the door instead of the Kenney
 * "doorwayOpen" model. That model turned out to be a door panel modeled
 * swung open on its hinge (confirmed: every node in its transform hierarchy
 * has zero rotation, so the skewed look is baked into the mesh's own vertex
 * data, not a transform we could correct). A real door on a hinge reads as
 * broken/tilted rather than "an open doorway" once you're standing in front
 * of it, so a simple guaranteed-upright frame -- matched to the exact same
 * halfWidth/height the wall opening was cut to -- is the reliable fix. */
function buildDoorFrame(halfWidth: number, height: number): THREE.Object3D {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: '#a8895f', roughness: 0.65, metalness: 0.12 })
  const jambW = 0.1
  const jambD = 0.16
  const jambGeo = new THREE.BoxGeometry(jambW, height, jambD)
  const left = new THREE.Mesh(jambGeo, mat)
  left.position.set(-halfWidth, height / 2, 0)
  group.add(left)
  const right = new THREE.Mesh(jambGeo, mat)
  right.position.set(halfWidth, height / 2, 0)
  group.add(right)
  const header = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2 + jambW, jambW, jambD), mat)
  header.position.set(0, height, 0)
  group.add(header)

  // An actual wood door panel, closed, on a hinge at the left jamb -- an
  // empty frame read as a black hole into nothing once it was really the
  // only thing standing between the room and the fog/void background.
  // Closed (not ajar) since there's nothing on the other side to walk to --
  // an open door visually promises a passage that doesn't exist. The
  // opening still has zero collision (see house.ts), so it stays walkable
  // regardless of how the panel looks.
  const panelMat = new THREE.MeshStandardMaterial({ color: '#7c5c3c', roughness: 0.7, metalness: 0.08 })
  const panelWidth = halfWidth * 2 - jambW * 1.4
  const panelHeight = height * 0.96
  const panelThickness = 0.045
  const panel = new THREE.Mesh(new THREE.BoxGeometry(panelWidth, panelHeight, panelThickness), panelMat)
  panel.position.set(panelWidth / 2, panelHeight / 2, 0)
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#d9c48a', roughness: 0.3, metalness: 0.7 })
  )
  knob.position.set(panelWidth - 0.08, panelHeight / 2, panelThickness / 2 + 0.02)
  panel.add(knob)
  const hinge = new THREE.Group()
  hinge.position.set(-halfWidth + jambW * 0.5, 0, 0)
  hinge.rotation.y = 0 // closed, filling the frame
  hinge.add(panel)
  group.add(hinge)

  return group
}

function fallbackCrystal(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 0),
    new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.55 })
  )
}

/** decorations.ts builders return multi-mesh Object3Ds, so a plain
 * root.geometry.dispose() won't reach the children -- walk every descendant
 * and dispose whatever it owns. Generic to whatever geometry/material
 * structure a given builder happens to produce, so the vocabulary can grow
 * without touching this cleanup logic. */
function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const material = m.material
    const disposeMat = (mm: THREE.Material) => {
      const tex = (mm as THREE.MeshStandardMaterial).map
      if (tex) tex.dispose() // generated GLBs carry real textures, unlike the primitives
      mm.dispose()
    }
    if (Array.isArray(material)) material.forEach(disposeMat)
    else if (material) disposeMat(material as THREE.Material)
  })
}

export function createScene(
  canvas: HTMLCanvasElement,
  claimed: ClaimedNode[],
  template: RoomTemplate,
  onPick?: (propId: string) => void,
  palaceId?: string
): SceneAPI {
  const TRIM = new THREE.Color(template.palette.trim)
  const DIM_TRIM = TRIM.clone().multiplyScalar(0.4)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#050607')
  scene.fog = new THREE.FogExp2(0x050607, 0.055)

  const camera = new THREE.PerspectiveCamera(62, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 200)

  const EYE_HEIGHT = 1.6
  const walker = createWalkControls(camera, renderer.domElement, {
    eyeHeight: EYE_HEIGHT,
    bounds: { halfWidth: ROOM.width / 2, halfDepth: ROOM.depth / 2, margin: 0.55 },
    collisions: template.props.filter((p) => p.collisionRadius > 0).map((p) => ({
      x: p.position[0],
      z: p.position[1],
      radius: p.collisionRadius,
    })),
    // Off-center + angled so near/far claimed spots get real screen-space
    // parallax at the default view (a dead-center spawn compresses labels
    // that share a viewing ray, e.g. a near lamp in front of a far window,
    // into overlapping billboards — walking around it fixes itself, but the
    // very first frame is worth composing better).
    spawn: { x: 1.4, z: 2.6, yaw: Math.PI * 0.86 },
    onClick: (clientX, clientY) => {
      const id = pickAt(clientX, clientY)
      if (id !== null) onPick?.(id)
    },
  })

  // Debug hook: the preview harness runs this tab hidden, which fully pauses
  // requestAnimationFrame — so movement can't be verified by waiting in real
  // time. Exposes manual frame-stepping instead (same convention as our other
  // builds' window.__ headless harnesses).
  if (typeof window !== 'undefined') {
    ;(window as any).__palaceScene = { camera, walker, ROOM, scene }
  }

  const tex = glowTexture()

  const floorTex = woodFloorTexture(template.palette.floorBase)
  floorTex.repeat.set(ROOM.width / 2, ROOM.depth / 2)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.05 })
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // --- walls + ceiling: painted-plaster panels + a thin glowing baseboard
  // trim (not a grid texture across the whole surface — that competed with
  // the furniture standing in front of it). South wall is split around the
  // door so it's an actual walkable opening, not just a non-colliding prop
  // standing in front of solid geometry.
  const halfW = ROOM.width / 2
  const halfD = ROOM.depth / 2
  // Painted-plaster noise texture (subtle, not a pattern) on a lighter base
  // than a pure light-absorbing matte + a faint emissive lift, so the walls
  // read as a real painted surface against the black void bg instead of
  // vanishing into it -- the original flat near-black tone was
  // indistinguishable from the background except right under a light.
  const wallTex = plasterTexture(template.palette.wallBase)
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    emissive: '#0a1516',
    emissiveIntensity: 0.5,
    roughness: 0.82,
    metalness: 0.1,
  })
  const trimMat = new THREE.MeshStandardMaterial({
    color: TRIM,
    emissive: TRIM,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.3,
  })
  const wallGroup = new THREE.Group()
  const accentMats: THREE.MeshStandardMaterial[] = []

  // Sparse vertical accent strips (paneling seams) so a long flat wall reads
  // as built structure, not a texture -- same "trim, not a busy surface"
  // move as the baseboard, just oriented the other way.
  function wallAccents(width: number, height: number, x: number, y: number, z: number, rotY: number) {
    const spacing = 2.1
    const count = Math.max(0, Math.floor(width / spacing) - 1)
    if (count <= 0) return
    const start = -width / 2 + (width - (count - 1) * spacing) / 2
    for (let n = 0; n < count; n++) {
      const offset = start + n * spacing
      const mat = trimMat.clone()
      mat.emissiveIntensity = 0.18
      mat.opacity = 0.5
      mat.transparent = true
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.035, height * 0.82), mat)
      const localX = x + offset * Math.cos(rotY)
      const localZ = z - offset * Math.sin(rotY)
      strip.position.set(localX, y, localZ)
      strip.rotation.y = rotY
      wallGroup.add(strip)
      accentMats.push(mat)
    }
  }

  function wallPanel(width: number, height: number, x: number, y: number, z: number, rotY: number) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat)
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotY
    wallGroup.add(mesh)
    const baseboard = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.06), trimMat)
    baseboard.position.set(x, y - height / 2 + 0.03, z)
    baseboard.rotation.y = rotY
    wallGroup.add(baseboard)
    const crown = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.04), trimMat)
    crown.position.set(x, y + height / 2 - 0.02, z)
    crown.rotation.y = rotY
    wallGroup.add(crown)
    wallAccents(width, height, x, y, z, rotY)
  }

  const doorHalfWidth = 0.7
  const doorHeight = 2.2
  // north wall (behind the window) + east + west: solid, full span
  wallPanel(ROOM.width, ROOM.height, 0, ROOM.height / 2, -halfD, 0)
  wallPanel(ROOM.depth, ROOM.height, -halfW, ROOM.height / 2, 0, Math.PI / 2)
  wallPanel(ROOM.depth, ROOM.height, halfW, ROOM.height / 2, 0, -Math.PI / 2)
  // south wall: left segment, right segment, header above the door opening
  const southLeftWidth = halfW - doorHalfWidth
  const southRightWidth = halfW - doorHalfWidth
  wallPanel(southLeftWidth, ROOM.height, -(doorHalfWidth + southLeftWidth / 2), ROOM.height / 2, halfD, Math.PI)
  wallPanel(southRightWidth, ROOM.height, doorHalfWidth + southRightWidth / 2, ROOM.height / 2, halfD, Math.PI)
  const headerHeight = ROOM.height - doorHeight
  const header = new THREE.Mesh(new THREE.PlaneGeometry(doorHalfWidth * 2, headerHeight), wallMat)
  header.position.set(0, doorHeight + headerHeight / 2, halfD)
  header.rotation.y = Math.PI
  wallGroup.add(header)

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), wallMat)
  ceiling.position.set(0, ROOM.height, 0)
  ceiling.rotation.x = Math.PI / 2
  wallGroup.add(ceiling)

  // A dim horizon-glow backdrop sized to the window's glass pane -- tried
  // tucking this behind the window model first, but wallWindow.glb's "glass"
  // turned out to be opaque (fully hides anything behind it), so it has to
  // sit just in FRONT of the model instead, filling the pane directly.
  // (First attempt at "in front" still measured as *inside* the model's own
  // bounding box -- z -3.489..-3.311 -- so it was still occluded; confirmed
  // by reading the live mesh's world bounding box, not guessed twice. After
  // fixing that, STILL invisible even as an opaque test color with fog off
  // and dragged into open floor -- turned out to be back-face culling: a
  // bare PlaneGeometry is single-sided by default, and copying the window
  // prop's own rotationY flipped this plane's normal away from the camera.
  // DoubleSide is the robust fix for a thin decorative backdrop like this.)
  const windowProp = template.props.find((p) => p.id === 'window')
  const windowTex = windowGlowTexture()
  let windowBackdrop: THREE.Mesh | null = null
  if (windowProp) {
    const [wx, wz] = windowProp.position
    windowBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.8),
      new THREE.MeshBasicMaterial({ map: windowTex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    )
    const towardRoomCenter = wz < 0 ? 0.16 : -0.16
    windowBackdrop.position.set(wx, 1.5, wz + towardRoomCenter)
    windowBackdrop.rotation.y = windowProp.rotationY
    windowBackdrop.renderOrder = 5
    wallGroup.add(windowBackdrop)
  }

  scene.add(wallGroup)

  scene.add(new THREE.HemisphereLight(0x2b3a3d, 0x0a0a0d, 0.9))
  // Was intensity 12 sitting directly above the transmitter core (same x=0,z=0
  // centerline) -- close enough to the ceiling to blow it out into a flat
  // white blob under bloom. Softer + offset off-center so it doesn't stack
  // with the core's own glow along the same sightline.
  const key = new THREE.PointLight(0xfff2d9, 7, 18, 2)
  key.position.set(1.2, ROOM.height - 0.4, -0.6)
  scene.add(key)
  const rim = new THREE.PointLight(0x2be3b8, 4, 16, 2)
  rim.position.set(-ROOM.width / 2 + 0.4, 2, ROOM.depth / 2 - 0.4)
  scene.add(rim)

  // --- the house: every prop always present; claimed ones get interactivity ---
  const claimedByPropId = new Map(claimed.map((c) => [c.prop.id, c.association]))

  const houseGroup = new THREE.Group()
  const pulseGroups = new Map<string, THREE.Group>()
  const hitMeshes: THREE.Mesh[] = []
  const glowSprites = new Map<string, THREE.Sprite>()
  const labelMats = new Map<string, THREE.SpriteMaterial>()
  const labelTextures: THREE.Texture[] = []
  const emojiMats: THREE.SpriteMaterial[] = []
  const emojiTextures: THREE.Texture[] = []
  const decorationRoots: THREE.Object3D[] = []
  // Per-prop handles so an AI-sculpted model arriving async can replace
  // whatever placeholder (primitive shape or flat sprite) that spot got.
  const decorationByProp = new Map<string, THREE.Object3D>()
  const spriteByProp = new Map<string, THREE.Sprite>()
  const gltfLoader = new GLTFLoader()
  let disposed = false

  template.props.forEach((prop) => {
    const [x, z] = prop.position
    const isClaimed = claimedByPropId.has(prop.id)

    const pulseGroup = new THREE.Group()
    pulseGroup.position.set(x, 0, z)
    pulseGroup.rotation.y = prop.rotationY
    houseGroup.add(pulseGroup)
    if (isClaimed) pulseGroups.set(prop.id, pulseGroup)

    if (prop.id === 'door') {
      pulseGroup.add(buildDoorFrame(doorHalfWidth, doorHeight))
    } else {
      const placeholder = fallbackCrystal()
      placeholder.position.y = 0.5
      placeholder.scale.setScalar(0.5)
      placeholder.visible = isClaimed // unclaimed props don't need a loading placeholder halo
      pulseGroup.add(placeholder)

      loadModel(prop.model)
        .then((model) => {
          pulseGroup.remove(placeholder)
          pulseGroup.add(model)
        })
        .catch(() => {
          placeholder.visible = true
        })
    }

    if (isClaimed) {
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 10, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false })
      )
      hit.position.y = 0.55
      hit.userData.propId = prop.id
      pulseGroup.add(hit)
      hitMeshes.push(hit)

      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        color: AMBER,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(1.0, 1.0, 1)
      sprite.position.set(x, 0.5, z)
      houseGroup.add(sprite)
      glowSprites.set(prop.id, sprite)

      const { texture: labelTex, aspect } = labelTexture(prop.id)
      const labelMat = new THREE.SpriteMaterial({ map: labelTex, color: AMBER, transparent: true, depthTest: false })
      const labelHeight = 0.55
      const label = new THREE.Sprite(labelMat)
      label.scale.set(labelHeight * aspect, labelHeight, 1)
      label.position.set(x, 1.55, z)
      label.renderOrder = 10
      houseGroup.add(label)
      labelMats.set(prop.id, labelMat)
      labelTextures.push(labelTex)

      // The AI-picked glyph for THIS spot's specific vivid detail, floating
      // just above the name tag (name below, imagined detail above -- comic
      // panel order) -- skipped entirely for palaces saved before this field
      // existed, same graceful-absence handling as every other optional
      // field in this app. When the emoji matches a real small 3D shape
      // (decorations.ts), render that instead of the flat glyph -- actual
      // object presence reads much closer to "the room grew this detail"
      // than an icon floating in space. Falls back to the flat sprite for
      // every emoji outside that fixed vocabulary (most of them, still --
      // this is a curated ~18-shape library, not full emoji coverage).
      const emoji = claimedByPropId.get(prop.id)?.emoji
      if (emoji) {
        const decoration = buildDecoration(emoji, claimedByPropId.get(prop.id)?.color)
        if (decoration) {
          // The raw prop position IS the furniture's visual center --
          // loadModel() re-centers every model on its pivot at load time.
          const anchorY = PROP_SURFACE_Y[prop.id] ?? 2.0
          decoration.position.set(x, anchorY, z)
          decoration.userData.bobPhase = Math.random() * Math.PI * 2
          decoration.userData.baseY = anchorY
          houseGroup.add(decoration)
          decorationRoots.push(decoration)
          decorationByProp.set(prop.id, decoration)
        } else {
          const emojiTex = emojiTexture(emoji)
          const emojiMat = new THREE.SpriteMaterial({ map: emojiTex, transparent: true, depthTest: false })
          const emojiSprite = new THREE.Sprite(emojiMat)
          emojiSprite.scale.set(0.4, 0.4, 1)
          emojiSprite.position.set(x, 2.05, z)
          emojiSprite.renderOrder = 10
          houseGroup.add(emojiSprite)
          emojiMats.push(emojiMat)
          emojiTextures.push(emojiTex)
          spriteByProp.set(prop.id, emojiSprite)
        }
      }

      // An AI-sculpted model for this exact palace+spot (Materialize, see
      // model-gen.ts) trumps both fallbacks. Checked async against
      // IndexedDB: absent for shared-link recipients and never-materialized
      // palaces, in which case whatever rendered above simply stays.
      if (palaceId) {
        getModel(modelKey(palaceId, prop.id)).then((bytes) => {
          if (!bytes || disposed) return
          gltfLoader.parse(
            bytes,
            '',
            (gltf) => {
              if (disposed) {
                disposeObject3D(gltf.scene)
                return
              }
              const obj = gltf.scene
              // Generated meshes come at arbitrary scale -- normalize to a
              // small-object size (per-object normalize is CORRECT here,
              // unlike the furniture kit where it destroyed proportions).
              const box = new THREE.Box3().setFromObject(obj)
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z) || 1
              obj.scale.setScalar(0.45 / maxDim)
              obj.updateMatrixWorld(true)
              const scaled = new THREE.Box3().setFromObject(obj)
              const center = scaled.getCenter(new THREE.Vector3())
              obj.position.x -= center.x
              obj.position.z -= center.z
              obj.position.y -= scaled.min.y // bottom sits at wrapper origin
              const wrapper = new THREE.Group()
              wrapper.add(obj)
              const anchorY = PROP_SURFACE_Y[prop.id] ?? 2.0
              wrapper.position.set(x, anchorY, z)
              wrapper.userData.bobPhase = Math.random() * Math.PI * 2
              wrapper.userData.baseY = anchorY
              const prevDecoration = decorationByProp.get(prop.id)
              if (prevDecoration) {
                houseGroup.remove(prevDecoration)
                const idx = decorationRoots.indexOf(prevDecoration)
                if (idx >= 0) decorationRoots.splice(idx, 1)
                disposeObject3D(prevDecoration)
              }
              const prevSprite = spriteByProp.get(prop.id)
              if (prevSprite) houseGroup.remove(prevSprite) // disposal stays with emojiMats/emojiTextures
              houseGroup.add(wrapper)
              decorationRoots.push(wrapper)
              decorationByProp.set(prop.id, wrapper)
            },
            () => {} // parse failure -> keep the fallback silently
          )
        })
      }
    }
  })
  scene.add(houseGroup)

  // the transmitter core — wired only to CLAIMED spots (your actual memories)
  const coreMat = new THREE.MeshStandardMaterial({
    color: AMBER,
    emissive: AMBER,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.7,
    wireframe: true,
  })
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), coreMat)
  // Off the room's exact x=0/z=0 centerline -- the door and window both sit
  // ON that centerline (opposite walls), so a dead-center core used to land
  // right in the sightline looking from one to the other and read as an
  // unexplained blob rather than a deliberate centerpiece.
  core.position.set(0.8, 1.9, -0.2)
  scene.add(core)
  const { texture: coreLabelTex, aspect: coreLabelAspect } = labelTexture('signal core')
  const coreLabel = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: coreLabelTex, color: AMBER, transparent: true, depthTest: false })
  )
  const coreLabelH = 0.4
  coreLabel.scale.set(coreLabelH * coreLabelAspect, coreLabelH, 1)
  coreLabel.position.set(core.position.x, core.position.y + 0.62, core.position.z)
  coreLabel.renderOrder = 10
  scene.add(coreLabel)
  const coreGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, color: AMBER, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  coreGlow.scale.set(1.6, 1.6, 1)
  coreGlow.position.copy(core.position)
  scene.add(coreGlow)

  const arcGroup = new THREE.Group()
  const arcMats = new Map<string, THREE.LineBasicMaterial>()
  claimed.forEach(({ prop }) => {
    const [x, z] = prop.position
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.7, z),
      new THREE.Vector3(x * 0.4, 1.5, z * 0.4),
      core.position.clone(),
    ])
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20))
    const mat = new THREE.LineBasicMaterial({ color: DIM_TRIM, transparent: true, opacity: 0.5 })
    arcGroup.add(new THREE.Line(geo, mat))
    arcMats.set(prop.id, mat)
  })
  scene.add(arcGroup)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 0.5, 0.5, 0.35)
  composer.addPass(bloom)

  let activePropId: string | null = null
  let flyTarget: THREE.Vector3 | null = null
  let flyLookAt: THREE.Vector3 | null = null
  let flyStart = 0
  let flyDuration = 1200
  const flyFromPos = new THREE.Vector3()
  const flyFromLook = new THREE.Vector3()
  const currentLook = new THREE.Vector3()

  const propById = new Map(template.props.map((p) => [p.id, p]))

  function setActive(propId: string | null) {
    activePropId = propId
  }

  /** Scripted camera moves (Palace Radio's flythrough, and clicking a locus in
   * the side panel) temporarily take over from the walker, then hand control
   * back with yaw/pitch synced so manual walking resumes without a snap. */
  function flyTo(propId: string | null, durationMs = 1300) {
    walker.setEnabled(false)
    flyFromPos.copy(camera.position)
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    flyFromLook.copy(camera.position).addScaledVector(dir, 3)
    flyStart = performance.now()
    flyDuration = durationMs
    const prop = propId ? propById.get(propId) : undefined
    if (!prop) {
      flyTarget = new THREE.Vector3(0, EYE_HEIGHT, 2.4)
      flyLookAt = core.position.clone()
    } else {
      const [x, z] = prop.position
      const d = new THREE.Vector2(x, z).normalize()
      // move IN from the prop toward the room center (not out into the void)
      flyTarget = new THREE.Vector3(x - d.x * 1.9, EYE_HEIGHT, z - d.y * 1.9)
      flyLookAt = new THREE.Vector3(x, 0.7, z)
    }
  }

  const raycaster = new THREE.Raycaster()
  function pickAt(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObjects(hitMeshes, false)
    if (!hits.length) return null
    return (hits[0].object.userData.propId as string) ?? null
  }

  let raf = 0
  const clock = new THREE.Clock()
  function animate() {
    raf = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime

    core.rotation.y = t * 0.4
    core.rotation.x = t * 0.15
    coreMat.emissiveIntensity = 0.7 + 0.25 * Math.sin(t * 2)

    let i = 0
    pulseGroups.forEach((grp, id) => {
      const isActive = id === activePropId
      if (!ARCHITECTURAL.has(id)) {
        const pulse = isActive ? 1 + 0.22 * Math.sin(t * 6) : 1 + 0.04 * Math.sin(t * 1.4 + i)
        grp.scale.setScalar(pulse)
      }
      const c = isActive ? TRIM : AMBER
      glowSprites.get(id)!.material.color.copy(c)
      glowSprites.get(id)!.scale.setScalar(isActive ? 1.5 : 1.0)
      labelMats.get(id)!.color.copy(c)
      const arcMat = arcMats.get(id)
      if (arcMat) {
        arcMat.color.copy(isActive ? TRIM : DIM_TRIM)
        arcMat.opacity = isActive ? 0.9 : 0.5
      }
      i++
    })

    decorationRoots.forEach((obj) => {
      const phase = obj.userData.bobPhase as number
      const baseY = obj.userData.baseY as number
      // A full continuous spin read fine for a floating icon, but a cat/apple/gift
      // now resting AT furniture height shouldn't spin in place like a music-box
      // novelty -- a gentle sway plus a subtle bob reads as "sitting there," not orbiting.
      obj.rotation.y = Math.sin(t * 0.6 + phase) * 0.35
      obj.position.y = baseY + Math.sin(t * 1.1 + phase) * 0.025
    })

    if (flyTarget && flyLookAt) {
      const elapsed = performance.now() - flyStart
      const p = Math.min(1, elapsed / flyDuration)
      const ease = 1 - Math.pow(1 - p, 3)
      camera.position.lerpVectors(flyFromPos, flyTarget, ease)
      currentLook.lerpVectors(flyFromLook, flyLookAt, ease)
      camera.lookAt(currentLook)
      if (p >= 1) {
        walker.setLookAt(flyTarget, flyLookAt)
        walker.setEnabled(true)
        flyTarget = null
      }
    } else {
      walker.update(dt)
    }

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
    disposed = true // stops in-flight sculpted-model loads from re-adding to a dead scene
    cancelAnimationFrame(raf)
    walker.dispose()
    renderer.dispose()
    labelMats.forEach((m) => m.dispose())
    labelTextures.forEach((t) => t.dispose())
    emojiMats.forEach((m) => m.dispose())
    emojiTextures.forEach((t) => t.dispose())
    decorationRoots.forEach(disposeObject3D)
    floorTex.dispose()
    tex.dispose()
    wallMat.dispose()
    wallTex.dispose()
    trimMat.dispose()
    accentMats.forEach((m) => m.dispose())
    coreLabelTex.dispose()
    ;(coreLabel.material as THREE.SpriteMaterial).dispose()
    windowTex.dispose()
    if (windowBackdrop) (windowBackdrop.material as THREE.Material).dispose()
  }

  if (typeof window !== 'undefined') {
    ;(window as any).__palaceScene.pickAt = pickAt
    ;(window as any).__palaceScene.hitMeshes = hitMeshes
    ;(window as any).__palaceScene.render = () => composer.render()
  }

  return { setActive, flyTo, pickAt, resize, dispose }
}
