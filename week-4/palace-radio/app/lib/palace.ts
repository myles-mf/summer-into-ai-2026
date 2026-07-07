/**
 * Palace state. Loci come either from the fixed template or from the vision
 * model's read of an uploaded room photo; the photo itself (if any) is kept
 * only as a soft backdrop texture behind the 3D beacon ring, never pinned to.
 */
export const TEMPLATE_LOCI = ['door', 'desk', 'window', 'bed', 'shelf'] as const

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
