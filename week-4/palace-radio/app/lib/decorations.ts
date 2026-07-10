/**
 * Real 3D presence for the AI's vivid-detail emoji — the small-object
 * counterpart to three-scene.ts's flat emojiTexture() sprite. When the
 * AI's emoji matches one of these primitive-built shapes (spheres,
 * cylinders, cones, tori, boxes — no external models, no AI-generated
 * geometry), three-scene.ts renders the real object at the claimed prop
 * instead of a floating glyph, so the room shows *something built*, not
 * just an icon. Every emoji NOT in this vocabulary falls back to the flat
 * sprite (three-scene.ts owns that fallback branch, not this file) — this
 * is a curated ~36-shape library, not full emoji coverage, by design.
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

function buildCat(): THREE.Object3D {
  const bodyMat = mat('#8a8a8f', { roughness: 0.6, metalness: 0.05 })
  const body = mesh(new THREE.SphereGeometry(0.1, 10, 8), bodyMat)
  body.scale.set(1.3, 0.85, 1)
  const head = mesh(new THREE.SphereGeometry(0.07, 10, 8), bodyMat, [0, 0.09, 0.13])
  const earL = mesh(new THREE.ConeGeometry(0.025, 0.05, 4), bodyMat, [-0.045, 0.16, 0.15], [0, 0, -0.3])
  const earR = mesh(new THREE.ConeGeometry(0.025, 0.05, 4), bodyMat, [0.045, 0.16, 0.15], [0, 0, 0.3])
  const tail = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.18, 6), bodyMat, [0, 0.02, -0.16], [0.9, 0, 0])
  return group(body, head, earL, earR, tail)
}

function buildDog(): THREE.Object3D {
  const bodyMat = mat('#b8895a', { roughness: 0.65, metalness: 0.05 })
  const body = mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat)
  body.scale.set(1.4, 0.9, 1)
  const head = mesh(new THREE.SphereGeometry(0.075, 10, 8), bodyMat, [0, 0.08, 0.15])
  const snout = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 8), bodyMat, [0, 0.06, 0.22], [Math.PI / 2, 0, 0])
  const earL = mesh(new THREE.BoxGeometry(0.025, 0.06, 0.015), bodyMat, [-0.055, 0.12, 0.13], [0, 0, -0.2])
  const earR = mesh(new THREE.BoxGeometry(0.025, 0.06, 0.015), bodyMat, [0.055, 0.12, 0.13], [0, 0, 0.2])
  const tail = mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.16, 6), bodyMat, [0, 0.05, -0.18], [-0.6, 0, 0])
  return group(body, head, snout, earL, earR, tail)
}

function buildFrog(): THREE.Object3D {
  const bodyMat = mat('#5fae4a', { roughness: 0.55, metalness: 0.02, emissive: '#3a7a2a', emissiveIntensity: 0.15 })
  const body = mesh(new THREE.SphereGeometry(0.11, 10, 8), bodyMat)
  body.scale.set(1.2, 0.7, 1.3)
  const eyeL = mesh(new THREE.SphereGeometry(0.025, 8, 6), bodyMat, [-0.05, 0.09, 0.08])
  const eyeR = mesh(new THREE.SphereGeometry(0.025, 8, 6), bodyMat, [0.05, 0.09, 0.08])
  const legL = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 6), bodyMat, [-0.08, -0.05, -0.05], [0, 0, 0.6])
  const legR = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.1, 6), bodyMat, [0.08, -0.05, -0.05], [0, 0, -0.6])
  return group(body, eyeL, eyeR, legL, legR)
}

function buildFish(): THREE.Object3D {
  const bodyMat = mat('#4aa8d8', { roughness: 0.3, metalness: 0.2, emissive: '#4aa8d8', emissiveIntensity: 0.25 })
  const body = mesh(new THREE.SphereGeometry(0.1, 10, 8), bodyMat)
  body.scale.set(1.5, 0.6, 0.7)
  const tailFin = mesh(new THREE.ConeGeometry(0.06, 0.1, 4), bodyMat, [-0.15, 0, 0], [0, 0, -Math.PI / 2])
  tailFin.scale.set(1, 1, 0.2)
  const dorsalFin = mesh(new THREE.ConeGeometry(0.03, 0.05, 4), bodyMat, [0, 0.08, 0])
  return group(body, tailFin, dorsalFin)
}

/** Stylized -- real wings have a curved membrane, not renderable cleanly
 * with rigid primitives at this scale. Four flattened, angled spheres
 * (a big pair + a small pair) plus a thin dark body read as "butterfly." */
