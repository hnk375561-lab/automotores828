#!/usr/bin/env python3
"""E2E de los efectos de entrada (scroll reveal) y su accesibilidad.

Verifica, con estilos computados y animaciones reales (document.getAnimations):
  1. A (títulos, p.ey, tarjetas de financiación) dura >= 1500 ms (2× los 750 ms originales) y <= 1600 ms.
  2. B (tarjeta de unidad 1300 ms, foto 1500 ms, fondos 1600 ms) dura >= 1,5× lo original y <= 1600 ms.
  3. El temporizador que limpia el desfase en js/site.js cubre la mayor duración + 4 desfases + margen.
  4. C (hover, botones, pasos de «Tu búsqueda») NO se ralentiza; el hover de la tarjeta no anima opacity/transform.
  5. prefers-reduced-motion y save-data: sin ocultar, sin transición de entrada, todo visible al instante.
  6. Si el observador falla: recuperación (rv-recover) con contenido visible y duración corta (<= 600 ms).
  7. Scroll de salto: lo que queda en pantalla termina visible; el estado final es opacity 1 / transform none.
Uso: python3 scripts/e2e-reveal.py   (levanta su propio servidor)."""
import os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8197')); BASE = f'http://127.0.0.1:{PORT}/'
FAILS, PASSED = [], []
def check(c, m):
    if not c: raise AssertionError(m)
def run(n, f):
    try: f(); PASSED.append(n); print('  ✓', n)
    except Exception as e: FAILS.append((n, e)); print('  ✗', n, '→', e)

SAVE_DATA = "Object.defineProperty(navigator,'connection',{get:()=>({saveData:true,effectiveType:'4g'})})"
NO_IO = "window.IntersectionObserver = function(){ this.observe=function(){}; this.unobserve=function(){}; this.disconnect=function(){}; };"

def abrir(br, w=390, h=844, reduced=False, init=None):
    ctx = br.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if reduced else 'no-preference')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    if init: pg.add_init_script(init)
    for _ in range(40):
        try: pg.goto(BASE, wait_until='load', timeout=6000); break
        except Exception: time.sleep(.25)
    pg.wait_for_selector('li.car', state='attached'); pg.wait_for_timeout(500)
    return ctx, pg, errs

def ms(v):  # '0.75s' | '120ms' -> ms
    v = v.strip(); return float(v[:-2]) if v.endswith('ms') else float(v[:-1]) * 1000

# Duración de la propiedad `prop` en el estilo computado de un elemento.
DUR_JS = """([sel, prop]) => { const n = document.querySelector(sel); if (!n) return null; const cs = getComputedStyle(n);
  const p = cs.transitionProperty.split(',').map(x => x.trim()), d = cs.transitionDuration.split(',').map(x => x.trim());
  const i = p.indexOf(prop); return i < 0 ? null : d[i % d.length]; }"""
def rv(pg, name):
    """Duración (ms) declarada en :root como --rv-*; fuente única de verdad: scripts/estilos.css."""
    return float(pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('%s'))" % name))
def cerca(d, esperado, tol=60): return abs(d - esperado) <= tol
def dur(pg, sel, prop):
    v = pg.evaluate(DUR_JS, [sel, prop]); check(v is not None, f'{sel} no transiciona {prop}'); return ms(v)

