import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  validateAssetManifest,
  validateSceneLayout,
} from '../src/assets/validation.js';
import { validateAssetFiles } from './validate-asset-files.mjs';
import { validateCheckedInAssets } from './validate-assets.mjs';

const validManifest = {
  schemaVersion: 1,
  coordinateSystem: {
    units: 'meters',
    upAxis: 'Y',
    forwardAxis: '-Z',
    handedness: 'right',
  },
  assets: [
    {
      id: 'placeholder-crate',
      path: 'assets/models/placeholder-crate.glb',
      visualScale: [1, 1, 1],
      dimensionsMeters: [1, 1, 1],
      physics: { bodyType: 'static', suggestedMass: 0, friction: 0.65, restitution: 0.1 },
      pivot: { type: 'base-center', offset: [0, 0, 0] },
      bounds: { center: [0, 0.5, 0], halfExtents: [0.5, 0.5, 0.5] },
      colliders: [
        { type: 'box', center: [0, 0.5, 0], halfExtents: [0.5, 0.5, 0.5] },
      ],
      render: { castShadow: true, receiveShadow: true },
    },
  ],
};

const validLayout = {
  schemaVersion: 1,
  id: 'asset-pipeline-preview',
  instances: [
    {
      id: 'preview-crate',
      assetId: 'placeholder-crate',
      transform: {
        position: [3.8, -0.7, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      physics: { bodyType: 'static', colliderSet: 'default' },
    },
  ],
};

test('asset manifest accepts the shared coordinate and collider contract', () => {
  assert.equal(validateAssetManifest(validManifest), validManifest);
});

test('asset manifest rejects duplicate IDs and invalid bounds', () => {
  const duplicate = structuredClone(validManifest);
  duplicate.assets.push(structuredClone(duplicate.assets[0]));
  assert.throws(() => validateAssetManifest(duplicate), /duplicate asset id/i);

  const invalidBounds = structuredClone(validManifest);
  invalidBounds.assets[0].bounds.halfExtents[1] = 0;
  assert.throws(() => validateAssetManifest(invalidBounds), /halfExtents/i);
});

test('asset manifest requires collider dimensions for each primitive shape', () => {
  const invalidSphere = structuredClone(validManifest);
  invalidSphere.assets[0].colliders = [{ type: 'sphere', center: [0, 0.5, 0] }];
  assert.throws(() => validateAssetManifest(invalidSphere), /radius/i);

  const invalidCapsule = structuredClone(validManifest);
  invalidCapsule.assets[0].colliders = [{ type: 'capsule', center: [0, 0.5, 0], radius: 0.2 }];
  assert.throws(() => validateAssetManifest(invalidCapsule), /halfHeight/i);

  const invalidHull = structuredClone(validManifest);
  invalidHull.assets[0].colliders = [{ type: 'convex-hull', center: [0, 0.5, 0] }];
  assert.throws(() => validateAssetManifest(invalidHull), /includeNodes/i);
});

test('asset manifest validates optional interaction surfaces', () => {
  const validSurface = structuredClone(validManifest);
  validSurface.assets[0].interactionSurfaces = [{
    id: 'tabletop',
    kind: 'walkable',
    height: 1,
    centerXZ: [0, 0],
    halfExtentsXZ: [0.5, 0.5],
  }];
  assert.equal(validateAssetManifest(validSurface), validSurface);

  const invalidSurface = structuredClone(validSurface);
  invalidSurface.assets[0].interactionSurfaces[0].height = Number.NaN;
  assert.throws(() => validateAssetManifest(invalidSurface), /interaction surface/i);
});

test('scene layout validates asset references and normalized transforms', () => {
  assert.equal(validateSceneLayout(validLayout, validManifest), validLayout);

  const missingAsset = structuredClone(validLayout);
  missingAsset.instances[0].assetId = 'not-in-manifest';
  assert.throws(() => validateSceneLayout(missingAsset, validManifest), /unknown asset/i);

  const invalidRotation = structuredClone(validLayout);
  invalidRotation.instances[0].transform.rotation = [0, 0, 0, 2];
  assert.throws(() => validateSceneLayout(invalidRotation, validManifest), /normalized quaternion/i);
});

test('asset files must stay inside the source root and contain GLB data', async () => {
  const sourceRoot = await mkdtemp(join(tmpdir(), 'pixel-paws-assets-'));
  const modelDir = join(sourceRoot, 'assets', 'models');
  await mkdir(modelDir, { recursive: true });
  await writeFile(join(modelDir, 'placeholder-crate.glb'), await readFile('src/assets/models/placeholder-crate.glb'));

  await assert.doesNotReject(validateAssetFiles(validManifest, sourceRoot));

  const traversal = structuredClone(validManifest);
  traversal.assets[0].path = '../outside.glb';
  await assert.rejects(validateAssetFiles(traversal, sourceRoot), /assets\/models/i);

  const absolute = structuredClone(validManifest);
  absolute.assets[0].path = join(sourceRoot, 'assets', 'models', 'placeholder-crate.glb');
  await assert.rejects(validateAssetFiles(absolute, sourceRoot), /assets\/models/i);

  const unpackaged = structuredClone(validManifest);
  unpackaged.assets[0].path = 'private/placeholder-crate.glb';
  await assert.rejects(validateAssetFiles(unpackaged, sourceRoot), /assets\/models/i);

  await writeFile(join(modelDir, 'placeholder-crate.glb'), Buffer.from('not-a-glb'));
  await assert.rejects(validateAssetFiles(validManifest, sourceRoot), /GLB header/i);
});

test('checked-in manifest and preview layout validate together', async () => {
  const manifest = JSON.parse(await readFile('src/assets/asset-manifest.json', 'utf8'));
  const layout = JSON.parse(await readFile('src/scenes/asset-pipeline-preview.scene.json', 'utf8'));

  validateAssetManifest(manifest);
  validateSceneLayout(layout, manifest);
  await validateAssetFiles(manifest, 'src');
});

test('asset validation script verifies the checked-in pipeline data', async () => {
  assert.deepEqual(await validateCheckedInAssets(), { assetCount: 3, sceneCount: 2, instanceCount: 3 });
});

test('asset validation script checks every packaged scene layout', async () => {
  const sourceRoot = await mkdtemp(join(tmpdir(), 'pixel-paws-scenes-'));
  await mkdir(join(sourceRoot, 'assets', 'models'), { recursive: true });
  await mkdir(join(sourceRoot, 'scenes'), { recursive: true });
  await writeFile(join(sourceRoot, 'assets', 'asset-manifest.json'), JSON.stringify(validManifest));
  await writeFile(join(sourceRoot, 'assets', 'models', 'placeholder-crate.glb'), await readFile('src/assets/models/placeholder-crate.glb'));
  await writeFile(join(sourceRoot, 'scenes', 'valid.scene.json'), JSON.stringify(validLayout));

  const invalidLayout = structuredClone(validLayout);
  invalidLayout.id = 'invalid-second-layout';
  invalidLayout.instances[0].assetId = 'missing-asset';
  await writeFile(join(sourceRoot, 'scenes', 'invalid.scene.json'), JSON.stringify(invalidLayout));

  await assert.rejects(validateCheckedInAssets({ sourceRoot }), /unknown asset/i);
});
