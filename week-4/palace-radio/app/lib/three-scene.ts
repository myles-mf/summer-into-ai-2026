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
import { HOUSE_PROPS } from './house'
import type { ClaimedNode } from './claim'
import { loadModel } from './model-glyph'
import { createWalkControls } from './walk-controls'

export type SceneAPI = {
  setActive: (propId: string | null) => void
  flyTo: (propId: string | null, durationMs?: number) => void
  pickAt: (clientX: number, clientY: number) => string | null
  resize: () => void
  dispose: () => void
}

const AMBER = new THREE.Color('#ffb020')
const TEAL = new THREE.Color('#2be3b8')
const PANEL = new THREE.Color('#123033')

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

/** Real flooring instead of a pure hologram grid -- dark reclaimed-wood
 * planks, each row a slightly different random shade with a few random
 * vertical seam breaks so it doesn't tile as an obvious repeat. */
function woodFloorTexture(): THREE.Texture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#100c09'
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
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** A soft mottled "painted plaster" noise on the walls instead of a flat
 * color -- subtle, so it reads as a real painted surface without competing
 * with the furniture in front of it (same restraint as the trim strips). */
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

function fallbackCrystal(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 0),
    new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.55 })
  )
}

export function createScene(canvas: HTMLCanvasElement, claimed: ClaimedNode[], onPick?: (propId: string) => void): SceneAPI {
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
    collisions: HOUSE_PROPS.filter((p) => p.collisionRadius > 0).map((p) => ({
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

  const floorTex = woodFloorTexture()
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
  const wallTex = plasterTexture('#182527')
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    emissive: '#0a1516',
    emissiveIntensity: 0.5,
    roughness: 0.82,
    metalness: 0.1,
  })
  const trimMat = new THREE.MeshStandardMaterial({
    color: TEAL,
    emissive: TEAL,
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

  scene.add(wallGroup)

  scene.add(new THREE.HemisphereLight(0x2b3a3d, 0x0a0a0d, 0.9))
  const key = new THREE.PointLight(0xfff2d9, 12, 20, 2)
  key.position.set(0, ROOM.height - 0.4, 0)
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

  HOUSE_PROPS.forEach((prop) => {
    const [x, z] = prop.position
    const isClaimed = claimedByPropId.has(prop.id)

    const pulseGroup = new THREE.Group()
    pulseGroup.position.set(x, 0, z)
    pulseGroup.rotation.y = prop.rotationY
    houseGroup.add(pulseGroup)
    if (isClaimed) pulseGroups.set(prop.id, pulseGroup)

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
  core.position.set(0, 1.9, 0)
  scene.add(core)
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
    const mat = new THREE.LineBasicMaterial({ color: PANEL, transparent: true, opacity: 0.5 })
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

  const propById = new Map(HOUSE_PROPS.map((p) => [p.id, p]))

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
      const c = isActive ? TEAL : AMBER
      glowSprites.get(id)!.material.color.copy(c)
      glowSprites.get(id)!.scale.setScalar(isActive ? 1.5 : 1.0)
      labelMats.get(id)!.color.copy(c)
      const arcMat = arcMats.get(id)
      if (arcMat) {
        arcMat.color.copy(isActive ? TEAL : PANEL)
        arcMat.opacity = isActive ? 0.9 : 0.5
      }
      i++
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
    cancelAnimationFrame(raf)
    walker.dispose()
    renderer.dispose()
    labelMats.forEach((m) => m.dispose())
    labelTextures.forEach((t) => t.dispose())
    floorTex.dispose()
    tex.dispose()
    wallMat.dispose()
    wallTex.dispose()
    trimMat.dispose()
    accentMats.forEach((m) => m.dispose())
  }

  if (typeof window !== 'undefined') {
    ;(window as any).__palaceScene.pickAt = pickAt
    ;(window as any).__palaceScene.hitMeshes = hitMeshes
    ;(window as any).__palaceScene.render = () => composer.render()
  }

  return { setActive, flyTo, pickAt, resize, dispose }
}
