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
// u/<id>/index.html: páginas de vista previa por unidad (WhatsApp/Facebook); redirigen a la ficha.

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let n = 0;
// URL absoluta para las vistas previas (og:image). En Netlify sale sola del entorno de build.
// Cloudflare Pages expone CF_PAGES_URL (https://<proyecto>.pages.dev); Netlify, DEPLOY_PRIME_URL / URL.
const envBase = (process.env.CF_PAGES_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || '').replace(/\/?$/, '/');
// Si el HTML ya trae una base absoluta de GitHub Pages (respaldo del generador) se reemplaza por la de este despliegue,
// porque con el repo privado esa dirección no existe y WhatsApp/Facebook dejarían el enlace sin imagen.
const GH_BASE = /https:\/\/[a-z0-9-]+\.github\.io\/[A-Za-z0-9._-]+\//g;
const rebase = (h) => {
  if (envBase === '/') return h;
  return h.replace(GH_BASE, envBase)
    .replace(/(<meta (?:property="og:image(?::secure_url)?"|name="twitter:image") content=")(?:\.\.\/)*images\//g, `$1${envBase}images/`);
};
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) { console.error(`Falta ${f}. ¿Corriste npm run build?`); process.exit(1); }
  if (f.endsWith('.html') && envBase !== '/') {
    fs.writeFileSync(path.join(out, f), rebase(fs.readFileSync(path.join(root, f), 'utf8')));
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
if (fs.existsSync(path.join(root, 'u'))) {
  for (const ent of fs.readdirSync(path.join(root, 'u'), { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const src = path.join(root, 'u', ent.name, 'index.html'); if (!fs.existsSync(src)) continue;
    const h = rebase(fs.readFileSync(src, 'utf8'));
    fs.mkdirSync(path.join(out, 'u', ent.name), { recursive: true }); fs.writeFileSync(path.join(out, 'u', ent.name, 'index.html'), h); n++;
  }
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
// _headers (Cloudflare Pages / Netlify): equivalente a los [[headers]] de netlify.toml. En modo demo suma noindex por cabecera.
{
  let demo = true;
  try { demo = JSON.parse(fs.readFileSync(path.join(root, 'data', 'dealership.json'), 'utf8')).publicacion?.publicIndexing !== true; } catch (e) { /* ante la duda: demo */ }
  const h = ['/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', ...(demo ? ['  X-Robots-Tag: noindex, nofollow'] : []), '',
    '/fonts/*', '  Cache-Control: public, max-age=31536000, immutable', '',
    '/images/*', '  Cache-Control: public, max-age=604800, stale-while-revalidate=86400', ''];
  fs.writeFileSync(path.join(out, '_headers'), h.join('\n'));
}
console.log(`_site/ listo: ${n} archivos`);
