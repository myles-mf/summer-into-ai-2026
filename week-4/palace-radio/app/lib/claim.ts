/**
 * Assigns each memorized item to a spot in a room template rather than
 * spawning new geometry per word — closer to how Method of Loci actually
 * works (you reuse a room you already know). Word matches its namesake prop
 * first; anything else (an open-ended word from a photo, or more items than
 * one room holds) claims the next unclaimed prop in room order.
 *
 * A palace with more items than one room holds spans multiple WINGS of the
 * same template -- each wing is a fresh instance of the same 16 slots, so
 * `wing` just selects which slice of the associations array this call is
 * claiming against. Nothing is ever silently dropped: overflow beyond the
 * last wing is the caller's problem (offer another wing), not this
 * function's -- see palace-library.ts's wingCount().
 */
import { type HouseProp, type RoomTemplate } from './house'
import { PROPS_PER_WING } from './palace-library'
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

/** Word-match first, then fall back to the next unclaimed prop in room tour
 * order, against only the slice of associations belonging to this wing. */
export function claimHouse(associations: Association[], template: RoomTemplate, wing = 0): ClaimedNode[] {
  const wingAssociations = associations.slice(wing * PROPS_PER_WING, wing * PROPS_PER_WING + PROPS_PER_WING)
  const props = template.props

  const unclaimed = new Set(props.map((p) => p.id))
  const byId = new Map(props.map((p) => [p.id, p]))
  const claimed: ClaimedNode[] = []
  const deferred: Association[] = []

  for (const a of wingAssociations) {
    const word = resolveWord(a.locus)
    if (unclaimed.has(word)) {
      claimed.push({ prop: byId.get(word)!, association: a })
      unclaimed.delete(word)
    } else {
      deferred.push(a)
    }
  }

  const tourOrder: HouseProp[] = props.filter((p) => unclaimed.has(p.id))
  for (const a of deferred) {
    const prop = tourOrder.shift()
    if (!prop) break
    claimed.push({ prop, association: a })
  }

  const order = new Map(props.map((p, i) => [p.id, i]))
  claimed.sort((a, b) => order.get(a.prop.id)! - order.get(b.prop.id)!)
  return claimed
}