function buildButterfly(): THREE.Object3D {
  const wingMat = mat('#e07ad0', { roughness: 0.4, metalness: 0.1, emissive: '#e07ad0', emissiveIntensity: 0.4, transparent: true, opacity: 0.9 })
  const body = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), mat('#2a2018', { roughness: 0.7, metalness: 0 }))
  const wingTopL = mesh(new THREE.SphereGeometry(0.06, 8, 6), wingMat, [-0.05, 0.03, 0], [0, 0.3, 0])
  wingTopL.scale.set(1, 0.6, 0.15)
  const wingTopR = mesh(new THREE.SphereGeometry(0.06, 8, 6), wingMat, [0.05, 0.03, 0], [0, -0.3, 0])
  wingTopR.scale.set(1, 0.6, 0.15)
  const wingBottomL = mesh(new THREE.SphereGeometry(0.04, 8, 6), wingMat, [-0.04, -0.03, 0], [0, 0.3, 0])
  wingBottomL.scale.set(1, 0.6, 0.15)
  const wingBottomR = mesh(new THREE.SphereGeometry(0.04, 8, 6), wingMat, [0.04, -0.03, 0], [0, -0.3, 0])
  wingBottomR.scale.set(1, 0.6, 0.15)
  return group(body, wingTopL, wingTopR, wingBottomL, wingBottomR)
}

/** A curved TubeGeometry along a hand-authored S-curve, not a chain of
 * primitives -- Three.js supports this natively and it reads as a real
 * snake silhouette instead of a lumpy bead chain. */
function buildSnake(): THREE.Object3D {
  const snakeMat = mat('#4a8a4f', { roughness: 0.5, metalness: 0.1 })
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0, 0),
    new THREE.Vector3(-0.06, 0, 0.04),
    new THREE.Vector3(0, 0, -0.03),
    new THREE.Vector3(0.06, 0.015, 0.03),
    new THREE.Vector3(0.12, 0.03, 0),
  ])
  const body = mesh(new THREE.TubeGeometry(curve, 20, 0.018, 8, false), snakeMat)
  const head = mesh(new THREE.SphereGeometry(0.028, 8, 6), snakeMat, [0.12, 0.03, 0])
  return group(body, head)
}

function buildTurtle(): THREE.Object3D {
  const shell = mesh(
    new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mat('#3f7a45', { roughness: 0.6, metalness: 0.05 })
  )
  shell.scale.set(1, 0.6, 1)
  const head = mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('#6a9a5a', { roughness: 0.6, metalness: 0.02 }), [0, 0, 0.11])
  const legMat = mat('#5a8a52', { roughness: 0.6, metalness: 0.02 })
  const legFL = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), legMat, [-0.08, -0.03, 0.06])
  const legFR = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), legMat, [0.08, -0.03, 0.06])
  const legBL = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), legMat, [-0.08, -0.03, -0.06])
  const legBR = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), legMat, [0.08, -0.03, -0.06])
  return group(shell, head, legFL, legFR, legBL, legBR)
}

