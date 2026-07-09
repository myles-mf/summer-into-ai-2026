/** The room's floor/wall/collision footprint — furniture positions now live
 * in house.ts (a fixed layout), not a computed ring/perimeter. Sized to real
 * furniture scale (see model-glyph.ts): a 9m x 7m studio with a human-scale
 * 2.8m ceiling, not the old abstract 4.2m void-height. */
export const ROOM = { width: 9, depth: 7, height: 2.8 } as const
