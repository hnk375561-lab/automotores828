// Valida que los datos y las páginas no se contradigan y que no se publique nada sin fuente.
// Uso: node scripts/validate.mjs [--prod]   (--prod = puerta de salida a producción)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.argv.includes('--prod');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const json = (f) => { try { return JSON.parse(rd(f)); } catch (e) { err(`${f} no es JSON válido: ${e.message}`); return null; } };

const d = json('data/dealership.json');
const a = json('data/autos.json');
const pend = json('data/pendientes.json');
json('data/sources.json');
const rev = json('data/autos-en-revision.json');

if (d && a) {
  const pages = ['index.html', 'privacidad.html', '404.html'];
  const demo = d.publicacion.publicIndexing === false;
  const html = Object.fromEntries(pages.map((p) => [p, rd(p)]));
  const robots = rd('robots.txt');

  // --- indexación coherente ---
  if (demo !== /Disallow:\s*\/\s*$/m.test(robots)) err('robots.txt no coincide con publicacion.publicIndexing');
  if (demo && d.publicacion.official) err('official debe ser false mientras el sitio sea demo');
  if (demo === fs.existsSync(path.join(root, 'sitemap.xml'))) err('sitemap.xml debe existir solo cuando publicIndexing es true');
  for (const p of pages) {
    const h = html[p];
    if (demo !== /noindex/.test(h)) err(`${p}: noindex no coincide con publicacion.publicIndexing`);
    if (demo && !/data-demo-note/.test(h) && p !== '404.html') err(`${p}: falta el aviso de demo`);
    if (!demo && /data-demo-note/.test(h)) err(`${p}: no debe tener aviso de demo en producción`);
    if ((h.match(/<h1[\s>]/g) || []).length !== 1) err(`${p}: debe tener un único h1`);
    if (/href="#"/.test(h)) err(`${p}: href="#"`);
    if (/href="http:\/\//.test(h)) err(`${p}: enlace http:// sin cifrar`);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt=/.test(m[0])) err(`${p}: img sin alt`);
      if (!/\bwidth=/.test(m[0]) || !/\bheight=/.test(m[0])) err(`${p}: img sin width/height`);
    }
    for (const m of h.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/noopener/.test(m[0])) err(`${p}: enlace externo sin noopener`);
    for (const m of h.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const u = m[1];
      if (/^(https?:|mailto:|tel:|#|\.\/?#?)/.test(u) || u === './') continue;
      if (!fs.existsSync(path.join(root, u.split(/[?#]/)[0]))) err(`${p}: referencia a archivo inexistente ${u}`);
    }
    for (const m of h.matchAll(/url\(([^)]+)\)/g)) if (!m[1].startsWith('data:') && !fs.existsSync(path.join(root, m[1].replace(/["']/g, '')))) err(`${p}: css url() a archivo inexistente ${m[1]}`);
  }

  const idx = html['index.html'];
  const visible = pages.map((p) => html[p]).join('\n').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  const visNoCars = visible.replace(/<li class="car">[\s\S]*?<\/li>/g, '');

  // --- datos del negocio ---
  const L = d.location;
  if (!idx.includes(`${L.address}, ${L.city}`) && !idx.includes(L.address)) err('index.html: falta la dirección');
  if (!idx.includes(d.contact.facebook)) err('index.html: falta el enlace a Facebook');
  if (!idx.includes(`instagram.com/${d.contact.instagram}/`)) err('index.html: falta el enlace a Instagram');
  if (!idx.includes('<title>' + d.identity.tradeName)) err('index.html: el title debe empezar con el nombre comercial');
  if (d.identity.cuit !== null) err('CUIT debe ser null hasta confirmación');
  try { JSON.parse(idx.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]); } catch { err('index.html: JSON-LD ausente o inválido'); }

  // --- contacto: conflicto de teléfonos ---
  const c = d.contact;
  if (c.whatsApp) {
    for (const p of ['index.html']) if (!html[p].includes(`wa.me/${c.whatsApp}`)) err(`${p}: WhatsApp no coincide con dealership.json`);
    if (!c.confirmadoPorDueno) err('contact.whatsApp está cargado pero confirmadoPorDueno es false');
  } else {
    for (const p of pages) if (/wa\.me|tel:/.test(html[p])) err(`${p}: hay teléfono o WhatsApp publicado sin confirmar`);
  }
  if (c.phoneTel && !idx.includes(`tel:${c.phoneTel}`)) err('index.html: teléfono no coincide con dealership.json');
  if (!c.confirmadoPorDueno) {
    const digits = (s) => s.replace(/\D/g, '');
    const page = digits(visible + pages.map((p) => html[p].match(/href="[^"]*"/g)?.join('') ?? '').join(''));
    for (const k of c.conflicto?.candidatos ?? []) if (page.includes(digits(k.numero))) err(`El número ${k.numero} aparece en el sitio sin confirmación`);
  }
  if (c.email) err('contact.email debe ser null hasta definir un correo institucional');
  if (/@hotmail|@gmail|@yahoo/i.test(visible)) err('hay un correo personal publicado');

  // --- afirmaciones sin fuente ---
  // Cada servicio solo puede aparecer si tiene su `clave` en services.published (con fuente citada).
  const claves = new Set(d.services.published.map((x) => x.clave).filter(Boolean));
  for (const x of d.services.published) if (!x.fuente) err(`services.published: «${x.texto}» no tiene fuente`);
  const vetadas = [
    [/consignaci|gestor[ií]a|taller|entrega inmediata|reserva online|\bcuotas?\b|\btasas?\b/i, 'servicio o condición sin fuente', null],
    [/permut|parte de pago|tom[aá]mos tu usado/i, 'permuta sin fuente', 'permuta'],
    [/tasaci[oó]n/i, 'tasación sin fuente', 'tasacion'],
    [/garant[ií]a/i, 'garantía sin fuente', 'garantia'],
    [/\b0 ?km\b/i, '0 km sin fuente', null],
    [/rese[ñn]as?|estrellas|opiniones|\b\d[.,]\d\s?\/\s?(5|10)\b/i, 'valoración o reseñas sin verificar', null],
    [/\$\s?\d|US\$|\d{1,3}(\.\d{3})+ ?km/i, 'precio o kilometraje fuera de una tarjeta de unidad', null],
    [/c[aá]mara del comercio automotor|\bCCA\b/i, 'afiliación a la CCA no verificada', null],
    [/adquirid[ao]|absorbid[ao]|renombrad[ao]/i, 'relación con el grupo sin redacción autorizada (P15)', null],
  ];
  for (const [re, why, clave] of vetadas) if ((!clave || !claves.has(clave)) && re.test(visNoCars)) err(`Texto no permitido en el sitio (${why}): ${re}`);
  if (/test ?drive|haval|\btank\b|\bora 03\b|\bgwm\b/i.test(visible)) err('GWM / test drive: se atiende en Paraná y Santa Fe, no se muestra como oferta de María Grande');
  if (!d.hours.display && /horario|lunes a |\b\d{1,2}[:.]\d{2} ?(hs|a)\b/i.test(visible)) err('hay un horario publicado sin confirmar');
  if (/verificad[oa]|confirmad[oa]/i.test(visible)) err('texto "verificado/confirmado" no permitido');
  const publicados = d.services.published.map((s) => s.texto.toLowerCase());
  if (!publicados.some((t) => t.includes('financiaci'))) err('services.published no incluye la financiación que muestra el sitio');

  // --- stock ---
  const nCards = (idx.match(/<li class="car">/g) || []).length;
  if (nCards !== a.autos.length) err(`index.html tiene ${nCards} tarjetas y data/autos.json tiene ${a.autos.length} unidades (correr npm run build)`);
  const ids = new Set();
  for (const v of a.autos) {
    if (!v.id || ids.has(v.id)) err(`autos.json: id faltante o repetido (${v.id})`);
    ids.add(v.id);
    if (!v.titulo) err(`autos.json ${v.id}: falta titulo`);
    if (!/^https:\/\/((www\.)?(facebook|instagram)\.com\/|grupoalmafuerte\.com\/producto\/)/.test(v.url || '')) err(`autos.json ${v.id}: url debe ser una publicación de Facebook/Instagram o una ficha de grupoalmafuerte.com/producto/`);
    if (v.precio && (!['ARS', 'USD'].includes(v.precio.moneda) || typeof v.precio.monto !== 'number' || !v.precio.fecha)) err(`autos.json ${v.id}: precio incompleto (moneda, monto y fecha)`);
    if (v.km != null && typeof v.km !== 'number') err(`autos.json ${v.id}: km debe ser número`);
    if (!idx.includes(v.titulo.replace(/&/g, '&amp;'))) err(`index.html: falta la unidad ${v.id}`);
  }
  if (a.autos.length && !a.relevadoEl) err('autos.json: falta relevadoEl (fecha del relevamiento)');
  for (const u of rev?.unidades ?? []) {
    if (a.autos.some((v) => v.id === u.id || v.url === u.url)) err(`autos-en-revision.json: ${u.id} está también publicada en autos.json`);
    if (idx.includes(u.titulo)) err(`index.html: se muestra ${u.id} (${u.titulo}), que está en revisión`);
    if (!u.motivo) err(`autos-en-revision.json ${u.id}: falta el motivo`);
  }

  // --- restos de otras agencias ---
  const legacy = /agencia-anterior-no-publicar/i;
  const skip = new Set(['node_modules', '.git', 'fonts', 'docs', '_site']);
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => skip.has(e.name) ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  for (const f of walk(root)) {
    const rel = path.relative(root, f);
    if (!/\.(html|js|mjs|json|md|xml|txt|webmanifest|svg|yml|css)$/.test(rel) || rel === 'scripts/validate.mjs') continue;
    if (legacy.test(fs.readFileSync(f, 'utf8'))) err(`${rel}: quedan restos de otro proyecto`);
  }

  // --- pendientes y puerta de producción ---
  const abiertos = (pend?.items ?? []).filter((i) => i.estado !== 'resuelto');
  const bloqueantes = abiertos.filter((i) => i.bloqueante);
  if (PROD) {
    if (!d.publicacion.official) err('PROD: publicacion.official debe ser true');
    if (demo) err('PROD: publicacion.publicIndexing debe ser true');
    if (!/^https:\/\//.test(d.publicacion.siteUrl || '')) err('PROD: falta publicacion.siteUrl (https)');
    if (!c.confirmadoPorDueno || !(c.whatsApp || c.phone)) err('PROD: falta teléfono o WhatsApp confirmado por el dueño');
    for (const b of bloqueantes) err(`PROD: pendiente bloqueante ${b.id}: ${b.tema}`);
  } else if (bloqueantes.length) warns.push(`${bloqueantes.length} pendientes bloqueantes para producción (${bloqueantes.map((b) => b.id).join(', ')}); ver data/pendientes.json`);
  if (abiertos.length) warns.push(`${abiertos.length} pendientes abiertos en total`);
}

for (const w of warns) console.log(`aviso: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} problema(s):`);
  for (const e of errors) console.error(' ✗ ' + e);
  process.exit(1);
}
console.log(`✓ Validación ${PROD ? 'de producción ' : ''}correcta`);
