// Lista cada línea del sitio que AFIRMA algo del negocio (servicios, años, garantías, financiación, 0 km, "a cargar"...).
// Sirve para revisar con el dueño, línea por línea, qué texto hay que confirmar o borrar antes de publicar.
// Uso: npm run audit
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const re = /(permut|consign|financ|0 ?km|cero ?km|garant[ií]a|a[ñn]os de|desde 19|desde 20|transfer|cr[eé]dito|cuotas|tarjeta|usados|nuevos|a confirmar|a cargar|EJEMPLO|WHATSAPP-A-CONFIRMAR|Pendiente de confirmaci)/i;
// Voz: frases que docs/IDENTIDAD-MADRE.md (sección 2) pide evitar. Se listan aparte para no mezclarlas con las afirmaciones.
const voz = /(descubr[ií]\b|contactanos ahora|te garantizamos|tu veh[ií]culo usado|experiencia premium|soluciones integrales|movilidad inteligente|oportunidades imperdibles|auto de tus sue[ñn]os|calidad garantizada)/i;
// Prohibidos: números, frases y nombres que no deben aparecer en ninguna página generada (docs/osint-2026-10-15.md, sección 4).
// Con --prohibidos corre solo este chequeo, en silencio, y falla (exit 1) si encuentra algo. Lo usa `npm test`.
const prohibidos = [
  [/4046[ .-]?8265|6221[ .-]?7508|3557[ .-]?0362/, 'teléfono candidato sin confirmar (data/dealership.json, contact.conflicto)'],
  [/garant[ií]a real|papeles al d[ií]a|sin detalles|revisados?\b/i, 'frase sin respaldo del negocio'],
  [/m[aá]s de 70 (unidades|autos|veh[ií]culos)/i, '«más de 70» no es un inventario auditado'],
  [/\b876 veh[ií]culos\b/i, 'dato de la competencia'],
  [/\bDarack\b|\bB?1744\b/, 'dato descartado (esquina «Daract», CP 1742)'],
  [/FMAutos|JMU|HF Autos/i, 'otra agencia'],
  [/DR Automobiles|DR Automoci[oó]n|Doctor Auto\b|DR Autos\b/, 'homónimo que no es este negocio'],
];
const paginas = ['index.html', 'reserva.html', 'privacidad.html', '404.html'];
let np = 0;
for (const f of paginas) {
  const p = path.join(root, f); if (!fs.existsSync(p)) continue;
  // Se quitan estilos, svg, scripts (salvo JSON-LD) y las opciones del formulario «Tu usado» (las elige el cliente para describir SU auto, no son afirmaciones del negocio).
  // Cada bloque quitado deja sus saltos de línea para que los números de línea coincidan con el archivo.
  const blank = (m) => m.replace(/[^\n]/g, '');
  const html = fs.readFileSync(p, 'utf8').replace(/<style[\s\S]*?<\/style>/gi, blank).replace(/<svg[\s\S]*?<\/svg>/gi, blank).replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, blank)
    .replace(/<button[^>]*\bcv-chip\b[^>]*>[\s\S]*?<\/button>/gi, blank).replace(/&quot;u-es&quot;:&quot;[^&]*&quot;/g, '');
  html.split('\n').forEach((l, i) => { for (const [r, motivo] of prohibidos) { const m = l.match(r); if (m) { np++; console.log(`PROHIBIDO ${f}:${i + 1}  «${m[0]}» — ${motivo}`); } } });
}
if (process.argv.includes('--prohibidos')) {
  if (np) { console.error(`\n${np} coincidencias prohibidas. Ver docs/osint-2026-10-15.md, sección 4.`); process.exit(1); }
  console.log('audit-copy --prohibidos: sin coincidencias.'); process.exit(0);
}
if (np) process.exitCode = 1;
let n = 0, nv = 0;
for (const f of ['index.html', '404.html', 'privacidad.html']) {
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n'); let inStyle = false, inScript = false;
  lines.forEach((l, i) => {
    if (/<style/.test(l)) inStyle = true; if (/<\/style>/.test(l)) { inStyle = false; return; } if (/<script/.test(l) && !/<\/script>/.test(l)) inScript = true; if (/<\/script>/.test(l)) { inScript = false; return; } if (inStyle || inScript) return;
    const text = l.replace(/<svg.*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const mv = text.match(voz); if (mv && !/^\/[*\/]/.test(text) && !/^(var|function)\b/.test(text)) { nv++; console.log(`VOZ ${f}:${i + 1}  …${text.slice(Math.max(0, text.toLowerCase().indexOf(mv[0].toLowerCase()) - 50), text.toLowerCase().indexOf(mv[0].toLowerCase()) + 70)}…`); }
    const m = text.match(re); if (!m || /^\/[*\/]/.test(text) || /^(var|function)\b/.test(text)) return;
    const k = text.toLowerCase().indexOf(m[0].toLowerCase()); n++;
    console.log(`${f}:${i + 1}  …${text.slice(Math.max(0, k - 70), k + 90)}…`);
  });
}
console.log(`\n${nv} líneas con frases de voz a evitar.`);
console.log(`${n} líneas con afirmaciones para revisar. Cada una: dato confirmado (y registrado en golive/AFIRMACIONES-A-CONFIRMAR.md) o se borra.`);
