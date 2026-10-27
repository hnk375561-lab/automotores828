#!/usr/bin/env python3
# E2E de la sección «Unidad destacada» (js/historia.js): apertura desde las reglas del botón, disolución al cerrar,
# pausa/repetición, Escape, foco, inert, movimiento reducido a mitad de vuelo, resize y ausencia de pedidos externos.
# Uso: npm run test:historia:e2e   (levanta su propio servidor en el puerto 8137)
import os, re, subprocess, sys, time, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PORT = int(os.environ.get('PORT_HISTORIA', '8137'))
URL = f'http://localhost:{PORT}/'
UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
UA_IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
PERFILES = [
    ('escritorio 1440x1000', dict(viewport={'width': 1440, 'height': 1000}), False),
    ('teléfono 390x844', dict(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3, user_agent=UA_IPHONE), True),
    ('tableta 820x1180', dict(viewport={'width': 820, 'height': 1180}, has_touch=True, is_mobile=True, device_scale_factor=2, user_agent=UA_IPAD), True),
]
fallos = []
def check(cond, msg):
    if not cond:
        fallos.append(msg); print('  ✗', msg)
    return cond

def esperar(pg, expr, timeout=6000, paso=25):
    t0 = time.time()
    while (time.time() - t0) * 1000 < timeout:
        if pg.evaluate(expr): return True
        pg.wait_for_timeout(paso)
    return False

FASE = "document.querySelector('#unidad-destacada').dataset.histFase"
EST = "window.drHistoria && window.drHistoria.estado()"
ABIERTO = f"{EST} === 'abierto'"
CERRADO = f"{EST} === 'cerrado'"

def nueva_pagina(br, ctxopts, errs, externos):
    ctx = br.new_context(**ctxopts)
    # equipo de gama media: evita el cierre simplificado que el sitio usa con ≤2 núcleos o ≤2 GB
    ctx.add_init_script("Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});")
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('request', lambda r: externos.append(r.url) if not r.url.startswith(('http://localhost', 'data:', 'blob:')) else None)
    pg.goto(URL, wait_until='load')
    pg.evaluate("(()=>{const p=document.querySelector('.prelude'); if(p) p.remove();})()")
    pg.evaluate("document.querySelector('#unidad-destacada').scrollIntoView({block:'center'})")
    ok = esperar(pg, "document.querySelector('[data-historia-abrir]').dataset.histEstado === 'listo'", 15000)
    check(ok, 'el botón nunca pasó a estado «listo»')
    return ctx, pg

def activar(pg, tactil, sel='[data-historia-abrir]'):
    if tactil: pg.tap(sel)
    else: pg.click(sel)

def numeros_path(clip):
    m = re.search(r'path\(evenodd,\s*"(.*)"\)', clip or '')
    if not m: return None
    cuerpo = m.group(1)
    huecos = cuerpo.split('Z')[1:]
    ys = []
    for h in huecos:
        n = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', h)]
        ys += n[1::2]
    return ys

