import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  instantiateAssetLayout,
  parseGlb,
} from '../src/assets/load-assets.js';

async function readPipelineData() {
  const [manifestText, layoutText, glb] = await Promise.all([
    readFile('src/assets/asset-manifest.json', 'utf8'),
    readFile('src/scenes/asset-pipeline-preview.scene.json', 'utf8'),
    readFile('src/assets/models/placeholder-crate.glb'),
  ]);
  return {
    manifest: JSON.parse(manifestText),
    layout: JSON.parse(layoutText),
    glb,
  };
}

test('parseGlb loads the locally packaged placeholder model', async () => {
  const { glb } = await readPipelineData();
  const object = await parseGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));

  assert.equal(object.getObjectByName('PlaceholderCrate')?.isMesh, true);
});

test('instantiateAssetLayout applies transforms and exposes physics metadata', async () => {
  const { manifest, layout, glb } = await readPipelineData();
  const source = await parseGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));
  let loadCount = 0;

  const [instance] = await instantiateAssetLayout({
    manifest,
    layout,
    loadModel: async (path) => {
      assert.equal(path, 'assets/models/placeholder-crate.glb');
      loadCount += 1;
      return source;
    },
  });

  assert.equal(loadCount, 1);
  assert.equal(instance.id, 'preview-crate');
  assert.equal(instance.object3D.name, 'preview-crate');
  assert.deepEqual(instance.object3D.position.toArray(), [3.8, -0.7, 0]);
  assert.deepEqual(instance.object3D.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(instance.initialTransform.rotation, [0, 0, 0, 1]);
  assert.equal(instance.physics.bodyType, 'static');
  assert.deepEqual(instance.physics.colliders[0].halfExtents, [0.5, 0.5, 0.5]);
  assert.equal(instance.object3D.getObjectByName('PlaceholderCrate').castShadow, true);
  assert.equal(instance.object3D.getObjectByName('PlaceholderCrate').receiveShadow, true);
});
