import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const loader = await readFile(new URL('../js/diferidos.js', import.meta.url), 'utf8');
const diferidos = [...html.matchAll(/<script type="text\/plain" data-dr-diferido src="(js\/[^"?]+)(?:\?v=[0-9a-f]{8})?"><\/script>/g)].map((m) => m[1]);

assert.deepEqual(diferidos, ['js/anillo.js', 'js/mapa.js', 'js/foto-reactiva.js'], 'Los scripts diferidos deben ser anillo, mapa y foto-reactiva, en ese orden.');
for (const f of diferidos) assert.ok(!new RegExp(`<script defer src="${f}`).test(html), `${f} no debe cargarse también con defer.`);
assert.match(html, /<script defer src="js\/diferidos\.js\?v=[0-9a-f]{8}"><\/script>/, 'Falta el cargador js/diferidos.js con versión.');
for (const f of ['secciones', 'site', 'wa-mensajes', 'ficha-flip', 'galeria-visor', 'boton-flecha', 'combobox', 'horarios', 'reserva-inline', 'visita-horarios', 'odometro']) {
  assert.match(html, new RegExp(`<script defer src="js/${f}\\.js`), `js/${f}.js debe seguir cargando con defer (es crítico o depende de otros).`);
}
assert.match(loader, /async\s*=\s*false/, 'El cargador debe conservar el orden de ejecución.');
assert.match(loader, /requestIdleCallback/, 'El cargador debe esperar a que el hilo esté libre.');
const site = await readFile(new URL('../js/site.js', import.meta.url), 'utf8');
assert.match(site, /var cajas = nodos\.map\(/, 'site.js debe leer las posiciones antes de escribir clases.');
console.log(`✓ Scripts diferidos: ${diferidos.length} en el cargador, el resto sigue con defer, sin lecturas de layout intercaladas en site.js.`);
