/**
 * Client orchestration for AI-sculpted objects ("Materialize"): for each
 * association, create a Tripo task through our proxy, poll it, download the
 * finished GLB through the proxy, and store the bytes in IndexedDB keyed to
 * this palace+locus. Runs a couple of tasks at a time (Tripo queues at most
 * ~10 per account; two keeps a shared free-tier account well clear of that).
 * Failures mark just that item and the room keeps its primitive there.
 */
'use client'

import type { Association } from './palace'
import { saveModel, modelKey } from './model-store'

export type GenState = 'pending' | 'sculpting' | 'done' | 'failed'

const POLL_MS = 2500
const TIMEOUT_MS = 3 * 60 * 1000
const CONCURRENCY = 2

export const USER_KEY_STORAGE = 'tripo-user-key'

export function getUserKey(): string {
  try {
    return localStorage.getItem(USER_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function setUserKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(USER_KEY_STORAGE, key.trim())
    else localStorage.removeItem(USER_KEY_STORAGE)
  } catch {}
}

/** Turns an association into a generation prompt: the vivid detail itself,
 * plus a style anchor so results sit comfortably in the low-poly room. */
function toPrompt(a: Association): string {
  return `${a.sentence} — just the ${a.item} detail as a single small object, low-poly stylized game asset, simple flat colors`.slice(0, 200)
}

async function generateOne(palaceId: string, a: Association, userKey: string): Promise<void> {
  const createRes = await fetch('/api/model-gen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: toPrompt(a), ...(userKey ? { userKey } : {}) }),
  })
  const created = await createRes.json()
  if (!createRes.ok) throw new Error(created.error || 'Could not start generation')

  const deadline = Date.now() + TIMEOUT_MS
  let glbUrl: string | undefined
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS))
    const pollRes = await fetch(`/api/model-gen?taskId=${encodeURIComponent(created.taskId)}`, {
      headers: userKey ? { 'x-user-key': userKey } : {},
    })
    const poll = await pollRes.json()
    if (!pollRes.ok) throw new Error(poll.error || 'Poll failed')
    if (poll.status === 'success' && poll.glbUrl) {
      glbUrl = poll.glbUrl
      break
    }
    if (poll.status === 'failed') throw new Error('Generation failed')
  }
  if (!glbUrl) throw new Error('Timed out waiting for the model')

  const dl = await fetch(`/api/model-gen?download=${encodeURIComponent(glbUrl)}`)
  if (!dl.ok) throw new Error('Model download failed')
  const bytes = await dl.arrayBuffer()
  await saveModel(modelKey(palaceId, a.locus), bytes)
}

/** Generates models for the given associations, reporting per-locus state
 * transitions via onState. Resolves when every item is done or failed. */
export async function materialize(
  palaceId: string,
  associations: Association[],
  userKey: string,
  onState: (locus: string, state: GenState, error?: string) => void
): Promise<void> {
  const queue = [...associations]
  async function worker() {
    for (;;) {
      const a = queue.shift()
      if (!a) return
      onState(a.locus, 'sculpting')
      try {
        await generateOne(palaceId, a, userKey)
        onState(a.locus, 'done')
      } catch (err) {
        onState(a.locus, 'failed', err instanceof Error ? err.message : 'failed')
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
}
