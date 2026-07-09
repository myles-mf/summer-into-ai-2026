'use client'

import { useEffect } from 'react'
import { encodeBroadcast, testCipherRoundtrip } from '../lib/cipher'
import { claimHouse } from '../lib/claim'
import { HOUSE_PROPS } from '../lib/house'
import { SAMPLE_PALACE } from '../lib/palace'

/** Headless verification harness — mirrors window.__gpt / window.__sov / etc.
 * across our other Summer builds. Pure-logic checks only (no network/audio),
 * so they run instantly in a preview tab where rAF is paused. */
export default function DebugHarness() {
  useEffect(() => {
    ;(window as any).__palace = {
      sample: SAMPLE_PALACE,
      encodeBroadcast,
      claimHouse,
      houseProps: HOUSE_PROPS,
      testCipherRoundtrip: () => testCipherRoundtrip(SAMPLE_PALACE.associations),
      testExactClaim: () => {
        const claimed = claimHouse(SAMPLE_PALACE.associations)
        const words = SAMPLE_PALACE.associations.map((a) => a.locus).sort()
        const got = claimed.map((c) => c.prop.id).sort()
        return claimed.length === SAMPLE_PALACE.associations.length && JSON.stringify(words) === JSON.stringify(got)
      },
      testFallbackClaim: () => {
        // words that don't match any house prop should still claim distinct,
        // valid spots via fallback -- not crash, not duplicate.
        const weird = ['quadratic', 'formula', 'x-squared'].map((w, i) => ({
          locus: w,
          item: 'Item' + i,
          sentence: 'test',
        }))
        const claimed = claimHouse(weird)
        const ids = claimed.map((c) => c.prop.id)
        const allValid = ids.every((id) => HOUSE_PROPS.some((p) => p.id === id))
        const allUnique = new Set(ids).size === ids.length
        return claimed.length === weird.length && allValid && allUnique
      },
      selfTest() {
        const cipherOk = testCipherRoundtrip(SAMPLE_PALACE.associations)
        const exactOk = (this as any).testExactClaim()
        const fallbackOk = (this as any).testFallbackClaim()
        const { spoken, decoder } = encodeBroadcast(SAMPLE_PALACE.associations)
        const spokenOk = spoken.length === SAMPLE_PALACE.associations.length + 2
        const decoderOk = decoder.length === SAMPLE_PALACE.associations.length
        const pass = cipherOk && exactOk && fallbackOk && spokenOk && decoderOk
        // eslint-disable-next-line no-console
        console.log('[palace] selfTest', { cipherOk, exactOk, fallbackOk, spokenOk, decoderOk, pass })
        return pass
      },
    }
  }, [])

  return null
}
