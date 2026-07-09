/**
 * Association type + the headless-harness fixture. Real persistence lives
 * in palace-library.ts now (a real library of named, saved palaces) --
 * this file used to also hold a single-slot sessionStorage state that
 * silently overwrote itself on every new palace, which is exactly the
 * problem palace-library.ts replaced.
 */
export type Association = { locus: string; item: string; sentence: string }

/** Fixture used by the headless self-test harness (window.__palace) */
export const SAMPLE_PALACE = {
  loci: ['door', 'desk', 'window', 'bed', 'shelf'],
  associations: [
    { locus: 'door', item: 'Hydrogen', sentence: 'A single lightbulb hangs where the door should be — one proton, one electron, one filament.' },
    { locus: 'desk', item: 'Helium', sentence: 'Two balloons are tied to the desk lamp, tugging it toward the ceiling.' },
    { locus: 'window', item: 'Lithium', sentence: 'A battery is wedged in the window frame, sparking against the glass.' },
    { locus: 'bed', item: 'Beryllium', sentence: 'A green emerald sits on the pillow, cool and heavy.' },
    { locus: 'shelf', item: 'Boron', sentence: 'A small box of borax detergent is tucked on the shelf.' },
  ] as Association[],
}
