// Arma _site/ con SOLO los archivos públicos (lista blanca). data/, golive/, docs/, scripts/ y notas no se publican.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');
const files = ['index.html', 'reserva.html', 'privacidad.html', '404.html', 'robots.txt', 'site.webmanifest', 'favicon.svg'];
const optional = ['sitemap.xml'];
// .nojekyll es un archivo oculto vacío que a veces no viaja en los zips: se crea acá, no se exige en el repo.
const dirs = ['fonts', 'images'];
const whole = ['css', 'js'];   // se copian completas

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let n = 0;
// URL absoluta para las vistas previas (og:image). En Netlify sale sola del entorno de build.
const envBase = (process.env.DEPLOY_PRIME_URL || process.env.URL || '').replace(/\/?$/, '/');
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) { console.error(`Falta ${f}. ¿Corriste npm run build?`); process.exit(1); }
  if (f.endsWith('.html') && envBase !== '/') {
    // completa las metas OG que quedaron relativas (build sin previewUrl/siteUrl)
    let h = fs.readFileSync(path.join(root, f), 'utf8');
    h = h.replace(/(<meta (?:property="og:image(?::secure_url)?"|name="twitter:image") content=")images\//g, `$1${envBase}images/`);
    fs.writeFileSync(path.join(out, f), h);
  } else fs.copyFileSync(path.join(root, f), path.join(out, f));
  n++;
}
for (const f of optional) if (fs.existsSync(path.join(root, f))) { fs.copyFileSync(path.join(root, f), path.join(out, f)); n++; }
function copyPublicAssets(src, dest, allowed) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name), to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyPublicAssets(from, to, allowed);
    else if (ent.isFile() && allowed.test(ent.name)) { fs.copyFileSync(from, to); n++; }
  }
}
for (const d of dirs) {
  const src = path.join(root, d);
  if (!fs.existsSync(src)) continue;
  const allowed = d === 'fonts' ? /\.woff2$/i : /\.(webp|png|jpe?g|svg|avif)$/i;
  copyPublicAssets(src, path.join(out, d), allowed);
}
for (const d of whole) { const src = path.join(root, d); if (fs.existsSync(src)) { fs.cpSync(src, path.join(out, d), { recursive: true }); n += fs.readdirSync(src, { recursive: true }).length; } }
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`_site/ listo: ${n} archivos`);
