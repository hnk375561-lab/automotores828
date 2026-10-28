import vm from 'node:vm';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
// Genera index.html, reserva.html, 404.html, privacidad.html, robots.txt, sitemap.xml, site.webmanifest y favicon.svg
// a partir de data/dealership.json y data/vehicles.json. Sin dependencias.
// Uso: npm run build   (después: npm test)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
// Versionado automático: cada <script>/<link> local de css/ y js/ lleva ?v=<hash del contenido> (se recalcula en cada build)
const stamp = (html) => html.replace(/(\b(?:src|href)=")((?:css|js)\/[^"?#]+\.(?:js|css))(?:\?v=[^"]*)?(")/g, (m, a, f, c) => {
  try { return a + f + '?v=' + crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 8) + c; } catch (e) { return m; }
});
const write = (f, s) => fs.writeFileSync(path.join(root, f), f.endsWith('.html') ? stamp(s) : s);
// Mensajes de WhatsApp: el mismo módulo que usa el navegador (js/wa-mensajes.js)
const WAM = (() => { const sb = {}; vm.runInNewContext(read('js/wa-mensajes.js'), sb); return sb.drWaMensajes; })();
const D = JSON.parse(read('data/dealership.json'));
const A = JSON.parse(read('data/vehicles.json'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const demo = D.publicacion.publicIndexing === false;
/* T8: medición de eventos. Apagada por defecto y SIEMPRE apagada en la demo (noindex). Solo se enciende con publicacion.medicion.activo === true y un endpoint https, ya en producción. */
const MED = D.publicacion.medicion || {};
const medicionOn = !demo && MED.activo === true && /^https:\/\//.test(MED.endpoint || '');
const medHead = `<meta name="dr-medicion" content="${medicionOn ? MED.endpoint.replace(/"/g, '%22') : 'off'}">\n<script defer src="js/medir.js?v=20261025-1"></script>\n`;
const siteUrl = D.publicacion.siteUrl ? D.publicacion.siteUrl.replace(/\/?$/, '/') : null;
/* Base ABSOLUTA para las vistas previas (WhatsApp, Facebook, etc. exigen URL absoluta en og:image).
   Prioridad: siteUrl (producción) > publicacion.previewUrl (demo, URL donde está publicada) > entorno de build
   (Netlify: URL / DEPLOY_PRIME_URL; GitHub Pages: GITHUB_REPOSITORY). Si no hay ninguna, queda relativa y
   scripts/build-site.mjs la completa al armar _site/ en Netlify. */
const envBase = process.env.CF_PAGES_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || (process.env.GITHUB_REPOSITORY ? `https://${process.env.GITHUB_REPOSITORY.split('/')[0].toLowerCase()}.github.io/${process.env.GITHUB_REPOSITORY.split('/')[1]}` : null);
/* Respaldo: sin URL cargada ni entorno de build, se toma el remoto git (GitHub Pages: usuario.github.io/repo). WhatsApp/Facebook/Instagram EXIGEN og:image absoluta: una ruta relativa deja el enlace sin imagen.
   Si el sitio se publica en otra dirección, cargarla en data/dealership.json → publicacion.previewUrl. */
const gitBase = (() => { try { const u = execSync('git remote get-url origin', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); const m = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(u); return m ? `https://${m[1].toLowerCase()}.github.io/${m[2]}` : null; } catch (e) { return null; } })();
const ogBaseRaw = siteUrl || D.publicacion.previewUrl || envBase || gitBase || '';
const ogBase = ogBaseRaw ? ogBaseRaw.replace(/\/?$/, '/') : '';
const NAME = D.identity.tradeName;
const L = D.location;
const C = D.contact;
const FB = C.facebook;
const ML_PROFILE = 'https://vehiculos.mercadolibre.com.ar/_CustId_121360385';
const IG = `https://www.instagram.com/${C.instagram}/`;
const TT = C.tiktok;
const YT = C.youtube;
const hasSvc = (k) => D.services.published.some((x) => x.clave === k);
const fdate = (iso) => iso.split('-').reverse().join('/');
const wa = (txt) => (C.whatsApp && D.contact.whatsAppConfirmed === true ? `https://wa.me/${C.whatsApp}?text=${encodeURIComponent(txt)}` : null);
const WA = wa('Hola! Quiero consultar por las unidades disponibles.');
const EXT = 'target="_blank" rel="noopener noreferrer"';
const SCORE = String(D.reviews.puntaje).replace('.', ',');
const FECHA_RV = String(D.reviews.fecha || '').split('-').reverse().join('/');
/* Tarjeta de opiniones de Google (solo puntaje, cantidad, fecha y enlace; sin reseñas ni nombres) */
const GREVIEWS = D.reviews.publicadas && D.reviews.googleUrl && D.reviews.puntaje && D.reviews.cantidad ? `<aside class="gr" aria-label="Opiniones de Google de Automotores 828"><div class="gr-in"><p class="gr-top"><span class="gr-g"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg></span>Opiniones en Google</p><p class="gr-score">${SCORE}<small>/5</small></p><div class="gr-meta"><span class="gr-stars" style="--p:${Math.round(D.reviews.puntaje / (D.reviews.escala || 5) * 100)}%" role="img" aria-label="${SCORE} de 5 estrellas"></span><p class="gr-n"><b>${D.reviews.cantidad}</b> opiniones</p></div><div class="gr-foot"><p class="gr-src">Puntaje de Google Maps al ${FECHA_RV}.</p><a class="gr-cta" href="${esc(D.reviews.googleUrl)}" target="_blank" rel="noopener noreferrer">Ver opiniones en Google<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></a></div></div></aside>` : '';
const DNRPA = 'https://www.dnrpa.gov.ar/portal_dnrpa/', LEY24449 = 'https://www.argentina.gob.ar/normativa/nacional/ley-24449-818';
const WAFORM = C.whatsApp && D.contact.whatsAppConfirmed === true ? `<a class="btn p" data-wa-msg data-wa="${C.whatsApp}" href="https://wa.me/${C.whatsApp}" ${EXT}>Enviar por WhatsApp</a>` : '';
const CPBTN = `<button class="btn${C.whatsApp && D.contact.whatsAppConfirmed === true ? '' : ' p'}" type="submit" data-copiar-msg hidden>Copiar mensaje</button>`;
const LEYENDA_CORTA = 'Demo ilustrativa · No es el sitio oficial';
const LEYENDA = `Demo ilustrativa. Consultá disponibilidad y precios con ${NAME}. No es el sitio oficial.`;
const FONTS = '@font-face{font-family:"Exo 2";font-style:italic;font-weight:100 900;font-display:swap;src:url(fonts/exo-2-latin-italic.woff2) format("woff2")}\n@font-face{font-family:"Exo 2";font-style:normal;font-weight:100 900;font-display:swap;src:url(fonts/exo-2-latin.woff2) format("woff2")}\n@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;font-display:swap;src:url(fonts/inter-latin-var.woff2) format("woff2")}\n';
const CSS = read('scripts/estilos.css').trim();
const DRID = read('css/dr-identidad.css').trim();

const ogTags = (p, title, desc) => `<meta property="og:site_name" content="${esc(NAME)}">
${ogBase ? `<meta property="og:url" content="${ogBase}${p}">\n` : ''}<meta property="og:image" content="${ogBase}images/og-dr.jpg">
<meta property="og:image:secure_url" content="${ogBase}images/og-dr.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${NAME} · Autos y motos usados en ${L.city}, ${L.province}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogBase}images/og-dr.jpg">
`;
const robotsMeta = demo ? '<meta name="robots" content="noindex, nofollow">\n' : '';
const canon = (p) => (siteUrl ? `<link rel="canonical" href="${siteUrl}${p}">\n` : '');

/* CSS compartido: un solo archivo externo (css/site.css), versionado por hash y cacheable entre páginas.
   Se genera desde scripts/estilos.css + los ajustes de abajo. Las rutas relativas de url() se reescriben porque el archivo vive en css/. */
const EXTRA_CSS = `.msg-updated{animation:msg-updated .28s ease-out}@keyframes msg-updated{from{opacity:.68;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
.guia-progress{color:#d9dbdd;font-size:.9rem;margin:.25rem 0}
.qa-search-label{display:block;margin:.6rem 0 .25rem;color:#d9dbdd}.qa-search{display:block;min-height:44px;width:min(100%,32rem);padding:.65rem .8rem;border:1px solid #6b6d70;border-radius:.4rem;background:#111214;color:#fff;font:inherit}.qa-search:focus-visible{outline:3px solid #ee1c22;outline-offset:2px}
.qa-search-status{min-height:1.4em;color:#d9dbdd;font-size:.9rem}
.gd [data-guide-checklist] label{display:flex;align-items:flex-start;gap:.65rem;cursor:pointer;padding:.3rem 0}.gd [data-guide-item]{inline-size:44px;block-size:44px;min-inline-size:44px;min-block-size:44px;flex:0 0 44px;margin:0;accent-color:#ee1c22}
.dr-hr-note{font-size:.9rem;color:#d9dbdd;margin-top:.6rem}
@media(prefers-reduced-motion:reduce){.msg-updated{animation:none}}`;
const absUrls = (css) => css.replace(/url\((['"]?)(?!data:|#|https?:|\/|\.\.\/)([^)'"]+)/g, 'url($1../$2');
const SITE_CSS = '/* GENERADO por scripts/build-index.mjs desde scripts/estilos.css. No editar a mano: se pisa en cada build. */\n' + absUrls(CSS + '\n' + EXTRA_CSS) + '\n';
fs.writeFileSync(path.join(root, 'css/site.css'), SITE_CSS);
const hashDe = (f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 8);
const linkCss = '<link rel="stylesheet" href="css/site.css">\n<link rel="stylesheet" href="css/dr-identidad.css">\n';

function page({ title, desc, body, file, withFonts = true, extraHead = '', htmlAttrs = '' }) {
  /* withFonts: fuentes inline (muy chicas) + CSS externo. 404 (withFonts=false) enlaza el CSS desde extraHead porque se sirve en cualquier ruta. */
  const cssHead = withFonts ? `<style>\n${FONTS}</style>\n${linkCss}` : '';
  return `<!DOCTYPE html>
<html lang="es-AR"${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${robotsMeta}<link rel="icon" type="image/svg+xml" href="favicon.svg">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#060607">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="es_AR">
${ogTags(file === 'index.html' ? '' : file, title, desc)}${canon(file === 'index.html' ? '' : file)}${withFonts ? '<link rel="manifest" href="site.webmanifest">\n<link rel="icon" type="image/png" sizes="192x192" href="images/icon-192.png">\n<link rel="apple-touch-icon" href="images/icon-180.png">\n<link rel="preload" href="fonts/exo-2-latin-italic.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin>\n' : ''}${cssHead}${medHead}${extraHead}</head>
<body>
${body}
</body>
</html>
`;
}

const footer = (fuentes) => `<footer class="site-footer"><div class="w">
<div class="ft-cta"><div><p class="ft-cta-k">AUTOMOTORES 828 · MONTE GRANDE</p><p class="ft-cta-t">¿Buscás tu próximo auto? <em>Escribinos.</em></p></div><a class="ft-cta-btn" href="mailto:${esc(C.email || '')}?subject=${encodeURIComponent('Consulta por unidades')}" aria-label="Escribir a Automotores 828 por correo">Escribir por correo <span aria-hidden="true">↗</span></a></div>
<div class="ft">
<section class="ft-col ft-brand" aria-label="Automotores 828"><img class="lg-ft" src="images/logo-sm.png" width="320" height="320" alt="Logo de Automotores 828"><p class="ft-b">${esc(NAME)}</p><p class="ft-desc">Autos usados, permutas y financiación en ${esc(L.city)}.</p><p class="ft-address"><a href="${esc(L.mapsUrl)}" ${EXT}>${esc(L.address)}, ${esc(L.city)}, ${esc(L.province)} · Cómo llegar</a></p><span class="ft-badge">Atención en Monte Grande</span></section>
<nav class="ft-col" aria-label="Navegación del pie"><p class="ft-k">Explorá</p><ul class="ft-links"><li><a href="#top">Inicio</a></li><li><a href="${fuentes ? '' : './'}#unidades">Catálogo / stock</a></li><li><a href="${fuentes ? '' : './'}#busqueda">Buscás</a></li><li><a href="${fuentes ? '' : './'}#tu-usado">Permutas</a></li><li><a href="${fuentes ? '' : './'}#financiacion">Financiación</a></li><li><a href="${fuentes ? '' : './'}#financiacion">Consignaciones</a></li><li><a href="${fuentes ? '' : './'}#financiacion">Compra y venta</a></li><li><a href="${fuentes ? '' : './'}#nosotros">Nosotros</a></li><li><a href="${fuentes ? '' : './'}#contacto">Contacto</a></li></ul></nav>
<section class="ft-col" aria-label="Contacto y horarios"><p class="ft-k">Contacto</p>${C.email ? `<p class="ft-contact-link"><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></p>` : ''}${(C.whatsApp && D.contact.whatsAppConfirmed === true) ? `<p class="ft-contact-link ft-wa"><a href="${esc(WA)}" ${EXT} aria-label="WhatsApp ${esc(C.whatsAppDisplay)}">${IC.wa}<span>WhatsApp ${esc(C.whatsAppDisplay)}</span></a></p>` : ''}${C.phoneTel ? `<p class="ft-contact-link"><a href="tel:${esc(C.phoneTel)}">${esc(C.phone || C.phoneTel)}</a></p>` : (C.whatsApp ? '' : `<p class="ft-pending">Teléfono / WhatsApp: pendiente de confirmar</p>`)}<p class="ft-contact-link"><a href="${esc(L.mapsUrl)}" ${EXT}>${esc(L.address)}, ${esc(L.city)} · Mapa</a></p>${H.display ? `<div class="ft-hours"><span class="ft-k">Horario de atención</span><p data-estado data-horario-footer hidden>${esc(H.corto)}</p><noscript><p>${esc(H.corto)}</p></noscript></div>` : ''}</section>
<section class="ft-col" aria-label="Redes y servicios"><p class="ft-k">Redes y servicios</p><ul class="ft-social"><li><a href="${FB}" ${EXT} aria-label="Facebook de Automotores 828"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v2H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1z"/></svg><span>Facebook</span></a></li><li><a href="${IG}" ${EXT} aria-label="Instagram de Automotores 828"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.8" r=".8"/></svg><span>Instagram</span></a></li></ul><div class="ft-ctas"><a href="${fuentes ? '' : './'}#tu-usado">Quiero vender mi auto</a><a href="${fuentes ? '' : './'}#financiacion">Consultá financiación</a><a href="${fuentes ? '' : './'}#tu-usado">Cotizá tu permuta</a></div><div class="ft-services" aria-label="Servicios publicados"><span>Permutas</span><span>Financiación</span><span>Consignaciones</span></div></section>
</div>
<div class="ft-bottom"><p class="ft-copy">© 2026 ${esc(NAME)}</p>${demo ? `<p class="demo-note" data-demo-note>${esc(LEYENDA)}</p>` : ''}<p class="ft-sources">${fuentes ? `Fuentes: <a href="${FB}" ${EXT}>Facebook</a> · <a href="${IG}" ${EXT}>Instagram</a>${TT ? ` · <a href="${TT}" ${EXT}>TikTok</a>` : ''}` : `<a href="${FB}" ${EXT}>Facebook</a> · <a href="${IG}" ${EXT}>Instagram</a>`}</p><a class="ft-privacy" href="${fuentes ? 'privacidad.html' : './privacidad.html'}">Privacidad y avisos</a><a class="ft-top" href="#top">Volver arriba ↑</a></div>
</div></footer>`;
const autos = A.autos;
const cantidadMotos = autos.filter((a) => a.tipoVehiculo === 'Moto').length;
const cantidadAutos = autos.length - cantidadMotos;
const ctaHead = { href: ML_PROFILE, t: 'Ver stock' };
const header = (pre = '', skip = '#unidades') => `<a class="skip" href="${skip}">Saltar al contenido</a>
<header class="site-header${pre ? ' site-header--inner' : ' site-header--home'}"><div class="w"><a class="mark" href="./" aria-label="${esc(NAME)}, inicio"><img class="lg-img" src="images/logo.png" width="320" height="320" alt="${esc(NAME)}"></a>
<nav class="site-nav" id="site-nav" aria-label="Principal"><a href="${pre}#horarios">Horarios</a><a href="${pre}#unidades">Unidades</a><a href="${pre}#financiacion">Financiación</a><a href="${pre}#guia">Guía</a><a href="${pre}#preguntas">Preguntas</a><a href="${pre}#nosotros">Nosotros</a><a href="${pre}#contacto">Contacto</a><a href="${pre}#tu-usado">Tu usado</a><a href="${pre}#busqueda">Tu búsqueda</a><a href="${pre}#visita">Visita</a></nav>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle><span class="menu-icon" aria-hidden="true"></span><span>Menú</span></button>
<div class="hc"><a class="btn p sm" href="${ctaHead.href}" ${EXT}>${ctaHead.t}</a></div></div></header>
${demo ? `<p class="demo"><span>${esc(LEYENDA_CORTA)}</span></p>` : ''}`;

// ---- servicios que se muestran en el panel lateral de la ficha (salen de services.published) ----
const SERV_FICHA = [
  hasSvc('permuta') ? 'Permutas' : '',
  hasSvc('consignacion') ? 'Consignaciones' : '',
  hasSvc('financiacion') ? 'Consultá por financiación' : '',
].filter(Boolean);

// ---- unidades ----
const fmt = (n) => n.toLocaleString('es-AR');
const norm = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const jsonSafe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
/* Los datos del catálogo van aparte, en js/units.min.json: el HTML pesa menos y el JSON queda cacheable
   entre visitas (antes iba embebido y se volvía a bajar con cada cambio de la página).
   Ojo: /data/* está bloqueado en netlify.toml, por eso el archivo vive en js/ (que sí se publica). */
const UNITS_URL = 'js/units.min.json';
/* Quita claves vacías (null, undefined, '') sin perder 0 ni false: el cliente ya las chequea con == null. */
const slim = (v) => {
  if (Array.isArray(v)) return v.map(slim);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) { const x = slim(v[k]); if (x !== null && x !== undefined && x !== '') o[k] = x; }
    return o;
  }
  return v;
};
// Muestra de color solo para dibujar el punto junto al nombre del color publicado; no es un dato de la ficha.
const SW = { blanco: '#f1f1ee', negro: '#161b1d', rojo: '#c21f1f', 'gris plata': '#b4bbbe', 'gris oscuro': '#4b5256', plata: '#b4bbbe', gris: '#8a9296', azul: '#1e4a8c', verde: '#2f6b45', bordo: '#6d1a2a', beige: '#cdbb98', dorado: '#b99a45', naranja: '#d9742a', amarillo: '#e5c717', marron: '#6b4a32' };
const swatch = (c) => SW[norm(c || '')] || null;
const marcaDe = (a) => a.marca || a.titulo.split(' ')[0];
const sinMarca = (a) => { const m = marcaDe(a); return a.tipoVehiculo === 'Moto' ? (a.modelo || a.titulo) : a.titulo.startsWith(m + ' ') ? a.titulo.slice(m.length + 1) : a.titulo; };
const consultaHref = (a) => wa(WAM.mensaje(a, a.vendida ? 'similares' : 'rapida')) || a.url;
// Fotos opcionales: no se inventan ni se toman de terceros; solo se publican si data/ las autoriza.
const mediaDe = (a) => (Array.isArray(a.fotos) ? a.fotos : Array.isArray(a.imagenes) ? a.imagenes : Array.isArray(a.galeria) ? a.galeria : []).map((x) => typeof x === 'string' ? { src: x, alt: a.titulo } : x).filter((x) => x && (x.src || x.url)).map((x) => ({ src: x.src || x.url, srcset: x.srcset || '', card: x.card || '', cardWidth: x.cardWidth || null, cardHeight: x.cardHeight || null, thumb: x.thumb || '', width: x.width || null, height: x.height || null, alt: x.alt || a.titulo, tipo: x.tipo || '' }));
const cardSrcset = (m) => { if (m.srcset) return m.srcset; if (m.card) return `${m.card} ${m.cardWidth || 600}w, ${m.src} ${m.width || 900}w`; const k = /^(images\/stock\/unidad-\d+)\.webp$/.exec(m.src || ''); return k && fs.existsSync(new URL('../' + k[1] + '-640.webp', import.meta.url)) && fs.existsSync(new URL('../' + k[1] + '-1000.webp', import.meta.url)) ? `${k[1]}-640.webp 640w, ${k[1]}-1000.webp 1000w` : ''; };
/* sizes del grid de tarjetas (.w.wide: 5/4/3/2/1 columnas según el ancho) */
const CARD_SIZES = '(min-width:1200px) 300px, (min-width:961px) 280px, (min-width:701px) 300px, (min-width:521px) 330px, calc(100vw - 40px)';
const mediaTag = (a) => { const m = mediaDe(a)[0]; const ss = m ? cardSrcset(m) : ''; return m ? `<figure class="car-ph"><img src="${esc(m.card || m.src)}"${ss ? ` srcset="${esc(ss)}"` : ''} sizes="${CARD_SIZES}" width="${m.cardWidth || m.width || 900}" height="${m.cardHeight || m.height || 600}" loading="lazy" decoding="async" alt="${esc(m.alt)}"><span class="car-badge" aria-hidden="true"></span></figure>` : ''; };
const IC = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.4 6.6h.01"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 7l8 6 8-6"/></svg>',
  tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/></svg>',
};
const mailHref = (a) => C.email ? `mailto:${C.email}?subject=${encodeURIComponent('Consulta por ' + a.titulo + (a.anio ? ' ' + a.anio : ''))}&body=${encodeURIComponent('Hola! Me interesa el ' + a.titulo + (a.anio ? ' ' + a.anio : '') + '. ¿Me pasan disponibilidad, precio y formas de pago? Gracias.')}` : null;
const quick = (a, i) => {
  const t = esc(a.titulo);
  const items = [
    (C.whatsApp && D.contact.whatsAppConfirmed === true) ? `<a href="${esc(consultaHref(a))}" ${EXT} aria-label="WhatsApp ${esc(C.whatsAppDisplay)}: ${t}" title="WhatsApp ${esc(C.whatsAppDisplay)}">${IC.wa}<span>WhatsApp</span></a>` : '',
    C.instagram ? `<a href="${IG}" ${EXT} aria-label="Instagram de ${esc(C.nombre || 'Automotores 828')}" title="Instagram">${IC.ig}<span>Instagram</span></a>` : '',
    C.email ? `<a href="${esc(mailHref(a))}" aria-label="Correo: ${t}" title="Correo">${IC.mail}<span>Correo</span></a>` : '',
    C.phoneTel ? `<a href="tel:${C.phoneTel}" aria-label="Llamar por ${t}" title="Llamar">${IC.tel}<span>Llamar</span></a>` : '',
    `<button type="button" data-share="${i}" aria-label="Compartir ${t}" title="Compartir" hidden>${IC.share}<span>Compartir</span></button>`,
  ].filter(Boolean).join('');
  return `<div class="car-q" role="group" aria-label="Contacto rápido">${items}</div>`;
};
const card = (a) => {
  const i = autos.indexOf(a);
  const marca = marcaDe(a);
  const sw = swatch(a.color);
  const fila = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  const pr = a.precio ? `<p class="pr"><span class="price-currency">${esc(a.precio.moneda)}</span> ${fmt(a.precio.monto)}</p><p class="n">Precio publicado el ${esc(fdate(a.precio.fecha))}; puede haber cambiado.</p>` : '<p class="pr">Consultar precio</p>';
  const busca = norm([a.titulo, a.tipoVehiculo, a.tipoMoto, marca, a.modelo, a.version, a.cilindrada, a.color, a.anio].filter((x) => x !== undefined && x !== null && x !== '').join(' '));
  return `<li class="car reveal${a.vendida ? ' car--vendida' : ''}" style="--reveal-delay:${Math.min(i,5)*60}ms" data-t="${esc(busca)}" data-i="${i}">
${mediaTag(a)}
<div class="car-h"><span class="car-b">${esc(marca)}</span>${a.tipoVehiculo === 'Moto' ? '<span class="car-b">Moto</span>' : ''}${a.vendida ? '<span class="car-v">Vendida</span>' : ''}<label class="car-c" hidden><input type="checkbox" value="${i}" aria-label="Comparar ${esc(a.titulo)}"><span>Comparar</span></label></div>
<h3>${esc(sinMarca(a))}</h3>
<div class="car-s"><p><b${a.anio == null ? ' class="nd"' : ''}>${a.anio != null ? a.anio : 'Sin dato'}</b><small>Año</small></p><p><b${a.km == null ? ' class="nd"' : ''}>${a.km != null ? fmt(a.km) : 'Consultar'}</b><small>Kilómetros</small></p></div>
<dl class="sp">${fila('Caja', a.transmision ? esc(a.transmision) : '')}${fila('Combustible', a.combustible ? esc(a.combustible) : '')}${fila('Color', a.color ? `${sw ? `<i class="sw" style="--sw:${sw}"></i>` : ''}${esc(a.color)}` : '')}</dl>
<div class="car-f">${pr}${a.nota ? `<p class="n">${esc(a.nota)}</p>` : ''}<button class="btn sm ficha-trigger" type="button" data-ficha="${i}" aria-label="Ver la ficha completa de ${esc(a.titulo)}">Ver la ficha completa</button><a class="btn sm" href="${esc(consultaHref(a))}" ${EXT} aria-label="Consultar por ${esc(a.titulo)}">${a.vendida ? 'Consultar por similares' : WA ? 'Reservar esta unidad' : 'Ver publicación en Mercado Libre'}</a>${quick(a, i)}</div>
</li>`;
};
const catData = autos.map((a, i) => ({
  i, titulo: a.titulo, media: mediaDe(a), marca: marcaDe(a), modelo: a.modelo || null, modeloTxt: sinMarca(a),
  tipoVehiculo: a.tipoVehiculo || 'Auto', tipoMoto: a.tipoMoto || null, cilindrada: a.cilindrada || null, motor: a.motor || null,
  potencia: a.potencia || null, traccion: a.traccion || null, puertas: a.puertas || null, numeroVelocidades: a.numeroVelocidades || null,
  version: a.version || null, anio: a.anio ?? null, km: a.km ?? null, carroceria: a.carroceria || null, id: a.id || null,
  vendida: !!a.vendida, nota: a.nota || null, relevadoEl: a.relevadoEl || a.fuente?.consultado || null,
  atributosPublicados: a.atributosPublicados || [], hrefFin: wa(WAM.mensaje(a, 'fin')),
  hrefVisita: wa(WAM.mensaje(a, 'visita')),
  mail: mailHref(a), transmision: a.transmision || null, combustible: a.combustible || null, color: a.color || null,
  sw: swatch(a.color), precio: a.precio || null, anticipo: a.anticipo || null, url: a.url, href: consultaHref(a)
}));
/* Catálogo diferido: solo las primeras tarjetas van como elementos del DOM; el resto viaja dentro de <noscript id="cars-rest"> (sin JavaScript se ven todas)
   y js/secciones.js crea cada tarjeta cuando va a mostrarse. Coincide con el primer lote móvil (6). */
const CARDS_INICIALES = 6;
const unidades = autos.length
  ? `${autos.length > 1 ? '<div class="fx" id="tools" hidden></div>\n' : ''}<p id="sinres" class="vacio" hidden>Ninguna unidad coincide con los filtros. Sacá alguno o limpiá todos para ver las ${autos.length} unidades.</p><ul class="cars" id="cars">\n${autos.slice(0, CARDS_INICIALES).map(card).join('\n')}\n</ul>\n${autos.length > CARDS_INICIALES ? `<noscript id="cars-rest"><ul class="cars">\n${autos.slice(CARDS_INICIALES).map(card).join('\n')}\n</ul></noscript>\n` : ''}<div class="inventory-more-wrap" id="inventory-more-wrap"><p class="inventory-more-note" id="inventory-more-note" role="status" aria-live="polite">Cargando unidades…</p><button class="btn p inventory-more-btn" id="inventory-more" type="button" aria-controls="cars" aria-label="Mostrar más unidades" hidden>Mostrar más unidades</button></div>\n<script type="application/json" id="cat-data" data-src="${UNITS_URL}"></script>\n<script type="application/json" id="cat-ctx">${jsonSafe({ nombre: NAME, tel: C.phoneTel || null, telTxt: C.phone || null, wa: C.whatsApp ? WA : null, waTxt: C.whatsAppDisplay || null, email: C.email || null, maps: L.mapsUrl || null, dir: `${L.address}, ${L.city}, ${L.province}`, horario: D.hours.corto || null, ig: IG, fb: FB, ciudad: L.city, servicios: SERV_FICHA, coordenadas: L.coordenadas ? { lat: L.coordenadas.lat, lng: L.coordenadas.lng } : null })}</script>\n<p class="src">${A.relevadoEl ? `Stock al ${esc(fdate(A.relevadoEl))}. ` : ''}Consultá precio y disponibilidad actualizados por nuestros canales de contacto.</p>\n<div class="row mt"><a class="btn p" href="${IG}" ${EXT}>Ver más en Instagram</a><a class="btn" href="${FB}" ${EXT}>Ver más en Facebook</a>${TT ? `<a class="btn" href="${TT}" ${EXT}>Ver más en TikTok</a>` : ''}</div>`
  : `<div class="vacio"><p>Las unidades disponibles se publican en nuestro Instagram, TikTok y Facebook. Escribinos y te contamos disponibilidad y precio.</p><div class="row"><a class="btn p" href="${IG}" ${EXT}>Ver Instagram</a>${TT ? `<a class="btn" href="${TT}" ${EXT}>Ver TikTok</a>` : ''}<a class="btn" href="${FB}" ${EXT}>Ver Facebook</a></div></div>`;

// ---- contacto ----
const H = D.hours;
const fh = (t) => t.replace(/^0/, '');
const rng = (r) => r.map((x) => `${fh(x[0])} a ${fh(x[1])}`).join(' y ');
const hrsRows = H.display ? H.semana.map((g) => `<tr data-dias="${g.dias.join(',')}"><th scope="row">${esc(g.etiqueta)}</th><td>${rng(g.rangos)} h</td></tr>`).join('') + (H.domingo ? `<tr data-dias="0"><th scope="row">Domingos</th><td>${esc(H.domingo)}</td></tr>` : '') : '';
const estadoP = H.display ? `<p class="estado" data-estado data-semana="${esc(JSON.stringify(H.semana))}" hidden></p>` : '';
const hrsTable = H.display ? `${estadoP}<table class="hrs"><caption class="sr">Horario de atención</caption><tbody>${hrsRows}</tbody></table>` : '';
const direccion = `${esc(L.address)}, ${esc(L.city)}, ${esc(L.province)}${L.direccionAnterior ? `<small class="ant">Antes: ${esc(L.direccionAnterior)}</small>` : ''}`;
const dl = [
  ['Dirección', direccion],
  ['Cómo llegar', `<a href="${L.mapsUrl}" ${EXT}>Abrir en Google Maps</a>`],
  C.phone ? ['Teléfono', `<a href="tel:${C.phoneTel}">${esc(C.phone)}</a>`] : null,
  (C.whatsApp && D.contact.whatsAppConfirmed === true) ? ['WhatsApp', `<a href="${WA}" ${EXT}>${esc(C.whatsAppDisplay)} · Escribinos</a>`] : null,
  C.email ? ['Correo', `<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`] : null,
  H.display ? ['Horario', hrsTable] : null,
  D.reviews.googleUrl ? ['Ficha de Google', `<a href="${D.reviews.googleUrl}" ${EXT}>Abrir ficha en Google</a>`] : null,
  ['Redes', `<a href="${FB}" ${EXT}>Facebook</a> · <a href="${IG}" ${EXT}>Instagram @${esc(C.instagram)}</a>${TT ? ` · <a href="${TT}" ${EXT}>TikTok</a>` : ''}`],
].filter(Boolean);

// ---- barra de datos, sucursales del grupo, preguntas ----
const bar = `<div class="bar" role="region" aria-label="Datos rápidos"><div class="w"><ul>
<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><span class="k">Dirección</span><b>${esc(L.address.replace('Avenida', 'Av.'))}</b><small>${esc(L.city)}${L.direccionAnterior ? ` · antes ${esc(L.direccionAnterior)}` : ''}</small></li>
${C.phoneTel ? `<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg><span class="k">Teléfono</span><a href="tel:${C.phoneTel}">${esc(C.phone)}</a><small>Llamanos</small></li>` : ''}
${C.whatsApp && D.contact.whatsAppConfirmed === true ? `<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/></svg><span class="k">WhatsApp</span><a href="${WA}" ${EXT}>${esc(C.whatsAppDisplay)}</a><small>Escribinos</small></li>` : ''}
${H.display ? `<li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg><span class="k">Horario</span><b data-estado>${esc(H.corto)}</b><small>${estadoP ? 'Hora de Argentina' : ''}</small></li>` : ''}
</ul></div></div>`;

const qa = (q, a) => { const id = 'qa-' + q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return `<details class="dd" id="${id}"><summary>${q}</summary><p>${a}</p></details>`; };
const faq = [
  hasSvc('permuta') ? qa('¿Reciben mi usado como parte de pago?', `Sí, tomamos permutas. Armá el mensaje en la sección «Tu usado» y envialo por el canal que prefieras; las condiciones se acuerdan con ${esc(NAME)}.`) : '',
  hasSvc('consignacion') ? qa('¿Puedo dejar mi auto en consignación?', `Sí, trabajamos con consignaciones. Escribinos y coordinamos las condiciones.`) : '',
  hasSvc('financiacion') ? qa('¿Cómo financio?', `Consultanos por financiación. Este sitio no publica condiciones de financiación: se informan por consulta y dependen de la unidad y de cada solicitante.`) : '',
  qa('¿Dónde veo las unidades disponibles?', `Este catálogo reúne publicaciones públicas consultadas en Mercado Libre. También podés ver novedades en nuestro <a href="${IG}" ${EXT}>Instagram</a>${TT ? `, <a href="${TT}" ${EXT}>TikTok</a>` : ''} y <a href="${FB}" ${EXT}>Facebook</a>. Los precios y la disponibilidad pueden cambiar: confirmalos antes de ir.`),
  qa('¿Cómo coordino una visita?', `Entrá a <a href="reserva.html">Agendar visita y prueba de manejo</a>, elegí un día y una franja y enviá la consulta. No es un turno: el día y la hora se acuerdan con ${esc(NAME)}.`),
  H.display ? qa('¿Cuándo atienden?', `Los días y franjas, y si estamos abiertos ahora, están en la sección <a href="#horarios">Horarios</a>.`) : '',
  // Información general de compra de usados: fuentes en data/sources.json (guiaGeneral). No describe condiciones de la agencia.
  qa('¿Puedo pedir yo el informe de dominio de un vehículo?', `Sí. Cualquier persona mayor de edad puede solicitarlo en el Registro del Automotor o por internet, en el sitio de la <a href="${DNRPA}" ${EXT}>DNRPA</a>. Muestra quién es el titular y las anotaciones del vehículo, como prendas o embargos. Conviene pedirlo antes de decidir la compra.`),
  qa('¿Cuánto cuesta la transferencia?', `Depende de cada vehículo: los aranceles y los impuestos se calculan sobre su valuación oficial y varían según la jurisdicción. La <a href="${DNRPA}" ${EXT}>DNRPA</a> ofrece un estimador online, pero el cálculo definitivo lo hace el Registro al presentar el trámite. Este sitio no informa costos de transferencia.`),
  qa('¿El seguro es obligatorio para circular?', `Sí. Todo automotor debe tener, como mínimo, un seguro de responsabilidad civil contra terceros para circular (<a href="${LEY24449}" ${EXT}>Ley de Tránsito 24.449</a>, art. 68).`),
].filter(Boolean).join('\n');
const glos = [
  ['Título del automotor', 'Documento del Registro del Automotor que acredita quién es el titular del vehículo.'],
  ['Cédula de identificación', 'Documento que habilita a circular con el vehículo. La del titular es la «cédula verde».'],
  ['Dominio', 'La patente: letras y números que identifican al vehículo.'],
  ['Informe de dominio', 'Certificado del Registro con los datos del titular y las anotaciones del vehículo, por ejemplo prendas o embargos.'],
  ['Libre deuda', 'Constancia de que no hay deuda de patentes o multas.'],
  ['Verificación policial', 'Control físico que comprueba que los números de motor y chasis coinciden con los papeles.'],
  ['Formulario 08', 'Formulario de transferencia que firman las partes cuando cambia el titular.'],
  ['Parte de pago', 'Entregar tu usado como parte del precio de otra unidad.'],
  ['CAT (título digital)', 'Constancia de Asignación de Título: acredita el título digital y se puede presentar en lugar del título en papel.'],
  ['Cédula azul', 'Cédula para quien maneja el auto de otra persona de forma habitual. La solicita el titular; no reemplaza a la cédula verde.'],
  ['Prenda', 'Respaldo de un crédito que queda anotado sobre el vehículo y aparece en el informe de dominio. Si hay una prenda, la transferencia se comunica a quien dio el crédito.'],
  ['Inhibición', 'Medida judicial que alcanza a una persona. Si el titular está inhibido, no se puede inscribir la transferencia hasta que el juez la deje sin efecto.'],
  ['Denuncia de venta', 'Trámite que presenta quien vendió ante el Registro de radicación del vehículo (Formulario 11 o trámite posterior). Resguarda su responsabilidad civil por los daños que cause el auto a partir de la fecha de inscripción.'],
].map(([t, d]) => qa(t, d)).join('\n');
const secPreguntas = `
<section class="lt" id="preguntas" aria-labelledby="preg-t"><div class="w">
<p class="ey"><span class="ey-brand">828</span> · Preguntas</p><h2 id="preg-t">Lo que <em>conviene saber</em></h2>
<p class="sec-p">Respuestas cortas y un glosario del comprador. Información general de octubre de 2026: no es una condición ni una promesa de ${esc(NAME)}.</p>
<div class="qa" data-qa><label class="qa-search-label" for="qa-search">Buscar en preguntas y glosario</label><input id="qa-search" class="qa-search" type="search" autocomplete="off" placeholder="Escribí una palabra…"><p class="qa-search-status" data-qa-search-status role="status" aria-live="polite"></p><div class="qa-tabs" role="tablist" aria-label="Preguntas y glosario" hidden><button type="button" role="tab" id="qa-t1" aria-controls="qa-p1" aria-selected="true">Preguntas frecuentes</button><button type="button" role="tab" id="qa-t2" aria-controls="qa-p2" aria-selected="false" tabindex="-1">Glosario del comprador</button></div>
<div class="qa-p" id="qa-p1" role="tabpanel" aria-labelledby="qa-t1"><h3>Preguntas frecuentes</h3>${faq}</div><div class="qa-p" id="qa-p2" role="tabpanel" aria-labelledby="qa-t2"><h3>Glosario del comprador</h3>${glos}</div></div>
</div></section>`;
const semana = H.semana || [];
const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !semana.some((g) => g.dias.includes(d)));
const morningOnly = semana.filter((g) => g.rangos.length === 1).flatMap((g) => g.dias);
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const openSpec = semana.flatMap((g) => g.rangos.map((r) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: g.dias.map((x) => DOW[x]), opens: r[0], closes: r[1] })));

