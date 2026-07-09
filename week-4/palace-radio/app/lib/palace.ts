/**
 * Palace state. "Loci" are words that CLAIM a spot in the fixed house
 * (house.ts) — they don't spawn anything. The template vocabulary is just
 * the house's own prop names, in house tour order; a topic/list can also be
 * open-ended (any words), which claims remaining house spots in order (see
 * claim.ts). Photo upload still runs the vision model for personalization,
 * but its words resolve against the same fixed house, not a reconstruction
 * of the photographed room.
 */
import { HOUSE_WORDS } from './house'

export const TEMPLATE_LOCI = HOUSE_WORDS

export type Association = { locus: string; item: string; sentence: string }

export type PalaceState = {
  associations: Association[]
  loci: string[]
  /** base64 data URL if the user uploaded a room photo (backdrop only) */
  imageDataUrl?: string
}

const KEY = 'palace-radio-state'

export function savePalace(state: PalaceState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch (_) {
    /* storage unavailable */
  }
}

export function loadPalace(): PalaceState | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PalaceState
    if (!Array.isArray(parsed.associations) || !Array.isArray(parsed.loci)) return null
    return parsed
  } catch (_) {
    return null
  }
}

export function clearPalace() {
  try {
    sessionStorage.removeItem(KEY)
  } catch (_) {}
}

/** Fixture used by the headless self-test harness (window.__palace) */
export const SAMPLE_PALACE: PalaceState = {
  loci: ['door', 'desk', 'window', 'bed', 'shelf'],
  associations: [
    { locus: 'door', item: 'Hydrogen', sentence: 'A single lightbulb hangs where the door should be — one proton, one electron, one filament.' },
    { locus: 'desk', item: 'Helium', sentence: 'Two balloons are tied to the desk lamp, tugging it toward the ceiling.' },
    { locus: 'window', item: 'Lithium', sentence: 'A battery is wedged in the window frame, sparking against the glass.' },
    { locus: 'bed', item: 'Beryllium', sentence: 'A green emerald sits on the pillow, cool and heavy.' },
    { locus: 'shelf', item: 'Boron', sentence: 'A small box of borax detergent is tucked on the shelf.' },
  ],
}
