import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAudioAssets } from './audio-assets.mjs';

test('audio discovery works empty and copies only local supported audio into a sorted catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'audio-assets-'));
  const source = join(root, 'src');
  const output = join(root, 'out');
  await buildAudioAssets(source, output);
  assert.deepEqual(JSON.parse(await readFile(join(output, 'catalog.json'))), []);
  await mkdir(join(source, 'impacts/ceramic/wood/light'), { recursive: true });
  await writeFile(join(source, 'impacts/ceramic/wood/light/hit.mp3'), 'test fixture, not playable audio');
  await writeFile(join(source, 'README.md'), 'not an audio sample');
  await buildAudioAssets(source, output);
  assert.deepEqual(JSON.parse(await readFile(join(output, 'catalog.json'))), ['impacts/ceramic/wood/light/hit.mp3']);
  assert.equal(await readFile(join(output, 'impacts/ceramic/wood/light/hit.mp3'), 'utf8'), 'test fixture, not playable audio');
  await assert.rejects(readFile(join(output, 'README.md')), { code: 'ENOENT' });
});
