#!/usr/bin/env python3
"""E2E móvil · acciones de la ficha, botón Favoritos y botones flotantes.
Chromium con pantalla táctil (Playwright) contra scripts/serve.mjs. Comprueba:
 1. «Tasar mi usado» y «Ver horarios y mapa» llevan a su sección (no solo cierran la ficha).
 2. «Agendar visita y prueba de manejo» abre «Coordiná tu visita» a la vista.
 3. «Favoritos» queda dentro de su casilla, sin texto desbordado.
 4. Los botones flotantes (WhatsApp arriba, agendar abajo) son permanentes, a la derecha, ≥44 px y llevan a su destino.
 5. Con el comparador abierto en la bandeja, los flotantes no tapan «Comparar» ni «Vaciar»."""
import json, os, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8195'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
LIBRES = [u for u in UNITS if not u.get('vendida')]
FAILS, PASSED = [], []

def check(c, m):
    if not c: raise AssertionError(m)
def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def nueva(b, w=390, touch=True):
    ctx = b.new_context(viewport={'width': w, 'height': 844 if w < 700 else 900}, has_touch=touch, is_mobile=touch)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE, wait_until='load'); pg.wait_for_selector('#cars li', timeout=10000); time.sleep(.6)
    pg.errs = errs; return pg
def tocar(pg, loc):
    loc.scroll_into_view_if_needed(); (loc.tap if pg.evaluate("() => 'ontouchstart' in window") else loc.click)()
def abrir_ficha(pg):
    tocar(pg, pg.locator('#cars [data-ficha]').first); pg.wait_for_selector('dialog.ficha[open]', timeout=8000); time.sleep(.8)
