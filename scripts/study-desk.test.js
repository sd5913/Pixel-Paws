import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as T from 'three';

import { parseGlb } from '../src/assets/load-assets.js';
import { validateAssetManifest, validateSceneLayout } from '../src/assets/validation.js';
import { inspectGlb, validateMeasuredAsset } from './inspect-glb.mjs';

const MUG_SHA256 = 'e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e';
const close = (actual, expected, tolerance = 1e-6) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(
    Math.abs(value - expected[index]) <= tolerance,
    `${value} differs from ${expected[index]} at index ${index}`,
  ));
};

async function readDeskContract() {
  const [manifestText, deskBytes, mugBytes, layoutText] = await Promise.all([
    readFile('src/assets/asset-manifest.json', 'utf8'),
    readFile('src/assets/models/desk.glb'),
    readFile('src/assets/models/mug.glb'),
    readFile('src/scenes/study-desk-preview.scene.json', 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText);
  return {
    manifest,
    desk: manifest.assets.find(asset => asset.id === 'desk'),
    deskBytes,
    mugBytes,
    layout: JSON.parse(layoutText),
  };
}

test('desk GLB has exact production bounds and mobile-friendly materials', async () => {
  const { manifest, desk, deskBytes, mugBytes } = await readDeskContract();
  validateAssetManifest(manifest);
  const measurement = await inspectGlb(deskBytes);
  validateMeasuredAsset(desk, measurement);

  close(measurement.dimensionsMeters, [1.8, 0.75, 0.9]);
  close(measurement.bounds.min, [-0.9, 0, -0.45]);
  close(measurement.bounds.max, [0.9, 0.75, 0.45]);
  assert.equal(measurement.issues.numErrors, 0);
  assert.equal(measurement.issues.numWarnings, 0);
  assert.ok(measurement.triangles <= 8000, `Desk has ${measurement.triangles} triangles`);
  assert.ok(measurement.materials <= 3, `Desk has ${measurement.materials} materials`);
  assert.equal(measurement.textures, 0);

  const scene = await parseGlb(deskBytes.buffer.slice(deskBytes.byteOffset, deskBytes.byteOffset + deskBytes.byteLength));
  const materials = new Map();
  scene.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.set(material.name, material);
    }
  });
  assert.deepEqual([...materials.keys()].sort(), [
    'Oat wood tabletop',
    'Soft sage drawer',
    'Warm wood frame and cream pull',
  ]);
  for (const material of materials.values()) {
    assert.equal(material.metalness, 0);
    assert.ok(material.roughness >= 0.7 && material.roughness <= 0.85);
  }
  assert.equal(materials.get('Oat wood tabletop').color.getHexString(T.SRGBColorSpace), 'c8aa86');
  assert.equal(materials.get('Soft sage drawer').color.getHexString(T.SRGBColorSpace), 'a9bba0');
  assert.equal(materials.get('Warm wood frame and cream pull').vertexColors, true);
  const vertexColors = new Set();
  scene.traverse(object => {
    if (!object.isMesh || object.material.name !== 'Warm wood frame and cream pull') return;
    const color = object.geometry.attributes.color;
    for (let index = 0; index < color.count; index += 1) {
      vertexColors.add(new T.Color(color.getX(index), color.getY(index), color.getZ(index))
        .getHexString(T.SRGBColorSpace));
    }
  });
  assert.deepEqual([...vertexColors].sort(), ['c8aa86', 'fff0d7']);

  assert.equal(createHash('sha256').update(mugBytes).digest('hex'), MUG_SHA256);
});

test('desk manifest defines the walkable top and compound static colliders', async () => {
  const { desk } = await readDeskContract();
  assert.equal(desk.physics.bodyType, 'static');
  assert.equal(desk.physics.suggestedMass, 0);
  assert.equal(desk.physics.friction, 0.75);
  assert.equal(desk.physics.restitution, 0.05);
  assert.deepEqual(desk.interactionSurfaces, [{
    id: 'tabletop',
    kind: 'walkable',
    height: 0.75,
    centerXZ: [0, 0],
    halfExtentsXZ: [0.9, 0.45],
  }]);
  assert.equal(desk.colliders.length, 5);
  assert.deepEqual(desk.colliders[0], {
    type: 'box',
    center: [0, 0.7, 0],
    halfExtents: [0.9, 0.05, 0.45],
  });
  for (const collider of desk.colliders.slice(1)) {
    assert.equal(collider.type, 'box');
    assert.equal(collider.center[1], 0.325);
    assert.deepEqual(collider.halfExtents, [0.08, 0.325, 0.08]);
  }
});

test('study desk preview places the unchanged mug on the tabletop', async () => {
  const { manifest, layout } = await readDeskContract();
  validateSceneLayout(layout, manifest);
  const deskInstance = layout.instances.find(instance => instance.assetId === 'desk');
  const mugInstance = layout.instances.find(instance => instance.assetId === 'mug');
  assert.deepEqual(deskInstance.transform.position, [0, 0, 0]);
  assert.equal(deskInstance.physics.bodyType, 'static');
  assert.deepEqual(mugInstance.transform.position, [0.58, 0.75, 0.27]);
  assert.deepEqual(mugInstance.transform.scale, [1, 1, 1]);
  assert.equal(mugInstance.physics.bodyType, 'dynamic');
});
