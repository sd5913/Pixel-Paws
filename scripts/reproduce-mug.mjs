import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectGlb } from './inspect-glb.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const original = await readFile(join(root, 'src/assets/models/mug.glb'));
const originalSpec = await readFile(join(root, 'src/assets/asset-spec.json'));
await mkdir(join(root, 'work'), { recursive: true });
const temporary = await mkdtemp(join(root, 'work/mug-reproduction-'));
try {
  await mkdir(join(temporary, 'node_modules'));
  await symlink(join(root, 'node_modules/three-mug-reference'), join(temporary, 'node_modules/three'), 'dir');
  const outputs = [];
  for (const run of ['first', 'second']) {
    const assets = join(temporary, run, 'assets');
    await mkdir(join(assets, 'generators'), { recursive: true });
    await mkdir(join(assets, 'models'), { recursive: true });
    const generator = join(assets, 'generators/generate-mug.mjs');
    await copyFile(join(root, 'src/assets/generators/generate-mug.mjs'), generator);
    const result = spawnSync(process.execPath, [generator], { cwd: root, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    const bytes = await readFile(join(assets, 'models/mug.glb'));
    const spec = JSON.parse(await readFile(join(assets, 'asset-spec.json'), 'utf8'));
    const measured = await inspectGlb(bytes);
    assert.equal(measured.issues.numWarnings, 0);
    assert.deepEqual(measured.dimensionsMeters, spec.dimensionsMeters);
    outputs.push({ bytes, spec, measured });
  }
  assert.deepEqual(outputs[0].bytes, outputs[1].bytes, 'Generator must be deterministic');
  assert.deepEqual(outputs[0].spec, outputs[1].spec);
  assert.deepEqual(outputs[0].bytes, original, 'Reproduction differs from approved mug; do not replace it');
  assert.deepEqual(outputs[0].spec, JSON.parse(originalSpec));
  console.log(`Two isolated runs reproduce the approved mug exactly: ${outputs[0].measured.sha256}`);
} finally {
  assert.deepEqual(await readFile(resolve(root, 'src/assets/models/mug.glb')), original);
  assert.deepEqual(await readFile(resolve(root, 'src/assets/asset-spec.json')), originalSpec);
  await rm(temporary, { recursive: true, force: true });
}
