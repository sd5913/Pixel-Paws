import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { context } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'work/asset-preview');
await mkdir(resolve(output, 'assets'), { recursive: true });
await cp(resolve(root, 'src/assets/models'), resolve(output, 'assets/models'), { recursive: true });
await cp(resolve(root, 'src/assets/asset-manifest.json'), resolve(output, 'assets/asset-manifest.json'));
await cp(resolve(root, 'scripts/asset-review/index.html'), resolve(output, 'index.html'));
const build = await context({
  entryPoints: [resolve(root, 'scripts/asset-review/main.js')],
  outfile: resolve(output, 'preview.js'), bundle: true, format: 'esm', platform: 'browser',
});
await build.rebuild();
await build.serve({ servedir: output, host: '127.0.0.1', port: 4173 });
console.log('Asset review: http://127.0.0.1:4173 — Ctrl+C to stop. No gameplay loaded.');
process.once('SIGINT', async () => { await build.dispose(); process.exit(0); });
