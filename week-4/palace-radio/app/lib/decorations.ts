/**
 * Real 3D presence for the AI's vivid-detail emoji — the small-object
 * counterpart to three-scene.ts's flat emojiTexture() sprite. When the
 * AI's emoji matches one of these primitive-built shapes (spheres,
 * cylinders, cones, tori, boxes — no external models, no AI-generated
 * geometry), three-scene.ts renders the real object at the claimed prop
 * instead of a floating glyph, so the room shows *something built*, not
 * just an icon. Every emoji NOT in this vocabulary falls back to the flat
 * sprite (three-scene.ts owns that fallback branch, not this file) — this
 * is a curated ~18-shape library, not full emoji coverage, by design.
 *
 * No dependency on three-scene.ts (kept a leaf module, like cipher.ts /
 * wav.ts / palace-library.ts). Every builder call constructs fresh
 * geometry/material instances local to that call — no shared singletons —
 * so two claimed props using the same emoji never risk a double-dispose.
 */
import * as THREE from 'three'

export type DecorationBuilder = () => THREE.Object3D

const BRASS = { color: '#c9a24b', roughness: 0.3, metalness: 0.7 }

function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.1, ...opts })
}

function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group()
  children.forEach((c) => g.add(c))
  return g
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, pos?: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, material)
  if (pos) m.position.set(...pos)
  if (rot) m.rotation.set(...rot)
  return m
}

function buildLightbulb(): THREE.Object3D {
  const bulb = mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    mat('#fff4c2', { emissive: '#ffdd66', emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.05 }),
    [0, 0.14, 0]
  )
  const base = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 10), new THREE.MeshStandardMaterial(BRASS), [0, -0.02, 0])
  return group(bulb, base)
}

function buildBalloon(): THREE.Object3D {
  const balloonMat = mat('#ff5577', { roughness: 0.35, metalness: 0.05 })
  const body = mesh(new THREE.SphereGeometry(0.16, 14, 12), balloonMat, [0, 0.2, 0])
  body.scale.set(1, 1.25, 1)
  const knot = mesh(new THREE.ConeGeometry(0.02, 0.04, 6), balloonMat, [0, 0.02, 0])
  const string = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), mat('#cccccc', { roughness: 0.8, metalness: 0 }), [0, -0.33, 0])
  return group(body, knot, string)
}

function buildBattery(): THREE.Object3D {
  const cell = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 12), mat('#2a2a2a', { roughness: 0.5, metalness: 0.3 }))
  const cap = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), new THREE.MeshStandardMaterial(BRASS), [0, 0.18, 0])
  const stripe = mesh(
    new THREE.CylinderGeometry(0.091, 0.091, 0.08, 12),
    mat('#ffd400', { emissive: '#ffd400', emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.1 }),
    [0, 0.02, 0]
  )
  return group(cell, cap, stripe)
}

function buildGem(): THREE.Object3D {
  return mesh(new THREE.OctahedronGeometry(0.18, 0), mat('#4fd0ff', { emissive: '#4fd0ff', emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.4 }))
}

function buildBox(): THREE.Object3D {
  const crate = mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), mat('#b8874f', { roughness: 0.7, metalness: 0.08 }))
  const tapeMat = mat('#e8dcc0', { roughness: 0.6, metalness: 0.05 })
  const tapeV = mesh(new THREE.BoxGeometry(0.06, 0.29, 0.33), tapeMat)
  const tapeH = mesh(new THREE.BoxGeometry(0.33, 0.29, 0.06), tapeMat)
  return group(crate, tapeV, tapeH)
}

function buildBook(): THREE.Object3D {
  const body = mesh(new THREE.BoxGeometry(0.26, 0.05, 0.19), mat('#8a4a3a', { roughness: 0.7, metalness: 0.05 }))
  const pages = mesh(new THREE.BoxGeometry(0.24, 0.035, 0.17), mat('#f2ead8', { roughness: 0.9, metalness: 0 }), [0, 0.006, 0])
  const g = group(body, pages)
  g.rotation.y = 0.15
  return g
}

