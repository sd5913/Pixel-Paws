import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { validateAssetManifest, validateSceneLayout } from './validation.js';

const sharedLoader = new GLTFLoader();
const modelCache = new Map();

export function parseGlb(data, resourcePath = '', loader = sharedLoader) {
  return new Promise((resolve, reject) => {
    loader.parse(data, resourcePath, (gltf) => resolve(gltf.scene), reject);
  });
}

export function loadGlb(path, loader = sharedLoader) {
  if (!modelCache.has(path)) {
    modelCache.set(path, new Promise((resolve, reject) => {
      loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    }));
  }
  return modelCache.get(path);
}

export async function instantiateAssetLayout({ manifest, layout, loadModel = loadGlb }) {
  validateAssetManifest(manifest);
  validateSceneLayout(layout, manifest);
  const assetsById = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const sourcesByAssetId = new Map();

  return Promise.all(layout.instances.map(async (instance) => {
    const asset = assetsById.get(instance.assetId);
    if (!sourcesByAssetId.has(asset.id)) {
      sourcesByAssetId.set(asset.id, Promise.resolve(loadModel(asset.path)));
    }

    const source = await sourcesByAssetId.get(asset.id);
    const object3D = source.clone(true);
    object3D.name = instance.id;
    object3D.position.fromArray(instance.transform.position);
    object3D.quaternion.fromArray(instance.transform.rotation);
    object3D.scale.set(
      asset.visualScale[0] * instance.transform.scale[0],
      asset.visualScale[1] * instance.transform.scale[1],
      asset.visualScale[2] * instance.transform.scale[2],
    );
    object3D.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = asset.render.castShadow;
      child.receiveShadow = asset.render.receiveShadow;
    });

    return {
      id: instance.id,
      assetId: instance.assetId,
      object3D,
      initialTransform: structuredClone(instance.transform),
      pivot: structuredClone(asset.pivot),
      bounds: structuredClone(asset.bounds),
      physics: {
      bodyType: instance.physics.bodyType,
      colliderSet: instance.physics.colliderSet,
      colliders: structuredClone(asset.colliders),

      // 物理参数
      suggestedMass: asset.suggestedMass,
      friction: asset.friction,
      restitution: asset.restitution,
    },
    };
  }));
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  return response.json();
}

export async function loadSceneAssetInstances({
  manifestUrl = './assets/asset-manifest.json',
  layoutUrl = './scenes/asset-pipeline-preview.scene.json',
  fetchImpl = globalThis.fetch,
  loadModel = loadGlb,
} = {}) {
  const [manifest, layout] = await Promise.all([
    fetchJson(manifestUrl, fetchImpl),
    fetchJson(layoutUrl, fetchImpl),
  ]);
  return instantiateAssetLayout({ manifest, layout, loadModel });
}
