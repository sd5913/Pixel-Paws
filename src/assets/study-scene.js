import { instantiateAssetLayout } from './load-assets.js';
import { Box3, Vector3 } from 'three';

export async function loadStudyScene({ fetchImpl = fetch, loadModel } = {}) {
  const [manifest, layout] = await Promise.all([
    './assets/asset-manifest.json', './scenes/study-desk-gameplay.scene.json',
  ].map(async path => {
    const response = await fetchImpl(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  }));
  const instances = await instantiateAssetLayout({ manifest, layout, loadModel });
  const desk = manifest.assets.find(asset => asset.id === 'desk');
  const localSurface = desk.interactionSurfaces.find(item => item.id === 'tabletop');
  const deskInstance = instances.find(item => item.assetId === 'desk').object3D;
  // The configured 90-degree turn remains axis aligned. Transform all corners
  // so movement bounds follow the desk's rotation as well as its scale.
  deskInstance.updateMatrixWorld(true);
  const corners = [];
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    corners.push(new Vector3(
      localSurface.centerXZ[0] + x * localSurface.halfExtentsXZ[0],
      localSurface.height,
      localSurface.centerXZ[1] + z * localSurface.halfExtentsXZ[1],
    ).applyMatrix4(deskInstance.matrixWorld));
  }
  const bounds = new Box3().setFromPoints(corners);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const surface = {
    height: center.y,
    centerXZ: [center.x, center.z],
    halfExtentsXZ: [size.x / 2, size.z / 2],
  };
  return {
    instances, surface,
    // Scoring size is explicit gameplay configuration, independent of model size/mass.
    targets: layout.instances.filter(instance => instance.scoring)
      .map(instance => ({ id: instance.id, size: instance.scoring.size })),
    reset() {
      for (const { object3D, initialTransform } of instances) {
        object3D.position.fromArray(initialTransform.position);
        object3D.quaternion.fromArray(initialTransform.rotation);
        object3D.scale.fromArray(initialTransform.scale);
      }
    },
  };
}
