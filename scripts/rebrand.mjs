// Reemplaza textos literales en todo el proyecto, para pasar este sitio a OTRA agencia (o cargar un dato nuevo en todos lados).
// Uso:  node scripts/rebrand.mjs mapa.json [--dry]
// mapa.json = [["texto viejo","texto nuevo"], ...]   (se aplican en orden: poner los textos largos primero)
// Toca .html .js .json .md .xml .txt .webmanifest .toml (no vendor/, fonts/, node_modules/, .git/).
// Ejemplo real: ver docs/REUTILIZAR.md y docs/rebrand.ejemplo.json
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mapFile, ...flags] = process.argv.slice(2); const dry = flags.includes('--dry');
if (!mapFile) { console.error('Uso: node scripts/rebrand.mjs mapa.json [--dry]'); process.exit(1); }
const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const skip = new Set(['node_modules', '.git', 'vendor', 'fonts', 'images', 'video']);
const ok = /\.(html|js|mjs|json|md|xml|txt|webmanifest|toml)$/i; const hits = {}; let files = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  if (skip.has(e.name)) continue; const p = path.join(d, e.name);
  if (e.isDirectory()) { walk(p); continue; } if (!ok.test(e.name) || path.resolve(p) === path.resolve(mapFile)) continue;
  let s = fs.readFileSync(p, 'utf8'), t = s;
  for (const [a, b] of map) { const c = t.split(a).length - 1; if (c) { hits[a] = (hits[a] || 0) + c; t = t.split(a).join(b); } }
  if (t !== s) { files++; if (!dry) fs.writeFileSync(p, t); }
} })(root);
for (const [a] of map) console.log(`${String(hits[a] || 0).padStart(4)} × ${a.slice(0, 70)}`);
console.log(`${dry ? '[simulacro] ' : ''}${files} archivos ${dry ? 'cambiarían' : 'modificados'}. Después: npm run prerender && npm test`);