function buildMouse(): THREE.Object3D {
  const bodyMat = mat('#9a9a9a', { roughness: 0.6, metalness: 0.05 })
  const body = mesh(new THREE.SphereGeometry(0.07, 10, 8), bodyMat)
  body.scale.set(1.2, 0.9, 1)
  const head = mesh(new THREE.SphereGeometry(0.045, 8, 6), bodyMat, [0, 0.02, 0.08])
  const earL = mesh(new THREE.SphereGeometry(0.025, 8, 6), bodyMat, [-0.03, 0.06, 0.08])
  earL.scale.set(1, 1, 0.4)
  const earR = mesh(new THREE.SphereGeometry(0.025, 8, 6), bodyMat, [0.03, 0.06, 0.08])
  earR.scale.set(1, 1, 0.4)
  const tail = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 4), mat('#c9a2a2', { roughness: 0.7, metalness: 0 }), [0, -0.01, -0.1], [1.4, 0, 0])
  return group(body, head, earL, earR, tail)
}

function buildBee(): THREE.Object3D {
  const bodyMat = mat('#f2c230', { roughness: 0.4, metalness: 0.1, emissive: '#f2c230', emissiveIntensity: 0.3 })
  const stripeMat = mat('#2a2018', { roughness: 0.5, metalness: 0.05 })
  const body = mesh(new THREE.SphereGeometry(0.06, 10, 8), bodyMat)
  body.scale.set(1.3, 1, 1)
  const stripe1 = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.018, 10), stripeMat, [-0.02, 0, 0], [0, 0, Math.PI / 2])
  const stripe2 = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 10), stripeMat, [0.02, 0, 0], [0, 0, Math.PI / 2])
  const wingMat = mat('#eaf6ff', { roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.55 })
  const wingL = mesh(new THREE.SphereGeometry(0.035, 8, 6), wingMat, [-0.02, 0.05, 0], [0, 0, 0.4])
  wingL.scale.set(1, 0.3, 0.7)
  const wingR = mesh(new THREE.SphereGeometry(0.035, 8, 6), wingMat, [0.02, 0.05, 0], [0, 0, -0.4])
  wingR.scale.set(1, 0.3, 0.7)
  return group(body, stripe1, stripe2, wingL, wingR)
}

function buildLadybug(): THREE.Object3D {
  const shellMat = mat('#d8302a', { roughness: 0.35, metalness: 0.1, emissive: '#d8302a', emissiveIntensity: 0.3 })
  const body = mesh(new THREE.SphereGeometry(0.08, 10, 8), shellMat)
  body.scale.set(1, 0.7, 1.2)
  const head = mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('#1a1a1a', { roughness: 0.4, metalness: 0.1 }), [0, 0.01, 0.08])
  const spotMat = mat('#1a1a1a', { roughness: 0.4, metalness: 0.1 })
  const spots = [
    [-0.03, 0.05, 0.02],
    [0.03, 0.05, 0.02],
    [-0.035, 0.05, -0.04],
    [0.035, 0.05, -0.04],
    [0, 0.06, -0.08],
  ].map(([x, y, z]) => mesh(new THREE.SphereGeometry(0.012, 6, 6), spotMat, [x, y, z]))
  return group(body, head, ...spots)
}

function buildClock(): THREE.Object3D {
  const faceMat = mat('#f2ead8', { roughness: 0.5, metalness: 0.1 })
  const brassMat = new THREE.MeshStandardMaterial(BRASS)
  const face = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), faceMat, undefined, [Math.PI / 2, 0, 0])
  const rim = mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 16), brassMat, undefined, [Math.PI / 2, 0, 0])
  const handHour = mesh(new THREE.BoxGeometry(0.008, 0.045, 0.01), mat('#2a2018', { roughness: 0.7, metalness: 0 }), [0, 0.02, 0.017], [0, 0, -0.7])
  const handMin = mesh(new THREE.BoxGeometry(0.006, 0.07, 0.008), mat('#2a2018', { roughness: 0.7, metalness: 0 }), [0, 0.03, 0.018], [0, 0, 1.9])
  return group(face, rim, handHour, handMin)
}

