import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inspectGlb } from './inspect-glb.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const generator = join(root, 'src/assets/generators/generate-desk.mjs');
const checkedDesk = await readFile(join(root, 'src/assets/models/desk.glb'));
const checkedSpec = JSON.parse(await readFile(join(root, 'src/assets/desk-spec.json'), 'utf8'));
const mug = await readFile(join(root, 'src/assets/models/mug.glb'));
const mugHash = createHash('sha256').update(mug).digest('hex');
assert.equal(mugHash, 'e13d5667b6688c7a74e3c81a427b92fec4f49f79a27660c067eee6237c34b79e');

await mkdir(join(root, 'work'), { recursive: true });
const temporary = await mkdtemp(join(root, 'work/desk-reproduction-'));
try {
  const outputs = [];
  for (const run of ['first', 'second']) {
    const output = join(temporary, run);
    const result = spawnSync(process.execPath, [generator, `--output-dir=${output}`], {
      cwd: root, encoding: 'utf8',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    const bytes = await readFile(join(output, 'models/desk.glb'));
    const spec = JSON.parse(await readFile(join(output, 'desk-spec.json'), 'utf8'));
    const measurement = await inspectGlb(bytes);
    assert.equal(measurement.issues.numWarnings, 0);
    assert.deepEqual(measurement.dimensionsMeters, spec.dimensionsMeters);
    outputs.push({ bytes, spec, measurement });
  }
  assert.deepEqual(outputs[0].bytes, outputs[1].bytes, 'Desk generator must be deterministic');
  assert.deepEqual(outputs[0].spec, outputs[1].spec);
  assert.deepEqual(outputs[0].bytes, checkedDesk, 'Generated desk differs from checked-in desk.glb');
  assert.deepEqual(outputs[0].spec, checkedSpec, 'Generated desk report differs from checked-in desk-spec.json');
  assert.equal(
    createHash('sha256').update(await readFile(join(root, 'src/assets/models/mug.glb'))).digest('hex'),
    mugHash,
    'Desk reproduction changed the approved mug',
  );
  console.log(`Two isolated runs reproduce desk.glb exactly: ${outputs[0].measurement.sha256}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
