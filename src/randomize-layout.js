import { Box3, Matrix4, Quaternion, Vector3 } from 'three';

const EDGE_GAP = 0.12;
const OBJECT_GAP = 0.08;
const SPAWN_HALF_SIZE = 0.42;

// Conservative visual/collider footprints include offsets from each model pivot.
function footprint(instance) {
  const transform = new Matrix4().compose(new Vector3(),
    new Quaternion().fromArray(instance.initialTransform.rotation), instance.object3D.scale);
  const box = new Box3();
  const shapes = [instance.bounds, ...instance.physics.colliders.filter(shape => shape.type === 'box')];
  for (const shape of shapes) {
    if (!shape?.halfExtents) continue;
    const center = new Vector3().fromArray(shape.center ?? [0, 0, 0]);
    const half = new Vector3().fromArray(shape.halfExtents);
    box.union(new Box3(center.clone().sub(half), center.clone().add(half)).applyMatrix4(transform));
  }
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
}
function at(box, x, z) {
  return { minX: box.minX + x, maxX: box.maxX + x, minZ: box.minZ + z, maxZ: box.maxZ + z };
}
function overlaps(a, b, gap = OBJECT_GAP) {
  return a.minX < b.maxX + gap && a.maxX + gap > b.minX
    && a.minZ < b.maxZ + gap && a.maxZ + gap > b.minZ;
}

export function randomizeLayout(instances, surface, random = Math.random) {
  const movable = instances.filter(instance => instance.physics.bodyType === 'dynamic')
    .map(instance => ({ instance, box: footprint(instance) }))
    .sort((a, b) => (b.box.maxX - b.box.minX) * (b.box.maxZ - b.box.minZ)
      - (a.box.maxX - a.box.minX) * (a.box.maxZ - a.box.minZ));
  const fixed = instances.filter(instance => instance.isObstacle && instance.physics.bodyType === 'static')
    .map(instance => at(footprint(instance), instance.initialTransform.position[0], instance.initialTransform.position[2]));
  const [cx, cz] = surface.centerXZ;
  const [hx, hz] = surface.halfExtentsXZ;
  for (let attempt = 0; attempt < 30; attempt++) {
    const occupied = [...fixed, { minX: -SPAWN_HALF_SIZE, maxX: SPAWN_HALF_SIZE,
      minZ: -SPAWN_HALF_SIZE, maxZ: SPAWN_HALF_SIZE }];
    const placements = [];
    for (const { instance, box } of movable) {
      const minX = cx - hx + EDGE_GAP - box.minX;
      const maxX = cx + hx - EDGE_GAP - box.maxX;
      const minZ = cz - hz + EDGE_GAP - box.minZ;
      const maxZ = cz + hz - EDGE_GAP - box.maxZ;
      if (minX > maxX || minZ > maxZ) throw new Error(`No tabletop space for ${instance.id}`);
      let placed = false;
      for (let sample = 0; sample < 250; sample++) {
        const x = minX + random() * (maxX - minX);
        const z = minZ + random() * (maxZ - minZ);
        const previous = instance.initialTransform.position;
        if (Math.hypot(x - previous[0], z - previous[2]) < 0.12) continue;
        const candidate = at(box, x, z);
        if (occupied.some(other => overlaps(candidate, other))) continue;
        occupied.push(candidate);
        placements.push({ instance, position: [x, previous[1], z] });
        placed = true;
        break;
      }
      if (!placed) break;
    }
    if (placements.length !== movable.length) continue;
    // Commit the entire valid arrangement together, before resetting physics.
    for (const { instance, position } of placements) instance.initialTransform.position = position;
    return;
  }
  throw new Error('Could not find a clear tabletop layout');
}
