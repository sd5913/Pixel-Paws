import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateAssetManifest, validateSceneLayout } from '../../src/assets/validation.js';
import { validateAssetFiles } from '../../scripts/validate-asset-files.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(directory, '../..');

export async function buildViewer({ outputRoot = resolve(repo, 'work/viewer-pages'), sourceRoot = resolve(repo, 'src') } = {}) {
  const manifest = validateAssetManifest(JSON.parse(await readFile(join(sourceRoot, 'assets/asset-manifest.json'), 'utf8')));
  const layout = validateSceneLayout(JSON.parse(await readFile(join(sourceRoot, 'scenes/study-desk-preview.scene.json'), 'utf8')), manifest);
  for (const asset of manifest.assets) {
    if (!asset.approvedSha256) continue;
    const digest = createHash('sha256').update(await readFile(resolve(sourceRoot, asset.path))).digest('hex');
    if (digest !== asset.approvedSha256) throw new Error(`Asset ${asset.id} approved SHA-256 digest does not match.`);
  }
  await validateAssetFiles(manifest, sourceRoot);
  const imports = manifest.assets.map((asset, i) => `import model${i} from ${JSON.stringify(resolve(sourceRoot, asset.path))};`).join('\n');
  const catalog = `${imports}\nexport const manifest = ${JSON.stringify(manifest)};\nexport const layout = ${JSON.stringify(layout)};\nexport const models = {${manifest.assets.map((asset, i) => `${JSON.stringify(asset.id)}:model${i}`).join(',')}};`;
  const result = await build({ entryPoints: [join(directory, 'app.js')], write: false,
    bundle: true, minify: true, format: 'esm', target: 'es2022', loader: { '.glb': 'binary' },
    plugins: [{ name: 'manifest-catalog', setup(plugin) {
      plugin.onResolve({ filter: /^viewer:catalog$/ }, () => ({ path: 'catalog', namespace: 'viewer' }));
      plugin.onLoad({ filter: /.*/, namespace: 'viewer' }, () => ({ contents: catalog, loader: 'js', resolveDir: repo }));
    } }],
  });
  // Keep all resources embedded: the same artifact works under a project Pages prefix or offline.
  const template = await readFile(join(directory, 'index.html'), 'utf8');
  const stylesheet = await readFile(join(directory, 'style.css'), 'utf8');
  const finalHtml = template
    .replace('/* INLINE_STYLE */', () => stylesheet)
    .replace('/* INLINE_SCRIPT */', () => result.outputFiles[0].text.replaceAll('</script', '<\\/script'));
  const output = resolve(outputRoot, 'asset-viewer');
  await mkdir(output, { recursive: true });
  const htmlPath = join(output, 'index.html');
  await writeFile(htmlPath, finalHtml);
  await writeFile(join(output, 'THREE-LICENSE.txt'), await readFile(join(repo, 'node_modules/three/LICENSE')));
  return { htmlPath, assetCount: manifest.assets.length };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = await buildViewer({ outputRoot: process.argv[2] });
  console.log(`Asset Viewer: ${result.htmlPath} (${result.assetCount} manifest assets)`);
}
