import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildViewer } from './build.mjs';
import { presets } from '../../experiments/illustrated-rendering/presets.js';

test('shared illustrated presets exactly preserve the original published settings', async () => {
  assert.deepEqual(presets, JSON.parse(await readFile(new URL('./presets.expected.json', import.meta.url))));
});

test('Pages package preserves existing root content and automatically embeds new manifest assets', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'viewer-build-'));
  try {
    const sourceRoot = join(scratch, 'source');
    await cp(resolve('src/assets'), join(sourceRoot, 'assets'), { recursive: true });
    await cp(resolve('src/scenes'), join(sourceRoot, 'scenes'), { recursive: true });
    const manifest = JSON.parse(await readFile(join(sourceRoot, 'assets/asset-manifest.json')));
    const added = structuredClone(manifest.assets[0]); added.id = 'future-prop';
    added.path = 'assets/models/future-prop.glb'; manifest.assets.push(added);
    await cp(join(sourceRoot, manifest.assets[0].path), join(sourceRoot, added.path));
    await writeFile(join(sourceRoot, 'assets/asset-manifest.json'), JSON.stringify(manifest));
    const outputRoot = join(scratch, 'site'); await mkdir(outputRoot);
    await writeFile(join(outputRoot, 'index.html'), 'existing homepage');
    await writeFile(join(outputRoot, 'CNAME'), 'existing.example.com');
    const { htmlPath, assetCount } = await buildViewer({ outputRoot, sourceRoot });
    assert.equal(assetCount, 4);
    assert.equal(htmlPath, join(outputRoot, 'asset-viewer/index.html'));
    assert.equal(await readFile(join(outputRoot, 'index.html'), 'utf8'), 'existing homepage');
    assert.equal(await readFile(join(outputRoot, 'CNAME'), 'utf8'), 'existing.example.com');
    const html = await readFile(htmlPath, 'utf8');
    assert.match(html, /future-prop/);
    assert.ok(!html.includes('/* INLINE_SCRIPT */'));
    assert.ok(!html.includes('/* INLINE_STYLE */'));
    assert.ok(!/<script[^>]+src=/.test(html));
    assert.ok(!/https?:\/\/cdn/.test(html));
  } finally { await rm(scratch, { recursive: true, force: true }); }
});

test('build rejects an altered approved GLB instead of publishing it', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'viewer-tamper-'));
  try {
    await cp(resolve('src/assets'), join(scratch, 'assets'), { recursive: true });
    await cp(resolve('src/scenes'), join(scratch, 'scenes'), { recursive: true });
    const mugPath = join(scratch, 'assets/models/mug.glb');
    const bytes = await readFile(mugPath); bytes[bytes.length - 1] ^= 1;
    await writeFile(mugPath, bytes);
    await assert.rejects(buildViewer({ sourceRoot: scratch, outputRoot: join(scratch, 'out') }), /approved|SHA|digest/i);
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
