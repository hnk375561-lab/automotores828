// Servidor estatico con gzip (como GitHub Pages) para medir Lighthouse sin sesgo.
// Uso: node scripts/serve-gzip.mjs <carpeta> <puerto>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] || '_site');
const port = Number(process.argv[3] || 8080);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const COMPRIMIBLES = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
    const ext = path.extname(file).toLowerCase();
    const h = { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', Vary: 'Accept-Encoding' };
    const gz = COMPRIMIBLES.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (req.method === 'HEAD') { res.writeHead(200, h).end(); return; }
    if (gz) { res.writeHead(200, { ...h, 'Content-Encoding': 'gzip' }); fs.createReadStream(file).pipe(zlib.createGzip({ level: 6 })).pipe(res); }
    else { res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res); }
  });
}).listen(port, () => console.log('sirviendo ' + root + ' en :' + port));
