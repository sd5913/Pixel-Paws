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
  await writeFile(join(sourceDir, 'landing.html'), '<link rel="stylesheet" href="landing.css">');
  await writeFile(join(sourceDir, 'landing.css'), 'body { color: #333; }');
  await mkdir(join(sourceDir, 'privacy'));
  await writeFile(join(sourceDir, 'privacy', 'index.html'), '<title>Privacy Policy</title>');
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

  await writeFile(join(sourceDir, 'level-2.html'), '<script type="module" src="level-2.js"></script>');
  await writeFile(join(sourceDir, 'level-2.js'), 'console.log("Level two");');

  await writeFile(join(sourceDir, 'level-3.html'), '<script type="module" src="level-3.js"></script>');
  await writeFile(join(sourceDir, 'level-3.js'), 'console.log("Level three");');
  await buildSite({ sourceDir, outputDir });
  assert.match(await readFile(join(outputDir, 'level-3.js'), 'utf8'), /Level three/);

  assert.match(await readFile(join(outputDir, 'index.html'), 'utf8'), /landing\.css/);
  assert.match(await readFile(join(outputDir, 'play.html'), 'utf8'), /app\.js/);
  assert.match(await readFile(join(outputDir, 'landing.css'), 'utf8'), /color: #333/);
  assert.equal(await readFile(join(outputDir, 'privacy', 'index.html'), 'utf8'), '<title>Privacy Policy</title>');
  assert.match(await readFile(join(outputDir, 'level-2.html'), 'utf8'), /level-2\.js/);
  assert.match(await readFile(join(outputDir, 'level-2.js'), 'utf8'), /Level two/);

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
