import './build.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const htmlPath = resolve(process.argv[2] || 'work/illustrated-rendering', 'index.html');
const port = Number(process.env.PORT || 4174);
createServer(async (request, response) => {
  if (!['/', '/index.html'].includes(new URL(request.url, 'http://localhost').pathname)) {
    response.writeHead(404).end('Not found'); return;
  }
  try {
    const html = await readFile(htmlPath);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  } catch {
    response.writeHead(500).end('Preview build unavailable; run build.mjs again.');
  }
}).listen(port, '0.0.0.0', () => console.log(`Preview: http://localhost:${port}`));