// ---- secciones nuevas: comparador, cómo comprar, tu usado, búsqueda, guía, visita, mapa ----
const COORD = L.coordenadas;
const CVI = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.2a8.7 8.7 0 0 0-7.4 13.2L3.4 20.8l4.5-1.2A8.7 8.7 0 1 0 12 3.2z"/><path d="M8.9 8.6c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.4.7 1.4 1.8 2.6 2.3.3.1.5.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.2.3.4 0 .5-.2 1.2-.8 1.6-.6.4-1.4.5-2.4.2-1.6-.5-3-1.6-4-3-.7-1-1.3-2.2-1-3.3.1-.4.3-.8.7-1.1z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>',
  clear: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>',
  km: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 17a8 8 0 1 1 16 0M12 17l4-5M7 17h2M15 17h2"/></svg>',
};
const cvSun = '<div class="cv-sun" data-sun aria-hidden="true"><svg viewBox="0 0 96 54" focusable="false"><path class="cv-arc" d="M8 48a40 40 0 0 1 80 0"/><path class="cv-ticks" d="M12 36l5 3M24 20l4 4M48 8v6M72 20l-4 4M84 36l-5 3"/><g class="cv-needle"><path d="M48 48V16"/></g><circle class="cv-hub" cx="48" cy="48" r="4"/></svg></div>';
const cvChips = (id, lbl, opts, multi) => `<div class="cv-chips" role="group" aria-label="${esc(lbl)}" data-chips${multi ? ' data-multi' : ''} data-target="${id}">${opts.map((o) => `<button type="button" class="cv-chip" aria-pressed="false" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div><input type="hidden" id="${id}" data-lbl="${esc(lbl)}" data-p>`;
const cvL = (txt, forId, hint) => `<label class="cv-l"${forId ? ` for="${forId}"` : ''}>${txt}${hint ? `<small>${hint}</small>` : ''}</label>`;
const cvT = (txt, hint) => `<span class="cv-l" role="presentation">${txt}${hint ? `<small>${hint}</small>` : ''}</span>`;
const cvForm = ({ uid, intro, aria, ey, h3, body, nota, extra = '', busca = false, ejemplo }) => `
<form class="cv-form${busca ? ' cv-form--busca' : ''}" data-msg${busca ? ' data-busca' : ''} data-intro="${esc(intro)}" aria-label="${esc(aria)}">
<header class="cv-head">${cvSun}<div class="cv-ht"><p class="cv-ey">${ey}</p><h3>${h3}</h3></div><div class="cv-prog" aria-live="polite"><span class="cv-prog-t" data-prog-t>Sin datos todavía</span><span class="cv-prog-b" aria-hidden="true"><i data-prog-b></i></span></div></header>
<div class="cv-grid">${body}</div>
${extra}
<div class="cv-bub" data-burbuja><p class="cv-bub-h"><span>Así llega tu mensaje</span><em>Se arma solo</em></p><div class="cv-bub-b" data-bub-b></div></div>
<textarea class="msg-v cv-msgv" readonly hidden aria-label="Mensaje armado"></textarea>
<div class="cv-acts">${C.whatsApp && D.contact.whatsAppConfirmed === true ? `<a class="cv-btn cv-btn--wa" data-wa-msg data-wa="${C.whatsApp}" href="https://wa.me/${C.whatsApp}" ${EXT}>${CVI.wa}<span>Enviar por WhatsApp</span></a>` : ''}
<div class="cv-tools"><button class="cv-btn cv-btn--g${C.whatsApp && D.contact.whatsAppConfirmed === true ? '' : ' cv-btn--main'}" type="submit" data-copiar-msg hidden>${CVI.copy}<span>Copiar mensaje</span></button><button class="cv-btn cv-btn--g" type="button" data-ejemplo="${esc(JSON.stringify(ejemplo))}" hidden>${CVI.spark}<span>Completar con un ejemplo</span></button><button class="cv-btn cv-btn--g" type="button" data-limpiar hidden>${CVI.clear}<span>Limpiar</span></button></div>
<p class="cv-soc">También podés escribirle a la agencia por <a href="${FB}" ${EXT}>Facebook</a> o <a href="${IG}" ${EXT}>Instagram</a>.</p></div>
<p class="msg-s" role="status" aria-live="polite"></p>
</form>
<p class="src conversion-note cv-note">${nota}</p>`;

const secUsado = hasSvc('permuta') ? `
<section class="conversion conversion--trade" id="tu-usado" aria-labelledby="usado-t"><div class="w">
<div class="conversion-layout">
<div class="conversion-story photo-copy-panel">
<p class="ey"><span class="ey-brand">828</span> · Tu próximo paso</p><h2 id="usado-t">Entregá tu usado como <em>parte de pago</em></h2>
<p class="sec-p">Tomamos permutas. Contanos cuál es y armá el mensaje para enviárselo a ${esc(NAME)} por el canal que prefieras.</p>
<ol class="cv-steps"><li><b>Contanos qué tenés</b><span>Marca, modelo, año y kilometraje alcanzan para empezar.</span></li><li><b>Mirá tu mensaje armarse</b><span>Se escribe solo a medida que completás los datos.</span></li><li><b>Envialo a ${esc(NAME)}</b><span>Por el canal que prefieras. Las condiciones se acuerdan con ellos.</span></li></ol>
<ul class="cv-pills"><li>Permutas</li><li>Consignaciones</li><li>Compra y venta</li></ul>
</div>
<div class="conversion-panel cv-panel">
${cvForm({
  uid: 'u', intro: 'Hola! Quiero consultar por entregar mi usado como parte de pago.', aria: 'Datos de tu usado', ey: 'Empezá por acá', h3: 'Datos de tu usado',
  ejemplo: { 'u-mm': 'Chevrolet Corsa Classic 1.4', 'u-an': '2014', 'u-km': '118.000', 'u-co': 'Nafta', 'u-tr': 'Manual', 'u-es': 'Papeles al día, Services al día', 'u-in': 'Entregarlo y llevarme otro', 'u-no': 'Lo puedo llevar a la agencia cuando quieran verlo.' },
  body: `
<div class="cv-f cv-f--wide">${cvL('Marca y modelo', 'u-mm')}<input id="u-mm" data-lbl="Marca y modelo" data-p list="dl-marcas" autocomplete="off" placeholder="Ej: Chevrolet Corsa Classic 1.4" required></div>
<div class="cv-f">${cvL('Año', 'u-an')}<input id="u-an" data-lbl="Año" data-p data-anio inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Ej: 2014"></div>
<div class="cv-f">${cvL('Kilometraje', 'u-km')}<span class="cv-sfx" data-sfx="km"><input id="u-km" data-lbl="Kilometraje" data-p data-fmt="miles" inputmode="numeric" autocomplete="off" placeholder="Ej: 120.000"></span></div>
<div class="cv-f">${cvT('Combustible')}${cvChips('u-co', 'Combustible', ['Nafta', 'Diésel', 'GNC', 'Otro'])}</div>
<div class="cv-f">${cvT('Caja')}${cvChips('u-tr', 'Caja', ['Manual', 'Automática'])}</div>
<div class="cv-f cv-f--wide">${cvT('Cómo está', 'Podés marcar varias')}${cvChips('u-es', 'Estado', ['Papeles al día', 'Services al día', 'Un solo dueño', 'Sin choques importantes', 'Con GNC'], true)}</div>
<div class="cv-f cv-f--wide">${cvT('Qué querés hacer')}${cvChips('u-in', 'Quiero', ['Entregarlo y llevarme otro', 'Consignarlo', 'Consultar si lo toman'])}</div>
${autos.length ? `<div class="cv-f cv-f--wide">${cvL('¿Alguna unidad te interesa?', 'u-un', 'Opcional')}<select id="u-un" data-lbl="Unidad que me interesa" data-stock><option value="">Todavía no sé</option></select></div>` : ''}
<div class="cv-f cv-f--wide">${cvL('Algo más que quieras contar', 'u-no', 'Opcional')}<textarea id="u-no" data-lbl="Comentarios" maxlength="280" placeholder="Ej: tiene GNC de quinta generación, cubiertas nuevas…"></textarea><span class="cv-cnt" data-cnt aria-hidden="true">0 / 280</span></div>`,
  nota: `Es un mensaje que armás vos: no se envía ni se guarda nada desde este sitio. Las condiciones se acuerdan con ${esc(NAME)}.`,
})}
</div>
</div>
</div></section>` : '';

const MARCAS = [...new Set([...A.autos.map((a) => a.marca), 'Chevrolet', 'Volkswagen', 'Peugeot', 'Renault', 'Ford', 'Fiat', 'Toyota', 'Citroën', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Jeep', 'Audi', 'BMW', 'Mercedes-Benz', 'Suzuki', 'Yamaha'])].sort((x, y) => x.localeCompare(y, 'es'));

const secBusqueda = `
<section class="conversion conversion--search lt" id="busqueda" aria-labelledby="bus-t"><div class="w">
<div class="conversion-layout">
<div class="conversion-story photo-copy-panel">
<p class="ey"><span class="ey-brand">828</span> · Del otro lado del volante</p><h2 id="bus-t">Contanos qué auto <em>buscás</em></h2>
<p class="sec-p">Armá un mensaje con lo que tenés en mente y enviáselo a ${esc(NAME)} por el canal que prefieras.</p>
<ol class="cv-steps"><li><b>Decinos qué buscás</b><span>Una marca o un modelo alcanza; el resto afina la búsqueda.</span></li><li><b>${autos.length ? 'Mirá qué hay publicado' : 'Revisá nuestras redes'}</b><span>${autos.length ? 'Mientras escribís, te mostramos las unidades del catálogo que encajan.' : 'Las unidades se publican en Instagram, TikTok y Facebook.'}</span></li><li><b>Enviá la consulta</b><span>Por el canal que prefieras, sin registrarte ni dejar datos en el sitio.</span></li></ol>
<ul class="cv-pills"><li>Sin compromiso</li><li>Consultá financiación</li><li>Permutas</li></ul>
</div>
<div class="conversion-panel cv-panel">
<datalist id="dl-marcas">${MARCAS.map((m) => `<option value="${esc(m)}">`).join('')}</datalist>
${cvForm({
  uid: 'b', busca: true, intro: 'Hola! Estoy buscando un auto o una moto.', aria: 'Qué vehículo buscás', ey: 'Armá tu consulta', h3: 'El vehículo que tenés en mente',
  ejemplo: { 'b-mm': 'Volkswagen Amarok', 'b-ca': 'Moto', 'b-an': '2010', 'b-tr': 'Manual', 'b-co': 'Nafta', 'b-mo': 'US$', 'b-pr': '25.000', 'b-us': 'Ciudad, ruta', 'b-pa': 'Financiado', 'b-no': 'Contame las opciones disponibles.' },
  body: `
<div class="cv-f cv-f--wide">${cvL('Marca o modelo', 'b-mm')}<input id="b-mm" data-lbl="Marca o modelo" data-p list="dl-marcas" autocomplete="off" placeholder="Ej: Peugeot 208, Chevrolet Cruze…" required></div>
<div class="cv-f cv-f--wide">${cvT('Tipo de vehículo', 'Elegí una opción')}${cvChips('b-ca', 'Tipo de vehículo', ['Auto', 'Moto'], true)}</div>
<div class="cv-f">${cvL('Año mínimo', 'b-an')}<input id="b-an" data-lbl="Año mínimo" data-p data-anio inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Ej: 2015"><div class="cv-quick" aria-label="Años sugeridos">${[2010, 2015, 2018, 2020].map((y) => `<button type="button" class="cv-q" data-set="b-an" data-v="${y}">${y}+</button>`).join('')}</div></div>
<div class="cv-f">${cvT('Caja', 'Indistinto si no elegís')}${cvChips('b-tr', 'Transmisión', ['Manual', 'Automática'])}${cvT('Combustible', 'Podés marcar varios')}${cvChips('b-co', 'Combustible', ['Nafta', 'Diésel', 'GNC', 'Híbrido'], true)}</div>
<div class="cv-f cv-f--wide cv-money">${cvL('Presupuesto aproximado', 'b-pr', 'Opcional')}<div class="cv-money-r"><div class="cv-cur" role="group" aria-label="Moneda"><button type="button" class="cv-chip is-on" aria-pressed="true" data-cur="$">$</button><button type="button" class="cv-chip" aria-pressed="false" data-cur="US$">US$</button></div><input id="b-pr" data-lbl="Presupuesto" data-p data-fmt="miles" data-pre="#b-mo" inputmode="numeric" autocomplete="off" placeholder="Ej: 12.000.000"><input type="hidden" id="b-mo" value="$"></div></div>
<div class="cv-f cv-f--wide">${cvT('Para qué lo vas a usar', 'Podés marcar varios')}${cvChips('b-us', 'Uso', ['Trabajo', 'Familia', 'Ciudad', 'Ruta', 'Primer auto'], true)}</div>
<div class="cv-f cv-f--wide">${cvT('Cómo pensás pagarlo', 'Podés marcar varios')}${cvChips('b-pa', 'Forma de pago', ['Contado', 'Financiado', 'Con mi usado'], true)}</div>
<div class="cv-f cv-f--wide">${cvL('Algo más que quieras contar', 'b-no', 'Opcional')}<textarea id="b-no" data-lbl="Comentarios" maxlength="280" placeholder="Ej: busco algo económico en consumo y con aire acondicionado…"></textarea><span class="cv-cnt" data-cnt aria-hidden="true">0 / 280</span></div>`,
  extra: autos.length ? '<div class="cv-match" data-match aria-live="polite"><p class="cv-match-h" data-match-h>Escribí una marca o modelo para ver qué hay publicado</p><ul class="cv-match-l" data-match-l></ul></div>' : '',
  nota: 'Es un mensaje que armás vos: no se envía ni se guarda nada desde este sitio. No confirma disponibilidad ni precios.',
})}
</div>
</div>
</div></section>`;

const secGuia = `
<section id="guia" aria-labelledby="guia-t"><div class="w">
<p class="ey"><span class="ey-brand">828</span> · Guía de compra</p><h2 id="guia-t">Antes de comprar un <em>usado</em></h2>
<p class="sec-p">Información general para cualquier compra de un usado, de octubre de 2026. No es una condición ni una promesa de ${esc(NAME)}.</p>
<div class="guia-bar"><p class="guia-progress" data-guide-progress role="status" aria-live="polite">0 de 6 puntos seleccionados</p><button class="btn sm" type="button" data-guia-all hidden>Plegar todo</button></div>
<div class="guia">
<details class="gd"><summary><h3>Qué mirar en el auto</h3><span class="gd-c">6 puntos</span></summary><div class="gd-b"><ul data-guide-checklist><li><label><input type="checkbox" data-guide-item="carroceria">Carrocería y pintura: diferencias de tono, juntas desparejas o signos de golpes. Consultá la <a href="#preguntas">guía de preguntas</a>.</label></li><li><label><input type="checkbox" data-guide-item="neumaticos">Neumáticos, frenos y suspensión: desgaste parejo y ruidos al probarlo.</label></li><li><label><input type="checkbox" data-guide-item="motor">Motor y debajo del auto: fugas de aceite o líquidos.</label></li><li><label><input type="checkbox" data-guide-item="tablero">Tablero y luces: que no queden testigos encendidos.</label></li><li><label><input type="checkbox" data-guide-item="kilometraje">Kilometraje: que sea coherente con el desgaste de pedales, volante y asientos. Podés revisar unidades en <a href="#cars">el catálogo</a>.</label></li><li><label><input type="checkbox" data-guide-item="prueba">Probalo en marcha, en calle y en ruta si podés.</label></li></ul></div></details>
<details class="gd"><summary><h3>Papeles que conviene pedir</h3><span class="gd-c">5 puntos</span></summary><div class="gd-b"><ul><li>Título y cédula del automotor, y que los datos coincidan con el auto (dominio, motor y chasis).</li><li>Informe de dominio del Registro del Automotor.</li><li>Libre deuda de patentes y de multas.</li><li>Verificación policial vigente.</li><li>Formulario 08 de transferencia, firmado por quien vende.</li></ul></div></details>
<details class="gd"><summary><h3>Qué preguntarle a quien vende</h3><span class="gd-c">6 puntos</span></summary><div class="gd-b"><ul><li>¿Cuántos dueños tuvo y desde cuándo está a nombre de quien lo vende?</li><li>¿Hay facturas o registro de los services y reparaciones?</li><li>¿Tuvo choques o reparaciones importantes?</li><li>¿Pesa alguna prenda, embargo o restricción sobre el dominio?</li><li>¿Podés hacerlo revisar por un mecánico de tu confianza antes de decidir?</li><li>Dejá por escrito lo acordado: precio, forma de pago y fecha de entrega.</li></ul></div></details>
</div>
<p class="src">Los requisitos y costos de la transferencia cambian: consultalos en el Registro del Automotor o con un gestor o escribano antes de pagar.</p>
</div></section>`;

const mapa = COORD ? `
<div class="map" id="mapa" data-lat="${COORD.lat}" data-lng="${COORD.lng}" data-leaflet="js/vendor/leaflet.js" data-css="js/vendor/leaflet.css">
<div class="map-p"><p>Mapa interactivo de OpenStreetMap. Se carga solo si lo pedís.</p><button class="btn" type="button" data-mapa-abrir hidden>Ver mapa</button><p class="map-m src" role="status" aria-live="polite"></p></div>
<div class="map-v" role="region" aria-label="Mapa con la ubicación" hidden></div>
<div class="row"><a class="btn" href="${L.mapsUrl}" ${EXT}>Abrir en Google Maps</a><button class="btn" type="button" data-copiar="${esc(L.address)}, ${esc(L.city)}, ${esc(L.province)}" hidden>Copiar dirección</button></div>
<p class="src">Te esperamos en ${esc(L.address)}, ${esc(L.city)}.</p>
</div>` : '';


// ---- horarios + mapa (sección debajo del hero), contacto y sucursales con mapa ----
const gmapsEmbed = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=es&z=16&output=embed`;
const gmapsSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const DIR_COMPLETA = `${L.address}, ${L.city}, ${L.province}`;
const ICX = {
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
};
const ICN = {
  route: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h6.5a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H16"/></svg>',
  car: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 15.5v-3l2-5h13l2 5v3M3.5 15.5h17M3.5 15.5v2.5M20.5 15.5v2.5"/><circle cx="7.5" cy="14" r=".6"/><circle cx="16.5" cy="14" r=".6"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-.8-1.6-1.2-2.8-1.2-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2c1.7.3 2.7.8 2.7 2s-1.1 2-2.7 2c-1.2 0-2.2-.4-2.8-1.2M12 6.5V8M12 16v1.5"/></svg>',
  swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h13l-3.5-3.5M19 15H6l3.5 3.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>',
  group: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M12 8.5v3.5M12 12 6.5 15.2M12 12l5.5 3.2"/></svg>',
};
const hrFilas = H.display ? H.semana.map((g) => `<tr data-dias="${g.dias.join(',')}"><th scope="row"><span class="dr-dn">${esc(g.etiqueta)}</span><span class="dr-hoy">Hoy</span></th><td>${g.rangos.map((r) => `<span class="dr-rg">${fh(r[0])} a ${fh(r[1])}</span>`).join('')}</td></tr>`).join('') + (H.domingo ? `<tr data-dias="0"><th scope="row"><span class="dr-dn">Domingos</span><span class="dr-hoy">Hoy</span></th><td><span class="dr-rg dr-rg--x">${esc(H.domingo)}</span></td></tr>` : '') : '';
const mapaDidactico = `<div class="dr-map dr-map--didactic" id="mapa" data-mapa-didactico>
<div class="dr-didactic-art" aria-hidden="true"><svg viewBox="0 0 720 360" role="img"><path class="dr-road dr-road-a" d="M-20 275C130 250 175 125 320 145s205 135 420 78"/><path class="dr-road dr-road-b" d="M125 -20c28 108 98 134 144 180s45 108 50 220"/><path class="dr-road dr-road-c" d="M445 -20c-10 105-20 165 38 218s124 62 247 64"/><path class="dr-route" d="M120 270C210 230 230 176 318 175s105 66 192 55"/><circle class="dr-route-node" cx="120" cy="270" r="9"/><circle class="dr-route-node" cx="510" cy="230" r="9"/><g class="dr-pin" transform="translate(318 112)"><path d="M0 44S-25 22-25 0a25 25 0 1 1 50 0C25 22 0 44 0 44Z"/><circle cx="0" cy="0" r="8"/></g></svg><span class="dr-didactic-label dr-didactic-label--from">Tu recorrido</span><span class="dr-didactic-label dr-didactic-label--to">828</span></div>
<div class="dr-map-ph dr-map-ph--didactic"><span class="dr-map-ic">${ICX.pin}</span><p>Mapa didáctico de referencia</p><p class="map-m">Llegá a ${esc(NAME)} · ${esc(DIR_COMPLETA)}</p><div class="row"><a class="btn p sm" href="${L.mapsUrl}" ${EXT}>Abrir indicaciones</a></div></div>
</div>`;
const mapaHr = COORD ? `<div class="dr-map" id="mapa" data-lat="${COORD.lat}" data-lng="${COORD.lng}" data-nombre="${esc(NAME)}" data-dir="${esc(DIR_COMPLETA)}" data-gmaps="${esc(L.mapsUrl)}" data-leaflet="js/vendor/leaflet.js" data-css="js/vendor/leaflet.css" data-manual-map="1">
<div class="dr-map-v" role="region" aria-label="Mapa con la ubicación de ${esc(NAME)}"></div>
<div class="dr-map-ph" data-mapa-ph><span class="dr-map-ic">${ICX.pin}</span><p>Mapa de ${esc(L.city)}</p><div class="row"><button class="btn p sm" type="button" data-mapa-abrir hidden>Ver mapa</button><a class="btn sm" href="${L.mapsUrl}" ${EXT}>Abrir en Google Maps</a></div><p class="map-m src" role="status" aria-live="polite"></p></div>
</div>` : mapaDidactico;
const hrAddr = H.display ? `<div class="dr-addr"><div class="dr-addr-t"><span class="dr-addr-i">${ICX.pin}</span><div><p class="dr-k">Dónde estamos</p><p class="dr-a">${esc(DIR_COMPLETA)}</p>${L.direccionAnterior ? `<p class="dr-ant">Antes: ${esc(L.direccionAnterior)}</p>` : ''}</div></div>
<div class="row"><a class="btn p sm" href="${L.mapsUrl}" ${EXT}>Cómo llegar</a><button class="btn sm" type="button" data-copiar="${esc(DIR_COMPLETA)}" hidden>Copiar dirección</button></div></div>` : '';
const secHorarios = H.display ? `
<section id="horarios" class="dr-hr dr-lux dr-v71" aria-labelledby="hor-t" data-semana="${esc(JSON.stringify(H.semana))}"><div class="w">
<div class="dr-hr-head"><p class="ey"><span class="ey-brand">828</span> · Horarios y ubicación</p><h2 id="hor-t">Cuándo y dónde <em>visitarnos</em></h2><p class="dr-hr-lead">Te esperamos en ${esc(L.address)}, Monte Grande. En la agencia podés conocer las unidades, conversar sobre permutas y consultar alternativas de financiación. Revisá los horarios y, si venís por un vehículo en particular, escribinos o llamanos antes para confirmar su disponibilidad y coordinar la atención.</p><p class="dr-hr-note">Los horarios se basan en datos públicos; te recomendamos confirmarlos antes de viajar.</p></div>
<div class="dr-stage">
<div class="dr-panel">
<div class="dr-now" data-live data-abierto="0">
<p class="dr-now-st"><span class="dr-dot" aria-hidden="true"></span><span data-estado-t>Horario de atención</span></p>
<p class="dr-now-lbl" data-cd-lbl></p>
<div class="dr-cd" role="timer" aria-label="Tiempo que falta"><span class="dr-cd-u"><b data-cd-h>--</b><i>horas</i></span><span class="dr-cd-u"><b data-cd-m>--</b><i>minutos</i></span><span class="dr-cd-u"><b data-cd-s>--</b><i>segundos</i></span></div>
<p class="dr-now-d" data-estado-d>${esc(H.corto)}</p>
</div>
<div class="dr-wk"><p class="dr-wk-t">Días y horarios de atención</p>
<table class="dr-tbl"><caption class="sr">Horario de atención</caption><tbody>${hrFilas}</tbody></table></div>
<p class="dr-tz">Hora de Argentina: ahora son las <b data-reloj>--:--:--</b></p>
</div>
<div class="dr-mapwrap">
${mapaHr}
${hrAddr}
</div>
</div>
<p class="src dr-src">Las franjas indican el horario general de atención. La disponibilidad de los vehículos puede cambiar y una consulta no reserva por sí sola una unidad; confirmá ambos puntos con el equipo antes de salir. Las indicaciones de Google Maps y Waze están disponibles junto al mapa, que solo carga cuando elegís verlo.</p>
</div></section>` : '';

