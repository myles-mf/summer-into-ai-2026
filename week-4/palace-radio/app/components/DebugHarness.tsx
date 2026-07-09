'use client'

import { useEffect } from 'react'
import { encodeBroadcast, testCipherRoundtrip } from '../lib/cipher'
import { claimHouse } from '../lib/claim'
import { getTemplate, listTemplates } from '../lib/house'
import { SAMPLE_PALACE, type Association } from '../lib/palace'
import { createPalace, getPalace, listPalaces, deletePalace, PROPS_PER_WING, wingCount } from '../lib/palace-library'

const STATION = getTemplate('station-house')

/** Headless verification harness — mirrors window.__gpt / window.__sov / etc.
 * across our other Summer builds. Pure-logic checks only (no network/audio),
 * so they run instantly in a preview tab where rAF is paused. */
export default function DebugHarness() {
  useEffect(() => {
    ;(window as any).__palace = {
      sample: SAMPLE_PALACE,
      encodeBroadcast,
      claimHouse,
      getTemplate,
      listTemplates,
      houseProps: STATION.props,
      testCipherRoundtrip: () => testCipherRoundtrip(SAMPLE_PALACE.associations),
      testExactClaim: () => {
        const claimed = claimHouse(SAMPLE_PALACE.associations, STATION, 0)
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
        const claimed = claimHouse(weird, STATION, 0)
        const ids = claimed.map((c) => c.prop.id)
        const allValid = ids.every((id) => STATION.props.some((p) => p.id === id))
        const allUnique = new Set(ids).size === ids.length
        return claimed.length === weird.length && allValid && allUnique
      },
      testWingSplit: () => {
        // A 40-item palace should span 3 wings (16+16+8), every item claimed
        // exactly once across all wings combined, no prop id repeated within
        // a single wing -- the actual "no data silently dropped" guarantee.
        const totalItems = 40
        const fixture: Association[] = Array.from({ length: totalItems }, (_, i) => ({
          locus: 'item' + i,
          item: 'Item ' + i,
          sentence: 'test',
        }))
        const wings = wingCount(totalItems)
        const wingsOk = wings === Math.ceil(totalItems / PROPS_PER_WING)
        const allClaimed: string[] = []
        let noIntraWingDupes = true
        for (let w = 0; w < wings; w++) {
          const claimed = claimHouse(fixture, STATION, w)
          const ids = claimed.map((c) => c.prop.id)
          if (new Set(ids).size !== ids.length) noIntraWingDupes = false
          claimed.forEach((c) => allClaimed.push(c.association.item))
        }
        const noneDropped = allClaimed.length === totalItems
        const allUniqueItems = new Set(allClaimed).size === totalItems
        return wingsOk && noIntraWingDupes && noneDropped && allUniqueItems
      },
      testLibraryRoundtrip: () => {
        const before = listPalaces().length
        const created = createPalace({
          name: '__test__',
          templateId: 'station-house',
          associations: SAMPLE_PALACE.associations,
          loci: SAMPLE_PALACE.loci,
        })
        const afterCreate = listPalaces()
        const foundInList = afterCreate.some((p) => p.id === created.id)
        const fetched = getPalace(created.id)
        const fetchedOk = fetched !== null && fetched.name === '__test__' && fetched.associations.length === SAMPLE_PALACE.associations.length
        deletePalace(created.id)
        const afterDelete = listPalaces()
        const removedFromList = !afterDelete.some((p) => p.id === created.id)
        const fetchedAfterDelete = getPalace(created.id)
        const countRestored = afterDelete.length === before
        return foundInList && fetchedOk && removedFromList && fetchedAfterDelete === null && countRestored
      },
      testTemplateIdIntegrity: () => {
        const templates = listTemplates()
        const allSixteen = templates.every((t) => t.props.length === PROPS_PER_WING)
        const vocab = templates.map((t) => t.props.map((p) => p.id).sort().join(','))
        const sameVocabAcrossAll = new Set(vocab).size <= 1
        return allSixteen && sameVocabAcrossAll
      },
      selfTest() {
        const cipherOk = testCipherRoundtrip(SAMPLE_PALACE.associations)
        const exactOk = (this as any).testExactClaim()
        const fallbackOk = (this as any).testFallbackClaim()
        const wingOk = (this as any).testWingSplit()
        const libraryOk = (this as any).testLibraryRoundtrip()
        const templateOk = (this as any).testTemplateIdIntegrity()
        const { spoken, decoder } = encodeBroadcast(SAMPLE_PALACE.associations)
        const spokenOk = spoken.length === SAMPLE_PALACE.associations.length + 2
        const decoderOk = decoder.length === SAMPLE_PALACE.associations.length
        const pass = cipherOk && exactOk && fallbackOk && wingOk && libraryOk && templateOk && spokenOk && decoderOk
        // eslint-disable-next-line no-console
        console.log('[palace] selfTest', { cipherOk, exactOk, fallbackOk, wingOk, libraryOk, templateOk, spokenOk, decoderOk, pass })
        return pass
      },
    }
  }, [])

  return null
}
