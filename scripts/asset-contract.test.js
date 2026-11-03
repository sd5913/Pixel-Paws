import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { validateAssetManifest } from '../src/assets/validation.js';
import { inspectGlb, validateMeasuredAsset } from './inspect-glb.mjs';

const manifest = JSON.parse(await readFile('src/assets/asset-manifest.json', 'utf8'));
const mugBytes = await readFile('src/assets/models/mug.glb');

test('approved mug has measured dimensions, valid GLB, and preserved digest', async () => {
  const result = await inspectGlb(mugBytes);
  assert.equal(result.sha256, 'e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e');
  assert.equal(result.issues.numErrors, 0);
  assert.equal(result.issues.numWarnings, 0);
  assert.equal(result.triangles, 612);
  const spec = JSON.parse(await readFile('src/assets/asset-spec.json', 'utf8'));
  assert.deepEqual(result.dimensionsMeters, spec.dimensionsMeters);
  assert.deepEqual(result.bounds, spec.bounds);
  validateMeasuredAsset(manifest.assets.find(a => a.id === 'mug'), result);
});

test('measurement rejects truncated GLB data and external dependencies', async () => {
  await assert.rejects(inspectGlb(mugBytes.subarray(0, 40)), /GLB|validation/i);
  const invalid = Buffer.from(mugBytes);
  invalid.writeUInt32LE(1, 4);
  await assert.rejects(inspectGlb(invalid), /GLB|validation/i);
  const jsonLength = mugBytes.readUInt32LE(12);
  const json = JSON.parse(mugBytes.subarray(20, 20 + jsonLength).toString());
  json.buffers[0].uri = 'external.bin';
  const text = JSON.stringify(json);
  const chunk = Buffer.from(text.padEnd(Math.ceil(Buffer.byteLength(text) / 4) * 4, ' '));
  const external = Buffer.concat([mugBytes.subarray(0, 20), chunk, mugBytes.subarray(20 + jsonLength)]);
  external.writeUInt32LE(external.length, 8);
  external.writeUInt32LE(chunk.length, 12);
  await assert.rejects(inspectGlb(external), /embed all resources|validation/i);
});

test('manifest metadata cannot substitute target dimensions for measured dimensions', async () => {
  const result = await inspectGlb(mugBytes);
  const mug = structuredClone(manifest.assets.find(a => a.id === 'mug'));
  mug.dimensionsMeters[1] = 0.2;
  assert.throws(() => validateMeasuredAsset(mug, result), /dimensionsMeters/i);
});

test('manifest rejects invalid physical defaults and missing dimensions', () => {
  for (const [key, value] of [['suggestedMass', -1], ['friction', -0.1], ['restitution', 1.1], ['bodyType', 'moving']]) {
    const bad = structuredClone(manifest);
    bad.assets[0].physics[key] = value;
    assert.throws(() => validateAssetManifest(bad), /physics/i);
  }
  const bad = structuredClone(manifest);
  delete bad.assets[0].dimensionsMeters;
  assert.throws(() => validateAssetManifest(bad), /dimensionsMeters/i);
});

test('measurement checks visual scale, bounds center and preserved file hash', async () => {
  const result = await inspectGlb(mugBytes);
  const mug = structuredClone(manifest.assets.find(a => a.id === 'mug'));
  mug.bounds.center[0] = 0;
  assert.throws(() => validateMeasuredAsset(mug, result), /bounds.center/i);
  mug.bounds.center[0] = (result.bounds.min[0] + result.bounds.max[0]) / 2;
  mug.approvedSha256 = '0'.repeat(64);
  assert.throws(() => validateMeasuredAsset(mug, result), /hash/i);
  mug.visualScale = [2, 2, 2];
  assert.throws(() => validateMeasuredAsset(mug, result), /dimensionsMeters/i);
});
