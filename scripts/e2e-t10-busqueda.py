#!/usr/bin/env python3
"""E2E de T10 · «Tu búsqueda»: el tope de presupuesto respeta la moneda, sin conversión.
Con tope en US$ solo coinciden unidades publicadas en USD; con tope en $, solo ARS."""
import json, os, re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8192'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
def esperadas(m, tope):
    return sum(1 for u in UNITS if (u.get('precio') or {}).get('moneda') == m and 0 < (u['precio'].get('monto') or 0) <= tope)
FAILS, PASSED = [], []
def check(c, m):
    if not c: raise AssertionError(m)
def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def coincidentes(pg, moneda, tope):
    pg.evaluate("() => document.querySelector('#busqueda').scrollIntoView()")
    pg.wait_for_selector('#b-pr', state='attached', timeout=8000)
    pg.click(f'#busqueda .cv-cur [data-cur="{moneda}"]')
    pg.fill('#b-pr', str(tope))
    pg.wait_for_timeout(700)
    t = pg.inner_text('#busqueda [data-match-h]')
    m = re.match(r'(\d+) unidad', t)
    return int(m.group(1)) if m else 0, t

def main(br):
    ctx = br.new_context(); errors = []
    pg = ctx.new_page(); pg.set_viewport_size({'width': 1280, 'height': 900}); pg.emulate_media(reduced_motion='reduce')
    pg.on('pageerror', lambda e: errors.append(str(e)))
    for _ in range(40):
        try: pg.goto(BASE, wait_until='load', timeout=6000); break
        except Exception: time.sleep(.25)
    def usd():
        n, t = coincidentes(pg, 'US$', 20000); e = esperadas('USD', 20000)
        check(e > 0, 'el set de datos no tiene USD ≤ 20.000 para probar')
        check(n == e, f'tope US$ 20.000: esperadas {e} (solo USD), la web dice {n}: «{t}»')
    def ars():
        n, t = coincidentes(pg, '$', 15000000); e = esperadas('ARS', 15000000)
        check(n == e, f'tope $ 15.000.000: esperadas {e} (solo ARS), la web dice {n}: «{t}»')
    def sin_conversion():
        n, t = coincidentes(pg, 'US$', 1)
        check(n == 0, f'tope US$ 1 no debe dejar pasar nada (ni unidades en ARS): «{t}»')
    run('tope en US$ solo deja unidades en USD', usd)
    run('tope en $ solo deja unidades en ARS', ars)
    run('tope mínimo no deja pasar unidades de otra moneda', sin_conversion)
    run('sin errores de consola', lambda: check(not errors, str(errors)))
    ctx.close()

srv = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as p:
        br = p.chromium.launch(); main(br); br.close()
finally:
    srv.terminate()
print(f'{len(PASSED)} OK, {len(FAILS)} con fallos'); sys.exit(1 if FAILS else 0)
