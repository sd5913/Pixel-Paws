import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.argv[2] || 'work/illustrated-rendering');
const bundle = await build({
  entryPoints: [resolve(root, 'preview.js')], bundle: true, write: false,
  format: 'esm', target: 'es2022', minify: true, loader: { '.glb': 'binary' },
});
const html = (await readFile(resolve(root, 'index.html'), 'utf8'))
  .replace('/* INLINE_STYLE */', await readFile(resolve(root, 'style.css'), 'utf8'))
  .replace('/* INLINE_SCRIPT */', () => bundle.outputFiles[0].text.replaceAll('</script', '<\\/script'));
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'index.html'), html);
console.log(`Standalone preview: ${resolve(output, 'index.html')}`);
