/**
 * The Station House: one fixed, fully-furnished room (not spawned per-word).
 * Every prop is always present; a locus WORD doesn't create a new object, it
 * CLAIMS one that's already there (see claim.ts) — closer to how the actual
 * Method of Loci works (you reuse a room you already know), and it means
 * adding more words never needs "new space": you're just lighting up more
 * of a room that was always fully furnished.
 *
 * Positions are tuned for the models' REAL scale (model-glyph.ts's global
 * 2x) inside the walled+ceilinged ROOM (nodes.ts) — a 9x7m studio: bed nook
 * on the west wall, desk nook on the east wall, door (south) and window
 * (north) opposite each other, a living area in the south-west.
 * `collisionRadius` is 0 for wall-mounted/decorative props (door, window,
 * mirror, rug, lamps, plant) — you can't usefully "bump into" a floor lamp,
 * and a 0-radius door is what makes the doorway actually walkable.
 */
export type HouseProp = {
  /** Also doubles as the canonical claim word for this spot. */
  id: string
  model: string
  position: [number, number]
  rotationY: number
  collisionRadius: number
}

export const HOUSE_PROPS: HouseProp[] = [
  { id: 'door', model: 'doorwayOpen.glb', position: [0, 3.4], rotationY: 0, collisionRadius: 0 },
  { id: 'window', model: 'wallWindow.glb', position: [0, -3.4], rotationY: Math.PI, collisionRadius: 0 },
  { id: 'bed', model: 'bedSingle.glb', position: [-3.2, -2.4], rotationY: Math.PI / 2, collisionRadius: 0.9 },
  { id: 'nightstand', model: 'sideTable.glb', position: [-3.2, -0.4], rotationY: Math.PI / 2, collisionRadius: 0.6 },
  { id: 'lamp', model: 'lampRoundFloor.glb', position: [-1.7, -2.9], rotationY: 0, collisionRadius: 0 },
  { id: 'desk', model: 'desk.glb', position: [3.2, -2.4], rotationY: -Math.PI / 2, collisionRadius: 0.9 },
  { id: 'chair', model: 'chairDesk.glb', position: [1.8, -1.2], rotationY: Math.PI, collisionRadius: 0.55 },
  { id: 'deskLamp', model: 'lampSquareTable.glb', position: [3.9, -2.9], rotationY: 0, collisionRadius: 0 },
  { id: 'bookshelf', model: 'bookcaseClosed.glb', position: [4.0, 0.4], rotationY: -Math.PI / 2, collisionRadius: 0.55 },
  { id: 'shelf', model: 'bookcaseOpenLow.glb', position: [4.0, 1.8], rotationY: -Math.PI / 2, collisionRadius: 0.55 },
  { id: 'armchair', model: 'loungeChair.glb', position: [-3.0, 1.6], rotationY: Math.PI / 4, collisionRadius: 0.7 },
  { id: 'table', model: 'table.glb', position: [-1.0, 2.2], rotationY: 0, collisionRadius: 0.85 },
  { id: 'rug', model: 'rugRectangle.glb', position: [-1.8, 1.9], rotationY: 0, collisionRadius: 0 },
  { id: 'mirror', model: 'bathroomMirror.glb', position: [-4.35, 1.0], rotationY: Math.PI / 2, collisionRadius: 0 },
  { id: 'tvStand', model: 'cabinetTelevision.glb', position: [2.0, 3.0], rotationY: Math.PI, collisionRadius: 0.75 },
  { id: 'plant', model: 'pottedPlant.glb', position: [4.0, 3.0], rotationY: 0, collisionRadius: 0 },
]

/** Ordered list of claimable words — this is now the whole "template
 * vocabulary": ask for N associations, get the house's first N spots. */
export const HOUSE_WORDS = HOUSE_PROPS.map((p) => p.id)
