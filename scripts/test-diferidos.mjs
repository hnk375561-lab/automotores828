import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const loader = await readFile(new URL('../js/diferidos.js', import.meta.url), 'utf8');
const diferidos = [...html.matchAll(/<script type="text\/plain" data-dr-diferido src="(js\/[^"?]+)(?:\?v=[0-9a-f]{8})?"><\/script>/g)].map((m) => m[1]);

assert.deepEqual(diferidos, ['js/hero-motion.js', 'js/anillo.js', 'js/mapa.js', 'js/foto-reactiva.js'], 'Los scripts diferidos deben ser hero-motion, anillo, mapa y foto-reactiva, en ese orden.');
for (const f of diferidos) assert.ok(!new RegExp(`<script defer src="${f}`).test(html), `${f} no debe cargarse también con defer.`);
assert.match(html, /<script defer src="js\/diferidos\.js\?v=[0-9a-f]{8}"><\/script>/, 'Falta el cargador js/diferidos.js con versión.');
for (const f of ['secciones', 'site', 'wa-mensajes', 'ficha-flip', 'galeria-visor', 'boton-flecha', 'combobox', 'horarios', 'reserva-inline', 'visita-horarios', 'odometro']) {
  assert.match(html, new RegExp(`<script defer src="js/${f}\\.js`), `js/${f}.js debe seguir cargando con defer (es crítico o depende de otros).`);
}
assert.match(loader, /async\s*=\s*false/, 'El cargador debe conservar el orden de ejecución.');
assert.match(loader, /requestIdleCallback/, 'El cargador debe esperar a que el hilo esté libre.');
const site = await readFile(new URL('../js/site.js', import.meta.url), 'utf8');
assert.match(site, /var cajas = nodos\.map\(/, 'site.js debe leer las posiciones antes de escribir clases.');
/* reflujos forzados: nada de lecturas de layout «de relleno» al arrancar */
const secc = await readFile(new URL('../js/secciones.js', import.meta.url), 'utf8');
assert.ok(!/void\s+vista\.offsetWidth/.test(secc), 'secciones.js no debe forzar un reflujo con void vista.offsetWidth.');
assert.ok(!/window\.innerWidth/.test(secc.replace(/function esMovil\(\)[^\n]*\n/, '').replace(/window\.innerWidth\s*<=\s*800/, '')), 'secciones.js debe usar esMovil() (matchMedia) y no window.innerWidth en el catálogo.');
assert.ok(!/window\.innerWidth\s*[<>]=?\s*980/.test(site.replace(/mq980 \? mq980\.matches : window\.innerWidth <= 980/, '')), 'site.js debe usar matchMedia para el corte de 980 px.');
const reserva = await readFile(new URL('../js/reserva-inline.js', import.meta.url), 'utf8');
assert.match(reserva, /new Intl\.DateTimeFormat\('es-AR'/, 'reserva-inline.js debe reutilizar un único Intl.DateTimeFormat.');
/* imágenes: solo la primera foto del hero va con prioridad alta; el resto baja con prioridad baja y en diferido */
const heroImgs = [...html.matchAll(/<img src="images\/hero\/[^>]*>/g)].map((m) => m[0]);
assert.ok(heroImgs.length >= 20, `El hero debe tener sus dos tandas de fotos; hay ${heroImgs.length}.`);
assert.ok(/fetchpriority="high"/.test(heroImgs[0]) && !/loading="lazy"/.test(heroImgs[0]), 'La primera foto del hero debe ser prioritaria y no diferida.');
for (const t of heroImgs.slice(1)) assert.ok(/loading="lazy"/.test(t) && /fetchpriority="low"/.test(t), `Las demás fotos del hero deben ser lazy y de prioridad baja: ${t.slice(0, 80)}`);
/* fondos: el CSS no debe pedirlos de entrada en la portada (con JavaScript activo) */
assert.match(html, /<html lang="es-AR" data-fondos>/, 'La portada debe llevar data-fondos en <html>.');
assert.match(html, /@media \(scripting:enabled\)\{\s*html\[data-fondos\] #financiacion/, 'Falta el bloque «Fondos diferidos» en el CSS de la portada.');
assert.match(html, /html\[data-fondos\] \.nz-frentes:not\(\.bg-on\) i\{background-image:none\}/, 'Los fondos de Nosotros deben esperar a .bg-on.');
const fondos = await readFile(new URL('../js/fondos-secciones.js', import.meta.url), 'utf8');
assert.match(fondos, /classList\.add\('bg-on'\)/, 'js/fondos-secciones.js debe marcar .bg-on al acercarse.');
console.log(`✓ Scripts diferidos: ${diferidos.length} en el cargador, el resto sigue con defer, sin lecturas de layout intercaladas en site.js.`);
