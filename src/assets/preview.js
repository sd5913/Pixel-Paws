import { Group } from 'three';

import { loadSceneAssetInstances } from './load-assets.js';

export async function addAssetPreview(parent, { loadInstances = loadSceneAssetInstances } = {}) {
  const instances = await loadInstances();
  const preview = new Group();
  preview.name = 'asset-pipeline-preview';
  preview.add(...instances.map((instance) => instance.object3D));
  parent.add(preview);
  return instances;
}
