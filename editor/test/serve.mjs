// Servidor de teste com os mesmos cabeçalhos de isolamento usados no app Android
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.wav': 'audio/wav', '.json': 'application/json', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {
    'Content-Type': types[path.extname(p)] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  fs.createReadStream(p).pipe(res);
}).listen(8080, () => console.log('servidor de teste em 8080'));
