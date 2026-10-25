#!/usr/bin/env python3
"""E2E de T7 · foto vertical sin recorte. Tarjeta 4:5 y ficha con object-fit:contain (nunca cover) a 390/768/1280 px."""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8193')); BASE = f'http://127.0.0.1:{PORT}/'
FAILS, PASSED = [], []
def check(c, m):
    if not c: raise AssertionError(m)
def run(n, f):
    try: f(); PASSED.append(n); print('  ✓', n)
    except Exception as e: FAILS.append((n, e)); print('  ✗', n, '→', e)
def abrir(br, w, h):
    pg = br.new_page(viewport={'width': w, 'height': h}); pg.emulate_media(reduced_motion='reduce'); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    for _ in range(40):
        try: pg.goto(BASE, wait_until='load', timeout=6000); break
        except Exception: time.sleep(.25)
    pg.wait_for_selector('li.car', state='attached'); return pg, errs
def tarjeta(br, w, h):
    pg, errs = abrir(br, w, h)
    r = pg.evaluate("() => { const b = document.querySelector('#unidades li.car .car-ph').getBoundingClientRect(); return b.width / b.height }")
    check(abs(r - 0.8) < 0.02, f'{w}px: marco de tarjeta {r:.3f}, esperado 4:5 (0,8)')
    check(not errs, str(errs)); pg.close()
def ficha(br, w, h):
    pg, errs = abrir(br, w, h)
    pg.evaluate("document.querySelector('#unidades .cars').scrollIntoView()"); pg.wait_for_timeout(500)
    pg.click('li.car >> nth=0 >> .car-ph'); pg.wait_for_selector('dialog.ficha[open] .fi-t img', timeout=8000); pg.wait_for_timeout(700)
    d = pg.evaluate("() => { const i = document.querySelector('dialog.ficha .fi-t img'); const b = i.getBoundingClientRect(); return {fit: getComputedStyle(i).objectFit, w: b.width, h: b.height, nw: i.naturalWidth, nh: i.naturalHeight} }")
    check(d['fit'] == 'contain', f'{w}px: object-fit {d["fit"]}, esperado contain (sin recorte)')
    check(d['h'] <= h * 0.75, f'{w}px: la foto ocupa {d["h"]:.0f}px de alto, excede el 72 % de la pantalla')
    check(not errs, str(errs)); pg.close()
srv = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        for w, h in [(390, 844), (768, 1024), (1280, 900)]:
            run(f'tarjeta 4:5 a {w}px', lambda w=w, h=h: tarjeta(br, w, h))
            run(f'ficha sin recorte a {w}px', lambda w=w, h=h: ficha(br, w, h))
        br.close()
finally: srv.terminate()
print(f'{len(PASSED)} OK, {len(FAILS)} con fallos'); sys.exit(1 if FAILS else 0)
