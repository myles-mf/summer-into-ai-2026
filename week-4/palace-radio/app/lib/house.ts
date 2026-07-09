/**
 * The Station House: one fixed, fully-furnished room (not spawned per-word).
 * Every prop is always present; a locus WORD doesn't create a new object, it
 * CLAIMS one that's already there (see claim.ts) — closer to how the actual
 * Method of Loci works (you reuse a room you already know), and it means
 * adding more words never needs "new space": you're just lighting up more
 * of a room that was always fully furnished.
 */
export type HouseProp = {
  /** Also doubles as the canonical claim word for this spot. */
  id: string
  model: string
  position: [number, number]
  rotationY: number
}

export const HOUSE_PROPS: HouseProp[] = [
  { id: 'door', model: 'doorwayOpen.glb', position: [0, 3.8], rotationY: 0 },
  { id: 'window', model: 'wallWindow.glb', position: [0, -3.8], rotationY: Math.PI },
  { id: 'bed', model: 'bedSingle.glb', position: [-3.6, -2.9], rotationY: Math.PI / 2 },
  { id: 'nightstand', model: 'sideTable.glb', position: [-2.0, -3.2], rotationY: Math.PI / 2 },
  { id: 'lamp', model: 'lampRoundFloor.glb', position: [-0.6, -1.6], rotationY: 0 },
  { id: 'desk', model: 'desk.glb', position: [4.1, -3.2], rotationY: -Math.PI / 2 },
  { id: 'chair', model: 'chairDesk.glb', position: [2.2, -1.2], rotationY: Math.PI },
  { id: 'deskLamp', model: 'lampSquareTable.glb', position: [4.9, -3.3], rotationY: 0 },
  { id: 'bookshelf', model: 'bookcaseClosed.glb', position: [4.9, -0.2], rotationY: -Math.PI / 2 },
  { id: 'shelf', model: 'bookcaseOpenLow.glb', position: [4.9, 1.5], rotationY: -Math.PI / 2 },
  { id: 'armchair', model: 'loungeChair.glb', position: [-3.8, 1.6], rotationY: Math.PI / 4 },
  { id: 'table', model: 'table.glb', position: [-2.0, 2.3], rotationY: 0 },
  { id: 'rug', model: 'rugRectangle.glb', position: [-0.8, 0.2], rotationY: 0 },
  { id: 'mirror', model: 'bathroomMirror.glb', position: [-4.9, -1.2], rotationY: Math.PI / 2 },
  { id: 'tvStand', model: 'cabinetTelevision.glb', position: [1.6, 3.3], rotationY: Math.PI },
  { id: 'plant', model: 'pottedPlant.glb', position: [4.9, 3.4], rotationY: 0 },
]

/** Ordered list of claimable words — this is now the whole "template
 * vocabulary": ask for N associations, get the house's first N spots. */
export const HOUSE_WORDS = HOUSE_PROPS.map((p) => p.id)
