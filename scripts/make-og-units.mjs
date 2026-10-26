#!/usr/bin/env node
/* Genera images/og/u-<id>.jpg (1200x630) para la vista previa al compartir CADA unidad.
   Fuente: la primera foto de la ficha (data/vehicles.json → fotos[0].src). Las mismas fotos que ya muestra el sitio.
   Composición: fondo = la misma foto desenfocada y oscurecida, foto completa SIN recorte al centro, emblema 828 en la esquina.
   Uso:  npm run og:units     (después:  npm run build) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200, H = 630;
const autos = JSON.parse(fs.readFileSync(path.join(root, 'data/vehicles.json'), 'utf8')).autos;
const outDir = path.join(root, 'images/og');
fs.mkdirSync(outDir, { recursive: true });
const emblem = await sharp(path.join(root, 'images/logo-emblema-828.png')).resize(120, 120).png().toBuffer();

let ok = 0, skip = 0;
const keep = new Set();
for (const a of autos) {
  const f = a.fotos && a.fotos[0] && (a.fotos[0].src || a.fotos[0].card);
  const src = f && path.join(root, f);
  if (!src || !fs.existsSync(src)) { skip++; console.warn(`sin foto: ${a.id} (queda la imagen general del sitio)`); continue; }
  const bg = await sharp(src).resize(W, H, { fit: 'cover' }).blur(28).modulate({ brightness: 0.42 }).toBuffer();
  const fg = await sharp(src).resize({ height: H, width: W, fit: 'inside' }).toBuffer();
  const meta = await sharp(fg).metadata();
  const left = Math.round((W - meta.width) / 2);
  const bar = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${W}" height="8" fill="#ee1c22"/></svg>`);
  const name = `u-${a.id}.jpg`;
  await sharp(bg)
    .composite([{ input: fg, left, top: 0 }, { input: bar, left: 0, top: 0 }, { input: emblem, left: W - 150, top: H - 150 }])
    .jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(outDir, name));
  keep.add(name); ok++;
}
for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) fs.rmSync(path.join(outDir, f));   // sin huérfanas
console.log(`images/og: ${ok} imágenes generadas, ${skip} unidades sin foto`);
