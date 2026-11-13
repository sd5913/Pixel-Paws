import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { Box3 } from 'three';
import { parseGlb } from '../src/assets/load-assets.js';
import { loadStudyScene } from '../src/assets/study-scene.js';

test('portrait desk scene preserves reference assets and fits the eight replacement props', async () => {
  for (const [file, expected] of [
    ['desk', '29f5ef241bc0bca43fb0baad9444623955549a6afe7807c1c4be81958e92c78e'],
    ['mug', 'e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e'],
  ]) assert.equal(createHash('sha256').update(await readFile(`src/assets/models/${file}.glb`)).digest('hex'), expected);
  const study = await loadStudyScene({
    fetchImpl: async path => ({ ok: true, json: async () => JSON.parse(await readFile(`src/${path.slice(2)}`, 'utf8')) }),
    loadModel: async path => {
      const bytes = await readFile(`src/${path}`);
      return parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    },
  });
  assert.equal(study.surface.height, 0.75);
  assert.ok(Math.abs(study.surface.halfExtentsXZ[0] - 1.485) < 1e-9);
  assert.ok(Math.abs(study.surface.halfExtentsXZ[1] - 1.98) < 1e-9);
  const footprints = study.instances.filter(item => item.assetId !== 'desk')
    .map(({ id, object3D }) => ({ id, bounds: new Box3().setFromObject(object3D, true) }));
  const overlapsXZ = (a, b) => a.min.x < b.max.x && a.max.x > b.min.x
    && a.min.z < b.max.z && a.max.z > b.min.z;
  const spawn = { min: { x: -0.35, z: -0.35 }, max: { x: 0.35, z: 0.35 } };
  for (const [index, { id, bounds }] of footprints.entries()) {
    assert.ok(Math.abs(bounds.min.y - study.surface.height) < 1e-6, id);
    assert.ok(bounds.min.x >= -1.485 && bounds.max.x <= 1.485, id);
    assert.ok(bounds.min.z >= -1.98 && bounds.max.z <= 1.98, id);
    assert.ok(!overlapsXZ(bounds, spawn), id);
    for (const other of footprints.slice(index + 1)) {
      assert.ok(!overlapsXZ(bounds, other.bounds), `${id} overlaps ${other.id}`);
    }
  }
  assert.deepEqual(footprints.map(({ id }) => id).sort(), [
    'desk-lamp', 'eraser', 'glass-vase', 'headphones', 'ink-bottle', 'notebook', 'notebook-stack', 'tissue-box',
  ]);
  assert.equal(study.targets.length, 8);
  assert.equal(study.instances.find(item => item.assetId === 'ink-bottle').object3D.scale.x, 0.1);
  assert.equal(study.instances.find(item => item.assetId === 'desk-lamp').object3D.scale.x, 0.4);
  const { object3D, initialTransform } = study.instances.find(item => item.assetId === 'headphones');
  object3D.position.set(4, -3, 8);
  object3D.rotation.x = 1;
  object3D.scale.setScalar(5);
  study.reset();
  assert.deepEqual(object3D.position.toArray(), initialTransform.position);
  assert.deepEqual(object3D.quaternion.toArray(), initialTransform.rotation);
  assert.deepEqual(object3D.scale.toArray(), initialTransform.scale);
});
