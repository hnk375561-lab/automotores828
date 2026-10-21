// Muestra qué cambiaría el paso a producción SIN aplicar nada (solo modo --dry).
// Uso: npm run golive -- --dry --domain=https://www.ejemplo.com.ar
// Ver golive/PRODUCCION.md. No ejecutar el paso real hasta tener dominio y autorización de fotos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args.includes('--dry')) { console.error('Solo existe el modo --dry (no aplica cambios). Uso: npm run golive -- --dry --domain=https://tu-dominio/'); process.exit(2); }
const dom = ((args.find((a) => a.startsWith('--domain=')) || '').slice(9) || 'https://DOMINIO-DEFINITIVO').replace(/\/+$/, '') + '/';
const json = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const d = json('data/dealership.json');
const pend = json('data/pendientes.json').items.filter((i) => i.estado !== 'resuelto');
const out = [];
const note = (f, m) => out.push(`  ${f.padEnd(26)} ${m}`);
note('data/dealership.json', `publicacion: status "produccion", official true, publicIndexing true, siteUrl ${dom}`);
for (const f of ['index.html', 'reserva.html', 'privacidad.html', '404.html']) note(f, 'se regenera sin noindex ni aviso de demo, con canonical (npm run build)');
note('robots.txt', `"Disallow: /" pasa a "Allow: /" y se agrega "Sitemap: ${dom}sitemap.xml"`);
note('sitemap.xml', 'se crea en la raíz (hoy solo existe golive/sitemap.xml, preparado)');
note('index.html', 'pegar golive/json-ld-autodealer.html en <head> con el dominio real');
note('privacidad.html', 'completar responsable (razón social, domicilio legal, email) y revisión profesional');
const bloq = pend.filter((i) => i.bloqueante);
console.log(`Paso a producción (SIMULACIÓN, no se escribió nada) · dominio: ${dom}\nEstado actual: publicIndexing=${d.publicacion.publicIndexing}\n${out.join('\n')}\n\nPendientes bloqueantes abiertos (${bloq.length}): ${bloq.map((i) => `${i.id} ${i.tema}`).join(' · ') || 'ninguno'}\n\nDespués: npm run build · npm test · npm run test:prod · revisar en celular.`);
