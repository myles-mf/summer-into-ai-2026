/**
 * A real library of saved palaces, replacing the old single-slot
 * sessionStorage state in palace.ts (kept there only for the Association
 * type + the harness fixture). Previously, creating a new palace silently
 * overwrote whatever was there before, and it vanished when the tab closed
 * -- neither is fine once someone might want a chemistry palace AND a
 * history palace, both still there next week. localStorage (not
 * sessionStorage) so it survives across sessions.
 *
 * Wing count is always derived from itemCount, never stored -- storing it
 * separately would just be a cache-invalidation bug waiting to happen.
 */
import type { Association } from './palace'

export const PROPS_PER_WING = 16

export type RoomTemplateId = 'station-house' | 'broadcast-loft' | 'greenhouse-archive'

export type PalaceMeta = {
  id: string
  name: string
  templateId: RoomTemplateId
  createdAt: number
  itemCount: number
}

export type StoredPalace = PalaceMeta & {
  associations: Association[]
  loci: string[]
  /** base64 data URL if the user uploaded a room photo (backdrop only) */
  imageDataUrl?: string
}

type PalaceLibrary = { version: 1; palaces: StoredPalace[] }

const KEY = 'palace-radio-library-v1'

export function wingCount(itemCount: number): number {
  return Math.max(1, Math.ceil(itemCount / PROPS_PER_WING))
}

function readLibrary(): PalaceLibrary {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { version: 1, palaces: [] }
    const parsed = JSON.parse(raw) as PalaceLibrary
    if (parsed.version !== 1 || !Array.isArray(parsed.palaces)) return { version: 1, palaces: [] }
    return parsed
  } catch (_) {
    return { version: 1, palaces: [] }
  }
}

function writeLibrary(lib: PalaceLibrary) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lib))
  } catch (_) {
    /* storage unavailable */
  }
}

function toMeta(p: StoredPalace): PalaceMeta {
  return { id: p.id, name: p.name, templateId: p.templateId, createdAt: p.createdAt, itemCount: p.itemCount }
}

export function listPalaces(): PalaceMeta[] {
  return readLibrary()
    .palaces.map(toMeta)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getPalace(id: string): StoredPalace | null {
  return readLibrary().palaces.find((p) => p.id === id) ?? null
}

export function createPalace(input: {
  name: string
  templateId: RoomTemplateId
  associations: Association[]
  loci: string[]
  imageDataUrl?: string
}): StoredPalace {
  const palace: StoredPalace = {
    id: crypto.randomUUID(),
    name: input.name,
    templateId: input.templateId,
    createdAt: Date.now(),
    itemCount: input.associations.length,
    associations: input.associations,
    loci: input.loci,
    imageDataUrl: input.imageDataUrl,
  }
  const lib = readLibrary()
  lib.palaces.push(palace)
  writeLibrary(lib)
  return palace
}

/** Upsert by id -- used both for normal edits (adding a wing) and for the
 * shareable-link flow, where opening someone's link should add their
 * palace to your library without ever touching your own existing ones. */
export function savePalace(palace: StoredPalace) {
  const lib = readLibrary()
  const i = lib.palaces.findIndex((p) => p.id === palace.id)
  const next = { ...palace, itemCount: palace.associations.length }
  if (i === -1) lib.palaces.push(next)
  else lib.palaces[i] = next
  writeLibrary(lib)
}

export function deletePalace(id: string) {
  const lib = readLibrary()
  lib.palaces = lib.palaces.filter((p) => p.id !== id)
  writeLibrary(lib)
}
