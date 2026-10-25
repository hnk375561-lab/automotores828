#!/usr/bin/env node
/* Corre TODA la suite sin cortarse en el primer fallo y resume al final cuáles fallaron.
   Uso: npm run test:todo   (exit 1 si algo falló). `npm test` sigue igual (corta en el primero). */
import { spawnSync } from 'node:child_process';

const PASOS = [
  ['validate-dealership', 'node', ['scripts/validate-dealership.mjs']],
  ['audit-copy', 'node', ['scripts/audit-copy.mjs', '--prohibidos']],
  ['image-manifest', 'python3', ['scripts/validate-image-manifest.py']],
  ['catalog-pagination', 'node', ['scripts/test-catalog-pagination.mjs']],
  ['e2e-catalogo', 'python3', ['scripts/e2e-catalogo.py']],
  ['e2e-t1-enlaces', 'python3', ['scripts/e2e-t1-enlaces.py']],
  ['e2e-t2-bimoneda', 'python3', ['scripts/e2e-t2-bimoneda.py']],
  ['e2e-t6-visitas', 'python3', ['scripts/e2e-t6-visitas.py']],
  ['e2e-t5-comparalo', 'python3', ['scripts/e2e-t5-comparalo.py']],
  ['e2e-t3-transparencia', 'python3', ['scripts/e2e-t3-transparencia.py']],
  ['e2e-t4-seleccion', 'python3', ['scripts/e2e-t4-seleccion.py']],
  ['e2e-movil-acciones', 'python3', ['scripts/e2e-movil-acciones.py']],
  ['e2e-t10-busqueda', 'python3', ['scripts/e2e-t10-busqueda.py']],
  ['e2e-t7-foto', 'python3', ['scripts/e2e-t7-foto.py']],
];

const res = [];
for (const [nombre, cmd, args] of PASOS) {
  console.log(`\n=== ${nombre} ===`);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  res.push({ nombre, ok: r.status === 0, seg: ((Date.now() - t0) / 1000).toFixed(1) });
}

console.log('\n──────── Resumen ────────');
for (const r of res) console.log(`${r.ok ? '✓' : '✖'} ${r.nombre} (${r.seg} s)`);
const fallos = res.filter(r => !r.ok);
console.log(fallos.length ? `\n${fallos.length} con fallos: ${fallos.map(f => f.nombre).join(', ')}` : '\nTodo en verde');
process.exit(fallos.length ? 1 : 0);
