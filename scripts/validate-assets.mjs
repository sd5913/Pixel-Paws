import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateAssetManifest, validateSceneLayout } from '../src/assets/validation.js';
import { validateAssetFiles } from './validate-asset-files.mjs';

export async function validateCheckedInAssets() {
  const manifest = JSON.parse(await readFile('src/assets/asset-manifest.json', 'utf8'));
  const layout = JSON.parse(await readFile('src/scenes/asset-pipeline-preview.scene.json', 'utf8'));

  validateAssetManifest(manifest);
  validateSceneLayout(layout, manifest);
  await validateAssetFiles(manifest, 'src');

  return { assetCount: manifest.assets.length, instanceCount: layout.instances.length };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const { assetCount, instanceCount } = await validateCheckedInAssets();
  const assetLabel = assetCount === 1 ? 'asset' : 'assets';
  const instanceLabel = instanceCount === 1 ? 'scene instance' : 'scene instances';
  console.log(`Validated ${assetCount} ${assetLabel} and ${instanceCount} ${instanceLabel}.`);
}