srv = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        for W, H in ((390, 844), (1280, 800)):
            ctx, pg, errs = abrir(br, W, H)
            def cat_a():
                for sel in ('section h2.reveal', 'p.ey.reveal', '.finance-card.reveal'):
                    for prop in ('opacity', 'transform'):
                        d = dur(pg, sel, prop)
                        check(cerca(d, rv(pg, '--rv-dur')), f'[{W}] A {sel} {prop} = {d} ms (esperado --rv-dur = {rv(pg, "--rv-dur")})')
            def cat_b():
                for prop in ('opacity', 'transform'):
                    d = dur(pg, 'li.car.reveal', prop); check(cerca(d, rv(pg, '--rv-dur-b')), f'[{W}] B li.car {prop} = {d} ms (esperado --rv-dur-b = {rv(pg, "--rv-dur-b")})')
                d = dur(pg, 'li.car.reveal .car-ph', 'clip-path'); check(cerca(d, rv(pg, '--rv-dur-ph')), f'[{W}] B foto clip-path = {d} ms (esperado --rv-dur-ph = {rv(pg, "--rv-dur-ph")})')
                d = dur(pg, '.dr-fondo', 'opacity'); check(cerca(d, rv(pg, '--rv-dur-fondo')), f'[{W}] B .dr-fondo = {d} ms (esperado --rv-dur-fondo = {rv(pg, "--rv-dur-fondo")})')
                a = pg.evaluate("getComputedStyle(document.querySelector('.hx-copy')).animationDuration")
                check(cerca(ms(a), rv(pg, '--rv-dur-hero')), f'[{W}] hero .hx-copy animación = {a} (esperado --rv-dur-hero = {rv(pg, "--rv-dur-hero")})')
            def timer_cubre():
                src = open(os.path.join(ROOT, 'js/site.js'), encoding='utf-8').read()
                m = re.search(r"transitionDelay = ''; \}\); \}, (\d+)\)", src); check(m, 'no encuentro el temporizador de limpieza de desfase')
                t = int(m.group(1))
                paso = float(pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rv-stagger'))"))
                peor = max(dur(pg, 'section h2.reveal', 'opacity'), dur(pg, 'li.car.reveal', 'opacity'),
                           dur(pg, 'li.car.reveal .car-ph', 'clip-path') + 100) + 4 * paso
                check(t >= peor + 200, f'[{W}] temporizador {t} ms no cubre {peor:.0f} ms + 200 de margen')
            def cat_c():
                for sel in ('a.btn.p', 'button.menu-toggle' if W == 390 else 'a.btn'):
                    for prop, d in (('background-color', None), ('transform', None)):
                        v = pg.evaluate(DUR_JS, [sel, prop])
                        if v is not None: check(ms(v) <= 350, f'[{W}] C {sel} {prop} = {v} (no debe ralentizarse)')
                check(dur(pg, 'li.car.reveal', 'border-color') <= 350 if pg.evaluate(DUR_JS, ['li.car.reveal', 'border-color']) else True, f'[{W}] C borde de tarjeta > 350 ms')
                a = pg.evaluate("(()=>{const n=document.querySelector('.rz-step');return n?getComputedStyle(n).animationDuration:'0.5s'})()")
                check(ms(a) <= 500, f'[{W}] C rz-step = {a} (no debe ralentizarse)')
            def hover_sin_opacidad_transform():
                if W < 1000: return
                pg.evaluate("document.querySelector('#unidades').scrollIntoView()"); pg.wait_for_timeout(3200)
                car = pg.locator('#unidades li.car').first; car.scroll_into_view_if_needed(); pg.wait_for_timeout(2600)
                car.hover(); pg.wait_for_timeout(120)
                props = pg.evaluate("(()=>{const c=document.querySelector('#unidades li.car');return c.getAnimations().map(a=>a.transitionProperty)})()")
                check('opacity' not in props and 'transform' not in props, f'el hover de la tarjeta anima {props}')
            run(f'{W}px · A: entradas de texto/títulos/financiación = --rv-dur', cat_a)
            run(f'{W}px · B: tarjeta, foto, fondos y hero más lentos y con techo', cat_b)
            run(f'{W}px · temporizador de site.js cubre duración + desfase', timer_cubre)
            run(f'{W}px · C: botones/hover/pasos sin ralentizar', cat_c)
            run(f'{W}px · hover de tarjeta no anima opacity/transform', hover_sin_opacidad_transform)
            check(not errs, f'errores JS: {errs}') if errs else None
            ctx.close()

        def movimiento_reducido():
            ctx, pg, errs = abrir(br, reduced=True)
            check(pg.evaluate("!document.documentElement.classList.contains('rv-ready')"), 'con movimiento reducido no debe haber rv-ready')
            r = pg.evaluate("""()=>[...document.querySelectorAll('.reveal')].map(n=>{const cs=getComputedStyle(n);return [cs.opacity,cs.transform,cs.transitionDuration.split(',')[0],n.getAnimations().length]})""")
            check(r, 'no hay .reveal')
            for o, t, d, a in r: check(o == '1' and t == 'none' and ms(d) == 0 and a == 0, f'no visible/sin transición: {o} {t} {d} {a}')
            check(pg.evaluate("[...document.querySelectorAll('.hx-copy')].every(n=>getComputedStyle(n).animationName==='none')"), 'el hero anima con movimiento reducido')
            ctx.close()
        def ahorro_datos():
            ctx, pg, errs = abrir(br, init=SAVE_DATA)
            check(pg.evaluate("document.documentElement.classList.contains('save-data')"), 'save-data no se detectó')
            check(pg.evaluate("!document.documentElement.classList.contains('rv-ready')"), 'con save-data no debe haber rv-ready')
            r = pg.evaluate("""()=>[...document.querySelectorAll('.reveal')].map(n=>[getComputedStyle(n).opacity,getComputedStyle(n).transform,n.getAnimations().length])""")
            for o, t, a in r: check(o == '1' and t == 'none' and a == 0, f'save-data: no visible/animando {o} {t} {a}')
            ctx.close()
        def recuperacion():
            ctx, pg, errs = abrir(br, init=NO_IO)
            check(pg.evaluate("document.documentElement.classList.contains('rv-ready')"), 'sin observador debería arrancar oculto (rv-ready)')
            pg.wait_for_timeout(2900)
            check(pg.evaluate("document.documentElement.classList.contains('rv-recover')"), 'no se activó rv-recover')
            check(pg.evaluate("!document.documentElement.classList.contains('rv-ready')"), 'rv-ready sigue puesto tras recuperar')
            for sel, prop in (('section h2.reveal', 'opacity'), ('li.car.reveal', 'opacity')):
                d = dur(pg, sel, prop); check(d <= 600, f'recuperación {sel} = {d} ms (debe ser ≤ 600, no la animación lenta)')
            OCULTOS = "[...document.querySelectorAll('.reveal')].filter(n=>getComputedStyle(n).opacity!=='1').map(n=>n.tagName+'.'+[...n.classList].join('.')+' op='+getComputedStyle(n).opacity)"
            r = pg.evaluate(OCULTOS)
            for _ in range(20):   # hasta 2 s para que termine la transición corta
                if not r: break
                pg.wait_for_timeout(100); r = pg.evaluate(OCULTOS)
            check(not r, f'{len(r)} elementos siguen ocultos tras la recuperación: {r[:3]}')
            ctx.close()
        def scroll_salto():
            ctx, pg, errs = abrir(br)
            # Saltos rápidos entre secciones que sí tienen entradas (títulos); termina en la última.
            for sel in ('#unidades-t', '#preg-t', '#nos-t'):
                pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{behavior:'instant'}})"); pg.wait_for_timeout(120)   # el sitio usa scroll-behavior:smooth: 'instant' simula un salto real
            pg.wait_for_timeout(3300)
            vis = pg.evaluate("""()=>[...document.querySelectorAll('.reveal')].filter(n=>{const r=n.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).map(n=>[getComputedStyle(n).opacity,getComputedStyle(n).transform])""")
            check(vis, 'no hay elementos en pantalla')
            for o, t in vis: check(o == '1' and t == 'none', f'en pantalla sin terminar: {o} {t}')
            ctx.close()
        run('movimiento reducido: todo visible, sin transición ni animación', movimiento_reducido)
        run('ahorro de datos: todo visible, sin transición', ahorro_datos)
        run('observador caído: recuperación rápida y contenido visible', recuperacion)
        run('scroll de salto: lo visible termina en opacity 1 / transform none', scroll_salto)
        br.close()
finally:
    srv.terminate()
print(f'\n{len(PASSED)} OK, {len(FAILS)} con fallos')
sys.exit(1 if FAILS else 0)
