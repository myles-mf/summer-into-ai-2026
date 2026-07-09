/**
 * Loads a real furniture model (Kenney "Furniture Kit", CC0, public/models/)
 * by filename, grounded to local y=0 so every piece sits on the floor
 * regardless of its original pivot. Word -> filename resolution lives in
 * house.ts/claim.ts now — this module just loads whatever file it's given.
 *
 * Kenney's kit is modeled at exactly half real-world scale (measured: the
 * door comes in at 0.49 x 1.01 x 0.09, i.e. a real 0.98m x 2.02m doorway
 * halved). ONE global multiplier -- not a per-object normalize-to-1.15 pass
 * -- is the fix: normalizing every model's max dimension to the same size
 * destroyed relative proportions (a door ended up the same size as a lamp).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const GLOBAL_SCALE = 2

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

export async function loadModel(file: string): Promise<THREE.Object3D> {
  const raw = await loadRaw(file)
  const instance = raw.clone(true)
  instance.scale.setScalar(GLOBAL_SCALE)
  instance.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(instance)
  const center = box.getCenter(new THREE.Vector3())
  instance.position.x -= center.x
  instance.position.z -= center.z
  instance.position.y -= box.min.y

  return instance
}
