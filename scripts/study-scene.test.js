import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { parseGlb } from '../src/assets/load-assets.js';
import { loadStudyScene } from '../src/assets/study-scene.js';

test('portrait desk scene preserves model bytes, rotates movement bounds and resets scaled mug', async () => {
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
  const mug = study.instances.find(item => item.assetId === 'mug');
  assert.deepEqual(mug.object3D.position.toArray(), [0.891, 0.75, -1.276]);
  assert.deepEqual(mug.object3D.scale.toArray(), [3.6, 3.6, 3.6]);
  assert.equal(study.targets.length, 5);
  assert.equal(new Set(study.targets.map(target => target.id)).size, 5);
  assert.ok(study.targets.every(target => target.size === 'small'));
  assert.equal(new Set(study.instances.filter(item => item.assetId === 'mug').map(item => item.object3D)).size, 5);
  mug.object3D.position.set(4, -3, 8);
  mug.object3D.rotation.x = 1;
  mug.object3D.scale.setScalar(5);
  study.reset();
  assert.deepEqual(mug.object3D.position.toArray(), [0.891, 0.75, -1.276]);
  assert.deepEqual(mug.object3D.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(mug.object3D.scale.toArray(), [3.6, 3.6, 3.6]);
});
