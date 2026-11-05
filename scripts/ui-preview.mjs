import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/ui-gameplay/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.glb': 'model/gltf-binary',
  '.jpg': 'image/jpeg',
};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(resolve(root) + sep)) {
      response.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(data);
  } catch {
    response.writeHead(404).end('Not found. UI preview file not found.');
  }
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? 'Port 4176 is already in use. Open http://127.0.0.1:4176/' : error);
  process.exitCode = 1;
});
server.listen(4176, '127.0.0.1', () => {
  console.log('Preview: http://127.0.0.1:4176/');
  console.log('Scoring tests: http://127.0.0.1:4176/?debugScoring=1');
});
