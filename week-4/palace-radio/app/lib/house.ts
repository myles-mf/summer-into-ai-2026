/**
 * Room templates: every saved palace picks one of these at creation time.
 * A template is one fixed, fully-furnished room (not spawned per-word) --
 * every prop is always present; a locus WORD doesn't create a new object,
 * it CLAIMS one that's already there (see claim.ts), closer to how the
 * actual Method of Loci works (you reuse a room you already know).
 *
 * All templates share the same 16 canonical prop ids -- they re-lay-out and
 * re-color, they don't rename -- so claim.ts's ALIASES map and the AI's loci
 * vocabulary never need to branch per template.
 *
 * `collisionRadius` is 0 for wall-mounted/decorative props (door, window,
 * mirror, rug, lamps, plant) -- you can't usefully "bump into" a floor lamp,
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

export type RoomPalette = {
  floorBase: string
  wallBase: string
  /** Replaces the old hardcoded TEAL -- baseboard/crown/accent trim, arcs, active-state tint. */
  trim: string
}

export type RoomTemplateId = 'station-house' | 'broadcast-loft' | 'greenhouse-archive'

export type RoomTemplate = {
  id: RoomTemplateId
  name: string
  props: HouseProp[]
  palette: RoomPalette
}

const STATION_HOUSE: RoomTemplate = {
  id: 'station-house',
  name: 'The Station House',
  // Positions tuned for the models' REAL scale (model-glyph.ts's global 2x)
  // inside the walled+ceilinged ROOM (nodes.ts) -- a 9x7m studio: bed nook
  // on the west wall, desk nook on the east wall, door (south) and window
  // (north) opposite each other, a living area in the south-west.
  props: [
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
  ],
  palette: { floorBase: '#100c09', wallBase: '#182527', trim: '#2be3b8' },
}

const BROADCAST_LOFT: RoomTemplate = {
  id: 'broadcast-loft',
  name: 'Broadcast Loft',
  // Studio/DJ-booth feel: a broadcast console on the east wall (desk+chair+
  // deskLamp) flanked by a "record wall" (both bookcases), a lounge pit
  // center-west, a daybed nook on the west wall instead of a full bed
  // corner, tvStand repurposed as a mixing-console stand near the door.
  props: [
    { id: 'door', model: 'doorwayOpen.glb', position: [0, 3.4], rotationY: 0, collisionRadius: 0 },
    { id: 'window', model: 'wallWindow.glb', position: [0, -3.4], rotationY: Math.PI, collisionRadius: 0 },
    { id: 'bed', model: 'bedSingle.glb', position: [-3.4, -2.2], rotationY: Math.PI / 2, collisionRadius: 0.9 },
    { id: 'nightstand', model: 'sideTable.glb', position: [-3.4, -0.3], rotationY: Math.PI / 2, collisionRadius: 0.6 },
    { id: 'lamp', model: 'lampRoundFloor.glb', position: [-1.9, -2.9], rotationY: 0, collisionRadius: 0 },
    { id: 'desk', model: 'desk.glb', position: [3.2, -1.0], rotationY: -Math.PI / 2, collisionRadius: 0.9 },
    { id: 'chair', model: 'chairDesk.glb', position: [1.4, -0.6], rotationY: Math.PI / 2, collisionRadius: 0.55 },
    { id: 'deskLamp', model: 'lampSquareTable.glb', position: [3.9, -1.7], rotationY: 0, collisionRadius: 0 },
    { id: 'bookshelf', model: 'bookcaseClosed.glb', position: [4.0, -2.6], rotationY: -Math.PI / 2, collisionRadius: 0.55 },
    { id: 'shelf', model: 'bookcaseOpenLow.glb', position: [4.0, 0.6], rotationY: -Math.PI / 2, collisionRadius: 0.55 },
    { id: 'armchair', model: 'loungeChair.glb', position: [-2.5, 1.4], rotationY: Math.PI / 4, collisionRadius: 0.7 },
    { id: 'table', model: 'table.glb', position: [-0.6, 2.2], rotationY: 0, collisionRadius: 0.85 },
    { id: 'rug', model: 'rugRectangle.glb', position: [-1.6, 1.5], rotationY: 0, collisionRadius: 0 },
    { id: 'mirror', model: 'bathroomMirror.glb', position: [-4.35, 2.6], rotationY: Math.PI / 2, collisionRadius: 0 },
    { id: 'tvStand', model: 'cabinetTelevision.glb', position: [1.8, 3.0], rotationY: Math.PI, collisionRadius: 0.75 },
    { id: 'plant', model: 'pottedPlant.glb', position: [4.0, 3.0], rotationY: 0, collisionRadius: 0 },
  ],
  palette: { floorBase: '#0c0c0e', wallBase: '#1a1420', trim: '#ff3d81' },
}