const visHr = H.display ? `<ul class="vz-hrs">${H.semana.map((g) => `<li data-dias="${g.dias.join(',')}"><span>${esc(g.etiqueta)}</span><b>${g.rangos.map((r) => `${fh(r[0])} a ${fh(r[1])}`).join(' y ')}</b></li>`).join('')}${H.domingo ? `<li data-dias="0"><span>Domingos</span><b>${esc(H.domingo)}</b></li>` : ''}</ul>` : '';
const secVisita = `
<section id="visita" class="visita-s vz" aria-labelledby="vis-t"><div class="w vis-w">
<div class="vz-head"><p class="ey"><span class="ey-brand">828</span> · Visita</p><h2 id="vis-t">Coordiná tu <em>visita</em></h2>
<p class="sec-p">Elegí una fecha y una franja para consultar por una visita o una prueba de manejo. La solicitud no es un turno automático: el equipo verifica la disponibilidad de la unidad y confirma con vos el día y el horario antes de que viajes.</p></div>
<div class="vz-grid">
<div class="vz-main"><h3>Agendá una visita y prueba de manejo</h3>
<ol class="vz-steps"><li><b>Elegí día y franja</b><span>En la página de reserva, desde el celular o la computadora.</span></li><li><b>Se arma tu consulta</b><span>Queda lista para enviarla a la agencia por el canal que prefieras.</span></li><li><b>La agencia te confirma</b><span>Es una consulta, no un turno: el día y la hora se acuerdan con la agencia.</span></li></ol>
<div class="vz-cta"><a class="btn p vz-go" href="reserva.html">Agendar visita</a>${C.whatsApp && D.contact.whatsAppConfirmed === true ? `<a class="btn" href="${wa('Hola! Quiero coordinar una visita y prueba de manejo.') }" ${EXT}>WhatsApp</a>` : ''}<a class="btn" href="${L.mapsUrl}" ${EXT}>Cómo llegar</a>${C.phoneTel ? `<a class="btn" href="tel:${C.phoneTel}">Llamar</a>` : ''}</div></div>
${H.display ? `<aside class="vz-side" aria-label="Antes de venir"><p class="vz-side-k">Antes de venir</p>
<div class="vz-live" data-live data-abierto="0"><span class="dr-dot" aria-hidden="true"></span><div><p class="vz-live-t" data-estado-t>Horario de atención</p><p class="vz-live-c" data-cd-full></p></div></div>
${visHr}
<p class="vz-addr">${ICX.pin}<span>${esc(DIR_COMPLETA)}</span></p>
<a class="btn sm" href="#horarios">Ver horarios y mapa</a></aside>` : ''}
</div>
</div></section>`;

