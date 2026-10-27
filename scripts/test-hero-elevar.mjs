import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/hero-carousel.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../js/hero-motion.js', import.meta.url), 'utf8');

assert.match(css, /@media \(hover:hover\) and \(pointer:fine\)\{[\s\S]*\.hero-chain-car\.is-lift\{/, 'La elevación debe existir solo para puntero fino con hover.');
assert.match(css, /\.hero-chain-car\.is-lift\{[^}]*scale\(1\.065\)[^}]*box-shadow/, 'La tarjeta elevada debe escalar y llevar sombra.');
assert.match(css, /prefers-reduced-motion:reduce\)\{[\s\S]*\.hero-chain-car\.is-lift\{transform:none/, 'Con movimiento reducido no debe desplazarse ni escalar.');

/* la cinta nunca se frena por la elevación */
const lift = css.slice(css.indexOf('Hero · elevación'));
assert.ok(!/animation-play-state|animation\s*:|animation-name|\.hero-chain-track/.test(lift), 'El CSS de elevación no puede tocar la animación de la cinta.');
const ini = js.lastIndexOf('/*', js.indexOf('Elevación de la tarjeta')), fin = js.lastIndexOf('  sync();');
assert.ok(ini > 0 && fin > ini, 'Falta el bloque de elevación en hero-motion.js.');
const bloque = js.slice(ini, fin).replace(/\/\*[\s\S]*?\*\//g, '');   /* sin comentarios ni el sync() final del archivo */
assert.ok(bloque.length > 200, 'El bloque de elevación está vacío.');
assert.ok(!/is-paused|animation-play-state|focused|sync\(/.test(bloque), 'El bloque de elevación no puede pausar ni sincronizar la pausa de la cinta.');
assert.match(bloque, /classList\.add\('is-lift'\)/, 'Debe marcar la tarjeta con is-lift.');
assert.match(bloque, /actual\.classList\.remove\('is-lift'\)/, 'Debe quitar la marca de la anterior (una sola tarjeta a la vez).');
assert.match(bloque, /interactionArea\.contains\(el\)/, 'Debe soltar la tarjeta si el puntero sale del hero o hay un diálogo encima.');
console.log('✓ Elevación del hero: solo mouse, una tarjeta a la vez, sin tocar la pausa ni la animación de la cinta.');
