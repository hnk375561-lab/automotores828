// Convierte las fotos originales de una unidad en las variantes que usa el sitio.
// Uso:   npm install            (una vez: instala sharp)
//        node scripts/make-images.mjs <slug> <carpeta-con-fotos> [--ratio 4:3|original]
// Ej.:   node scripts/make-images.mjs gol-2018 ./fotos-brutas/gol
// Salida: images/<slug>-N.webp (1280 px), <slug>-N-800.webp y <slug>-N-480.webp  (+ el fragmento listo para pegar en STOCK).
// Las fotos se ordenan por nombre de archivo: la primera es la portada.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
let sharp; try { sharp = (await import('sharp')).default; } catch { console.error('Falta sharp: correr "npm install" primero.'); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, dir, ...rest] = process.argv.slice(2);
if (!slug || !dir || !/^[a-z0-9-]+$/.test(slug)) { console.error('Uso: node scripts/make-images.mjs <slug-en-minusculas> <carpeta> [--ratio 4:3|original]'); process.exit(1); }
const original = rest.join(' ').includes('original');
const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!files.length) { console.error('No hay fotos en ' + dir); process.exit(1); }
const out = path.join(root, 'images'); fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const f of files) {
  n++; const src = sharp(path.join(dir, f), { failOn: 'none' }).rotate();  // respeta la orientación EXIF
  const big = original ? src.clone().resize({ width: 1280, withoutEnlargement: true }) : src.clone().resize(1280, 960, { fit: 'cover', position: 'attention' });
  await big.webp({ quality: 78 }).toFile(path.join(out, `${slug}-${n}.webp`));
  for (const w of [800, 480]) await sharp(path.join(out, `${slug}-${n}.webp`)).resize({ width: w }).webp({ quality: 74 }).toFile(path.join(out, `${slug}-${n}-${w}.webp`));
  console.log(`  ${f} -> ${slug}-${n}.webp (+800, +480)`);
}
console.log(`\nListo: ${n} fotos. Pegar en STOCK (index.html), completar solo con datos de la publicación:\n`);
console.log(`  { foto:"images/${slug}-1.webp", fotos:[${Array.from({ length: n }, (_, i) => i + 1)}].map(function(n){return "images/${slug}-"+n+".webp"}), titulo:"Marca Modelo Versión", corto:"Modelo", anio:0000, km:"000.000 km", combustible:"Nafta", precio:"Consultar", nota:"Texto de la publicación." },\n`);
console.log('Después: npm run prerender && npm test');
