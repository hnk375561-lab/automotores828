// Pruebas del kernel de contornos de js/historia.js (funciones puras, sin navegador).
// Uso: npm run test:historia
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/historia.js'), 'utf8');
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const K = sandbox.drHistoriaKernel;
assert.ok(K && typeof K.contornos === 'function', 'js/historia.js debe exponer drHistoriaKernel.contornos');

const W = 800, H = 500;
assert.equal(K.contornos(W, H, 0), null, 'q=0 → sin recorte');
assert.equal(K.contornos(W, H, 1), 'oculto', 'q=1 → oculto');
assert.equal(K.contornos(0, H, 0.5), null, 'tamaño 0 → null');

const a = K.contornos(W, H, 0.5), b = K.contornos(W, H, 0.5);
assert.equal(a, b, 'determinista: mismos parámetros, mismo resultado');
assert.ok(a.startsWith('path(evenodd,"M0 0'), 'empieza con el rectángulo exterior');
assert.ok(a.endsWith('Z")'), 'termina con Z")');
assert.ok(!/\d+\.\d{2,}/.test(a), 'coordenadas con un decimal como máximo');

const contornos = (p) => (p.match(/M/g) || []).length - 1;
assert.ok(contornos(a) >= 1, 'con q intermedio hay al menos un contorno');

/* área liberada (suma de polígonos) crece con q: se aproxima con los vértices de los tramos Q */
const area = (p) => {
  const cuerpo = p.slice('path(evenodd,"'.length, -2).replace(/^M0 0H\d+V\d+H0Z/, '');
  let total = 0;
  for (const c of cuerpo.split('Z').filter(Boolean)) {
    const nums = c.replace(/[MQ]/g, ' ').trim().split(/\s+/).map(Number);
    const pts = [];
    for (let i = 2; i + 3 < nums.length; i += 4) pts.push([nums[i], nums[i + 1]]);
    let s = 0;
    for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; }
    total += Math.abs(s) / 2;
  }
  return total;
};
const a1 = area(K.contornos(W, H, 0.3)), a2 = area(K.contornos(W, H, 0.6)), a3 = area(K.contornos(W, H, 0.9));
assert.ok(a1 <= a2 && a2 <= a3, `el área liberada debe crecer con q (${a1} ≤ ${a2} ≤ ${a3})`);

const c1 = K.campo(W, H, 0.5), c2 = K.campo(1200, 700, 0.5);
assert.ok(c1.nx !== c2.nx || c1.ny !== c2.ny, 'un cambio de tamaño regenera la grilla');
assert.equal(K.potencia2InOut(0), 0);
assert.equal(K.potencia2InOut(1), 1);
assert.equal(K.potencia2InOut(0.5), 0.5);
console.log('✓ Kernel de historia: determinista, bordes q=0/q=1, contornos cerrados y área creciente.');
