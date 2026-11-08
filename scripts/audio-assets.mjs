import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// esbuild has no import.meta.glob. Generate a local catalog at build time instead.
export async function buildAudioAssets(source, output) {
  const paths = [];
  async function walk(directory, prefix = '') {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) await walk(join(directory, entry.name), `${relative}/`);
      else if (entry.isFile() && /\.(mp3|wav|ogg|m4a)$/i.test(entry.name)) paths.push(relative);
    }
  }
  await walk(source);
  await mkdir(output, { recursive: true });
  for (const path of paths.sort()) {
    await mkdir(dirname(join(output, path)), { recursive: true });
    await cp(join(source, path), join(output, path));
  }
  await writeFile(join(output, 'catalog.json'), JSON.stringify(paths, null, 2) + '\n');
}
