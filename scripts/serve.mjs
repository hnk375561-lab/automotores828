// Servidor local sin dependencias para ver el sitio:  npm run dev  ->  http://localhost:8080
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const port = +process.env.PORT || 8080;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'content-type': T['.html'] }); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
  const size = fs.statSync(f).size, r = req.headers.range, t = T[path.extname(f)] || 'application/octet-stream';
  if (r) { const [a, b] = r.replace('bytes=', '').split('-'); const s = +a, e = b ? +b : size - 1; res.writeHead(206, { 'content-type': t, 'content-range': `bytes ${s}-${e}/${size}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 }); return fs.createReadStream(f, { start: s, end: e }).pipe(res); }
  res.writeHead(200, { 'content-type': t, 'content-length': size, 'accept-ranges': 'bytes' }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Sitio en http://localhost:${port}`));
