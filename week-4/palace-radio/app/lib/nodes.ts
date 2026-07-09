/** The room's floor/collision footprint — furniture positions now live in
 * house.ts (a fixed layout), not a computed ring/perimeter, but the scene
 * still needs a floor size and walking bounds. */
export const ROOM = { width: 11, depth: 8.5, height: 4.2 } as const
