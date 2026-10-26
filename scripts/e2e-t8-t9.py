#!/usr/bin/env python3
"""E2E de T8 (medición apagada y, si se enciende, solo campos permitidos) y T9 (odómetro de cifras reales, sin GSAP en la portada)."""
import os, subprocess, sys, time, json, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8194')); BASE = f'http://127.0.0.1:{PORT}/'
EP = 'https://medir.invalid/e'
FAILS, PASSED = [], []
def check(c, m):
    if not c: raise AssertionError(m)
def run(n, f):
    try: f(); PASSED.append(n); print('  ✓', n)
    except Exception as e: FAILS.append((n, e)); print('  ✗', n, '→', e)
UNIT = json.load(open(os.path.join(ROOT, 'js/units.min.json')))[0]['id']
def abrir(br, reduced=True, url=BASE, encender=False, dnt=False, w=390, h=844):
    ctx = br.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if reduced else 'no-preference')
    pg = ctx.new_page(); reqs, beacons, errs = [], [], []
    pg.on('request', lambda r: reqs.append(r.url)); pg.on('pageerror', lambda e: errs.append(str(e)))
    def beacon(route):
        beacons.append(json.loads(route.request.post_data or '{}')); route.fulfill(status=204, body='')
    pg.route(EP, beacon)
    if encender:
        def idx(route):
            r = route.fetch(); body = r.text().replace('content="off"', f'content="{EP}"', 1)
            route.fulfill(response=r, body=body)
        pg.route(re.compile(r'.*/(index\.html)?(\?.*)?$'), lambda route: idx(route) if route.request.resource_type == 'document' else route.continue_())
    if dnt: pg.add_init_script("Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'})")
    for _ in range(40):
        try: pg.goto(url, wait_until='load', timeout=6000); break
        except Exception: time.sleep(.25)
    pg.wait_for_selector('li.car', state='attached'); return ctx, pg, reqs, beacons, errs
srv = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        def t8_apagada():
            ctx, pg, reqs, bc, errs = abrir(br)
            check(pg.evaluate("document.querySelector('meta[name=dr-medicion]').content") == 'off', 'la demo debe salir con medición off')
            check(pg.evaluate("typeof window.drMedir") == 'function', 'drMedir no existe')
            pg.goto(BASE + '#unidad=' + str(UNIT)); pg.wait_for_selector('dialog.ficha[open]', timeout=8000)
            pg.evaluate("document.querySelector('a[href*=\"wa.me\"]') && document.querySelector('a[href*=\"wa.me\"]').addEventListener('click',e=>e.preventDefault())")
            pg.wait_for_timeout(500)
            externos = [u for u in reqs if not u.startswith(BASE) and not u.startswith('data:') and 'openstreetmap' not in u]
            check(not externos, f'peticiones externas con la medición apagada: {externos[:3]}')
            check(not bc, 'salió un beacon con la medición apagada'); check(not errs, str(errs)); ctx.close()
        def t8_encendida():
            ctx, pg, reqs, bc, errs = abrir(br, encender=True)
            check(pg.evaluate("document.querySelector('meta[name=dr-medicion]').content") == EP, 'no se encendió en la prueba')
            pg.evaluate("location.hash = '#unidad=" + str(UNIT) + "'"); pg.wait_for_selector('dialog.ficha[open]', timeout=8000); pg.wait_for_timeout(600)
            pg.evaluate("document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&/wa\\.me|whatsapp/.test(a.href))e.preventDefault()},false)")
            wa = pg.locator('dialog.ficha a[href*="wa.me"]').first
            if wa.count(): wa.click(); pg.wait_for_timeout(400)
            ev = [b.get('e') for b in bc]
            check('ficha_abierta' in ev, f'no midió la apertura: {bc}')
            if wa.count(): check('whatsapp_clic' in ev, f'no midió WhatsApp: {bc}')
            for b in bc:
                check(set(b) <= {'e', 'id', 'origen', 'filtro'}, f'campos no permitidos: {b}')
                check(not re.search(r'\d{8,}', json.dumps({k: v for k, v in b.items() if k != 'id'})), f'posible teléfono: {b}')
            check(not errs, str(errs)); ctx.close()
        def t8_dnt():
            ctx, pg, reqs, bc, errs = abrir(br, encender=True, dnt=True)
            pg.evaluate("location.hash = '#unidad=" + str(UNIT) + "'"); pg.wait_for_selector('dialog.ficha[open]', timeout=8000); pg.wait_for_timeout(600)
            check(not bc, f'midió con «No rastrear» activo: {bc}'); ctx.close()
        def t8_privacidad():
            h = open(os.path.join(ROOT, 'privacidad.html'), encoding='utf-8').read()
            check('no guarda datos de quienes lo visitan' in h, 'con la medición apagada el texto de privacidad debe seguir igual')
        def t9_odometro():
            ctx, pg, reqs, bc, errs = abrir(br, reduced=False, w=1280, h=900)
            pg.evaluate("document.querySelector('.inventory-meta').scrollIntoView({block:'center'})"); pg.wait_for_timeout(3200)   # el odómetro dura 1800 ms (antes 900): espera = animación + margen
            v = pg.evaluate("[...document.querySelectorAll('[data-odo]')].map(e=>[e.textContent.trim(),e.dataset.odo])")
            check(len(v) == 3 and all(a == b for a, b in v), f'las cifras finales deben ser las publicadas: {v}')
            check(v[0][0] == str(len(json.load(open(os.path.join(ROOT, 'js/units.min.json'))))), 'la cifra no coincide con el catálogo')
            check(not errs, str(errs)); ctx.close()
        def t9_reducido_y_sin_gsap():
            ctx, pg, reqs, bc, errs = abrir(br, reduced=True)
            v = pg.evaluate("[...document.querySelectorAll('[data-odo]')].map(e=>[e.textContent.trim(),e.dataset.odo])")
            check(all(a == b for a, b in v), f'con movimiento reducido las cifras deben estar finales: {v}')
            check(not any('gsap' in u or u.split('?')[0].endswith('/js/motion.js') for u in reqs), 'la portada no debe cargar GSAP ni motion.js')
            check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), 'desbordamiento horizontal'); ctx.close()
        def t9_hero_prioridad():
            ctx, pg, reqs, bc, errs = abrir(br)
            fp = pg.evaluate("[...document.querySelectorAll('.hero-chain-car img')].map(i=>i.fetchPriority)")
            check(fp[0] != 'low' and all(x == 'low' for x in fp[1:]), f'solo la primera foto del hero debe tener prioridad alta: {fp[:4]}'); ctx.close()
        run('T8 apagada: sin peticiones externas ni beacons', t8_apagada)
        run('T8 encendida (simulada): solo eventos y campos permitidos', t8_encendida)
        run('T8 respeta «No rastrear»', t8_dnt)
        run('T8 privacidad sin cambios mientras está apagada', t8_privacidad)
        run('T9 odómetro termina en las cifras publicadas', t9_odometro)
        run('T9 movimiento reducido sin animar y sin GSAP en la portada', t9_reducido_y_sin_gsap)
        run('T9 hero: solo la primera foto con prioridad alta', t9_hero_prioridad)
        br.close()
finally: srv.terminate()
print(f'{len(PASSED)} OK, {len(FAILS)} con fallos'); sys.exit(1 if FAILS else 0)
