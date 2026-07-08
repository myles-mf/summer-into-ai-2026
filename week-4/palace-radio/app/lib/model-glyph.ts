/**
 * Real furniture models (Kenney "Furniture Kit", CC0, public/models/) instead
 * of hand-coded box-primitive icons — swapped in after feedback that the
 * primitives read as "basic." Loaded async via GLTFLoader, normalized to a
 * consistent size and grounded to y=0 so every piece sits on the floor
 * regardless of its original modeling scale/pivot. Same curated-vocabulary +
 * fallback boundary as the old glyphs.ts: an open-ended vision-detected word
 * we don't have a model for still falls back to the abstract crystal rather
 * than guessing.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MODEL_FILES: Record<string, string> = {
  door: 'doorwayOpen.glb',
  desk: 'desk.glb',
  window: 'wallWindow.glb',
  bed: 'bedSingle.glb',
  shelf: 'bookcaseOpenLow.glb',
  chair: 'chair.glb',
  lamp: 'lampRoundFloor.glb',
  bookshelf: 'bookcaseClosed.glb',
  mirror: 'bathroomMirror.glb',
  table: 'table.glb',
}

const ALIASES: Record<string, string> = {
  nightstand: 'desk',
  dresser: 'shelf',
  drawer: 'shelf',
  drawers: 'shelf',
  couch: 'chair',
  sofa: 'chair',
  armchair: 'chair',
  tv: 'window',
  television: 'window',
  wardrobe: 'shelf',
  closet: 'door',
  cabinet: 'shelf',
  painting: 'mirror',
  frame: 'mirror',
  picture: 'mirror',
}

function resolveFile(locus: string): string | undefined {
  const key = locus.toLowerCase().trim()
  if (MODEL_FILES[key]) return MODEL_FILES[key]
  const aliased = ALIASES[key]
  return aliased ? MODEL_FILES[aliased] : undefined
}

const loader = new GLTFLoader()
const rawCache = new Map<string, Promise<THREE.Object3D>>()

function loadRaw(file: string): Promise<THREE.Object3D> {
  let cached = rawCache.get(file)
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      loader.load(`/models/${file}`, (gltf) => resolve(gltf.scene), undefined, reject)
    })
    rawCache.set(file, cached)
  }
  return cached
}

const TARGET_SIZE = 1.15

/** Loads the model for a locus (if we have one), normalized so its largest
 * dimension is ~TARGET_SIZE units and its base sits at local y=0. Returns
 * null if there's no curated model for this word (caller should fall back). */
export async function loadFurnitureModel(locus: string): Promise<THREE.Object3D | null> {
  const file = resolveFile(locus)
  if (!file) return null

  const raw = await loadRaw(file)
  const instance = raw.clone(true)
  instance.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = false
      o.receiveShadow = false
    }
  })

  instance.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(instance)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = TARGET_SIZE / maxDim
  instance.scale.setScalar(scale)

  instance.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(instance)
  const center = box2.getCenter(new THREE.Vector3())
  instance.position.x -= center.x
  instance.position.z -= center.z
  instance.position.y -= box2.min.y

  return instance
}