const chan = (cls, icon, k, v, sub, href, ext) => `<li><a class="dr-chn${cls ? ' ' + cls : ''}" href="${href}"${ext ? ' ' + EXT : ''}><span class="dr-chn-i">${icon}</span><span class="dr-chn-t"><span class="dr-chn-k">${k}</span><span class="dr-chn-v">${v}</span><span class="dr-chn-s">${sub}</span></span></a></li>`;
const canales = [
  C.whatsApp && D.contact.whatsAppConfirmed === true ? chan('dr-chn--p', IC.wa, 'WhatsApp', esc(C.whatsAppDisplay), 'Escribinos y te respondemos', WA, true) : '',
  C.phoneTel ? chan('', IC.tel, 'Teléfono', esc(C.phone), 'Llamanos en horario de atención', `tel:${C.phoneTel}`, false) : '',
  C.email ? chan('', IC.mail, 'Correo', esc(C.email), 'Consultas por escrito', `mailto:${esc(C.email)}`, false) : '',
  chan('', ICX.pin, 'Visitanos', esc(L.address), `${esc(L.city)} · ver horarios y mapa`, '#horarios', false),
].filter(Boolean).join('');
const redes = [
  `<li><a href="${FB}" ${EXT}>Facebook</a></li>`,
  `<li><a href="${IG}" ${EXT}>Instagram @${esc(C.instagram)}</a></li>`,
  D.reviews.googleUrl ? `<li><a href="${D.reviews.googleUrl}" ${EXT}>Ficha de Google</a></li>` : '',
  TT ? `<li><a href="${TT}" ${EXT}>TikTok @${esc(C.instagram)}</a></li>` : '',
  YT ? `<li><a href="${YT}" ${EXT}>YouTube</a></li>` : '',
].filter(Boolean).join('');

