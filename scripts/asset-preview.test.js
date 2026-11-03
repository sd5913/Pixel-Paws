import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Group, Object3D } from 'three';

import { addAssetPreview } from '../src/assets/preview.js';

test('addAssetPreview attaches loaded visuals without changing gameplay objects', async () => {
  const parent = new Group();
  const previewObject = new Object3D();
  const descriptors = [{ id: 'preview-crate', object3D: previewObject }];

  const result = await addAssetPreview(parent, {
    loadInstances: async () => descriptors,
  });

  assert.equal(result, descriptors);
  assert.equal(parent.getObjectByName('asset-pipeline-preview')?.children[0], previewObject);
});
