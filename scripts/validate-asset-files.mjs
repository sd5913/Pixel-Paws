import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { validateAssetManifest } from '../src/assets/validation.js';
import { inspectGlb, validateMeasuredAsset } from './inspect-glb.mjs';

export async function validateAssetFiles(manifest, sourceRoot) {
  validateAssetManifest(manifest);
  const absoluteRoot = resolve(sourceRoot);

  for (const asset of manifest.assets) {
    const absoluteAssetPath = resolve(absoluteRoot, asset.path);
    const relativeAssetPath = relative(absoluteRoot, absoluteAssetPath);
    if (relativeAssetPath === '..' || relativeAssetPath.startsWith(`..${sep}`) || isAbsolute(relativeAssetPath)) {
      throw new Error(`Asset ${asset.id} path must stay inside the source root.`);
    }

    const file = await readFile(absoluteAssetPath);
    if (file.length < 4 || file.subarray(0, 4).toString('ascii') !== 'glTF') {
      throw new Error(`Asset ${asset.id} does not have a valid GLB header.`);
    }
    const measurement = await inspectGlb(file);
    validateMeasuredAsset(asset, measurement);
    if (measurement.issues.numWarnings) {
      throw new Error(`Asset ${asset.id} has GLB warnings: ${JSON.stringify(measurement.issues.messages)}`);
    }
  }

  return manifest;
}