function buildBird(): THREE.Object3D {
  const bodyMat = mat('#4a90d9', { roughness: 0.55, metalness: 0.05 })
  const body = mesh(new THREE.SphereGeometry(0.09, 10, 8), bodyMat)
  body.scale.set(1, 0.9, 1.3)
  const head = mesh(new THREE.SphereGeometry(0.055, 8, 8), bodyMat, [0, 0.08, 0.1])
  const beak = mesh(new THREE.ConeGeometry(0.02, 0.06, 6), mat('#e0a020', { roughness: 0.4, metalness: 0.3 }), [0, 0.075, 0.16], [Math.PI / 2, 0, 0])
  const tail = mesh(new THREE.ConeGeometry(0.03, 0.12, 6), bodyMat, [0, 0, -0.14], [-Math.PI / 2, 0, 0])
  return group(body, head, beak, tail)
}

/** Stylized -- a literal crescent needs CSG (subtracting one sphere from
 * another), which Three.js core doesn't support without adding a whole new
 * geometry-processing dependency for one shape. A pale glowing sphere reads
 * fine as "moon" in this low-poly, stylized room. */
function buildMoon(): THREE.Object3D {
  return mesh(new THREE.SphereGeometry(0.16, 16, 12), mat('#e8e4d0', { emissive: '#d8d0a8', emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.02 }))
}

/** Stylized -- a true 5-point star needs a hand-authored extrude shape.
 * An octahedron (same family as the gem, differentiated by color/emissive)
 * reads as "a glinting point of light" instead. */
function buildStar(): THREE.Object3D {
  return mesh(new THREE.OctahedronGeometry(0.15, 0), mat('#fff2a8', { emissive: '#ffe066', emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.3 }))
}

/** Stylized -- flame is organic/concave, unrepresentable cleanly with rigid
 * primitives. Two tapered, offset cones suggest a flame silhouette. */
function buildFire(): THREE.Object3D {
  const outer = mesh(new THREE.ConeGeometry(0.11, 0.28, 8), mat('#ff6a1a', { emissive: '#ff6a1a', emissiveIntensity: 0.7, roughness: 0.4, metalness: 0 }), [0, 0.14, 0])
  const inner = mesh(new THREE.ConeGeometry(0.06, 0.16, 8), mat('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.8, roughness: 0.4, metalness: 0 }), [0, 0.13, 0])
  return group(outer, inner)
}

function buildDroplet(): THREE.Object3D {
  const dropMat = mat('#3fa8e8', { emissive: '#3fa8e8', emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 })
  const body = mesh(new THREE.SphereGeometry(0.12, 12, 10), dropMat)
  body.scale.set(1, 1.3, 1)
  const tip = mesh(new THREE.ConeGeometry(0.06, 0.1, 8), dropMat, [0, 0.15, 0])
  return group(body, tip)
}

function buildKey(): THREE.Object3D {
  const brassMat = new THREE.MeshStandardMaterial(BRASS)
  const bow = mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16), brassMat, [0, 0.1, 0])
  const shaft = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 8), brassMat, [0, -0.02, 0])
  const tooth1 = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), brassMat, [0.02, -0.09, 0])
  const tooth2 = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), brassMat, [0.02, -0.13, 0])
  return group(bow, shaft, tooth1, tooth2)
}

function buildCandle(): THREE.Object3D {
  const wax = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.24, 10), mat('#f0e6cc', { roughness: 0.5, metalness: 0.02 }))
  const wick = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 4), mat('#2a2018', { roughness: 0.9, metalness: 0 }), [0, 0.135, 0])
  const flame = mesh(
    new THREE.ConeGeometry(0.02, 0.05, 6),
    mat('#ffb347', { emissive: '#ffb347', emissiveIntensity: 0.85, roughness: 0.4, metalness: 0 }),
    [0, 0.17, 0]
  )
  return group(wax, wick, flame)
}

