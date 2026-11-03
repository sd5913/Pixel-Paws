import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Box3, Vector3 } from 'three';
import validator from 'gltf-validator';
import { parseGlb } from '../src/assets/load-assets.js';

export async function inspectGlb(bytes) {
  const issues = (await validator.validateBytes(new Uint8Array(bytes), { maxIssues: 100 })).issues;
  if (issues.numErrors) throw new Error(`GLB validation failed: ${JSON.stringify(issues)}`);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  for (const resource of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('GLB must embed all resources.');
  }
  // Texture decoding needs browser APIs; fail explicitly instead of silently
  // claiming a headless measurement supports textured or compressed assets.
  if (json.images?.length || json.extensionsRequired?.length) {
    throw new Error('GLB measurement requires a browser/decoder for images or required extensions.');
  }
  const scene = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const box = new Box3().setFromObject(scene, true);
  const dimensionsMeters = box.getSize(new Vector3()).toArray();
  if (![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)
      || !dimensionsMeters.every(n => n > 0)) throw new Error('GLB has invalid or empty measured bounds.');
  let triangles = 0;
  let vertices = 0;
  scene.traverse(node => {
    if (!node.isMesh) return;
    vertices += node.geometry.attributes.position.count;
    triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
  });
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length, dimensionsMeters,
    bounds: { min: box.min.toArray(), max: box.max.toArray() },
    triangles, vertices, materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0, issues,
  };
}

export function validateMeasuredAsset(asset, measurement) {
  const close = (actual, expected, field) => {
    if (!Array.isArray(expected) || expected.length !== 3 || actual.some((n, i) => !Number.isFinite(expected[i]) || Math.abs(n - expected[i]) > 1e-6)) {
      throw new Error(`Asset ${asset.id} ${field} does not match measured GLB (tolerance 1e-6 m).`);
    }
  };
  const size = measurement.dimensionsMeters.map((n, i) => n * asset.visualScale[i]);
  const center = measurement.bounds.min.map((n, i) => (n + measurement.bounds.max[i]) * asset.visualScale[i] / 2);
  close(size, asset.dimensionsMeters, 'dimensionsMeters');
  close(center, asset.bounds.center, 'bounds.center');
  close(size.map(n => n / 2), asset.bounds.halfExtents, 'bounds.halfExtents');
  if (asset.approvedSha256 && measurement.sha256 !== asset.approvedSha256) {
    throw new Error(`Asset ${asset.id} approved file hash changed.`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: node scripts/inspect-glb.mjs path/to/asset.glb');
  console.log(JSON.stringify(await inspectGlb(await readFile(path)), null, 2));
}
