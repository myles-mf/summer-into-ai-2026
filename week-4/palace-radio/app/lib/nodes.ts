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
