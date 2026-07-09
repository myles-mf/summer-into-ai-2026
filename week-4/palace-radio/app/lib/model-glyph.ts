/**
 * Loads a real furniture model (Kenney "Furniture Kit", CC0, public/models/)
 * by filename, normalized to a consistent size and grounded to local y=0 so
 * every piece sits on the floor regardless of its original modeling scale
 * or pivot. Word -> filename resolution lives in house.ts/claim.ts now —
 * this module just loads whatever file it's given.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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

export async function loadModel(file: string): Promise<THREE.Object3D> {
  const raw = await loadRaw(file)
  const instance = raw.clone(true)

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