function buildFlower(): THREE.Object3D {
  const stem = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.22, 6), mat('#4a8a4f', { roughness: 0.6, metalness: 0.02 }), [0, -0.11, 0])
  const center = mesh(
    new THREE.SphereGeometry(0.025, 8, 6),
    mat('#f2c230', { emissive: '#f2c230', emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.1 }),
    [0, 0.02, 0]
  )
  const petalMat = mat('#f28ab0', { roughness: 0.4, metalness: 0.05, emissive: '#f28ab0', emissiveIntensity: 0.2 })
  const petals: THREE.Mesh[] = []
  for (let i = 0; i < 6; i++) {
    const angle = i * (Math.PI / 3)
    const petal = mesh(new THREE.SphereGeometry(0.03, 8, 6), petalMat, [Math.cos(angle) * 0.04, 0.02, Math.sin(angle) * 0.04], [0, angle, 0])
    petal.scale.set(1.6, 0.5, 1)
    petals.push(petal)
  }
  return group(stem, center, ...petals)
}

/** The classic two-lobes-plus-cone trick for a heart silhouette. */
function buildHeart(): THREE.Object3D {
  const heartMat = mat('#e8304f', { roughness: 0.35, metalness: 0.1, emissive: '#e8304f', emissiveIntensity: 0.35 })
  const lobeL = mesh(new THREE.SphereGeometry(0.06, 10, 8), heartMat, [-0.035, 0.03, 0])
  const lobeR = mesh(new THREE.SphereGeometry(0.06, 10, 8), heartMat, [0.035, 0.03, 0])
  const bottom = mesh(new THREE.ConeGeometry(0.075, 0.11, 10), heartMat, [0, -0.06, 0], [Math.PI, 0, 0])
  return group(lobeL, lobeR, bottom)
}

function buildCrown(): THREE.Object3D {
  const crownMat = new THREE.MeshStandardMaterial(BRASS)
  const base = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.05, 12, 1, true), crownMat)
  const gemMat = mat('#4fd0ff', { emissive: '#4fd0ff', emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.4 })
  const spikes: THREE.Mesh[] = []
  const gems: THREE.Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const angle = i * ((2 * Math.PI) / 5)
    const r = 0.095
    const spike = mesh(new THREE.ConeGeometry(0.02, 0.06, 4), crownMat, [Math.cos(angle) * r, 0.05, Math.sin(angle) * r])
    spikes.push(spike)
    const gem = mesh(new THREE.SphereGeometry(0.012, 6, 6), gemMat, [Math.cos(angle) * r, 0.08, Math.sin(angle) * r])
    gems.push(gem)
  }
  return group(base, ...spikes, ...gems)
}

function buildApple(): THREE.Object3D {
  const body = mesh(new THREE.SphereGeometry(0.1, 12, 10), mat('#d8302a', { roughness: 0.35, metalness: 0.05 }))
  body.scale.set(1, 0.95, 1)
  const stem = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.05, 6), mat('#5a3a20', { roughness: 0.7, metalness: 0 }), [0, 0.1, 0])
  const leaf = mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#4a8a4f', { roughness: 0.5, metalness: 0.02 }), [0.02, 0.11, 0], [0, 0.5, 0])
  leaf.scale.set(1.6, 0.3, 1)
  return group(body, stem, leaf)
}

function buildGift(): THREE.Object3D {
  const boxMat = mat('#c93838', { roughness: 0.5, metalness: 0.05 })
  const ribbonMat = mat('#f2ead8', { roughness: 0.5, metalness: 0.1 })
  const box = mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), boxMat)
  const ribbonV = mesh(new THREE.BoxGeometry(0.03, 0.15, 0.17), ribbonMat)
  const ribbonH = mesh(new THREE.BoxGeometry(0.17, 0.15, 0.03), ribbonMat)
  const bowL = mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 10), ribbonMat, [-0.02, 0.08, 0], [Math.PI / 2, 0.5, 0])
  const bowR = mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 10), ribbonMat, [0.02, 0.08, 0], [Math.PI / 2, -0.5, 0])
  return group(box, ribbonV, ribbonH, bowL, bowR)
}

