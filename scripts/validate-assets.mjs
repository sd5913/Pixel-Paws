import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateAssetManifest, validateSceneLayout } from '../src/assets/validation.js';
import { validateAssetFiles } from './validate-asset-files.mjs';

export async function validateCheckedInAssets({ sourceRoot = 'src' } = {}) {
  const manifest = JSON.parse(await readFile(join(sourceRoot, 'assets', 'asset-manifest.json'), 'utf8'));
  const sceneDirectory = join(sourceRoot, 'scenes');
  const sceneFiles = (await readdir(sceneDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.scene.json'))
    .map((entry) => entry.name)
    .sort();

  validateAssetManifest(manifest);
  if (sceneFiles.length === 0) throw new Error('At least one .scene.json layout is required.');

  let instanceCount = 0;
  for (const sceneFile of sceneFiles) {
    const layout = JSON.parse(await readFile(join(sceneDirectory, sceneFile), 'utf8'));
    validateSceneLayout(layout, manifest);
    instanceCount += layout.instances.length;
  }
  await validateAssetFiles(manifest, sourceRoot);

  return { assetCount: manifest.assets.length, sceneCount: sceneFiles.length, instanceCount };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const { assetCount, sceneCount, instanceCount } = await validateCheckedInAssets();
  const assetLabel = assetCount === 1 ? 'asset' : 'assets';
  const sceneLabel = sceneCount === 1 ? 'scene layout' : 'scene layouts';
  const instanceLabel = instanceCount === 1 ? 'scene instance' : 'scene instances';
  console.log(`Validated ${assetCount} ${assetLabel} across ${sceneCount} ${sceneLabel} and ${instanceCount} ${instanceLabel}.`);
}
