import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../js/secciones.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/damero-secciones.css', import.meta.url), 'utf8');

const count = (text, pattern) => [...text.matchAll(pattern)].length;
const cardCount = count(html, /<li\b[^>]*class="[^"]*\bcar\b/g);
assert.ok(cardCount > 20, `El catálogo debe tener más de 20 unidades; encontró ${cardCount}.`);
/* el DOM vivo trae solo las primeras tarjetas; el resto va dentro de <noscript id="cars-rest"> (texto, no elementos) */
const ulIni = html.indexOf('<ul class="cars" id="cars">'), ulFin = html.indexOf('</ul>', ulIni);
const nsIni = html.indexOf('<noscript id="cars-rest">'), nsFin = html.indexOf('</noscript>', nsIni);
assert.ok(ulIni > 0 && nsIni > ulFin && nsFin > nsIni, 'Debe haber una lista viva y un <noscript id="cars-rest"> después.');
const vivas = count(html.slice(ulIni, ulFin), /<li\b[^>]*class="[^"]*\bcar\b/g), enNoscript = count(html.slice(nsIni, nsFin), /<li\b[^>]*class="[^"]*\bcar\b/g);
assert.equal(vivas, 6, `La lista viva debe traer solo 6 tarjetas; trae ${vivas}.`);
assert.equal(vivas + enNoscript, cardCount, 'Todas las tarjetas restantes deben estar dentro del <noscript>.');
assert.equal(count(html, /id="inventory-more"/g), 1, 'Debe existir exactamente un botón expansor.');
assert.equal(count(html, /id="inventory-more-note"/g), 1, 'Debe existir exactamente un contador de unidades visibles.');
assert.match(html, /id="inventory-more"[^>]*aria-controls="cars"[^>]*hidden/, 'El botón debe controlar la lista y comenzar oculto hasta que JS evalúe resultados.');
assert.match(runtime, /esMovil\(\)\s*\?\s*6\s*:\s*20/, 'El paso debe ser de seis unidades en móvil y veinte en escritorio.');
assert.match(runtime, /window\._drCatalogoMostradas\s*\+=\s*esMovil\(\)\s*\?\s*6\s*:\s*20/, 'Cada clic debe incrementar el lote según el breakpoint.');
assert.match(runtime, /mqMovil\s*=\s*window\.matchMedia\s*\?\s*window\.matchMedia\('\(max-width: 700px\)'\)/, 'El corte móvil del catálogo debe leerse con matchMedia (sin forzar layout).');
assert.match(runtime, /more\.hidden\s*=\s*restantes\s*===\s*0/, 'El expansor solo debe ocultarse cuando se muestran todas las coincidencias.');
assert.match(css, /#unidades \.inventory-more-btn/, 'El botón debe tener estilos propios del catálogo.');
assert.match(css, /@media\(max-width:700px\)\{#unidades \.inventory-more-wrap/, 'El expansor debe tener ajustes responsive.');
console.log(`✓ Paginación del catálogo: ${cardCount} unidades, expansor accesible y lotes 20/6 validados.`);