function buildMushroom(): THREE.Object3D {
  const cap = mesh(
    new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mat('#d8302a', { roughness: 0.5, metalness: 0.02 }),
    [0, 0.02, 0]
  )
  cap.scale.set(1, 0.7, 1)
  const stem = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 10), mat('#f2ead8', { roughness: 0.6, metalness: 0.02 }), [0, -0.09, 0])
  const spotMat = mat('#f2ead8', { roughness: 0.5, metalness: 0 })
  const spots = [
    [0, 0.09, 0],
    [-0.045, 0.06, 0.02],
    [0.045, 0.06, -0.02],
    [0, 0.06, 0.05],
  ].map(([x, y, z]) => mesh(new THREE.SphereGeometry(0.012, 6, 6), spotMat, [x, y, z]))
  return group(cap, stem, ...spots)
}

function buildIceCube(): THREE.Object3D {
  return mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.14),
    mat('#bfe8f5', { roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.55, emissive: '#bfe8f5', emissiveIntensity: 0.2 })
  )
}

/** Stylized -- one sphere covers basketball/soccer-ball/tennis-ball/globe
 * alike; surface markings (seams, continents) aren't worth a texture pass
 * for a claimed-prop decoration this small. */
function buildBall(): THREE.Object3D {
  return mesh(new THREE.SphereGeometry(0.14, 16, 12), mat('#d8722a', { roughness: 0.55, metalness: 0.05 }))
}

/** Three overlapping soft spheres is the standard "cloud" silhouette trick. */
function buildCloud(): THREE.Object3D {
  const cloudMat = mat('#f2f2ea', { roughness: 0.75, metalness: 0.02, emissive: '#dcdcd0', emissiveIntensity: 0.15 })
  const core = mesh(new THREE.SphereGeometry(0.1, 10, 8), cloudMat)
  core.scale.set(1.4, 0.85, 1)
  const left = mesh(new THREE.SphereGeometry(0.075, 8, 6), cloudMat, [-0.1, -0.01, 0])
  left.scale.set(1, 0.85, 1)
  const right = mesh(new THREE.SphereGeometry(0.08, 8, 6), cloudMat, [0.1, 0.015, 0])
  right.scale.set(1, 0.9, 1)
  return group(core, left, right)
}

/** A round head plus a few TubeGeometry-along-a-curve tentacles, reusing
 * buildSnake's curved-tube technique at smaller scale and multiplied --
 * cheaper and more organic-looking than modeling true jointed legs. */
function buildOctopus(): THREE.Object3D {
  const skinMat = mat('#c9539a', { roughness: 0.45, metalness: 0.08, emissive: '#c9539a', emissiveIntensity: 0.2 })
  const head = mesh(new THREE.SphereGeometry(0.095, 12, 10), skinMat, [0, 0.04, 0])
  head.scale.set(1, 0.9, 1)
  const eyeMat = mat('#1a1a1a', { roughness: 0.4, metalness: 0.1 })
  const eyeL = mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeMat, [-0.04, 0.07, 0.075])
  const eyeR = mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeMat, [0.04, 0.07, 0.075])
  const tentacleCount = 5
  const tentacles: THREE.Mesh[] = []
  for (let i = 0; i < tentacleCount; i++) {
    const angle = (i / tentacleCount) * Math.PI * 2
    const baseX = Math.cos(angle) * 0.06
    const baseZ = Math.sin(angle) * 0.06
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(baseX, -0.03, baseZ),
      new THREE.Vector3(baseX * 1.6, -0.1, baseZ * 1.6),
      new THREE.Vector3(baseX * 1.3, -0.16, baseZ * 1.3 + Math.sin(angle) * 0.03),
      new THREE.Vector3(baseX * 1.8, -0.2, baseZ * 1.8),
    ])
    tentacles.push(mesh(new THREE.TubeGeometry(curve, 12, 0.012, 6, false), skinMat))
  }
  return group(head, eyeL, eyeR, ...tentacles)
}

