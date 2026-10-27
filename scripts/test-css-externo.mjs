import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* Punto 4: el CSS vive en un archivo externo, versionado y compartido; las páginas no vuelven a inlinearlo. */
const MAX_INLINE = 20 * 1024;
const css = await readFile(new URL('../css/site.css', import.meta.url), 'utf8');
assert.ok(css.length > 100 * 1024, 'css/site.css debe contener la hoja completa; ejecutá npm run build.');
assert.equal((css.match(/url\((["']?)(?:images|fonts)\//g) || []).length, 0, 'css/site.css no debe tener url(images/…) ni url(fonts/…) sin ../ (el archivo vive en css/).');
assert.ok(/url\((["']?)\.\.\/images\//.test(css), 'css/site.css debe apuntar a ../images/.');
for (const f of ['index.html', 'privacidad.html', '404.html']) {
  const html = await readFile(new URL(`../${f}`, import.meta.url), 'utf8');
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) assert.ok(m[1].length < MAX_INLINE, `${f}: hay un <style> inline de ${(m[1].length / 1024).toFixed(0)} KB (máximo 20 KB). El CSS va en css/site.css.`);
  assert.match(html, /css\/site\.css\?v=[0-9a-f]{8}/, `${f} debe enlazar css/site.css con versión.`);
  assert.match(html, /css\/dr-identidad\.css\?v=[0-9a-f]{8}/, `${f} debe enlazar css/dr-identidad.css con versión.`);
  if (f !== '404.html') assert.match(html, /<link rel="stylesheet" href="css\/site\.css\?v=[0-9a-f]{8}">/, `${f}: el CSS debe cargarse con <link> bloqueante en el <head> (sin destello sin estilo).`);
}
const nf = await readFile(new URL('../404.html', import.meta.url), 'utf8');
assert.ok(/document\.write\(|href="https?:\/\/[^"]+css\/site\.css/.test(nf), '404: debe enlazar el CSS con base calculada o absoluta (se sirve en cualquier ruta).');
assert.match(nf, /<noscript><link rel="stylesheet" href="css\/site\.css/, '404: debe tener respaldo <noscript> del CSS.');
console.log(`✓ CSS externo: css/site.css ${(css.length / 1024).toFixed(0)} KB, sin <style> inline grande en index, privacidad y 404.`);
