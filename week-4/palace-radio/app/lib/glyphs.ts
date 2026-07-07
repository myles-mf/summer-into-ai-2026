/**
 * Small glowing wireframe icons for each beacon so it actually reads as "a
 * door," "a desk," "a window" — not just an interchangeable glowing ball.
 * Built from thin box/cylinder/cone primitives (a "neon schematic" look that
 * matches the pylons/arcs already in the scene), for a curated, bounded
 * vocabulary. Anything outside that vocabulary falls back to an abstract
 * crystal — this is what keeps the scope safe: a room photo can return an
 * open-ended locus label, and we can't hand-model every possible object.
 */
import * as THREE from 'three'

type PartBuilder = (mat: THREE.MeshBasicMaterial) => THREE.Object3D[]

function bar(mat: THREE.MeshBasicMaterial, w: number, h: number, d: number, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.position.set(x, y, z)
  return mesh
}

const GLYPH_BUILDERS: Record<string, PartBuilder> = {
  door: (mat) => {
    const w = 0.46,
      h = 0.85,
      t = 0.05
    return [
      bar(mat, t, h, t, -w / 2, 0, 0),
      bar(mat, t, h, t, w / 2, 0, 0),
      bar(mat, w + t, t, t, 0, h / 2, 0),
      bar(mat, 0.05, 0.05, 0.05, w / 2 - 0.09, -0.05, 0.05), // handle
    ]
  },
  window: (mat) => {
    const s = 0.62,
      t = 0.045
    return [
      bar(mat, s, t, t, 0, s / 2, 0),
      bar(mat, s, t, t, 0, -s / 2, 0),
      bar(mat, t, s, t, -s / 2, 0, 0),
      bar(mat, t, s, t, s / 2, 0, 0),
      bar(mat, t * 0.8, s, t * 0.8, 0, 0, 0),
      bar(mat, s, t * 0.8, t * 0.8, 0, 0, 0),
    ]
  },
  desk: (mat) => {
    const parts = [bar(mat, 0.85, 0.05, 0.45, 0, 0.2, 0)]
    ;[
      [-0.37, -0.17],
      [0.37, -0.17],
      [-0.37, 0.17],
      [0.37, 0.17],
    ].forEach(([lx, lz]) => parts.push(bar(mat, 0.045, 0.45, 0.045, lx, -0.03, lz)))
    return parts
  },
  table: (mat) => GLYPH_BUILDERS.desk(mat),
  bed: (mat) => [
    bar(mat, 0.85, 0.14, 0.5, 0, -0.1, 0),
    bar(mat, 0.85, 0.3, 0.05, 0, 0.08, -0.24),
    bar(mat, 0.28, 0.07, 0.16, -0.24, -0.02, -0.13),
  ],
  shelf: (mat) => {
    const parts = [-0.24, 0, 0.24].map((y) => bar(mat, 0.75, 0.035, 0.28, 0, y, 0))
    parts.push(bar(mat, 0.035, 0.56, 0.035, -0.36, 0, 0.12))
    parts.push(bar(mat, 0.035, 0.56, 0.035, 0.36, 0, 0.12))
    return parts
  },
  bookshelf: (mat) => {
    const parts = [-0.34, -0.1, 0.14, 0.38].map((y) => bar(mat, 0.55, 0.03, 0.24, 0, y, 0))
    parts.push(bar(mat, 0.03, 0.8, 0.03, -0.27, 0.05, 0.1))
    parts.push(bar(mat, 0.03, 0.8, 0.03, 0.27, 0.05, 0.1))
    return parts
  },
  chair: (mat) => {
    const parts = [bar(mat, 0.48, 0.05, 0.48, 0, 0, 0), bar(mat, 0.48, 0.52, 0.05, 0, 0.28, -0.21)]
    ;[
      [-0.19, -0.19],
      [0.19, -0.19],
      [-0.19, 0.19],
      [0.19, 0.19],
    ].forEach(([lx, lz]) => parts.push(bar(mat, 0.04, 0.38, 0.04, lx, -0.21, lz)))
    return parts
  },
  lamp: (mat) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 16), mat)
    base.position.set(0, -0.4, 0)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), mat)
    pole.position.set(0, -0.12, 0)
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 16, 1, true), mat)
    shade.position.set(0, 0.27, 0)
    return [base, pole, shade]
  },
  mirror: (mat) => [new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.032, 10, 28), mat)],
}

const ALIASES: Record<string, string> = {
  nightstand: 'desk',
  dresser: 'shelf',
  drawer: 'shelf',
  drawers: 'shelf',
  couch: 'chair',
  sofa: 'chair',
  armchair: 'chair',
  tv: 'window',
  television: 'window',
  wardrobe: 'shelf',
  closet: 'door',
  cabinet: 'shelf',
  painting: 'mirror',
  frame: 'mirror',
  picture: 'mirror',
}

function fallbackGlyph(mat: THREE.MeshBasicMaterial): THREE.Object3D[] {
  return [new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat)]
}

export type GlyphResult = { group: THREE.Group; material: THREE.MeshBasicMaterial }

export function buildGlyph(locus: string, initialColor: THREE.Color): GlyphResult {
  const material = new THREE.MeshBasicMaterial({ color: initialColor })
  const key = locus.toLowerCase().trim()
  const resolved = GLYPH_BUILDERS[key] ? key : ALIASES[key]
  const builder = resolved ? GLYPH_BUILDERS[resolved] : undefined
  const parts = builder ? builder(material) : fallbackGlyph(material)

  const group = new THREE.Group()
  parts.forEach((p) => group.add(p))
  return { group, material }
}
