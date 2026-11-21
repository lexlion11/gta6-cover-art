// Tiny static file server for app/ on port 8080 — Node 22 standard library
// only. Serves index.html at / and resolves any other path under app/.
// Usage: node serve.ts  →  http://localhost:8080

import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'app');
const PORT = 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';

  // Keep the request inside app/ (no traversal).
  const safe = normalize(join(root, path));
  if (!safe.startsWith(root + sep)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  try {
    const stat = statSync(safe);
    if (stat.isDirectory()) {
      res.writeHead(302, { location: path.replace(/\/?$/, '/') + 'index.html' });
      res.end();
      return;
    }
    const type = TYPES[extname(safe).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, {
      'content-type': type,
      'content-length': stat.size,
      'cache-control': 'no-cache',
    });
    createReadStream(safe).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${root} at http://localhost:${PORT}`);
});
