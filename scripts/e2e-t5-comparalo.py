#!/usr/bin/env python3
"""E2E de T5 · «Comparalo con» dentro de la ficha. Chromium headless (Playwright) contra scripts/serve.mjs.
Comprueba que las sugerencias respetan tipo, carrocería, moneda y franja de precio (contra js/units.min.json),
que un toque abre el comparador con las dos unidades correctas y que la ficha y el foco se conservan."""
import json, math, os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8193'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
BY_ID = {str(u['id']): u for u in UNITS}
FAILS, PASSED = [], []

def check(c, m):
    if not c: raise AssertionError(m)
def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def pok(u): p = u.get('precio') or {}; return bool(p.get('moneda')) and isinstance(p.get('monto'), (int, float)) and p['monto'] > 0
def esperadas(a):
    """Misma regla que la ficha: tipo, carrocería (si la unidad la publica), moneda y precio dentro de ±50 %; las 3 más cercanas en precio."""
    if not pok(a) or not a.get('tipoVehiculo'): return []
    out = []
    for c in UNITS:
        if c is a or c.get('vendida') or not c.get('media') or not pok(c): continue
        if c.get('tipoVehiculo') != a['tipoVehiculo']: continue
        if a.get('carroceria') and c.get('carroceria') != a['carroceria']: continue
        if c['precio']['moneda'] != a['precio']['moneda']: continue
        r = c['precio']['monto'] / a['precio']['monto']
        if not (1 / 1.5 <= r <= 1.5): continue
        y = abs(c['anio'] - a['anio']) if a.get('anio') is not None and c.get('anio') is not None else 99
        out.append((abs(math.log(r)), y, c['i'], c))
    return [t[3] for t in sorted(out, key=lambda t: t[:3])[:3]]

def abrir(ctx, errors, uid, w=1280, h=900):
    pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h}); pg.emulate_media(reduced_motion='reduce')
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    for _ in range(40):
        try: pg.goto(BASE + '#unidad=' + uid, wait_until='load', timeout=5000); break
        except Exception: time.sleep(.25)
    pg.wait_for_selector('dialog.ficha[open]', timeout=10000)
    return pg

def tarjetas(pg): return pg.evaluate("""() => [...document.querySelectorAll('dialog.ficha[open] .fi-sim-c')].map(b => ({ label: b.getAttribute('aria-label'), titulo: b.querySelector('b').textContent, small: b.querySelector('small').textContent, h: b.getBoundingClientRect().height }))""")

def elegir_muestra():
    conb, sinb = [], []
    for u in UNITS: (conb if esperadas(u) else sinb).append(u)
    def pick(pred, lst): return next((u for u in lst if pred(u)), None)
    return dict(auto_ars=pick(lambda u: u['tipoVehiculo'] == 'Auto' and u['precio']['moneda'] == 'ARS', conb), auto_usd=pick(lambda u: u['tipoVehiculo'] == 'Auto' and u['precio']['moneda'] == 'USD', conb),
                moto=pick(lambda u: u['tipoVehiculo'] == 'Moto', conb), sin=pick(lambda u: True, sinb), con_menos_de_3=pick(lambda u: len(esperadas(u)) < 3, conb))