function buildRobot(): THREE.Object3D {
  const bodyMat = mat('#9aa0a8', { roughness: 0.4, metalness: 0.55 })
  const body = mesh(new THREE.BoxGeometry(0.14, 0.16, 0.09), bodyMat)
  const head = mesh(new THREE.BoxGeometry(0.1, 0.09, 0.09), bodyMat, [0, 0.13, 0])
  const eyeMat = mat('#4fd0ff', { emissive: '#4fd0ff', emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.2 })
  const eyeL = mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeMat, [-0.025, 0.135, 0.046])
  const eyeR = mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeMat, [0.025, 0.135, 0.046])
  const antenna = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), bodyMat, [0, 0.2, 0])
  const antennaTip = mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeMat, [0, 0.225, 0])
  const armL = mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), bodyMat, [-0.09, 0.01, 0])
  const armR = mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), bodyMat, [0.09, 0.01, 0])
  return group(body, head, eyeL, eyeR, antenna, antennaTip, armL, armR)
}

/** A single flattened, angled sphere (reusing buildFlower's petal-shape
 * trick: sphere squashed thin on one axis) plus a thin center vein reads
 * as a leaf silhouette without a bespoke extruded shape. */
function buildLeaf(): THREE.Object3D {
  const leafMat = mat('#4a9a4f', { roughness: 0.55, metalness: 0.02, emissive: '#3a7a2a', emissiveIntensity: 0.15 })
  const blade = mesh(new THREE.SphereGeometry(0.11, 10, 8), leafMat, undefined, [0, 0, Math.PI / 5])
  blade.scale.set(1.8, 0.9, 0.12)
  const vein = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 4), mat('#2f6a34', { roughness: 0.6, metalness: 0 }), [0, 0, 0.005], [0, 0, Math.PI / 5])
  return group(blade, vein)
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
  '🐱': buildCat,
  '🐶': buildDog,
  '🐸': buildFrog,
  '🐟': buildFish,
  '🦋': buildButterfly,
  '🐍': buildSnake,
  '🐢': buildTurtle,
  '🐭': buildMouse,
  '🐝': buildBee,
  '🐞': buildLadybug,
  '⏰': buildClock,
  '🌸': buildFlower,
  '❤️': buildHeart,
  '👑': buildCrown,
  '🍎': buildApple,
  '🎁': buildGift,
  '🍄': buildMushroom,
  '🧊': buildIceCube,
  '🏀': buildBall,
  '☁️': buildCloud,
  '🐙': buildOctopus,
  '🤖': buildRobot,
  '🌿': buildLeaf,
}

/**
 * Tier 2 -- real usage showed the exact-match vocabulary above rarely fires:
 * the AI correctly picks the SPECIFIC accurate emoji for its sentence (a
 * flamingo is a flamingo, not our generic bird), and there are effectively
 * unlimited specific emoji it might reach for, so exact-only matching left
 * almost everything falling back to a flat icon even though the AI's picks
 * were perfectly accurate. This routes many more emoji to the CLOSEST
 * existing shape above -- a real object, just not species-exact -- without
 * needing hundreds more bespoke builders. Every value here must be a key
 * that exists in EMOJI_DECORATIONS.
 */