const RV = D.reviews;
const nDias = (H.semana || []).reduce((n, g) => n + g.dias.length, 0);
const trayectoriaNumero = D.presentacion.destacadoNumero || '—';
const trayectoriaEtiqueta = D.presentacion.destacadoEtiqueta || 'trayectoria';
const trayectoriaSub = D.presentacion.destacadoSub || '';
const secNosotros = `
<section class="nz" id="nosotros" aria-labelledby="nos-t">
<div class="nz-top"><div class="nz-frentes" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="w nz-w">
<div class="nz-intro">
<p class="ey"><span class="ey-brand">828</span> · Nosotros</p>
<span class="nz-logo"><img src="images/logo-sm.png" width="320" height="320" alt="${esc(NAME)}"></span>
<h2 id="nos-t">Quiénes <em>somos</em></h2>
<p class="nz-lead">Vehículos usados</p>
<p class="nz-offer">Financiación: consultar condiciones</p>
<p class="nz-offer-note">Las alternativas, requisitos y condiciones se confirman directamente con el equipo para cada unidad.</p>
<p class="nz-p">Reunimos opciones de distintas marcas y vehículos usados. Podés consultar por financiación y considerar una permuta. La disponibilidad y las condiciones de cada operación se confirman de manera directa con el equipo.</p>
<div class="row nz-cta"><a class="btn p" href="#unidades">Explorar unidades</a><a class="btn" href="#contacto">Hablar con el equipo</a></div>
<div class="nz-contactos" aria-label="Contacto de Automotores 828">${C.whatsAppDisplay ? `<a href="#contacto"><span>WhatsApp</span><b>${esc(C.whatsAppDisplay)}</b><small>Atención comercial</small></a>` : ''}</div>
</div>
<div class="nz-side"><div class="nz-big"><span class="nz-flag" aria-hidden="true"></span><p class="nz-proof">AUTOMOTORES 828 · MONTE GRANDE</p><p class="nz-num-l">Atención directa</p><p class="nz-num-s">Conocé opciones, resolvé consultas y avanzá a tu ritmo.</p></div>${GREVIEWS}</div>
</div></div>
<div class="nz-body"><div class="w">
<h3 class="nz-h">Qué podés resolver con nosotros</h3>
<ul class="nz-tiles">
<li class="nz-tile"><span class="nz-ic">${ICN.car}</span><h4>Compra y venta</h4><p>Compra y venta de vehículos usados en ${esc(L.city)}.</p><a href="#unidades">Ver unidades</a></li>
${hasSvc('financiacion') ? `<li class="nz-tile"><span class="nz-ic">${ICN.coin}</span><h4>Financiación</h4><p>Consultanos por financiación. Las condiciones se informan por consulta y dependen de la unidad y de cada solicitante.</p><a href="#financiacion">Ver cómo consultar</a></li>` : ''}
${hasSvc('permuta') ? `<li class="nz-tile"><span class="nz-ic">${ICN.swap}</span><h4>Tu usado cuenta</h4><p>Tomamos permutas. Armá el mensaje con los datos de tu usado y enviáselo a ${esc(NAME)}.</p><a href="#tu-usado">Armar mi consulta</a></li>` : ''}
${hasSvc('consignacion') ? `<li class="nz-tile"><span class="nz-ic">${ICN.shield}</span><h4>Consignaciones</h4><p>Podés dejar tu vehículo en consignación. Las condiciones se coordinan con ${esc(NAME)}.</p><a href="#contacto">Consultar</a></li>` : ''}
</ul>
</div></div>
<div class="nz-net nz-net--mapa" id="donde"><div class="nz-donde-hd"><div class="w"><h3 class="nz-h">Dónde encontrarnos</h3><p class="nz-net-p">Nuestro salón está en ${esc(L.address)}, ${esc(L.city)}. Revisá el horario general, confirmá previamente la unidad que querés ver y elegí «Abrir en Google Maps» para planificar el trayecto. El mapa interactivo de esta página queda disponible solo si decidís abrirlo.</p>
<ul><li class="is-here">${ICX.pin}<div><b>${esc(NAME)}</b><span>${esc(DIR_COMPLETA)}</span></div></li></ul>
${L.mapsUrl ? `<p class="nz-net-acc"><a class="btn p sm" href="${L.mapsUrl}" ${EXT}>Abrir en Google Maps</a></p>` : ''}</div></div>
${COORD ? `<div class="nz-mapa"><div class="dr-map" id="mapa-nosotros" data-lat="${COORD.lat}" data-lng="${COORD.lng}" data-nombre="${esc(NAME)}" data-dir="${esc(DIR_COMPLETA)}" data-gmaps="${esc(L.mapsUrl)}" data-leaflet="js/vendor/leaflet.js" data-css="js/vendor/leaflet.css" data-manual-map="1"><div class="dr-map-v" role="region" aria-label="Mapa con la ubicación de ${esc(NAME)}"></div><div class="dr-map-ph" data-mapa-ph><span class="dr-map-ic">${ICX.pin}</span><p>Mapa de ${esc(L.city)}</p><p class="map-m src" role="status" aria-live="polite">El mapa interactivo se carga solo cuando lo solicites.</p><div class="row"><button class="btn p sm" type="button" data-mapa-abrir>Ver mapa interactivo</button></div></div></div>` : ''}</div>
</section>`;

const ld = {
  '@context': 'https://schema.org', '@type': 'AutoDealer', name: NAME,
  address: { '@type': 'PostalAddress', streetAddress: L.address, postalCode: L.postalCode, addressLocality: L.city, addressRegion: L.province, addressCountry: 'AR' },
  sameAs: [FB, IG, TT, YT].filter(Boolean),
  ...(siteUrl ? { url: siteUrl } : {}), ...(C.phoneTel ? { telephone: C.phoneTel } : {}), ...(C.email ? { email: C.email } : {}), ...(L.mapsUrl ? { hasMap: L.mapsUrl } : {}), ...(COORD ? { geo: { '@type': 'GeoCoordinates', latitude: COORD.lat, longitude: COORD.lng } } : {}), ...(openSpec.length ? { openingHoursSpecification: openSpec } : {}),
};