def main(br):
    ctx = br.new_context(); errors = []; M = elegir_muestra()
    check(all(M.values()), f'faltan unidades de muestra en el catálogo: { {k: bool(v) for k, v in M.items()} }')
    def t_regla(clave):
        def f():
            a = M[clave]; pg = abrir(ctx, errors, str(a['id'])); tj = tarjetas(pg); esp = esperadas(a)
            check(pg.locator('dialog.ficha[open] .fi-sim .fi-s-k').inner_text().strip() == 'Comparalo con', 'el bloque debe titularse «Comparalo con»')
            check([t['titulo'] for t in tj] == [c['titulo'] for c in esp], f"sugerencias {[t['titulo'] for t in tj]} ≠ esperadas {[c['titulo'] for c in esp]}")
            for t, c in zip(tj, esp):
                check(t['small'].startswith(c['precio']['moneda'] + ' '), f"el precio debe mostrarse con su moneda: {t['small']!r}")
                check(c['tipoVehiculo'] == a['tipoVehiculo'] and c['precio']['moneda'] == a['precio']['moneda'], 'tipo o moneda distintos')
                check(t['h'] >= 44, f"tarjeta de menos de 44 px: {t['h']}")
            check(0 < len(tj) <= 3, 'debe haber entre 1 y 3 sugerencias')
            pg.close()
        return f
    def t_sin():
        a = M['sin']; pg = abrir(ctx, errors, str(a['id']))
        check(pg.locator('dialog.ficha[open] .fi-sim').count() == 0, 'sin candidatas con criterio claro el bloque no debe aparecer')
        check(pg.locator('dialog.ficha[open] .fi-gu').count() == 1, 'el resto de la ficha debe seguir igual')
        pg.close()
    def t_abre_comparador():
        a = M['auto_ars']; pg = abrir(ctx, errors, str(a['id'])); esp = esperadas(a)[0]
        pg.locator('dialog.ficha[open] .fi-sim-c').first.click()
        pg.wait_for_selector('dialog.cmp[open]', timeout=5000)
        txt = pg.inner_text('dialog.cmp[open]').lower()
        for u in (a, esp): check(u['modelo'].lower().split()[0] in txt or u['titulo'].lower() in txt, f"el comparador no muestra {u['titulo']}")
        check('2 de 2' in pg.inner_text('.tray-count'), 'la bandeja debe tener exactamente 2 unidades: ' + pg.inner_text('.tray-count'))
        ids = pg.evaluate("() => [...document.querySelectorAll('.car-c input:checked')].map(c => c.value)")
        check(sorted(map(int, ids)) == sorted([a['i'], esp['i']]), f'selección incorrecta: {ids} vs {[a["i"], esp["i"]]}')
        check(pg.text_content('dialog.ficha[open] [data-cmp-ficha]').strip() == 'Quitar de la comparación', 'el botón de la ficha debe reflejar que ya está en la comparación')
        pg.keyboard.press('Escape'); pg.wait_for_function("() => !document.querySelector('dialog.cmp[open]')", timeout=4000)
        check(pg.evaluate("() => !!document.querySelector('dialog.ficha[open]')"), 'la ficha debe seguir abierta al cerrar el comparador')
        check(pg.evaluate("() => document.documentElement.classList.contains('has-dlg')"), 'el bloqueo de scroll debe seguir con la ficha abierta')
        check(pg.evaluate("() => !!document.activeElement && document.activeElement.classList.contains('fi-sim-c')"), 'el foco debe volver a la tarjeta')
        check(pg.evaluate("() => location.hash") == '#unidad=' + str(a['id']), 'la URL de la ficha no debe cambiar')
        pg.close()
    def t_reemplazo_y_ver_ficha():
        a = M['auto_ars']; pg = abrir(ctx, errors, str(a['id'])); pg.locator('dialog.ficha[open] .fi-sim-c').first.click()
        pg.wait_for_selector('dialog.cmp[open]'); pg.keyboard.press('Escape'); pg.wait_for_function("() => !document.querySelector('dialog.cmp[open]')")
        e = esperadas(a)[0]; pg.locator('dialog.ficha[open] .fi-sim-v').first.click()
        pg.wait_for_function("(h) => location.hash === h", arg='#unidad=' + str(e['id']), timeout=5000)
        pg.wait_for_function("() => !!document.querySelector('dialog.ficha[open] .fi-sim-c')", timeout=5000)
        sig = esperadas(e)[0]; pg.locator('dialog.ficha[open] .fi-sim-c').first.click(); pg.wait_for_selector('dialog.cmp[open]')
        check('2 de 2' in pg.inner_text('.tray-count'), 'siempre exactamente 2 unidades')
        ids = pg.evaluate("() => [...document.querySelectorAll('.car-c input:checked')].map(c => +c.value)")
        check(sorted(ids) == sorted([e['i'], sig['i']]), f'la selección debe ser exactamente las dos de esta ficha: {ids}')
        pg.close()
    def t_viewports():
        a = M['auto_ars']
        for w in (390, 768, 1280):
            pg = abrir(ctx, errors, str(a['id']), w=w, h=900 if w > 700 else 844)
            ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth"); check(ov <= 0, f'desbordamiento de {ov}px a {w}px')
            fov = pg.evaluate("() => { const d = document.querySelector('dialog.ficha[open]'); return d.scrollWidth - d.clientWidth; }"); check(fov <= 1, f'desbordamiento horizontal dentro de la ficha a {w}px: {fov}')
            pg.locator('dialog.ficha[open] .fi-sim-c').first.scroll_into_view_if_needed(); pg.locator('dialog.ficha[open] .fi-sim-c').first.click(); pg.wait_for_selector('dialog.cmp[open]', timeout=5000)
            pg.close()
    print('E2E T5 · «Comparalo con» en la ficha')
    for k, n in [('auto_ars', 'auto en pesos'), ('auto_usd', 'auto en dólares'), ('moto', 'moto'), ('con_menos_de_3', 'unidad con menos de 3 candidatas')]: run(f'sugerencias respetan tipo, carrocería, moneda y precio · {n}', t_regla(k))
    run('sin candidata con criterio claro no hay bloque', t_sin); run('un toque abre el comparador con las dos unidades; ficha, foco y URL intactos', t_abre_comparador)
    run('selección siempre de exactamente 2 y «Ver ficha»', t_reemplazo_y_ver_ficha); run('390/768/1280 px', t_viewports)
    ctx.close(); check(not errors, 'errores de consola: ' + ' | '.join(errors[:5]))

proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(headless=True)
        try: main(br)
        except AssertionError as e: FAILS.append(('consola', e)); print('  ✗', e)
        br.close()
finally:
    proc.terminate()
print(f'\n{len(PASSED)} OK, {len(FAILS)} con fallos'); sys.exit(1 if FAILS else 0)
