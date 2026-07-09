/**
 * Numbers-station encoding for the Keeper's "Cipher" broadcast mode.
 * Call signs are assigned by index (not a fixed per-label map) so this
 * works for any set of loci the vision model or the template returns.
 */
import type { Association } from './palace'

export const NATO = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
  'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey',
  'X-ray', 'Yankee', 'Zulu',
] as const

const DIGIT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

function numberToPhrase(n: number): string {
  return String(n)
    .split('')
    .map((d) => DIGIT_WORDS[Number(d)])
    .join(' ')
}

/** First 4 letters of the item, spelled as A=1..Z=26, spoken digit by digit. */
export function itemToNumberPhrase(item: string): string {
  const letters = item.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
  if (!letters) return 'Zero.'
  return letters
    .split('')
    .map((ch) => numberToPhrase(ch.charCodeAt(0) - 64) + '.')
    .join(' ')
}

export type DecoderEntry = { code: string; locus: string; item: string; emoji?: string }

export function encodeBroadcast(associations: Association[]): {
  spoken: string[]
  decoder: DecoderEntry[]
} {
  const spoken: string[] = ['Numbers station. Decode the following.']
  const decoder: DecoderEntry[] = []

  associations.forEach((a, i) => {
    const code = NATO[i % NATO.length]
    spoken.push(`${code}. ${itemToNumberPhrase(a.item)}`)
    decoder.push({ code, locus: a.locus, item: a.item, emoji: a.emoji })
  })

  spoken.push('End of transmission.')
  return { spoken, decoder }
}

/** Self-consistency check used by the headless harness — there's no machine
 * decode step by design (a human reads the printed table), so "roundtrip"
 * here means: every association got a unique code, and re-encoding the same
 * item always yields the same phrase (determinism a listener can rely on). */
export function testCipherRoundtrip(associations: Association[]): boolean {
  const { decoder } = encodeBroadcast(associations)
  if (decoder.length !== associations.length) return false
  const codes = new Set(decoder.map((d) => d.code))
  if (codes.size !== decoder.length) return false
  return decoder.every((d, i) => {
    const again = itemToNumberPhrase(d.item)
    return again === itemToNumberPhrase(associations[i].item)
  })
}