// Cadena horizontal del hero: frentes de diez unidades ya integradas en data/vehicles.json.
const HERO_FOTOS = [
  ['01', 'images/hero/hero-01.webp', 'images/hero/hero-01-828.webp', 900, 1200, 621, 'Honda Fit 2014 Gris en Automotores 828'],
  ['02', 'images/hero/hero-02.webp', 'images/hero/hero-02-828.webp', 902, 902, 828, 'Peugeot 208 2021 Blanco en Automotores 828'],
  ['03', 'images/hero/hero-03.webp', 'images/hero/hero-03-828.webp', 900, 1200, 621, 'Renault Sandero Stepway 2014 Blanco en Automotores 828'],
  ['04', 'images/hero/hero-04.webp', 'images/hero/hero-04-828.webp', 900, 1200, 621, 'Peugeot 2008 2021 Gris en Automotores 828'],
  ['05', 'images/hero/hero-05.webp', 'images/hero/hero-05-828.webp', 1195, 1195, 828, 'Peugeot 208 2019 Blanco en Automotores 828'],
  ['06', 'images/hero/hero-06.webp', 'images/hero/hero-06-828.webp', 900, 900, 828, 'Fiat Palio 2013 Blanco en Automotores 828'],
  ['07', 'images/hero/hero-07.webp', 'images/hero/hero-07-828.webp', 900, 1200, 621, 'Peugeot 208 2016 Negro en Automotores 828'],
  ['08', 'images/hero/hero-08.webp', 'images/hero/hero-08-828.webp', 1141, 1141, 828, 'Citroën C4 Lounge 2020 Gris en Automotores 828'],
  ['09', 'images/hero/hero-09.webp', 'images/hero/hero-09-828.webp', 1131, 1131, 828, 'Toyota Yaris 2021 Azul en Automotores 828'],
  ['10', 'images/hero/hero-10.webp', 'images/hero/hero-10-828.webp', 900, 1200, 621, 'Renault Duster 2018 Gris en Automotores 828'],
];
const HERO_VERSION = '?v=20261021-2';
const HERO_UNIT_PHOTOS = [
  'images/stock/ml-4103009836-p01.webp', 'images/stock/ml-2137817901-p01.webp',
  'images/stock/ml-2185939777-p01.webp', 'images/stock/ml-2032707077-p01.webp',
  'images/stock/ml-2191782749-p01.webp', 'images/stock/ml-2116059721-p01.webp',
  'images/stock/ml-3962722820-p01.webp', 'images/stock/ml-2140604399-p01.webp',
  'images/stock/ml-2090433129-p01.webp', 'images/stock/ml-4049171736-p01.webp'
];
const HERO_UNITS = HERO_FOTOS.map((photo, i) => {
  const source = HERO_UNIT_PHOTOS[i];
  const matches = autos.filter((unit) => Array.isArray(unit.fotos) && unit.fotos.some((image) => image.src === source));
  if (matches.length !== 1 || !fs.existsSync(path.join(root, source))) throw new Error(`Hero ${photo[0]}: la fotografía ${source} no identifica una única unidad del inventario`);
  const unit = matches[0], label = `${unit.marca} ${unit.modelo} · ${unit.anio}`;
  const altIdentity = norm(photo[6].replace(/ en Automotores 828$/, ''));
  if (!altIdentity.includes(norm(`${unit.marca} ${unit.modelo} ${unit.anio} ${unit.color}`))) throw new Error(`Hero ${photo[0]}: marca/modelo/año/color no coincide con ${source} (hay unidades homónimas: se verifica también el color)`);
  return { unit, index: autos.indexOf(unit), label };
});
if (new Set(HERO_UNITS.map((entry) => entry.index)).size !== HERO_FOTOS.length) throw new Error('Las imágenes del hero no tienen correspondencia única con fichas distintas');
const heroFigure = ([n, src, small, width, height, smallWidth], entry, decorative, priority) => `<figure class="hero-chain-car hero-chain-car--${n}"${decorative ? ' aria-hidden="true"' : ''}>${decorative ? `<div class="hero-chain-link" aria-hidden="true" data-hero-unit="${esc(entry.unit.id)}"><img src="${src}${HERO_VERSION}" srcset="${small}${HERO_VERSION} ${smallWidth}w, ${src}${HERO_VERSION} ${width}w" sizes="25vw" width="${width}" height="${height}" alt="" decoding="async" loading="lazy" fetchpriority="low"><span class="hero-chain-label">${esc(entry.label)}</span></div>` : `<button class="hero-chain-link" type="button" data-hero-unit="${esc(entry.unit.id)}" aria-label="Abrir la ficha de ${esc(entry.label)}"><img src="${src}${HERO_VERSION}" srcset="${small}${HERO_VERSION} ${smallWidth}w, ${src}${HERO_VERSION} ${width}w" sizes="25vw" width="${width}" height="${height}" alt="" decoding="async"${priority ? ' fetchpriority="high"' : ' loading="lazy" fetchpriority="low"'}><span class="hero-chain-label">${esc(entry.label)}</span></button>`}</figure>`;
const HERO_CHAIN = HERO_FOTOS.map((photo, i) => heroFigure(photo, HERO_UNITS[i], false, i === 0)).join('');
const HERO_CHAIN_DUP = HERO_FOTOS.map((photo, i) => heroFigure(photo, HERO_UNITS[i], true, false)).join('');

/* Anillo de interiores (js/anillo.js): cada foto de images/anillo/ es una foto publicada de una unidad del stock.
   El vínculo se comprobó comparando cada foto con las fotos de cada ficha (coincidencia de puntos de imagen);
   «foto» es el número de foto de la ficha de la que sale. Si una unidad deja el stock, hay que cambiar su foto y su fila. */
const ANILLO_FOTOS = [
  { n: '01', id: '1982665981', foto: 9 },
  { n: '02', id: '2032707077', foto: 10 },
  { n: '03', id: '2032158299', foto: 12 },
  { n: '04', id: '2063616163', foto: 9 },
  { n: '05', id: '2069940821', foto: 8 },
  { n: '06', id: '2057558089', foto: 9 },
  { n: '07', id: '1957627121', foto: 10 },
];
const ANILLO_UNIDADES = ANILLO_FOTOS.map(({ n, id, foto }) => {
  const matches = autos.filter((unit) => String(unit.id) === id);
  if (matches.length !== 1) throw new Error(`Anillo ${n}: la unidad ${id} no está en data/vehicles.json`);
  const unit = matches[0];
  if (unit.vendida) throw new Error(`Anillo ${n}: la unidad ${id} figura como vendida; hay que reemplazar su foto`);
  if (!Array.isArray(unit.fotos) || !unit.fotos[foto - 1]) throw new Error(`Anillo ${n}: la ficha ${id} no tiene la foto ${foto}`);
  if (!fs.existsSync(path.join(root, `images/anillo/anillo-${n}.webp`))) throw new Error(`Anillo ${n}: falta images/anillo/anillo-${n}.webp`);
  return { n, unit };
});
if (new Set(ANILLO_UNIDADES.map((e) => e.unit.id)).size !== ANILLO_FOTOS.length) throw new Error('Las fotos del anillo no tienen correspondencia única con fichas distintas');
const anilloTarjeta = ({ n }) => `<li class="ring-card"><img src="images/anillo/anillo-${n}.webp" width="600" height="800" alt="" loading="lazy" decoding="async" draggable="false"></li>`;
const anilloUnidad = ({ unit }, k) => {
  const titulo = esc(unit.titulo);
  const meta = [unit.anio != null ? `<b>${unit.anio}</b>` : '', unit.version ? `<span>${esc(unit.version)}</span>` : ''].filter(Boolean).join('');
  const precio = unit.precio
    ? `<p class="ring-pr"><span class="price-currency">${esc(unit.precio.moneda)}</span> ${fmt(unit.precio.monto)}</p><p class="ring-n">Precio publicado el ${esc(fdate(unit.precio.fecha))}; puede haber cambiado.</p>`
    : '<p class="ring-pr">Consultar precio</p>';
  /* El nombre accesible de cada acción empieza con su texto visible (WCAG 2.5.3). «Ver ficha» reutiliza la ficha del catálogo (data-hero-unit). */
  const verFicha = `<button class="btn p sm" type="button" data-hero-unit="${esc(unit.id)}" aria-label="Ver ficha de ${titulo}">Ver ficha</button>`;
  const consultar = `<a class="btn sm" href="${esc(consultaHref(unit))}" ${EXT} aria-label="${WA ? 'Consultar por WhatsApp' : 'Ver publicación en Mercado Libre'}: ${titulo}">${WA ? 'Consultar' : 'Ver publicación'}</a>`;
  return `<div class="ring-unit${k === 0 ? ' is-on' : ''}" data-ring-i="${k}" role="group" aria-label="${titulo}"><p class="ring-brand">${esc(marcaDe(unit))}</p><h3 class="ring-model">${esc(unit.modelo || sinMarca(unit))}</h3>${meta ? `<p class="ring-meta">${meta}</p>` : ''}${precio}<div class="ring-act">${verFicha}${consultar}</div></div>`;
};
/* El anillo sigue siendo decoración (aria-hidden, sin interacción). Debajo va la unidad que pasa al frente, con datos de vehicles.json; las acciones reutilizan la ficha del catálogo (data-hero-unit) y el mensaje de wa-mensajes.js. */
const ANILLO = `<div class="ring-sec" data-anillo aria-hidden="true"><ul class="ring-stage">${ANILLO_UNIDADES.map(anilloTarjeta).join('')}</ul></div>\n<section class="ring-info" aria-labelledby="ring-t" data-anillo-info><div class="w">\n<h2 class="ey ring-k" id="ring-t"><span class="ey-brand">828</span> · Los interiores de nuestras unidades</h2>\n<div class="ring-units">${ANILLO_UNIDADES.map(anilloUnidad).join('')}</div>\n</div></section>`;

/* Datos de cada unidad del recorrido y de la unidad destacada (mismos datos reales de data/vehicles.json que usa la ficha). */
const HIST_DATO = {
  anio: (u) => (u.anio != null ? String(u.anio) : ''),
  km: (u) => (u.km != null ? `${fmt(u.km)} km` : ''),
  motor: (u) => u.motor || '',
  transmision: (u) => u.transmision || '',
  combustible: (u) => u.combustible || '',
  color: (u) => u.color || '',
};
const histDatos = (u, claves) => (claves || []).map((k) => (HIST_DATO[k] ? HIST_DATO[k](u) : '')).filter(Boolean).join(' · ');
const histPrecio = (u) => (u.precio && u.precio.fecha ? `Precio publicado el ${fdate(u.precio.fecha)}: ${u.precio.moneda} ${fmt(u.precio.monto)}; puede haber cambiado.` : '');
const histFondo = async (ruta) => { try { const { fondoDifuminado } = await import('./make-historia.mjs'); return await fondoDifuminado(ruta); } catch (e) { return ''; } };

/* Recorrido horizontal de la unidad destacada (js/recorrido.js, css/recorrido.css): vive DENTRO de #unidad-destacada.
   Primera tarjeta = la propia unidad destacada; luego las unidades de data/dealership.json → historias.recorrido.tarjetas (datos reales de data/vehicles.json).
   Cada tarjeta muestra el nombre real de la unidad (modelo, marca, año, km) y abre SU efecto de revelado (js/historia.js); sin JS enlaza a su ficha.
   Las fotos se muestran completas (la tarjeta toma la proporción real de la foto: nada se recorta).
   js/recorrido.js muestra «inicial» tarjetas y agrega «paso» por cada pulsación de «Cargar … más».
   Sin tarjetas válidas (mínimo 2), desactivado o sin foto en disco: devuelve null y la sección queda como era. */
const recorridoHtml = async (unit, foto, fondo, h) => {
  const r = D.historias && D.historias.recorrido;
  if (!r || r.activa !== true) return null;
  const lista = (r.tarjetas || []).map((t) => {
    const u = autos.find((x) => String(x.id) === String(t.unidadId));
    if (!u || u.vendida || !t.foto || !fs.existsSync(path.join(root, t.foto))) return null;
    return { u, t };
  }).filter(Boolean);
  if (lista.length < 2) { console.warn('recorrido: menos de 2 tarjetas válidas; no se emite'); return null; }
  const tx = r.textos || {};
  const claves = (h && h.datos) || [];
  const total = lista.length + 1;
  const inicial = Math.max(2, Math.min(total, Number(r.inicial) || total));
  const paso = Math.max(1, Number(r.paso) || 3);
  const n2 = (n) => String(n).padStart(2, '0');
  const items = [{ u: unit, src: foto.src, ancho: foto.ancho || 1200, alto: foto.alto || 675, alt: foto.alt || unit.titulo, bg: fondo, main: true }]
    .concat(lista.map(({ u, t }) => ({ u, src: t.foto, ancho: t.ancho || 1200, alto: t.alto || 900, alt: `${u.titulo} · Foto publicada en Mercado Libre`, bg: null, main: false })));
  for (const it of items) if (it.bg === null) it.bg = await histFondo(path.join(root, it.src));
  const nombre = (u) => String(u.modelo || sinMarca(u));
  const detalle = (u) => [u.marca, u.anio != null ? u.anio : null, u.km != null ? `${fmt(u.km)} km` : null].filter((x) => x != null && x !== '').join(' · ');
  const tarjetas = items.map((it, i) => `<a class="rec__card${it.main ? ' rec__card--main' : ''}" href="#unidad=${esc(it.u.id)}" data-hist-unit="${esc(it.u.id)}" data-i="${i}" style="--ar:${(it.ancho / it.alto).toFixed(4)}" aria-label="${esc(`Ver unidad: ${it.u.titulo}`)}"><span class="rec__photo"><img src="${esc(it.src)}" width="${it.ancho}" height="${it.alto}" alt=""${i === 0 ? '' : ' loading="lazy"'} decoding="async"></span><span class="rec__cap"><span class="rec__name"><b class="rec__word">${esc(nombre(it.u))}</b><i class="rec__sub">${esc(detalle(it.u))}</i></span><i class="rec__num" aria-hidden="true">${n2(i + 1)}</i></span></a>`).join('\n');
  const unidades = {};
  for (const it of items) unidades[it.u.id] = { t: it.u.titulo, d: histDatos(it.u, claves), p: histPrecio(it.u), w: wa(`Hola! Quiero consultar por ${it.u.titulo}.`), f: { s: it.src, w: it.ancho, h: it.alto, a: it.alt }, b: it.bg || '' };
  const json = JSON.stringify({ main: String(unit.id), unidades }).replace(/</g, '\\u003c');
  const sig = /^#[\w-]+$/.test(r.siguiente || '') ? r.siguiente : '#unidades';
  const html = `<a class="rec__skip" href="${sig}">${esc(r.saltar || 'Saltar el recorrido')}</a>
<div class="hist-rec" role="region" aria-label="${esc(r.region || 'Recorrido horizontal')}" tabindex="0" data-rec-inicial="${inicial}" data-rec-paso="${paso}"><div class="rec__track">
${tarjetas}
</div></div>
<div class="rec__hud" aria-hidden="true"><span class="rec__count"><b data-rec-n>01</b> / <span data-rec-total>${n2(total)}</span></span><span class="rec__bar"><i data-rec-bar></i></span></div>`;
  const mas = `<button class="hist-ctl-b hist-more" type="button" data-rec-mas hidden data-txt="${esc(tx.cargarMas || 'Cargar {n} más')}" data-txt-agregadas="${esc(tx.agregadas || 'Se agregaron {n} unidades. Mostrando {a} de {b}.')}">${esc((tx.cargarMas || 'Cargar {n} más').replace('{n}', String(paso)))}</button>
<p class="rec__cuenta" role="status" aria-live="polite" data-rec-cuenta data-txt="${esc(tx.mostrando || 'Mostrando {a} de {b} unidades')}"></p>`;
  return { html, mas, json };
};

/* Unidad destacada (js/historia.js): foto de una unidad real con revelado. Todo sale de data/dealership.json → historias.destacada
   y de data/vehicles.json (nada se duplica). Sin datos válidos, desactivada, vendida o sin foto en disco no se emite nada.
   El relleno difuminado se genera aquí con sharp (scripts/make-historia.mjs) y va incrustado como data: URI.
   El revelado sirve a la unidad destacada y a cada tarjeta del recorrido: js/historia.js completa el panel con el JSON [data-hist-datos]. */
