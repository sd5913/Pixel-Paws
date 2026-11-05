import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildSite } from './build.mjs';

test('buildSite bundles local Three.js and copies packaged assets', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'pixel-paws-build-'));
  const sourceDir = join(fixtureRoot, 'src');
  const outputDir = join(fixtureRoot, 'www');

  await mkdir(join(sourceDir, 'assets', 'models'), { recursive: true });
  await mkdir(join(sourceDir, 'assets', 'ui'), { recursive: true });
  await writeFile(join(sourceDir, 'assets', 'ui', 'joystick.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await mkdir(join(sourceDir, 'scenes'), { recursive: true });
  await writeFile(join(sourceDir, 'index.html'), '<script type="module" src="app.js"></script>');
  await writeFile(join(sourceDir, 'style.css'), 'body { margin: 0; }');
  await writeFile(
    join(sourceDir, 'app.js'),
    "import * as THREE from 'three'; console.log(THREE.REVISION);",
  );
  await writeFile(join(sourceDir, 'assets', 'asset-manifest.json'), '{"schemaVersion":1}');
  await writeFile(join(sourceDir, 'assets', 'validation.js'), 'export const internal = true;');
  await writeFile(join(sourceDir, 'assets', 'models', 'placeholder.glb'), Buffer.from('glTF'));
  await writeFile(join(sourceDir, 'scenes', 'preview.scene.json'), '{"schemaVersion":1}');

  await buildSite({ sourceDir, outputDir });

  const bundle = await readFile(join(outputDir, 'app.js'), 'utf8');
  assert.doesNotMatch(bundle, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(bundle, /from\s+["']three["']/);
  assert.match(bundle, /REVISION/);
  assert.equal(await readFile(join(outputDir, 'assets', 'models', 'placeholder.glb'), 'utf8'), 'glTF');
  assert.equal(await readFile(join(outputDir, 'assets', 'ui', 'joystick.svg'), 'utf8'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  assert.equal(await readFile(join(outputDir, 'assets', 'asset-manifest.json'), 'utf8'), '{"schemaVersion":1}');
  assert.equal(await readFile(join(outputDir, 'scenes', 'preview.scene.json'), 'utf8'), '{"schemaVersion":1}');
  await assert.rejects(readFile(join(outputDir, 'assets', 'validation.js')), { code: 'ENOENT' });
});
