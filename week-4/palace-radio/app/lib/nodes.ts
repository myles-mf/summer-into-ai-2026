/**
 * Beacon-ring layout: turns N loci into 3D positions arranged evenly around
 * a circle (a gentle spiral option keeps a lone locus from stacking on itself).
 * Replaces the old fixed 5-slot LOCUS_POSITIONS map so any locus count works.
 */
export type BeaconNode = {
  locus: string
  index: number
  angle: number
  position: [number, number, number]
}

export function layoutRing(
  loci: string[],
  opts: { radius?: number; y?: number; spiral?: number } = {}
): BeaconNode[] {
  const radius = opts.radius ?? 6
  const baseY = opts.y ?? 0
  const spiral = opts.spiral ?? 0
  const n = Math.max(loci.length, 1)

  return loci.map((locus, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = baseY + i * spiral
    return { locus, index: i, angle, position: [x, y, z] }
  })
}

/** Sanity check for the headless harness: N loci -> N nodes, evenly spaced,
 * all at the configured radius from the center. */
export function testRingLayout(loci: string[], radius = 6): boolean {
  const nodes = layoutRing(loci, { radius })
  if (nodes.length !== loci.length) return false
  return nodes.every((n) => {
    const [x, , z] = n.position
    const r = Math.sqrt(x * x + z * z)
    return Math.abs(r - radius) < 1e-6
  })
}

/** The actual room shell dimensions — kept here so the layout and the scene's
 * floor/walls always agree on the same box. */
export const ROOM = { width: 11, depth: 8.5, height: 4.2 } as const

/** Places loci around the INSIDE perimeter of a rectangular room (like real
 * furniture against the walls) instead of a ring floating in open space. */
export function layoutRoom(
  loci: string[],
  opts: { width?: number; depth?: number; inset?: number } = {}
): BeaconNode[] {
  const width = opts.width ?? ROOM.width
  const depth = opts.depth ?? ROOM.depth
  const inset = opts.inset ?? 1.3
  const n = Math.max(loci.length, 1)

  const halfW = width / 2 - inset
  const halfD = depth / 2 - inset
  const corners: [number, number][] = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ]
  const segLens = corners.map((c, i) => {
    const next = corners[(i + 1) % 4]
    return Math.hypot(next[0] - c[0], next[1] - c[1])
  })
  const total = segLens.reduce((a, b) => a + b, 0)

  return loci.map((locus, i) => {
    const target = (i / n) * total
    let acc = 0
    for (let s = 0; s < 4; s++) {
      const segLen = segLens[s]
      if (target <= acc + segLen || s === 3) {
        const t = segLen === 0 ? 0 : Math.min(1, (target - acc) / segLen)
        const a = corners[s]
        const b = corners[(s + 1) % 4]
        const x = a[0] + (b[0] - a[0]) * t
        const z = a[1] + (b[1] - a[1]) * t
        return { locus, index: i, angle: 0, position: [x, 0, z] as [number, number, number] }
      }
      acc += segLen
    }
    return { locus, index: i, angle: 0, position: [0, 0, 0] }
  })
}

/** Sanity check: N loci -> N nodes, all inside the room's footprint. */
export function testRoomLayout(loci: string[]): boolean {
  const nodes = layoutRoom(loci)
  if (nodes.length !== loci.length) return false
  const halfW = ROOM.width / 2
  const halfD = ROOM.depth / 2
  return nodes.every((n) => Math.abs(n.position[0]) <= halfW && Math.abs(n.position[2]) <= halfD)
}
