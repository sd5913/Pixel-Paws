import { instantiateAssetLayout } from './load-assets.js';
import { Box3, Group, Vector3 } from 'three';
import { randomizeLayout } from '../randomize-layout.js';

export async function loadStudyScene({ fetchImpl = fetch, loadModel } = {}) {
  const [manifest, layout] = await Promise.all([
    './assets/asset-manifest.json', './scenes/study-desk-gameplay.scene.json',
  ].map(async path => {
    const response = await fetchImpl(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  }));
  const instances = await instantiateAssetLayout({ manifest, layout, loadModel });
  const stack = instances.find(item => item.assetId === 'notebook-stack');
  const books = [];
  if (stack) {
    stack.object3D.updateMatrixWorld(true);
    for (const [index, child] of [...stack.object3D.children].entries()) {
      const root = new Group();
      root.position.copy(stack.object3D.position);
      root.quaternion.copy(stack.object3D.quaternion);
      root.scale.copy(stack.object3D.scale);
      root.add(child.clone(true));
      const localBounds = new Box3().setFromObject(child.clone(true), true);
      // Each authored mesh already contains its height within the stack.
      const center = localBounds.getCenter(new Vector3());
      const half = localBounds.getSize(new Vector3()).multiplyScalar(0.5);
      books.push({ ...stack, id: stack.id + '-book-' + (index + 1), object3D: root,
        initialTransform: structuredClone(stack.initialTransform),
        bounds: { center: center.toArray(), halfExtents: half.toArray() },
        physics: { ...stack.physics, suggestedMass: stack.physics.suggestedMass / 3,
          colliders: [{ type: 'box', center: center.toArray(), halfExtents: half.toArray() }] } });
    }
  }
  const layoutInstances = [...instances];
  if (stack) instances.splice(instances.indexOf(stack), 1, ...books);
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
      .flatMap(instance => instance.id === stack?.id
        ? books.map(book => ({ id: book.id, size: 'small' }))
        : [{ id: instance.id, size: instance.scoring.size }]),
    reset({ randomize = false, random = Math.random } = {}) {
      if (randomize) {
        randomizeLayout(layoutInstances, surface, random);
        for (const book of books) book.initialTransform.position = [...stack.initialTransform.position];
      }
      for (const { object3D, initialTransform } of instances) {
        object3D.position.fromArray(initialTransform.position);
        object3D.quaternion.fromArray(initialTransform.rotation);
        object3D.scale.fromArray(initialTransform.scale);
      }
    },
  };
}