/** Stylized -- the note glyph (flag + beam) is a 2D-typographic form, not
 * naturally a solid. A filled "notehead" + a stem reads as a music note in
 * silhouette without modeling the flag curl. */
function buildMusicalNote(): THREE.Object3D {
  const noteMat = mat('#c9a2ff', { emissive: '#c9a2ff', emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.15 })
  const head = mesh(new THREE.SphereGeometry(0.06, 10, 8), noteMat)
  head.scale.set(1.15, 0.85, 1)
  const stem = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6), noteMat, [0.06, 0.14, 0])
  return group(head, stem)
}

function buildMagnet(): THREE.Object3D {
  const body = mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16, Math.PI), mat('#c93838', { roughness: 0.45, metalness: 0.3 }), undefined, [Math.PI / 2, 0, Math.PI])
  const tipMat = mat('#d8d8d8', { roughness: 0.3, metalness: 0.75 })
  const tipA = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), tipMat, [-0.11, 0, 0])
  const tipB = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), tipMat, [0.11, 0, 0])
  return group(body, tipA, tipB)
}

function buildCactus(): THREE.Object3D {
  const bodyMat = mat('#4a8a4f', { roughness: 0.75, metalness: 0.02 })
  const body = mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.32, 8), bodyMat)
  const armL = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.14, 6), bodyMat, [-0.08, 0.05, 0], [0, 0, 0.4])
  const armR = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.14, 6), bodyMat, [0.08, 0.1, 0], [0, 0, -0.4])
  const pot = mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.08, 10), mat('#a8623f', { roughness: 0.8, metalness: 0.05 }), [0, -0.2, 0])
  return group(body, armL, armR, pot)
}

/** Stylized -- true gear teeth need a custom extruded profile. A torus rim
 * with 8 small radial boxes reads clearly as a gear/cog silhouette. */
function buildGear(): THREE.Object3D {
  const gearMat = mat('#9aa0a8', { roughness: 0.35, metalness: 0.6 })
  const rim = mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), gearMat, undefined, [Math.PI / 2, 0, 0])
  const hub = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), gearMat, undefined, [Math.PI / 2, 0, 0])
  const teeth: THREE.Mesh[] = []
  for (let i = 0; i < 8; i++) {
    const angle = i * (Math.PI / 4)
    const tooth = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.05), gearMat, [Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12], [0, angle, 0])
    teeth.push(tooth)
  }
  return group(rim, hub, ...teeth)
}

function buildBell(): THREE.Object3D {
  const brassMat = new THREE.MeshStandardMaterial({ ...BRASS, metalness: 0.65 })
  const body = mesh(new THREE.ConeGeometry(0.1, 0.16, 12, 1, true), brassMat, [0, 0.02, 0])
  const rim = mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 16), brassMat, [0, -0.06, 0], [Math.PI / 2, 0, 0])
  const clapper = mesh(new THREE.SphereGeometry(0.02, 8, 8), mat('#5a4a2a', { roughness: 0.5, metalness: 0.3 }), [0, -0.1, 0])
  const loop = mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 10), brassMat, [0, 0.11, 0])
  return group(body, rim, clapper, loop)
}

export const EMOJI_DECORATIONS: Record<string, DecorationBuilder> = {
  '💡': buildLightbulb,
  '🎈': buildBalloon,
  '🔋': buildBattery,
  '💎': buildGem,
  '📦': buildBox,
  '📖': buildBook,
  '🐦': buildBird,
  '🌙': buildMoon,
  '⭐': buildStar,
  '🔥': buildFire,
  '💧': buildDroplet,
  '🔑': buildKey,
  '🕯️': buildCandle,
  '🎵': buildMusicalNote,
  '🧲': buildMagnet,
  '🌵': buildCactus,
  '⚙️': buildGear,
  '🔔': buildBell,
}

export function buildDecoration(emoji: string): THREE.Object3D | null {
  const builder = EMOJI_DECORATIONS[emoji]
  return builder ? builder() : null
}
