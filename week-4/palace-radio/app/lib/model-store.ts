/**
 * IndexedDB store for AI-generated GLB models, keyed `${palaceId}:${locus}`.
 * Tripo's result URLs expire within ~24h, so the client downloads each GLB
 * once and keeps the bytes here -- localStorage can't hold them (GLBs run
 * to megabytes; localStorage tops out around 5MB total). Absence is always
 * graceful: no entry just means the room falls back to the primitive
 * decoration, which is also what shared-link recipients (whose IndexedDB
 * never saw the generation) get automatically.
 */
'use client'

const DB_NAME = 'palace-radio-models'
const STORE = 'models'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function modelKey(palaceId: string, locus: string): string {
  return `${palaceId}:${locus}`
}

export async function saveModel(key: string, bytes: ArrayBuffer): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(bytes, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getModel(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result instanceof ArrayBuffer ? req.result : null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null // IDB unavailable (private mode etc.) -- fall back to primitives
  }
}

export async function listModelKeys(palaceId: string): Promise<string[]> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys()
      req.onsuccess = () => resolve((req.result as string[]).filter((k) => k.startsWith(palaceId + ':')))
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function deleteModelsFor(palaceId: string): Promise<void> {
  const keys = await listModelKeys(palaceId)
  if (!keys.length) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    keys.forEach((k) => tx.objectStore(STORE).delete(k))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