def top(pg, sel): return pg.evaluate("(s) => Math.round(document.querySelector(s).getBoundingClientRect().top)", sel)
def hdr(pg): return pg.evaluate("() => (document.querySelector('header')||{offsetHeight:0}).offsetHeight")
def sin_ficha(pg): pg.wait_for_function("() => !document.querySelector('dialog.ficha[open]')", timeout=5000)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        def t_ancla(sel, dest):
            def f():
                pg = nueva(b); abrir_ficha(pg); tocar(pg, pg.locator(f'dialog.ficha[open] a[href="{sel}"]').first); sin_ficha(pg); time.sleep(2.2)
                t = top(pg, dest); check(abs(t - hdr(pg)) <= 40, f'{dest} quedó a {t}px del tope (debería estar bajo el encabezado)')
                check(pg.evaluate("() => location.hash") == sel, 'la URL debe terminar en ' + sel); check(not pg.errs, pg.errs[:2]); pg.context.close()
            return f
        def t_agendar():
            pg = nueva(b); abrir_ficha(pg); tocar(pg, pg.locator('dialog.ficha[open] a[href^="reserva.html"]').first); sin_ficha(pg); time.sleep(2.2)
            ok = pg.evaluate("() => { const x = document.querySelector('#visita .is-open, #visita [class*=rz]'); const r = x && x.getBoundingClientRect(); return !!r && r.top < innerHeight && r.bottom > 0; }")
            check(ok, '«Coordiná tu visita» debe quedar a la vista'); check(not pg.errs, pg.errs[:2]); pg.context.close()
        def t_favoritos():
            for w in (320, 390, 768, 1280):
                pg = nueva(b, w, w < 700); r = pg.evaluate("""() => { const f = document.querySelector('.fx-fav'), c = document.querySelector('#unidades .fx') || document.querySelector('.fx'); const a = f.getBoundingClientRect(), z = c.getBoundingClientRect();
                    return { w: a.width, over: f.scrollWidth - f.clientWidth, dentro: a.left >= z.left - 1 && a.right <= z.right + 1, h: a.height }; }""")
                check(r['over'] <= 1, f'texto desbordado a {w}px: {r}'); check(r['dentro'], f'sale de su casilla a {w}px: {r}'); check(r['w'] >= 100 and r['h'] >= 43, f'tamaño insuficiente a {w}px: {r}'); pg.context.close()
        def t_fab():
            for w in (320, 390, 768, 1280):
                pg = nueva(b, w, w < 700)
                r = pg.evaluate("""() => { const q = [...document.querySelectorAll('.dr-fab a')].map(a => a.getBoundingClientRect()); const cs = getComputedStyle(document.querySelector('.dr-fab'));
                    return { n: q.length, pos: cs.position, wa: q[0] && [q[0].top, q[0].left, q[0].width, q[0].height], ag: q[1] && [q[1].top, q[1].left, q[1].width, q[1].height], W: innerWidth, H: innerHeight }; }""")
                check(r['n'] == 2 and r['pos'] == 'fixed', f'deben ser 2 botones fijos a {w}px: {r}')
                check(r['wa'][0] < r['ag'][0] and abs(r['wa'][1] - r['ag'][1]) < 2, 'WhatsApp arriba y agendar abajo, alineados'); check(r['wa'][1] > r['W'] / 2, 'deben estar a la derecha')
                check(min(r['wa'][2], r['wa'][3], r['ag'][2], r['ag'][3]) >= 44, 'área táctil de al menos 44 px')
                pg.evaluate("scrollTo(0, document.documentElement.scrollHeight)"); time.sleep(.4)
                vis = pg.evaluate("() => [...document.querySelectorAll('.dr-fab a')].every(a => { const r = a.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; })"); check(vis, 'permanentes: visibles también al final de la página')
                check('wa.me' in pg.get_attribute('.dr-fab-wa', 'href'), 'el primero abre WhatsApp'); pg.context.close()
            pg = nueva(b); tocar(pg, pg.locator('.dr-fab-ag')); time.sleep(2.2)
            ok = pg.evaluate("() => { const x = document.querySelector('#visita .is-open'); const r = x && x.getBoundingClientRect(); return !!r && r.top < innerHeight && r.bottom > 0; }"); check(ok, 'el lápiz lleva a «Coordiná tu visita»'); pg.context.close()
        def t_fab_vs_bandeja():
            for w in (320, 390, 768, 1280):
                pg = nueva(b, w, w < 700)
                for u in LIBRES[:2]:
                    c = pg.locator(f'.car-c input[value="{u["i"]}"]'); c.scroll_into_view_if_needed(); c.check(force=True) if False else pg.evaluate("(i) => document.querySelector('.car-c input[value=\"' + i + '\"]').click()", u['i']); time.sleep(.3)
                pg.wait_for_selector('.tray:not([hidden])'); time.sleep(.4)
                r = pg.evaluate("""() => { const f = [...document.querySelectorAll('.dr-fab a')].map(a => a.getBoundingClientRect()); const t = [...document.querySelectorAll('.tray button, .tray a, .tray-count')].map(a => a.getBoundingClientRect());
                    const hit = f.some(a => t.some(b => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom))); return { hit, trayTop: document.querySelector('.tray').getBoundingClientRect().top, fabBottom: Math.max(...f.map(a => a.bottom)) }; }""")
                check(not r['hit'], f'los flotantes tapan la bandeja a {w}px: {r}'); check(r['fabBottom'] <= r['trayTop'] + 1, f'los flotantes deben quedar sobre la bandeja a {w}px: {r}'); pg.context.close()
        def t_comparador_movil():
            for w in (320, 390):
                pg = nueva(b, w)
                for u in LIBRES[2:4]: pg.evaluate("(i) => document.querySelector('.car-c input[value=\"' + i + '\"]').click()", u['i']); time.sleep(.3)
                pg.evaluate("document.querySelector('.cmp-open').click()"); pg.wait_for_selector('dialog.cmp[open]'); time.sleep(.8)
                r = pg.evaluate("""() => { const d = document.querySelector('dialog.cmp').getBoundingClientRect(); const u = [...document.querySelectorAll('.cmpx thead th.cmp-u')].map(e => e.getBoundingClientRect());
                    const ph = [...document.querySelectorAll('.cmp-ph')].map(e => e.getBoundingClientRect()); const ft = document.querySelector('.cmp-ft'); const sc = document.querySelector('.cmp-sc');
                    return { izq: u[0].left - d.left, der: d.right - u[1].right, w0: u[0].width, w1: u[1].width, ph: ph.map(x => x.height), phw: ph.map(x => x.width), ft: ft.getBoundingClientRect().height, abierto: ft.open, sw: sc.scrollWidth - sc.clientWidth }; }""")
                check(abs(r['izq'] - r['der']) <= 6, f'las unidades deben estar centradas a {w}px: {r}'); check(abs(r['w0'] - r['w1']) <= 2, f'columnas desiguales a {w}px: {r}')
                check(min(r['ph']) >= 0.75 * min(r['phw']) and min(r['ph']) >= 120, f'las fotos deben ser grandes a {w}px: {r}')
                check(not r['abierto'] and r['ft'] <= 60, f'el aviso debe estar plegado a {w}px: {r}'); check(r['sw'] <= 1, f'sin scroll horizontal a {w}px: {r}')
                pg.click('.cmp-ft summary'); check(pg.evaluate("() => document.querySelector('.cmp-ft').open"), 'el aviso se despliega con un toque'); pg.context.close()
        for n, fn in [('«Tasar mi usado» lleva a la sección (táctil)', t_ancla('#tu-usado', '#tu-usado')), ('«Ver horarios y mapa» lleva a la sección (táctil)', t_ancla('#horarios', '#horarios')),
                      ('«Agendar visita y prueba de manejo» abre «Coordiná tu visita»', t_agendar), ('Favoritos dentro de su casilla 320/390/768/1280', t_favoritos),
                      ('botones flotantes permanentes a la derecha', t_fab), ('flotantes no tapan la bandeja del comparador', t_fab_vs_bandeja), ('comparador móvil: centrado, fotos grandes, aviso plegado', t_comparador_movil)]: run(n, fn)
        b.close()
    print(f'\n{len(PASSED)} OK, {len(FAILS)} con fallos'); raise SystemExit(1 if FAILS else 0)

proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(1.5); main()
finally:
    proc.terminate()
