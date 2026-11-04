import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildViewer } from './build.mjs';

export function startViewerServer({ outputRoot = 'work/viewer-pages', port = 4175, host = '127.0.0.1' } = {}) {
  const root = resolve(outputRoot);
  const server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/') { response.writeHead(302, { Location: './asset-viewer/' }).end(); return; }
    let filename;
    try { filename = resolve(root, `.${decodeURIComponent(pathname)}`, pathname.endsWith('/') ? 'index.html' : ''); }
    catch { response.writeHead(400).end(); return; }
    if (!filename.startsWith(`${root}${sep}`)) { response.writeHead(403).end(); return; }
    try {
      const content = await readFile(filename);
      const contentType = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' }[extname(filename)] || 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' }).end(request.method === 'HEAD' ? undefined : content);
    } catch { response.writeHead(404).end('Not found'); }
  });
  return new Promise((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolveReady(server));
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await buildViewer();
  const server = await startViewerServer({ port: Number(process.env.PORT || 4175) });
  console.log(`Asset Viewer: http://localhost:${server.address().port}/asset-viewer/`);
}