export const EMOJI_ALIASES: Record<string, string> = {
  // bird family -> buildBird
  '🦜': '🐦', // parrot
  '🦩': '🐦', // flamingo
  '🕊️': '🐦', // dove / pigeon
  '🦉': '🐦', // owl
  '🐧': '🐦', // penguin
  '🦆': '🐦', // duck
  '🦅': '🐦', // eagle
  '🦢': '🐦', // swan
  '🐔': '🐦', // chicken
  '🐓': '🐦', // rooster
  '🦃': '🐦', // turkey
  '🦚': '🐦', // peacock
  '🐤': '🐦', // baby chick
  '🐣': '🐦', // hatching chick
  '🐥': '🐦', // front-facing chick

  // small mammal / rodent -> buildMouse
  '🐰': '🐭', // rabbit
  '🐇': '🐭', // rabbit (alt)
  '🐹': '🐭', // hamster
  '🐿️': '🐭', // squirrel
  '🦔': '🐭', // hedgehog

  // generic 4-legged land animal -> buildDog (accepted simplification --
  // same order of stylization as this file's moon/star/gear shapes)
  '🦁': '🐶', // lion
  '🐯': '🐶', // tiger
  '🐅': '🐶', // tiger (alt)
  '🐆': '🐶', // leopard
  '🐻': '🐶', // bear
  '🐮': '🐶', // cow
  '🐄': '🐶', // cow (alt)
  '🐷': '🐶', // pig
  '🐖': '🐶', // pig (alt)
  '🐴': '🐶', // horse
  '🐎': '🐶', // horse (alt)
  '🦊': '🐶', // fox
  '🐺': '🐶', // wolf
  '🦌': '🐶', // deer
  '🐐': '🐶', // goat
  '🐑': '🐶', // sheep
  '🐵': '🐶', // monkey
  '🙈': '🐶', // monkey (see-no-evil)
  '🙉': '🐶', // monkey (hear-no-evil)
  '🙊': '🐶', // monkey (speak-no-evil)
  '🐘': '🐶', // elephant -- a real proportion mismatch, accepted deliberately
  '🦓': '🐶', // zebra
  '🦏': '🐶', // rhino
  '🦛': '🐶', // hippo
  '🐫': '🐶', // camel
  '🐪': '🐶', // dromedary

  // ball family -> buildBall
  '⚽': '🏀',
  '🎾': '🏀',
  '🏐': '🏀', // volleyball
  '🏈': '🏀', // football
  '⚾': '🏀', // baseball
  '🌍': '🏀', // globe (Europe/Africa)
  '🌎': '🏀', // globe (Americas)
  '🌏': '🏀', // globe (Asia/Australia)

  // cloud/sky -> buildCloud
  '🌤️': '☁️',
  '⛅': '☁️',
  '🌥️': '☁️',
  '🌦️': '☁️',
  '🌫️': '☁️', // fog

  // tentacled sea creature -> buildOctopus
  '🦑': '🐙', // squid

  // plant/leaf -> buildLeaf (🌵 cactus and 🌸 flower already exact, not duplicated)
  '🍃': '🌿',
  '☘️': '🌿',
  '🍀': '🌿',
  '🌱': '🌿', // seedling

  // other aquatic -> buildFish
  '🐬': '🐟', // dolphin
  '🐳': '🐟', // whale
  '🐋': '🐟', // whale (alt)
  '🦈': '🐟', // shark
  '🦐': '🐟', // shrimp
  '🦞': '🐟', // lobster
  '🦀': '🐟', // crab

  // round fruit -> buildApple
  '🍊': '🍎', // orange
  '🍋': '🍎', // lemon
  '🍑': '🍎', // peach
  '🍒': '🍎', // cherries
  '🍇': '🍎', // grapes
  '🍐': '🍎', // pear

  // household/misc -> nearest existing shape (deliberately loose)
  '🕹️': '⚙️', // joystick -> gear
  '📱': '⚙️', // phone -> gear
  '🧭': '⏰', // compass -> clock
}

export function buildDecoration(emoji: string): THREE.Object3D | null {
  const exact = EMOJI_DECORATIONS[emoji]
  if (exact) return exact()
  const canonicalKey = EMOJI_ALIASES[emoji]
  const aliased = canonicalKey ? EMOJI_DECORATIONS[canonicalKey] : undefined
  return aliased ? aliased() : null
}
