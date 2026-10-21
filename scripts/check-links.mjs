// Verificador de enlaces de Automotores 828.  Uso:   node scripts/check-links.mjs            (solo enlaces internos y formatos)
//                                           node scripts/check-links.mjs --external (además prueba los externos por red)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const external = process.argv.includes('--external');
const pages = ['index.html', 'reserva.html', 'privacidad.html', '404.html'].filter((f) => fs.existsSync(path.join(root, f)));
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);
const problems = [], review = [], extUrls = new Map();
const add = (list, where, url, why) => list.push({ where, url: url.length > 110 ? url.slice(0, 107) + '…' : url, why });
const ids = (html) => new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]));
const htmlOf = Object.fromEntries(pages.map((p) => [p, fs.readFileSync(path.join(root, p), 'utf8')]));
const idsOf = Object.fromEntries(pages.map((p) => [p, ids(htmlOf[p])]));

function checkFormat(where, raw) {
  const url = raw.replace(/&amp;/g, '&');
  if (/DOMINIO-FINAL/.test(url)) return add(problems, where, url, 'placeholder sin reemplazar');
  // Leaflet sustituye {s} por a, b o c al solicitar cada mosaico; la plantilla no es un enlace navegable.
  if (/^https:\/\/\{s\}\.tile\.openstreetmap\.org\//.test(url)) return;
  if (url.startsWith('tel:')) { if (!/^tel:\+\d{10,15}$/.test(url)) add(problems, where, url, 'tel: mal formado'); return; }
  if (url.startsWith('mailto:')) return;
  if (url.startsWith('https://wa.me/')) {
    const num = url.slice(14).split('?')[0];
    if (num && !/^549\d{10}$/.test(num) && !/\$\{/.test(num)) add(problems, where, url, 'número de WhatsApp con formato raro (esperado 549 + 10 dígitos)');
    if (/\?text=/.test(url) && !/\$\{/.test(url)) { try { decodeURIComponent(url.split('text=')[1]); } catch { add(problems, where, url, 'texto de WhatsApp mal codificado'); } }
    return;
  }
  if (/google\.com\/maps/.test(url) || /waze\.com/.test(url)) { add(review, where, url, 'mapa: abrirlo a mano y confirmar que muestra el local'); return; }
  if (/^https?:\/\//.test(url) && !/\$\{/.test(url) && !/schema\.org|sitemaps\.org/.test(url)) extUrls.set(url, (extUrls.get(url) || new Set()).add(where));
}

for (const p of pages) {
  const html = htmlOf[p];
  for (const m of html.matchAll(/\s(?:href|src|data-href|data-url)=["']([^"']+)["']/g)) {
    const raw = m[1].trim(); if (!raw || raw.startsWith('data:') || raw.startsWith('javascript:')) continue;
    if (raw.startsWith('#')) { if (raw.length > 1 && raw !== '#unidad-' && !idsOf[p].has(raw.slice(1))) add(problems, p, raw, 'ancla sin destino (no existe ese id en la página)'); continue; }
    if (/^(https?:|tel:|mailto:)/.test(raw)) { checkFormat(p, raw); continue; }
    const [file, hash] = raw.split('#'); const clean = file.split('?')[0]; if (!clean) continue;
    const target = path.join(root, clean.replace(/^\//, ''));
    if (!fs.existsSync(target)) { add(problems, p, raw, 'archivo local inexistente'); continue; }
    if (hash && idsOf[clean] && !idsOf[clean].has(hash)) add(problems, p, raw, `la página ${clean} no tiene el id #${hash}`);
  }
}
for (const f of jsFiles) {
  const js = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of js.matchAll(/https?:\/\/[^\s"'`)<>]+|tel:[^\s"'`)<>]+/g)) checkFormat(f, m[0]);
  for (const m of js.matchAll(/(?:getElementById|querySelector)\(\s*["'`]#?([A-Za-z][\w-]*)["'`]\s*\)/g)) { /* selectores dinámicos: se verifican en el navegador */ }
}

async function probe(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; dr-linkcheck)' } });
    if (r.status >= 400) r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; dr-linkcheck)' } });
    return { status: r.status, final: r.url };
  } catch (e) { return { status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message }; } finally { clearTimeout(t); }
}
if (external) {
  const list = [...extUrls.entries()]; let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (i < list.length) { const [url, whereSet] = list[i++]; const r = await probe(url); const where = [...whereSet].join(', ');
    if (r.status === 0) add(problems, where, url, 'no responde: ' + r.error);
    else if (r.status === 404 || r.status === 410 || r.status >= 500) add(problems, where, url, 'HTTP ' + r.status);
    else if (r.status >= 400) add(review, where, url, 'HTTP ' + r.status + ' (muchos sitios bloquean bots: abrir a mano)');
    else if (/instagram|facebook/.test(url) && /login/.test(r.final)) add(review, where, url, 'redirige a login (normal en redes; abrir a mano)'); } }));
} else add(review, '—', `${extUrls.size} enlaces externos sin probar`, 'correr con --external para probarlos por red');

const uniq = (l) => [...new Map(l.map((x) => [x.where + x.url + x.why, x])).values()];
const show = (t, l0) => { const l = uniq(l0); console.log(`\n${t} (${l.length})`); for (const x of l) console.log(`  [${x.where}] ${x.url}\n      → ${x.why}`); };
show('✖ PROBLEMAS', problems); show('⚠ A REVISAR A MANO', review);
console.log(`\nPáginas: ${pages.join(', ')} · JS: ${jsFiles.length} archivos`);
process.exit(problems.length ? 1 : 0);
