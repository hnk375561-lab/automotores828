#!/usr/bin/env node
/* Relleno difuminado de la «Unidad destacada» (js/historia.js).
   Toma la foto indicada en data/dealership.json → historias.destacada.foto.src, la reduce a ~64 px de ancho,
   la desenfoca y la oscurece. El resultado (WebP de 1–2 KB) se incrusta como data: URI en el HTML (cero pedidos extra,
   cero destello). scripts/build-index.mjs lo genera solo en cada build; este comando sirve para ver el resultado.
   Uso:  npm run historia:img    (escribe images/historia/<unidadId>-bg.webp solo para inspección) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Devuelve 'data:image/webp;base64,…' o '' si no se pudo generar (el CSS deja un fondo oscuro liso). */
export async function fondoDifuminado(rutaFoto) {
  try {
    const { default: sharp } = await import('sharp');
    const buf = await sharp(rutaFoto)
      .resize({ width: 64 })
      .blur(2.5)
      .modulate({ brightness: 0.55, saturation: 1.1 })
      .webp({ quality: 60 })
      .toBuffer();
    return `data:image/webp;base64,${buf.toString('base64')}`;
  } catch (e) {
    return '';
  }
}

const esCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esCli) {
  const d = JSON.parse(fs.readFileSync(path.join(root, 'data/dealership.json'), 'utf8'));
  const h = d.historias && d.historias.destacada;
  if (!h || !h.foto || !h.foto.src) { console.error('Falta historias.destacada.foto.src en data/dealership.json'); process.exit(1); }
  const uri = await fondoDifuminado(path.join(root, h.foto.src));
  if (!uri) { console.error('No se pudo generar el relleno (¿falta sharp? npm ci).'); process.exit(1); }
  const salida = path.join(root, 'images/historia', `${h.unidadId}-bg.webp`);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, Buffer.from(uri.split(',')[1], 'base64'));
  console.log(`✓ ${path.relative(root, salida)} (${Math.round(uri.length * 0.75)} bytes)`);
}
