import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';

export async function buildSite({ sourceDir = 'src', outputDir = 'www' } = {}) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(resolve(outputDir, 'assets'), { recursive: true });

  await Promise.all([
    cp(resolve(sourceDir, 'index.html'), resolve(outputDir, 'index.html')),
    cp(resolve(sourceDir, 'style.css'), resolve(outputDir, 'style.css')),
    cp(resolve(sourceDir, 'assets', 'asset-manifest.json'), resolve(outputDir, 'assets', 'asset-manifest.json')),
    cp(resolve(sourceDir, 'assets', 'models'), resolve(outputDir, 'assets', 'models'), { recursive: true }),
    cp(resolve(sourceDir, 'scenes'), resolve(outputDir, 'scenes'), { recursive: true }),
  ]);

  await build({
    entryPoints: [resolve(sourceDir, 'app.js')],
    outfile: resolve(outputDir, 'app.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    nodePaths: [resolve('node_modules')],
    logLevel: 'silent',
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  await buildSite();
}
