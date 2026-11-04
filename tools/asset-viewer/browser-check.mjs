import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { buildViewer } from './build.mjs';
import { startViewerServer } from './serve.mjs';

const output = resolve('work/asset-viewer-review');
await mkdir(output, { recursive: true });
const sourceRoot = resolve(process.env.VIEWER_SOURCE_ROOT || 'src');
const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'assets/asset-manifest.json'), 'utf8'));
const { htmlPath } = await buildViewer({ sourceRoot });
const server = await startViewerServer({ port: 0 });
const browser = await chromium.launch({ executablePath: process.env.VIEWER_BROWSER_PATH || undefined,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => errors.push(r.url()));
  const url = `http://127.0.0.1:${server.address().port}/asset-viewer/`;
  const frames = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const pixels = () => page.locator('canvas').evaluate(c => c.toDataURL());
  await page.goto(url);
  await page.waitForSelector('html[data-viewer-ready=true]', { timeout: 10000 });
  assert.equal(await page.locator('#asset option').count(), manifest.assets.length + 1);
  await page.selectOption('#mode', 'inspection');
  for (const asset of manifest.assets) {
    const expected = asset.dimensionsMeters[0].toFixed(4);
    await page.selectOption('#asset', asset.id); await frames();
    assert.ok((await page.locator('#metadata').textContent()).includes(expected));
    assert.ok(!(await page.locator('#status').textContent()).includes('failed'));
  }
  await page.selectOption('#asset', 'mug'); await frames();
  assert.ok((await page.locator('#metadata').textContent()).includes('+Z'));
  const original = await pixels();
  for (const toggle of ['wireframe', 'bounds', 'colliders']) {
    await page.check(`#${toggle}`); await frames(); assert.notEqual(await pixels(), original);
    await page.uncheck(`#${toggle}`); await frames(); assert.equal(await pixels(), original);
  }
  await page.screenshot({ path: `${output}/inspection-desktop.png`, fullPage: true });
  await page.click('#zoom-in'); await frames(); assert.notEqual(await pixels(), original);
  await page.click('#reset'); await frames(); assert.equal(await pixels(), original);
  const viewport = await page.locator('canvas').boundingBox();
  await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  await page.mouse.down(); await page.mouse.move(viewport.x + viewport.width / 2 + 100, viewport.y + viewport.height / 2 + 40, { steps: 8 }); await page.mouse.up(); await frames();
  assert.notEqual(await pixels(), original);
  await page.click('#reset'); await frames(); assert.equal(await pixels(), original);
  await page.selectOption('#asset', 'desk-scene');
  await page.check('#colliders'); await page.check('#bounds'); await frames();
  await page.screenshot({ path: `${output}/colliders-desktop.png`, fullPage: true });
  await page.uncheck('#colliders'); await page.uncheck('#bounds');
  await page.selectOption('#mode', 'art');
  const artImages = [];
  for (const preset of ['soft-pastel', 'warm-illustrated', 'faceted-diorama']) {
    await page.selectOption('#preset', preset); await frames();
    artImages.push(await pixels());
    await page.screenshot({ path: `${output}/${preset}-desktop.png`, fullPage: true });
  }
  assert.equal(new Set(artImages).size, 3);
  await page.selectOption('#mode', 'inspection'); await page.selectOption('#asset', 'mug'); await frames();
  assert.equal(await pixels(), original, 'Art Preview must restore original inspection materials');
  const event = page.waitForEvent('download'); await page.click('#save-image');
  const download = await event; assert.ok(download.suggestedFilename().endsWith('.png'));
  await download.saveAs(`${output}/export.png`);
  await page.selectOption('#asset', 'desk-scene'); await page.selectOption('#mode', 'art');
  await page.selectOption('#preset', 'warm-illustrated');
  for (const [width, height] of [[390, 844], [360, 800], [768, 1024]]) {
    await page.setViewportSize({ width, height }); await frames();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.ok((await page.locator('canvas').boundingBox()).height >= 280);
    await page.screenshot({ path: `${output}/viewer-${width}.png`, fullPage: true });
  }
  await page.reload(); await page.waitForSelector('html[data-viewer-ready=true]');
  assert.equal(await page.inputValue('#asset'), 'desk-scene');
  assert.equal(await page.inputValue('#mode'), 'art');
  await page.goto(`${url}?asset=missing&mode=nonsense&preset=invalid`);
  await page.waitForSelector('html[data-viewer-ready=true]');
  assert.equal(await page.inputValue('#asset'), 'desk-scene');
  await page.goto('about:blank'); await context.setOffline(true);
  await page.setContent(await readFile(htmlPath, 'utf8')); await page.waitForSelector('html[data-viewer-ready=true]');
  await page.selectOption('#asset', 'mug'); await page.selectOption('#mode', 'inspection'); await frames();
  assert.ok((await page.locator('#metadata').textContent()).includes('0.0960'));
  assert.deepEqual(errors, []);
  const result = { assets: manifest.assets.length, presets: 3, orbit: true, zoomReset: true, wireframe: true, bounds: true,
    colliders: true, materialRestoration: true, pngExport: true, offline: true, errors,
    viewports: ['1440x1000', '390x844', '360x800', '768x1024'] };
  await writeFile(`${output}/verification.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); await new Promise(done => server.close(done)); }
