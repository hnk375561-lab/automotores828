#!/usr/bin/env node
/* Valida las páginas de vista previa por unidad (u/<id>/index.html): una por unidad, con su og:image propia, absoluta y existente. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const autos = JSON.parse(fs.readFileSync(path.join(root, 'data/vehicles.json'), 'utf8')).autos;
const errs = [], imgs = new Map();
for (const a of autos) {
  const f = path.join(root, 'u', String(a.id), 'index.html');
  if (!fs.existsSync(f)) { errs.push(`${a.id}: falta u/${a.id}/index.html (npm run build)`); continue; }
  const h = fs.readFileSync(f, 'utf8');
  const og = (k) => (h.match(new RegExp(`<meta property="${k}" content="([^"]*)"`)) || [])[1];
  const img = og('og:image');
  if (!img) { errs.push(`${a.id}: sin og:image`); continue; }
  if (!/^https:\/\//.test(img) && !/^\.\.\/\.\.\/images\//.test(img)) errs.push(`${a.id}: og:image no es absoluta https: ${img}`);
  if (!/^https:\/\//.test(img) || /images\//.test(img)) {
    const local = path.join(root, img.slice(img.indexOf('images/')));
    if (!fs.existsSync(local)) errs.push(`${a.id}: no existe ${path.relative(root, local)} (npm run og:units)`);
  }
  if (!/og\/u-/.test(img)) errs.push(`${a.id}: usa la imagen general; falta images/og/u-${a.id}.jpg (npm run og:units)`);
  if (!(og('og:title') || '').includes(a.titulo.replace(/&/g, '&amp;'))) errs.push(`${a.id}: og:title no menciona «${a.titulo}»`);
  if (!h.includes(`#unidad=${encodeURIComponent(String(a.id))}`)) errs.push(`${a.id}: no redirige a #unidad=${a.id}`);
  if (/\d[\d.]*\s?(USD|ARS|\$)|(USD|ARS|\$)\s?\d/.test(og('og:description') || '')) errs.push(`${a.id}: la vista previa no debe llevar precio`);
  if (imgs.has(img)) errs.push(`${a.id}: comparte og:image con ${imgs.get(img)}`); else imgs.set(img, a.id);
}
const extra = fs.existsSync(path.join(root, 'u')) ? fs.readdirSync(path.join(root, 'u')).filter((d) => !autos.some((a) => String(a.id) === d)) : [];
if (extra.length) errs.push(`páginas u/ huérfanas: ${extra.join(', ')}`);
if (errs.length) { console.error('✖ Vista previa por unidad:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ Vista previa por unidad: ${autos.length} páginas, cada una con su imagen propia y su redirección.`);