def correr(br, nombre, ctxopts, tactil):
    print(f'■ {nombre}')
    errs, externos = [], []
    ctx, pg = nueva_pagina(br, ctxopts, errs, externos)
    W, H = ctxopts['viewport']['width'], ctxopts['viewport']['height']

    # 0. controles fuera de la imagen
    fuera = pg.evaluate("""() => { const c = document.querySelector('.hist-ctl'), p = document.querySelector('.hist-prev'), o = document.querySelector('.hist-overlay');
      return !!c && !p.contains(c) && !o.contains(c) && !c.hidden; }""")
    check(fuera, 'los controles de pausa/repetición deben existir, estar visibles y fuera de la imagen')

    # 1. origen de la abertura = reglas del botón
    pg.evaluate("""() => { window.__aper = null; const ov = document.querySelector('.hist-overlay');
      new MutationObserver(() => { if (!window.__aper && ov.style.clipPath.startsWith('inset(')) window.__aper = ov.style.clipPath; })
        .observe(ov, { attributes: true, attributeFilter: ['style'] }); }""")
    esperado = pg.evaluate("""() => { const s = document.querySelector('#unidad-destacada .hist-stage, #unidad-destacada').getBoundingClientRect(), b = document.querySelector('.hist-btn').getBoundingClientRect();
      return [b.top - s.top, s.right - b.right, s.bottom - b.bottom, b.left - s.left]; }""")
    activar(pg, tactil)
    check(esperar(pg, f"{FASE} === 'reglas'", 800), 'tras activar debe entrar en la fase «reglas»')
    pg.wait_for_timeout(200)
    r = pg.evaluate("""() => { const a = document.querySelector('.hist-rule--top').getBoundingClientRect(), b = document.querySelector('.hist-btn').getBoundingClientRect();
      return { h: a.height, mitad: b.height / 2, top: a.top - b.top }; }""")
    check(1.5 < r['h'] <= r['mitad'] + 1 and abs(r['top']) < 1, f'la regla superior crece hacia abajo desde su borde exterior (h={r["h"]:.1f}, mitad={r["mitad"]:.1f})')
    check(esperar(pg, f"{FASE} === 'apertura'", 1500), 'a los 450 ms debe empezar la apertura')
    pg.wait_for_timeout(60)
    ap = pg.evaluate('window.__aper')
    nums = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', ap or '')] if ap else []
    # el navegador serializa inset() en forma corta (1 a 4 valores): se expande a top right bottom left
    if len(nums) == 1: nums = nums * 4
    elif len(nums) == 2: nums = [nums[0], nums[1], nums[0], nums[1]]
    elif len(nums) == 3: nums = [nums[0], nums[1], nums[2], nums[1]]
    check(len(nums) == 4 and all(abs(n - e) <= 10 for n, e in zip(nums, esperado)),
          f'la abertura nace en el botón: inset {nums} vs medido {[round(x,1) for x in esperado]}')
    check(esperar(pg, ABIERTO, 4000), 'la apertura debe terminar en «abierto»')
    d = pg.evaluate("""() => { const s = document.querySelector('#unidad-destacada .hist-stage, #unidad-destacada').getBoundingClientRect(), o = document.querySelector('.hist-overlay').getBoundingClientRect(), i = document.querySelector('.hist-fg');
      return { s: [s.left, s.top, s.width, s.height], o: [o.left, o.top, o.width, o.height], clip: document.querySelector('.hist-overlay').style.clipPath, nat: i.naturalWidth, tr: document.querySelector('.hist-media').style.transform,
               foco: document.activeElement.className, ancho: document.documentElement.scrollWidth > innerWidth }; }""")
    check(all(abs(a - b) < 1 for a, b in zip(d['s'], d['o'])), 'el overlay abierto cubre todo el escenario')
    check(d['nat'] > 0 and d['clip'] == 'none' and d['tr'] == 'none', f'imagen decodificada y sin recorte/escala residual ({d})')
    check('hist-close' in d['foco'], 'al abrir el foco va al botón cerrar')
    check(not d['ancho'], 'sin desborde horizontal con la sección abierta')

    # 2. foco atrapado + fondo inerte
    for _ in range(6): pg.keyboard.press('Tab')
    dentro = pg.evaluate("document.querySelector('.hist-overlay').contains(document.activeElement)")
    inerte = pg.evaluate("document.querySelector('#unidad-destacada .w').inert === true")
    check(dentro, 'el foco queda atrapado dentro del diálogo')
    check(inerte, 'el contenido de fondo está inerte mientras el diálogo está abierto')
    check(pg.evaluate("document.querySelector('.hist-overlay').getAttribute('role') === 'dialog' && document.querySelector('.hist-overlay').getAttribute('aria-modal') === 'true' && !!document.querySelector('.hist-overlay').getAttribute('aria-label')"), 'diálogo con role, aria-modal y etiqueta accesible')

    # 3. cierre: disolución desde arriba
    pg.evaluate("window.__muestras = []; const ov = document.querySelector('.hist-overlay'); const t0 = performance.now(); (function m(){ window.__muestras.push([performance.now()-t0, ov.style.clipPath]); if (window.drHistoria.estado() !== 'cerrado') requestAnimationFrame(m); })()")
    activar(pg, tactil, '.hist-close')
    check(esperar(pg, CERRADO, 3000), 'el cierre debe terminar en «cerrado»')
    mu = pg.evaluate('window.__muestras')
    paths = [(t, numeros_path(c)) for t, c in mu if c and c.startswith('path(')]
    check(len(paths) >= 6, f'la disolución usa clip-path:path() (muestras={len(paths)})')
    if paths:
        primeras = [ys for t, ys in paths if ys][:4]
        sup = [min(ys) / 1.0 for ys in primeras if ys]
        medio = [(t, ys) for t, ys in paths if ys and 300 < t < 600]
        prom = [sum(ys) / len(ys) for t, ys in medio] or [0]
        check(primeras and min(sup) < pg.evaluate("document.querySelector('#unidad-destacada .hist-stage, #unidad-destacada').clientHeight") * 0.35, 'los primeros huecos aparecen arriba (disolución dirigida desde el borde superior)')
        check(prom and sum(prom) / len(prom) < pg.evaluate("document.querySelector('#unidad-destacada .hist-stage, #unidad-destacada').clientHeight") * 0.62, 'a mitad del cierre los huecos se concentran en la mitad superior')
        durs = mu[-1][0] - next(t for t, c in mu if c and c != 'none')  # desde el primer recorte, sin la latencia del toque
        check(650 <= durs <= 1150, f'duración del cierre ≈ 850 ms (medido {durs:.0f} ms)')
    foco_ok = pg.evaluate("document.activeElement === document.querySelector('[data-historia-abrir]')")
    check(foco_ok, 'al cerrar el foco vuelve al botón disparador')
    resto = pg.evaluate("({ clip: document.querySelector('.hist-overlay').style.clipPath, h: document.querySelector('.hist-overlay').hidden, inert: !!document.querySelector('#unidad-destacada .w').inert })")
    check(resto['clip'] == '' and resto['h'] and not resto['inert'], f'sin estilos residuales tras cerrar ({resto})')

    # 4. teclado: Enter y Espacio sobre el botón real (solo escritorio)
    if not tactil:
        for tecla in ('Enter', 'Space'):
            pg.focus('[data-historia-abrir]'); pg.keyboard.press(tecla)
            check(esperar(pg, ABIERTO, 4000), f'{tecla} abre la historia')
            pg.keyboard.press('Escape')
            check(esperar(pg, CERRADO, 3000), f'Escape tras {tecla} cierra la historia')
            check(pg.evaluate("document.activeElement === document.querySelector('[data-historia-abrir]')"), f'foco restaurado tras {tecla}+Escape')

    # 5. activación repetida: un solo reloj, sin líneas de tiempo paralelas
    for _ in range(5): activar(pg, tactil) if pg.evaluate(f"{EST} === 'cerrado'") else None
    pg.evaluate("document.querySelector('[data-historia-abrir]').click(); document.querySelector('[data-historia-abrir]').click();")
    check(esperar(pg, ABIERTO, 4000), 'clics repetidos terminan en un único estado «abierto»')
    pg.evaluate("document.querySelector('.hist-close').click(); document.querySelector('.hist-close').click(); document.querySelector('.hist-close').click();")
    check(esperar(pg, CERRADO, 3000), 'cierres repetidos terminan en «cerrado»')

    # 6. Escape durante la apertura cancela y disuelve desde un escenario cubierto
    activar(pg, tactil)
    esperar(pg, f"{FASE} === 'apertura'", 1500); pg.wait_for_timeout(350)
    pg.keyboard.press('Escape')
    check(esperar(pg, CERRADO, 3000), 'Escape durante la apertura termina en «cerrado»')
    check(pg.evaluate("document.activeElement === document.querySelector('[data-historia-abrir]')"), 'foco restaurado tras cerrar en pleno revelado')
    # …y también durante las reglas
    activar(pg, tactil); pg.wait_for_timeout(180); pg.keyboard.press('Escape')
    check(esperar(pg, CERRADO, 2000), 'Escape durante las reglas cancela limpiamente')
    check(pg.evaluate("[...document.querySelectorAll('.hist-rule')].every(r => r.style.transform === '' && r.style.visibility === '')"), 'las reglas vuelven a su estado normal')

    # 7. pausa: el reloj se congela y se retoma sin saltos
    activar(pg, tactil)
    esperar(pg, f"{FASE} === 'apertura'", 1500); pg.wait_for_timeout(250)
    # el botón de pausa queda inerte tras abrir; se prueba desde la API y desde el botón antes de que el diálogo lo bloquee
    pg.evaluate("window.drHistoria.pausar(true)")
    t1 = pg.evaluate('window.drHistoria.tiempo()'); c1 = pg.evaluate("document.querySelector('.hist-overlay').style.clipPath")
    pg.wait_for_timeout(700)
    t2 = pg.evaluate('window.drHistoria.tiempo()'); c2 = pg.evaluate("document.querySelector('.hist-overlay').style.clipPath")
    check(t1 == t2 and c1 == c2, f'en pausa el tiempo y el recorte no avanzan ({t1:.0f}→{t2:.0f} ms)')
    pg.evaluate("window.drHistoria.pausar(false)")
    check(esperar(pg, ABIERTO, 4000), 'al reanudar la apertura se completa')
    # documento oculto
    pg.evaluate("window.drHistoria.cerrar()")
    pg.wait_for_timeout(250)
    pg.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))")
    t1 = pg.evaluate('window.drHistoria.tiempo()'); pg.wait_for_timeout(600); t2 = pg.evaluate('window.drHistoria.tiempo()')
    check(t1 == t2, f'con el documento oculto el reloj queda congelado ({t1:.0f}→{t2:.0f})')
    pg.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'))")
    check(esperar(pg, CERRADO, 3000), 'al volver la pestaña el cierre se completa')

    # 8. botones de pausa/repetición reales
    pg.click('[data-historia-pausa]') if not tactil else pg.tap('[data-historia-pausa]')
    check(pg.evaluate("document.querySelector('[data-historia-pausa]').getAttribute('aria-pressed') === 'true'"), 'el botón de pausa alterna aria-pressed')
    pg.click('[data-historia-pausa]') if not tactil else pg.tap('[data-historia-pausa]')
    activar(pg, tactil, '[data-historia-repetir]')
    check(esperar(pg, ABIERTO, 5000), 'Repetir animación vuelve a abrir la historia')
    pg.keyboard.press('Escape'); esperar(pg, CERRADO, 3000)

    # 9. movimiento reducido a mitad de vuelo (apertura y cierre)
    activar(pg, tactil); esperar(pg, f"{FASE} === 'apertura'", 1500); pg.wait_for_timeout(300)
    pg.emulate_media(reduced_motion='reduce')
    check(esperar(pg, ABIERTO, 400), 'reduced-motion a mitad de apertura: abre al instante')
    pg.keyboard.press('Escape')
    check(esperar(pg, CERRADO, 400), 'reduced-motion: cierra al instante')
    pg.emulate_media(reduced_motion='no-preference')
    activar(pg, tactil); esperar(pg, ABIERTO, 4000)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.emulate_media(reduced_motion='reduce')
    check(esperar(pg, CERRADO, 400), 'reduced-motion a mitad de cierre: termina al instante')
    pg.emulate_media(reduced_motion='no-preference')

    # 10. resize durante la apertura y el cierre
    activar(pg, tactil); esperar(pg, f"{FASE} === 'apertura'", 1500); pg.wait_for_timeout(250)
    nuevo = {'width': W + 40 if W < 1000 else W - 120, 'height': H - 60}
    pg.set_viewport_size(nuevo)
    check(esperar(pg, ABIERTO, 4000), 'resize durante la apertura: termina «abierto»')
    ok = pg.evaluate("(() => { const s = document.querySelector('#unidad-destacada .hist-stage, #unidad-destacada').getBoundingClientRect(), o = document.querySelector('.hist-overlay').getBoundingClientRect(); return Math.abs(s.width - o.width) < 1 && Math.abs(s.height - o.height) < 1; })()")
    check(ok, 'tras el resize el overlay vuelve a cubrir el escenario')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.set_viewport_size({'width': W, 'height': H})
    check(esperar(pg, CERRADO, 3000), 'resize durante el cierre: termina «cerrado»')
    check(not pg.evaluate("document.documentElement.scrollWidth > innerWidth"), 'sin desborde horizontal tras cerrar')

    # 11. sin pedidos externos ni errores
    check(not externos, f'sin pedidos externos: {externos[:3]}')
    check(not errs, f'sin errores de consola/página: {errs[:3]}')
    ctx.close()

srv = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(1.2)
    with sync_playwright() as p:
        br = p.chromium.launch()
        for nombre, opts, tactil in PERFILES:
            correr(br, nombre, opts, tactil)
        br.close()
finally:
    srv.terminate()
if fallos:
    print(f'\n✗ {len(fallos)} verificación(es) fallaron'); sys.exit(1)
print('\n✓ Unidad destacada: apertura desde las reglas, disolución desde arriba, pausa, foco y movimiento reducido en 3 viewports.')
