/**
 * Assigns each memorized item to a spot in the fixed house rather than
 * spawning new geometry per word — closer to how Method of Loci actually
 * works (you reuse a room you already know). Word matches its namesake prop
 * first; anything else (an open-ended word from a photo, or more items than
 * the house has named spots for) claims the next unclaimed prop in house
 * order, so a topic that has nothing to do with furniture still works.
 */
import { HOUSE_PROPS, type HouseProp } from './house'
import type { Association } from './palace'

export type ClaimedNode = {
  prop: HouseProp
  association: Association
}

const ALIASES: Record<string, string> = {
  dresser: 'tvStand',
  drawer: 'nightstand',
  drawers: 'nightstand',
  couch: 'armchair',
  sofa: 'armchair',
  tv: 'tvStand',
  television: 'tvStand',
  wardrobe: 'bookshelf',
  closet: 'door',
  cabinet: 'bookshelf',
  painting: 'mirror',
  frame: 'mirror',
  picture: 'mirror',
  carpet: 'rug',
  floorlamp: 'lamp',
  tablelamp: 'deskLamp',
}

function resolveWord(word: string): string {
  const key = word.toLowerCase().trim()
  return ALIASES[key] ?? key
}

/** Word-match first, then fall back to the next unclaimed prop in house
 * tour order. Associations beyond the house's prop count are dropped —
 * the whole point of a fixed house is that it doesn't need new space. */
export function claimHouse(associations: Association[]): ClaimedNode[] {
  const unclaimed = new Set(HOUSE_PROPS.map((p) => p.id))
  const byId = new Map(HOUSE_PROPS.map((p) => [p.id, p]))
  const claimed: ClaimedNode[] = []
  const deferred: Association[] = []

  for (const a of associations) {
    const word = resolveWord(a.locus)
    if (unclaimed.has(word)) {
      claimed.push({ prop: byId.get(word)!, association: a })
      unclaimed.delete(word)
    } else {
      deferred.push(a)
    }
  }

  const tourOrder: HouseProp[] = HOUSE_PROPS.filter((p) => unclaimed.has(p.id))
  for (const a of deferred) {
    const prop = tourOrder.shift()
    if (!prop) break
    claimed.push({ prop, association: a })
  }

  const order = new Map(HOUSE_PROPS.map((p, i) => [p.id, i]))
  claimed.sort((a, b) => order.get(a.prop.id)! - order.get(b.prop.id)!)
  return claimed
}