const secDestacada = await (async () => {
  const h = D.historias && D.historias.destacada;
  if (!h || h.activa !== true) return '';
  const unit = autos.find((u) => String(u.id) === String(h.unidadId));
  const foto = h.foto || {};
  if (!unit || unit.vendida || !foto.src || !fs.existsSync(path.join(root, foto.src))) return '';
  const tx = h.textos || {};
  const enc = h.encuadre || {};
  const titulo = String(tx.titulo || unit.titulo);
  const palabras = titulo.split(/\s+/);
  const h2 = palabras.length > 2 ? `${esc(palabras.slice(0, 2).join(' '))} <em>${esc(palabras.slice(2).join(' '))}</em>` : esc(titulo);
  const fondo = await histFondo(path.join(root, foto.src));
  const fecha = unit.relevadoEl || (unit.precio && unit.precio.fecha) || null;
  const datos = histDatos(unit, h.datos);
  const precioTxt = histPrecio(unit);
  const precio = precioTxt ? `<p class="n">${esc(precioTxt)}</p>` : '';
  const waUrl = wa(`Hola! Quiero consultar por ${unit.titulo}.`);
  const etiqueta = `Unidad destacada: ${titulo}`;
  const RECR = await recorridoHtml(unit, foto, fondo, h);
  const REC = RECR ? RECR.html : '';
  const foco = /^[0-9. %a-z-]+$/i.test(enc.focoMovil || '') ? ` style="--hist-foco:${enc.focoMovil}"` : '';
  return `<section class="hist" id="unidad-destacada" aria-labelledby="hist-t" data-historia data-hist-main="${esc(unit.id)}" data-enc-escritorio="${esc(enc.escritorio || 'contain-blur')}" data-enc-movil="${esc(enc.movil || 'contain-blur')}"${foco}${REC ? ' data-hist-rec' : ''}>
${REC ? '<div class="hist-stage">\n' : ''}<div class="w${REC ? ' hist-head' : ''}">
<p class="ey"><span class="ey-brand">828</span> · ${esc(tx.eyebrow || 'Unidad destacada')}</p>
<h2 id="hist-t">${h2}</h2>
<p class="sec-p">${fecha ? `Dato relevado el ${esc(fdate(fecha))}. ` : ''}Precio y disponibilidad pueden cambiar; confirmalos con la agencia.</p>
${REC ? `</div>\n${REC}\n<div class="w hist-foot">` : `<figure class="hist-prev"${fondo ? ` style="background-image:url(${fondo})"` : ''}><img src="${esc(foto.src)}" width="${foto.ancho || 1200}" height="${foto.alto || 675}" alt="${esc(foto.alt || unit.titulo)}" loading="lazy" decoding="async"></figure>`}
<button class="hist-btn" type="button" data-historia-abrir data-hist-estado="cargando" aria-busy="true" aria-controls="hist-overlay" aria-haspopup="dialog" aria-expanded="false"><span class="hist-rule hist-rule--top" aria-hidden="true"></span><span class="hist-label">${esc(tx.boton || 'Conocé esta unidad')}</span><span class="hist-rule hist-rule--bottom" aria-hidden="true"></span></button>
<div class="hist-ctl" role="group" aria-label="${esc(tx.controles || 'Control de la animación')}" hidden>
<button class="hist-ctl-b" type="button" data-historia-pausa aria-pressed="false"><span data-l-off>${esc(tx.pausar || 'Pausar animación')}</span><span data-l-on hidden>${esc(tx.reanudar || 'Reanudar animación')}</span></button>
<button class="hist-ctl-b" type="button" data-historia-repetir>${esc(tx.repetir || 'Repetir animación')}</button>
</div>
${RECR ? RECR.mas + '\n' : ''}<p class="sr" role="status" aria-live="polite" data-historia-estado></p>
<script>document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-historia-abrir],[data-hist-unit]");if(!b||(window.drHistoria&&window.drHistoria.__listo))return;if(b.hasAttribute("data-hist-unit")){var id=b.getAttribute("data-hist-unit");e.preventDefault();window.__drHistPend={id:id};setTimeout(function(){if(window.__drHistPend&&window.__drHistPend.id===id){window.__drHistPend=0;location.hash="#unidad="+id}},6000)}else if(b.getAttribute("data-hist-estado")==="cargando")window.__drHistPend=1},true)</script>
<noscript><p><a class="btn" href="u/${esc(unit.id)}/">Ver ficha de esta unidad</a></p></noscript>
</div>
<div class="hist-overlay" id="hist-overlay" role="dialog" aria-modal="true" aria-label="${esc(etiqueta)}" hidden>
<div class="hist-media">
<div class="hist-bg"${fondo ? ` style="background-image:url(${fondo})"` : ''}></div>
<img class="hist-fg" src="${esc(foto.src)}" width="${foto.ancho || 1200}" height="${foto.alto || 675}" alt="${esc(foto.alt || unit.titulo)}" loading="lazy" decoding="async" fetchpriority="low">
<div class="hist-scrim"></div>
</div>
<div class="hist-plate" aria-hidden="true"></div>
<div class="hist-info">
<p class="hist-kicker"><span class="ey-brand" aria-hidden="true">828</span><span>${esc(tx.eyebrow || 'Unidad destacada')}</span></p>
<h3>${esc(unit.titulo)}</h3>
${datos ? `<p class="hist-datos">${esc(datos)}</p>` : '<p class="hist-datos" hidden></p>'}
${precio || '<p class="n hist-precio" hidden></p>'}
<div class="row"><a class="btn p" href="#unidad=${esc(unit.id)}" data-historia-ficha>${esc(tx.verFicha || 'Ver ficha completa')}</a>${waUrl ? `<a class="btn" href="${esc(waUrl)}" data-historia-wa ${EXT}>Consultar por WhatsApp</a>` : ''}</div>
</div>
<button class="hist-close" type="button" aria-label="Cerrar unidad destacada">${esc(tx.cerrar || 'Cerrar')}</button>
</div>
${RECR ? `<script type="application/json" data-hist-datos>${RECR.json}</script>\n</div>\n` : ''}</section>`;
})();

/* Intro «Prelude» (solo portada): superposición a pantalla completa; css/prelude.css la oculta sin JavaScript o con movimiento reducido. */
const PRELUDE = (() => {
  const thin = Array.from({ length: 34 }, (_, i) => `<i style="width:${60 + i}%"></i>`).join('');
  return `<div class="prelude" role="dialog" aria-modal="true" aria-label="Introducción animada de ${esc(NAME)}" data-state="run">` +
    `<div class="prelude__stage"><div class="prelude__thin" aria-hidden="true">${thin}</div>` +
    `<svg class="prelude__rings" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="24"/><circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="48"/></svg>` +
    `<svg class="prelude__orbit" viewBox="0 0 800 500" aria-hidden="true" focusable="false"><path d="M185 250A215 215 0 0 1 615 250" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path d="M615 250A215 215 0 0 1 185 250" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>` +
    `<div class="prelude__core"><img src="images/logo-prelude.webp" width="320" height="320" alt="${esc(NAME)}" decoding="async"></div></div>` +
    `<div class="prelude__blinds" aria-hidden="true"><i class="prelude__blind"></i><i class="prelude__blind"></i><i class="prelude__blind"></i><i class="prelude__blind"></i><i class="prelude__blind"></i></div>` +
    `<button class="prelude__skip" type="button">Saltar</button></div>\n`;
})();
const index = page({
  title: `${NAME} · Autos y motos en ${L.city}, ${L.province}`,
  desc: `${NAME} en ${L.city}, ${L.partido}: compra y venta de autos y motos usados, permutas y consignaciones. Visitanos en ${L.address} o escribinos por redes o correo.`,
  file: 'index.html',
  htmlAttrs: ' data-fondos',
  extraHead: `<link rel="stylesheet" href="css/prelude.css">\n<script defer src="js/prelude.js"></script>\n<link rel="stylesheet" href="css/hero-carousel.css?v=20261024-5">\n<link rel="stylesheet" href="css/fondos-secciones.css">\n<link rel="stylesheet" href="css/damero-secciones.css?v=20261027-1">\n<link rel="stylesheet" href="css/comparador.css?v=20261028-1">\n<link rel="stylesheet" href="css/galeria-visor.css?v=20261026-1">\n<link rel="stylesheet" href="css/recorrido.css">\n<script type="application/ld+json">${JSON.stringify(ld)}</script>\n<script defer src="js/hero-carousel.js?v=20261024-1"></script>\n<script type="text/plain" data-dr-diferido src="js/hero-motion.js?v=20261025-1"></script>\n<script defer src="js/odometro.js?v=20261025-1"></script>\n<script defer src="js/fondos-secciones.js?v=20261024-1"></script>\n<script defer src="js/wa-mensajes.js"></script>\n<script defer src="js/secciones.js?v=20261029-1"></script>\n<script defer src="js/ficha-flip.js?v=20261027-1"></script>\n<script defer src="js/galeria-visor.js?v=20261026-1"></script>\n<script defer src="js/recorrido.js"></script>\n<script defer src="js/combobox.js?v=20261024-1"></script>\n<script type="text/plain" data-dr-diferido src="js/anillo.js?v=20261024-2"></script>\n<script defer src="js/boton-flecha.js?v=20261024-1"></script>\n<script type="text/plain" data-dr-diferido src="js/mapa.js?v=20261023-1"></script>\n<script defer src="js/horarios.js?v=20261024-1"></script>\n<script defer src="js/site.js?v=20261024-3"></script>\n<script defer src="js/diferidos.js"></script>\n<script type="text/plain" data-dr-diferido src="js/foto-reactiva.js?v=20261027-1"></script>\n<script type="text/plain" data-dr-diferido src="js/historia.js?v=20261031-1"></script>\n<script defer src="js/visita-horarios.js?v=1"></script>\n<script defer src="js/reserva-inline.js?v=20261028-1"></script>\n`,
  body: `${PRELUDE}${header()}
<main id="top">
<div class="hero" role="region" aria-label="${esc(NAME)}">
	<div class="hero-media hero-chain" data-hero-chain aria-label="Frentes de vehículos del inventario"><div class="hero-chain-track">${HERO_CHAIN}${HERO_CHAIN_DUP}</div></div>
<div class="hx-copy">
<p class="ey">${esc(L.city)} · ${esc(L.partido)}</p>
<h1><span class="sr">${esc(NAME)}: </span>Autos y motos <em>en ${esc(L.city)}</em></h1>
<p class="lead">Compra y venta de vehículos usados, permutas y consignaciones. Consultá por financiación.</p>
<div class="row"><a class="btn p" href="#unidades">Ver unidades</a>${C.whatsApp && D.contact.whatsAppConfirmed === true ? `<a class="btn" href="${WA}" ${EXT}>Escribir por WhatsApp</a>` : ''}<a class="btn lnk" href="${L.mapsUrl}" ${EXT}>Cómo llegar</a></div></div>
<a class="hx-down" href="#unidades">Explorá las unidades</a>
</div>
</div>
${secHorarios}
<section id="unidades" class="inventory-section" aria-labelledby="unidades-t"><div class="w wide">
<div class="inventory-head">
<div class="inventory-title"><p class="ey reveal"><span class="ey-brand">828</span> · Compra y venta · ${esc(L.city)}</p><h2 id="unidades-t" class="reveal">Nuestras <em>unidades</em></h2><p class="sec-p">Catálogo relevado el ${A.relevadoEl ? esc(fdate(A.relevadoEl)) : 'último relevamiento'}: ${cantidadAutos} autos y camionetas y ${cantidadMotos} motos. Precios y disponibilidad pueden cambiar; confirmalos con la agencia.</p></div>
<div class="inventory-meta" aria-label="Resumen del catálogo"><span class="inventory-meta-kicker">${esc(NAME)}</span><span><b class="odo" data-odo="${autos.length}">${autos.length}</b> unidades relevadas al ${fdate(A.relevadoEl)} · <b class="odo" data-odo="${cantidadAutos}">${cantidadAutos}</b> autos · <b class="odo" data-odo="${cantidadMotos}">${cantidadMotos}</b> motos</span><i aria-hidden="true"></i></div>
</div>
<div class="inventory-rule" aria-hidden="true"><span></span><small>${esc(L.city)} · ${esc(L.province)}</small><span></span></div>
${unidades}
</div></section>

${ANILLO}
${secDestacada}
<section class="finance-section" id="financiacion" aria-labelledby="fin-t"><div class="w">
<div class="finance-head"><div><p class="ey"><span class="ey-brand">828</span> · Financiación y servicios</p><h2 id="fin-t">Financiá tu <em>próximo vehículo</em></h2><p class="sec-p">Consultanos por financiación. Las condiciones se informan por consulta: este sitio no publica condiciones de financiación.</p></div><aside class="finance-aside"><span>${esc(NAME)}</span><p>Encontrá una forma de avanzar hacia tu próxima unidad.</p></aside></div>
<div class="finance-rule" aria-hidden="true"><span></span><small>Servicios para moverte mejor</small><span></span></div>
<div class="cards finance-cards">${hasSvc('financiacion') ? `<div class="card finance-card"><span class="finance-card-no">Financiación</span><h3>Consultá por financiación</h3><p>Escribinos y te contamos cómo avanzar con la unidad que te interese. Las condiciones dependen de la unidad y de cada solicitante.</p></div>` : ''}${hasSvc('permuta') ? `<div class="card finance-card"><span class="finance-card-no">Tu usado</span><h3>Permutas</h3><p>Tomamos permutas. Contanos qué tenés y armá el mensaje desde la sección «Tu usado».</p></div>` : ''}${hasSvc('consignacion') ? `<div class="card finance-card"><span class="finance-card-no">Consignación</span><h3>Consignaciones</h3><p>Podés dejar tu vehículo en consignación. Las condiciones se coordinan con ${esc(NAME)}.</p></div>` : ''}${hasSvc('compra-venta') ? `<div class="card finance-card"><span class="finance-card-no">Compra y venta</span><h3>Vehículos usados</h3><p>Compra y venta de vehículos usados en ${esc(L.city)}.</p></div>` : ''}</div>
<div class="row fin-cta"><a class="btn p" href="${wa('Hola! Quiero consultar por financiación.') || ML_PROFILE}" ${EXT}>Consultar por financiación</a>${hasSvc('permuta') ? '<a class="btn" href="#tu-usado">Consultar por mi usado</a>' : ''}</div>
<p class="src">¿Buscás algo más? Escribinos por nuestros canales y lo vemos juntos.</p>
</div></section>

${secUsado}
${secBusqueda}
${secGuia}
${secPreguntas}
${secVisita}

${secNosotros}

<section id="contacto" class="ct dr-ct" aria-labelledby="contacto-t"><div class="w">
<div class="dr-ct-head"><p class="ey"><span class="ey-brand">828</span> · Contacto</p><h2 id="contacto-t">Hablá con <em>un asesor</em></h2><p class="sec-p">Escribinos o llamanos y te contamos disponibilidad, precio y formas de pago de la unidad que te interese.</p></div>
<div class="dr-ct-grid">
<ul class="dr-ch">${canales}</ul>
<aside class="dr-ct-side" aria-label="Consultar y redes"><p class="dr-ct-t">¿Buscás un vehículo?</p><p>Contanos qué estás buscando y te ayudamos a encontrarlo.</p><div class="row"><a class="btn p" href="${ctaHead.href}" ${EXT}>${WA ? 'Consultar con un asesor' : 'Ver publicaciones en Mercado Libre'}</a><a class="btn" href="reserva.html">Agendar visita</a></div>
<div class="dr-soc"><p class="dr-k">En la web</p><ul>${redes}</ul></div></aside>
</div>
</div></section>
</main>
${footer(true)}
${C.whatsApp && D.contact.whatsAppConfirmed === true ? `<nav class="dr-fab" aria-label="Acciones rápidas"><a class="dr-fab-wa" href="${WA}" ${EXT} aria-label="Consultar por WhatsApp" title="Consultar por WhatsApp">${IC.wa}<span class="sr">Consultar por WhatsApp</span></a><a class="dr-fab-ag" href="reserva.html" aria-label="Agendar visita" title="Agendar visita"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/></svg><span class="sr">Agendar visita</span></a></nav>` : `<nav class="dr-fab" aria-label="Acciones rápidas"><a class="dr-fab-wa" href="${ML_PROFILE}" ${EXT} aria-label="Ver publicaciones en Mercado Libre" title="Mercado Libre"><span aria-hidden="true">ML</span></a><a class="dr-fab-ag" href="reserva.html" aria-label="Agendar visita" title="Agendar visita"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/></svg><span class="sr">Agendar visita</span></a></nav>`}
`,
});

