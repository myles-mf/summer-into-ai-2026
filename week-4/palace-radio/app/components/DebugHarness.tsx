'use client'

import { useEffect } from 'react'
import { encodeBroadcast, testCipherRoundtrip } from '../lib/cipher'
import { layoutRing, testRingLayout } from '../lib/nodes'
import { SAMPLE_PALACE } from '../lib/palace'

/** Headless verification harness — mirrors window.__gpt / window.__sov / etc.
 * across our other Summer builds. Pure-logic checks only (no network/audio),
 * so they run instantly in a preview tab where rAF is paused. */
export default function DebugHarness() {
  useEffect(() => {
    ;(window as any).__palace = {
      sample: SAMPLE_PALACE,
      encodeBroadcast,
      layoutRing,
      testCipherRoundtrip: () => testCipherRoundtrip(SAMPLE_PALACE.associations),
      testRingLayout: () => testRingLayout(SAMPLE_PALACE.loci),
      selfTest() {
        const cipherOk = testCipherRoundtrip(SAMPLE_PALACE.associations)
        const ringOk = testRingLayout(SAMPLE_PALACE.loci)
        const nodes = layoutRing(SAMPLE_PALACE.loci)
        const nodeCountOk = nodes.length === SAMPLE_PALACE.loci.length
        const { spoken, decoder } = encodeBroadcast(SAMPLE_PALACE.associations)
        const spokenOk = spoken.length === SAMPLE_PALACE.associations.length + 2
        const decoderOk = decoder.length === SAMPLE_PALACE.associations.length
        const pass = cipherOk && ringOk && nodeCountOk && spokenOk && decoderOk
        // eslint-disable-next-line no-console
        console.log('[palace] selfTest', { cipherOk, ringOk, nodeCountOk, spokenOk, decoderOk, pass })
        return pass
      },
    }
  }, [])

  return null
}