const GREENHOUSE_ARCHIVE: RoomTemplate = {
  id: 'greenhouse-archive',
  name: 'Greenhouse Archive',
  // Warm reading-room feel: table+armchair+rug as the dominant central
  // living zone, both bookcases doubled along the east wall as a real
  // archive, desk moved to a window-side writing nook, bed kept as a
  // simple corner cot, plant given a prominent window-side placement.
  props: [
    { id: 'door', model: 'doorwayOpen.glb', position: [0, 3.4], rotationY: 0, collisionRadius: 0 },
    { id: 'window', model: 'wallWindow.glb', position: [0, -3.4], rotationY: Math.PI, collisionRadius: 0 },
    { id: 'bed', model: 'bedSingle.glb', position: [-3.4, 2.6], rotationY: Math.PI / 2, collisionRadius: 0.9 },
    { id: 'nightstand', model: 'sideTable.glb', position: [-3.4, 0.7], rotationY: Math.PI / 2, collisionRadius: 0.6 },
    { id: 'lamp', model: 'lampRoundFloor.glb', position: [-2.0, 1.6], rotationY: 0, collisionRadius: 0 },
    { id: 'desk', model: 'desk.glb', position: [-3.2, -2.8], rotationY: 0, collisionRadius: 0.9 },
    { id: 'chair', model: 'chairDesk.glb', position: [-2.0, -1.2], rotationY: Math.PI, collisionRadius: 0.55 },
    { id: 'deskLamp', model: 'lampSquareTable.glb', position: [-2.2, -3.1], rotationY: 0, collisionRadius: 0 },
    { id: 'bookshelf', model: 'bookcaseClosed.glb', position: [4.0, -3.0], rotationY: -Math.PI / 2, collisionRadius: 0.55 },
    { id: 'shelf', model: 'bookcaseOpenLow.glb', position: [4.0, -1.5], rotationY: -Math.PI / 2, collisionRadius: 0.55 },
    { id: 'armchair', model: 'loungeChair.glb', position: [-1.2, 0.6], rotationY: Math.PI / 4, collisionRadius: 0.7 },
    { id: 'table', model: 'table.glb', position: [0.6, 1.4], rotationY: 0, collisionRadius: 0.85 },
    { id: 'rug', model: 'rugRectangle.glb', position: [-0.3, 1.0], rotationY: 0, collisionRadius: 0 },
    { id: 'mirror', model: 'bathroomMirror.glb', position: [4.35, 2.8], rotationY: -Math.PI / 2, collisionRadius: 0 },
    { id: 'tvStand', model: 'cabinetTelevision.glb', position: [2.0, 3.0], rotationY: Math.PI, collisionRadius: 0.75 },
    { id: 'plant', model: 'pottedPlant.glb', position: [2.0, -3.1], rotationY: 0, collisionRadius: 0 },
  ],
  palette: { floorBase: '#3d2b12', wallBase: '#dce3c4', trim: '#c9a24b' },
}

const TEMPLATES: Partial<Record<RoomTemplateId, RoomTemplate>> = {
  'station-house': STATION_HOUSE,
  'broadcast-loft': BROADCAST_LOFT,
  'greenhouse-archive': GREENHOUSE_ARCHIVE,
}

export function getTemplate(id: RoomTemplateId): RoomTemplate {
  const t = TEMPLATES[id]
  if (!t) throw new Error(`Room template "${id}" is not built yet`)
  return t
}

export function listTemplates(): RoomTemplate[] {
  return Object.values(TEMPLATES) as RoomTemplate[]
}

export const DEFAULT_TEMPLATE_ID: RoomTemplateId = 'station-house'

/** Ordered list of claimable words for a template -- this is the "template
 * vocabulary" for the AI prompt: ask for N associations, get the room's
 * first N spots. */
export function templateLoci(id: RoomTemplateId): string[] {
  return getTemplate(id).props.map((p) => p.id)
}

/** Back-compat: the canonical prop-id vocabulary is the same across every
 * template (see file header), so any one template's ids represent it. */
export const HOUSE_WORDS = STATION_HOUSE.props.map((p) => p.id)

/** Real-world Y height (meters, post GLOBAL_SCALE -- see model-glyph.ts) a
 * decoration should sit at to read as "resting on this prop" rather than
 * floating near the ceiling. One table shared across every template, since
 * they all use the same canonical prop-id vocabulary and the same models.
 * `bed`/`nightstand`/`desk`/`table`/`tvStand`/`shelf`/`bookshelf` are real
 * measured top-surface heights (a scratch GLTF bounding-box script parsed
 * each .glb's raw geometry). `chair`/`armchair` are engineering ESTIMATES,
 * not measurements: their models' bounding-box max-Y is the backrest top,
 * not the seat plane, which the measurement script can't isolate -- these
 * two are the most likely to need a follow-up numeric tweak after a visual
 * check. The rest aren't real "surfaces" (door, window, lamp, deskLamp,
 * mirror, rug) -- reasonable fixed placements (eye-level near wall fixtures,
 * near a lamp's shade, just above the floor for a rug). */
export const PROP_SURFACE_Y: Record<string, number> = {
  door: 1.3,
  window: 1.1,
  bed: 0.75,
  nightstand: 0.77,
  lamp: 1.4,
  desk: 0.77,
  chair: 0.48,
  deskLamp: 0.55,
  bookshelf: 1.7,
  shelf: 0.8,
  armchair: 0.42,
  table: 0.65,
  rug: 0.05,
  mirror: 1.4,
  tvStand: 0.62,
  plant: 0.85,
}

// NOTE: a PROP_XZ_OFFSET table briefly lived here (commit 9d2f17c),
// correcting for "corner-pivoted" models measured from the raw .glb files.
// It was wrong-premised and has been removed: model-glyph.ts's loadModel()
// already re-centers every model on its pivot at load time
// (instance.position.x -= center.x, etc.), so the rendered furniture was
// never off-center -- the offsets pushed decorations onto each piece's EDGE
// (offset == exactly half the footprint). Decorations belong at the raw
// prop position.