const privacidad = page({
  title: `Privacidad y avisos · ${NAME}`,
  desc: `Política de privacidad preliminar y avisos de ${NAME}.`,
  file: 'privacidad.html',
  body: `${header('./', '#top')}
<main id="top"><section><div class="w doc">
<p class="ey">Avisos</p><h1>Privacidad y <em>avisos</em></h1>
<h2>Datos personales</h2>
<p>Este sitio no tiene cuentas ni cookies propias y ${medicionOn ? 'cuenta solo eventos agregados y anónimos (apertura de una ficha, clic en WhatsApp, comparador abierto, favorito agregado, filtro usado), sin cookies, sin tu teléfono ni lo que escribas en los formularios, y respeta la señal «No rastrear»; nada más de lo que hacés se guarda.' : 'no guarda datos de quienes lo visitan.'} Los formularios «Tu usado» y «Contanos qué auto buscás» solo arman un mensaje en tu navegador, que podés copiar y enviar vos: no se transmite nada a este sitio. Los mapas de «Horarios y ubicación» y «Dónde encontrarnos» cargan sus mosaicos de OpenStreetMap solo cuando los solicitás; al abrirlos, el proveedor recibe tu dirección IP. Los botones y enlaces externos abren Mercado Libre, Facebook, Instagram, TikTok${C.whatsApp ? ', WhatsApp' : ''} o Google Maps, que tienen sus propias políticas de privacidad.</p>
<h2>Información de las unidades</h2>
<p>Los datos de las unidades (año, kilometraje, precio y anticipo cuando aparecen) provienen de publicaciones públicas consultadas en Mercado Libre y pueden haber cambiado. Confirmá siempre con ${esc(NAME)} antes de decidir.</p>
<h2>Documento preliminar</h2>
<p>Este texto es preliminar y debe revisarse profesionalmente antes de la publicación definitiva.</p>
<p><a class="btn sm" href="./">Volver al inicio</a></p>
</div></section></main>
${footer(false)}`,
});

const home404 = siteUrl || './';
const logo404 = 'images/logo-sm.png';
const FONTS_404 = FONTS.replace(/url\(fonts\/([^)]+)\)/g, '__U__$1__E__');
/* 404: se sirve en cualquier ruta, así que el CSS externo se enlaza con base absoluta (siteUrl) o calculada (document.write bloqueante: sin destello sin estilo). */
const V_SITE = hashDe('css/site.css'), V_DR = hashDe('css/dr-identidad.css');
const nf404Head = siteUrl
  ? `<style>${FONTS.replace(/url\(fonts\//g, `url(${siteUrl}fonts/`)}</style>\n<link rel="stylesheet" href="${siteUrl}css/site.css?v=${V_SITE}">\n<link rel="stylesheet" href="${siteUrl}css/dr-identidad.css?v=${V_DR}">\n`
  : '<script>(function(){var s=location.pathname.split("/").filter(Boolean),b=/github\\.io$/.test(location.hostname)&&s.length?"/"+s[0]+"/":"/";var st=document.createElement("style");st.textContent=' + JSON.stringify(FONTS_404) + '.split("__U__").join("ur"+"l("+b+"fonts/").split("__E__").join(")");document.head.appendChild(st);document.write(' + JSON.stringify('<link rel="stylesheet" href="') + '+b+' + JSON.stringify('css/site.css?v=' + V_SITE + '"><link rel="stylesheet" href="') + '+b+' + JSON.stringify('css/dr-identidad.css?v=' + V_DR + '">') + ');document.addEventListener("DOMContentLoaded",function(){document.getElementById("home").href=b})})()</script>\n<noscript><link rel="stylesheet" href="css/site.css?v=' + V_SITE + '"><link rel="stylesheet" href="css/dr-identidad.css?v=' + V_DR + '"></noscript>\n';
const nf = page({
  title: `Página no encontrada · ${NAME}`,
  desc: `La página que buscás no existe. Volvé al inicio de ${NAME}.`,
  file: '404.html', withFonts: false,
  extraHead: nf404Head,
  body: `<main class="nf"><div><img class="lg-404" src="${logo404}" width="320" height="320" alt="${esc(NAME)}"><p class="ey">Error 404</p><h1>No encontramos <em>esa página</em></h1><p>Puede que el enlace esté mal escrito o que la página ya no exista.</p><a id="home" class="btn p" href="${home404}">Volver al inicio</a></div></main>`,
});


// ---- reserva.html: consulta de visita (ver docs/RESERVA.md). El número de WhatsApp viaja en data-wa, no en js/reserva.js ----
const reservaBtn = C.whatsApp && D.contact.whatsAppConfirmed === true
  ? `<a id="whatsapp" class="primary" href="https://wa.me/${C.whatsApp}" data-wa="${C.whatsApp}" ${EXT}>Escribir por WhatsApp <span>↗</span></a>`
  : `<button id="whatsapp" class="primary" type="button" data-wa="">Copiar consulta <span>↗</span></button>`;
const reserva = `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${robotsMeta}<title>Coordiná tu visita · ${esc(NAME)}</title>
<meta name="description" content="Elegí un día y una franja y armá la consulta para ir a ver una unidad. Es una consulta, no un turno.">
<meta name="theme-color" content="#060607">
<meta property="og:type" content="website">
<meta property="og:title" content="Coordiná tu visita · ${esc(NAME)}">
<meta property="og:description" content="Elegí un día y una franja y armá la consulta para ir a ver una unidad. Es una consulta, no un turno.">
<meta property="og:locale" content="es_AR">
${ogTags('reserva.html', `Coordiná tu visita · ${NAME}`, 'Elegí un día y una franja y armá la consulta para ir a ver una unidad. Es una consulta, no un turno.')}${canon('reserva.html')}<link rel="manifest" href="site.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="images/icon-192.png">
<link rel="apple-touch-icon" href="images/icon-180.png">
<link rel="stylesheet" href="css/reserva.css"><link rel="stylesheet" href="css/motion.css">
</head>
<body>
<main id="booking" data-step="month" data-closed="${closedDays.join(',')}" data-morning-only="${morningOnly.join(',')}" data-semana="${esc(JSON.stringify(semana))}">
  <header class="booking-nav">
    <a class="brand" href="index.html" aria-label="Volver a ${esc(NAME)}"><img class="lg-bk" src="images/logo-sm.png" width="320" height="320" alt="${esc(NAME)}"></a>
    <p class="eyebrow">Coordiná tu visita <span aria-hidden="true">/</span> consulta</p>
    <button class="back" id="back" type="button" aria-label="Volver" hidden>← Atrás</button>
  </header>

  <section class="scene scene--month" aria-labelledby="month-title">
    <div class="scene__meta"><span id="month-status" aria-live="polite"></span></div>
    <div class="month-copy"><p class="kicker">${esc(NAME)}</p><h1 id="month-title">Elegí<em>cuándo</em><em>venir.</em></h1><p class="intro">Elegí un día en el calendario y armá la consulta. Todavía no es un turno.</p></div>
    <div class="calendar-shell">
      <div class="calendar-head"><button id="prev-month" type="button" aria-label="Mes anterior">←</button><h2 id="month-label"></h2><button id="next-month" type="button" aria-label="Mes siguiente">→</button></div>
      <div class="weekday" aria-hidden="true"><span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span></div>
      <div id="calendar" class="calendar" role="group" aria-label="Calendario de consulta"></div>
    </div>
  </section>

  <section class="scene scene--day" aria-labelledby="day-title" hidden>
    <div class="scene__meta"><span id="day-status" aria-live="polite"></span></div>
    <div class="giant-day" aria-hidden="true"><small id="day-month">—</small><span id="day-number">—</span><strong id="day-weekday">—</strong></div>
    <div class="day-copy"><p class="kicker">Tu visita</p><h2 id="day-title">¿Qué día<br><em>te queda bien?</em></h2><p>Elegí el día y se arma el mensaje de consulta.</p></div>
    <button class="next-step" id="to-time" type="button" disabled>Elegir franja <span>→</span></button>
  </section>

  <section class="scene scene--time" aria-labelledby="time-title" hidden>
    <div class="scene__meta"><span id="time-status" aria-live="polite"></span></div>
    <div class="time-copy"><p class="kicker">Franja del día</p><h2 id="time-title">¿Mañana<br><em>o tarde?</em></h2><p>La hora exacta se acuerda con el negocio.</p></div>
    <div id="slots" class="slots" role="listbox" aria-label="Franja del día"></div>
    <button class="next-step" id="to-confirm" type="button" disabled>Ver resumen <span>→</span></button>
  </section>

  <section class="scene scene--confirm" aria-labelledby="confirm-title" hidden>
    <div class="diagonal-wipe" aria-hidden="true"></div>
    <div class="scene__meta"><span>consulta de visita</span></div>
    <div class="confirm-copy"><p class="kicker">Tu visita</p><h2 id="confirm-title"><span id="summary-day">DÍA</span><em id="summary-time">FRANJA</em></h2><p>${esc(L.address)}<br>${esc(L.city)}</p></div>
    <div class="confirm-actions">${reservaBtn}<a class="secondary" href="${esc(L.mapsUrl)}" ${EXT}>Abrir Maps</a><button id="restart" class="secondary" type="button">Elegir otro día</button></div>
    <p id="send-state" class="send-state" role="status" aria-live="polite" data-state="ready">Listo para copiar · lo mandás vos por Facebook o Instagram</p>
    <p class="disclaimer">Con este mensaje consultás por una visita. El día y la hora se acuerdan con ${esc(NAME)}.</p>
    ${demo ? '<p class="disclaimer" data-demo-note>Versión de demostración · No es el sitio oficial</p>' : ''}
  </section>
  <div id="live" class="sr-only" aria-live="polite"></div>
</main>
<script src="js/wa-mensajes.js"></script><script src="js/visita-horarios.js"></script><script type="module" src="js/reserva.js"></script><script type="module" src="js/motion.js"></script>
</body>
</html>
`;

write('index.html', index);
write('reserva.html', reserva);
write('privacidad.html', privacidad);
write('404.html', nf);
/* ---- Vista previa al compartir POR UNIDAD ----
   WhatsApp/Facebook/Instagram no leen el «#» de #unidad=ID, así que cada ficha necesita una página propia con su og:image.
   u/<id>/index.html lleva las metas de esa unidad y redirige (solo con JS) a la ficha: ../../#unidad=<id>.
   Las imágenes salen de `npm run og:units` (images/og/u-<id>.jpg); si falta alguna se usa la general del sitio.
   Sin precio en la vista previa: puede haber cambiado desde el relevamiento (ver CLAUDE.md). */
fs.rmSync(path.join(root, 'u'), { recursive: true, force: true });
let unitPages = 0;
for (const a of autos) {
  const id = String(a.id);
  if (!/^[0-9A-Za-z_-]+$/.test(id)) continue;
  const hasOg = fs.existsSync(path.join(root, `images/og/u-${id}.jpg`));
  const img = `${ogBase || '../../'}images/${hasOg ? `og/u-${id}.jpg` : 'og-dr.jpg'}`;
  const bits = [a.anio, a.km != null ? `${Number(a.km).toLocaleString('es-AR')} km` : null, a.transmision, a.combustible, a.color].filter(Boolean);
  const title = `${a.titulo} · ${NAME}`;
  const desc = `${bits.join(' · ')}. Consultá precio y disponibilidad con ${NAME}, ${L.city}.`;
  const self = ogBase ? `${ogBase}u/${id}/` : '';
  const go = `../../#unidad=${encodeURIComponent(id)}`;
  const html = `<!doctype html>\n<html lang="es-AR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<meta name="description" content="${esc(desc)}">\n${robotsMeta}<meta property="og:type" content="website">\n<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(desc)}">\n<meta property="og:locale" content="es_AR">\n${ogBase ? `<meta property="og:url" content="${self}">\n` : ''}<meta property="og:site_name" content="${esc(NAME)}">\n<meta property="og:image" content="${img}">\n<meta property="og:image:secure_url" content="${img}">\n<meta property="og:image:type" content="image/jpeg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="${esc(a.titulo)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${esc(title)}">\n<meta name="twitter:description" content="${esc(desc)}">\n<meta name="twitter:image" content="${img}">\n${siteUrl ? `<link rel="canonical" href="${siteUrl}u/${id}/">\n` : ''}<noscript><meta http-equiv="refresh" content="0;url=${go}"></noscript>\n<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060607;color:#d9dbdd;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}a{color:#ee1c22}</style>\n</head>\n<body>\n<p>Abriendo la ficha de <strong>${esc(a.titulo)}</strong>…<br><a href="${go}">Si no se abre sola, tocá acá</a></p>\n<script>location.replace(${JSON.stringify(go)});</script>\n</body>\n</html>\n`;
  fs.mkdirSync(path.join(root, 'u', id), { recursive: true });
  fs.writeFileSync(path.join(root, 'u', id, 'index.html'), html);
  unitPages++;
}
/* Datos del catálogo en archivo aparte y cacheable: el HTML deja de pesar 300 KB y el JSON se reutiliza. */
const unitsJson = jsonSafe(slim(catData));
write(UNITS_URL, unitsJson);
write('robots.txt', demo ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}sitemap.xml\n` : ''}`);
const smPath = path.join(root, 'sitemap.xml');
if (!demo && siteUrl) write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}</loc></url>\n  <url><loc>${siteUrl}reserva.html</loc></url>\n  <url><loc>${siteUrl}privacidad.html</loc></url>\n</urlset>\n`);
else if (fs.existsSync(smPath)) fs.rmSync(smPath);
write('site.webmanifest', JSON.stringify({ name: NAME, short_name: 'Automotores 828', description: `Autos y motos usados en ${L.city}, ${L.province}.`, lang: 'es-AR', start_url: './', scope: './', display: 'standalone', background_color: '#060607', theme_color: '#060607', icons: [{ src: 'images/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'images/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] }, null, 2) + '\n');
write('favicon.svg', read('favicon.svg'));

console.log(`Generado: index.html (${(index.length / 1024).toFixed(1)} KB), privacidad.html, reserva.html, 404.html · ${autos.length} unidades (+${unitPages} páginas para compartir en u/) · ${UNITS_URL} (${(unitsJson.length / 1024).toFixed(1)} KB) · modo ${demo ? 'demo (noindex)' : 'producción'}`);
