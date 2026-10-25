#!/usr/bin/env python3
"""Prueba de la transición de fichas (js/ficha-flip.js) en Chromium real.
Cubre: varias fichas seguidas, cierre con botón / Escape / fondo, interrupciones, foco, scroll,
hero, tarjeta no disponible, prefers-reduced-motion, móvil y degradación si el módulo no carga."""
import os, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8179'))
proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)},
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
URL = f'http://127.0.0.1:{PORT}/'
DLG = 'dialog.ficha'
results = []

def check(name, cond, extra=''):
    results.append((name, bool(cond), extra))
    print(('OK   ' if cond else 'FALLA'), name, extra)

def load(browser, **kw):
    ctx = browser.new_context(**kw)
    # Un equipo/CI de ≤2 núcleos se declara «gama baja» y el módulo omite el morph y el vuelo de la foto:
    # por defecto se simulan 8 núcleos para probar el camino completo (LOWEND=1 lo desactiva).
    if not os.environ.get('LOWEND'): ctx.add_init_script("Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8})")
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)   # recursos externos (mapa, tipografías) no resuelven sin red
    if os.environ.get('NO_FLIP'): page.route('**/js/ficha-flip.js*', lambda r: r.abort())   # comparación A/B sin el módulo
    for _ in range(40):
        try:
            page.goto(URL, wait_until='load', timeout=3000); break
        except Exception:
            time.sleep(.25)
    page.wait_for_timeout(700)
    return ctx, page, errors

def bring(page, i):
    page.evaluate("i=>{var li=document.querySelectorAll('li.car')[i];var r=li.getBoundingClientRect();scrollBy(0,r.top+r.height/2-innerHeight/2)}", i)
    last, same = None, 0
    for _ in range(60):       # el scroll de la página es suave: esperar a que se asiente
        y = page.evaluate('pageYOffset'); same = same + 1 if y == last else 0; last = y
        if same >= 6: break
        page.wait_for_timeout(50)

def is_open(page): return page.evaluate("()=>!!document.querySelector('dialog.ficha[open]')")

def wait_closed(page, ms=2500):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if not is_open(page): return round((time.time() - t0) * 1000)
        page.wait_for_timeout(25)
    return None

def clean_state(page):
    """Nada queda colgado después de abrir o cerrar."""
    return page.evaluate("""()=>{
      var d=document.querySelector('dialog.ficha'); if(!d) return {ok:true,why:'sin diálogo'};
      var g=document.querySelector('[popover]'); var ghostOpen=!!(g&&g.matches(':popover-open'));
      var t=d.querySelector('.fi-t img');
      var mine=d.getAnimations({subtree:true}).filter(a=>a.effect&&a.effect.getTiming&&true).length;
      return {ok: !ghostOpen && (!d.open || (getComputedStyle(d).transform==='none' && (!t || t.style.visibility===''))) && d.style.willChange==='',
              ghostOpen, transform:getComputedStyle(d).transform, tgtVis:t?t.style.visibility:null, will:d.style.willChange, anims:mine}
    }""")

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ---------- escritorio ----------
        ctx, page, errors = load(browser, viewport={'width': 1280, 'height': 900})
        check('el módulo está activo', page.evaluate('()=>!!window.drFichaFlip'))
        for n in (1, 5, 9):       # varias fichas seguidas
            bring(page, n)
            btn = page.locator('button[data-ficha]').nth(n)
            btn.click(); page.wait_for_selector(DLG + '[open]')
            page.wait_for_timeout(1700)
            y0 = page.evaluate('pageYOffset')   # scroll con la ficha abierta (el clic de Playwright puede haberlo ajustado antes)
            st = clean_state(page)
            check(f'ficha {n}: estado limpio tras abrir', st['ok'], str(st))
            title = page.locator(DLG + ' #fi-ttl').inner_text()
            check(f'ficha {n}: contenido correcto', len(title) > 3, title)
            page.locator(DLG + ' .fi-x').click()
            ms = wait_closed(page)
            check(f'ficha {n}: cierra con el botón', ms is not None, f'{ms} ms')
            page.wait_for_timeout(150)
            check(f'ficha {n}: foco vuelve al botón', page.evaluate('n=>document.activeElement===document.querySelectorAll("button[data-ficha]")[n]', n))
            # El navegador puede reubicar el scroll al devolver el foco de un <dialog> nativo (varía con la posición del botón): lo que importa es que la tarjeta de origen quede a la vista.
            check(f'ficha {n}: la tarjeta de origen queda a la vista', page.evaluate('n=>{var r=document.querySelectorAll("button[data-ficha]")[n].getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}', n), f'{y0}→{page.evaluate("pageYOffset")}')
            check(f'ficha {n}: has-dlg quitado', not page.evaluate('document.documentElement.classList.contains("has-dlg")'))
            check(f'ficha {n}: sin residuos al cerrar', clean_state(page)['ok'], str(clean_state(page)))

        # Escape
        bring(page, 3); page.locator('button[data-ficha]').nth(3).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
        page.keyboard.press('Escape'); ms = wait_closed(page)
        check('Escape cierra', ms is not None, f'{ms} ms')
        # fondo (clic en el backdrop)
        page.locator('button[data-ficha]').nth(3).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
        page.mouse.click(8, 450); ms = wait_closed(page)
        check('clic en el fondo cierra', ms is not None, f'{ms} ms')

        # interrupciones
        page.locator('button[data-ficha]').nth(3).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(120)
        page.keyboard.press('Escape'); ms = wait_closed(page)
        check('Escape en pleno movimiento de apertura cierra', ms is not None, f'{ms} ms')
        page.wait_for_timeout(80)   # el evento «close» (que limpia) se despacha un instante después de quitarse [open]
        check('sin residuos tras interrupción', clean_state(page)['ok'], str(clean_state(page)))
        page.locator('button[data-ficha]').nth(4).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(200)
        page.keyboard.press('Escape'); page.keyboard.press('Escape'); page.keyboard.press('Escape')
        ms = wait_closed(page)
        check('Escape repetido no bloquea', ms is not None, f'{ms} ms')
        for k in range(4):        # abrir/cerrar a ráfagas
            page.locator('button[data-ficha]').nth(4).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(60 + 40 * k)
            page.locator(DLG + ' .fi-x').click(); wait_closed(page)
        page.locator('button[data-ficha]').nth(4).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
        st = clean_state(page)
        check('tras ráfagas la ficha abre limpia y completa', st['ok'] and page.locator(DLG + ' .fi-t img').count() > 1, str(st))
        # galería y botones siguen vivos
        before = page.evaluate("()=>document.querySelector('dialog.ficha .fi-t').scrollLeft")
        page.locator(DLG + ' .fi-next').click(); page.wait_for_timeout(700)
        check('galería: siguiente foto funciona', page.evaluate("()=>document.querySelector('dialog.ficha .fi-t').scrollLeft") > before)
        # con otra foto visible el cierre no vuela la foto 1 (cierre simple) y cierra igual
        page.locator(DLG + ' .fi-x').click(); ms = wait_closed(page)
        check('cierra con la galería en otra foto', ms is not None, f'{ms} ms')

        # enlace interno: «Ver horarios y mapa» cierra y navega
        page.locator('button[data-ficha]').nth(4).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
        link = page.locator(DLG + ' a[href="#horarios"]')
        if link.count():
            link.first.click(); ms = wait_closed(page)
            check('enlace «#horarios» cierra la ficha', ms is not None, f'{ms} ms')
            page.wait_for_timeout(500)
            check('el enlace llevó a la sección', page.evaluate("()=>{var e=document.querySelector('#horarios');var r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}"))

        bring(page, 4); page.locator('button[data-ficha]').nth(4).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)

        # «Otras unidades»: otra ficha con la ficha ya abierta no vuelve a abrirse desde la tarjeta
        if page.locator(DLG + ' .fi-sim-v').count():
            sw = page.evaluate("""()=>new Promise(res=>{var d=document.querySelector('dialog.ficha'),t0=performance.now(),w={op:1,moved:false,ghost:false},tt=d.querySelector('#fi-ttl').textContent;
              d.querySelector('.fi-sim-v').click();
              (function f(){var cs=getComputedStyle(d);w.op=Math.min(w.op,parseFloat(cs.opacity));if(cs.transform!=='none')w.moved=true;
                if(document.querySelector('[popover]:popover-open'))w.ghost=true;
                if(performance.now()-t0<450)requestAnimationFrame(f);else{w.changed=d.querySelector('#fi-ttl').textContent!==tt;res(w)}})()})""")
            check('otra unidad: cambia la ficha', sw['changed'], str(sw))
            check('otra unidad: el cuadro no se mueve ni se desvanece', sw['op'] > 0.99 and not sw['moved'] and not sw['ghost'], str(sw))
            page.wait_for_timeout(1200)
            check('otra unidad: queda limpia', clean_state(page)['ok'], str(clean_state(page)))
            page.locator(DLG + ' .fi-x').click(); ms = wait_closed(page)
            page.wait_for_timeout(150)
            check('otra unidad: cierra y el foco vuelve a la tarjeta original', ms is not None and page.evaluate('()=>document.activeElement===document.querySelectorAll("button[data-ficha]")[4]'), f'{ms} ms')
            check('otra unidad: sin residuos al cerrar', clean_state(page)['ok'], str(clean_state(page)))
        else:
            page.locator(DLG + ' .fi-x').click(); wait_closed(page)

        # hero
        page.evaluate('scrollTo(0,0)'); page.wait_for_timeout(500)
        # la cadena del hero se mueve sola y tiene copias decorativas (aria-hidden) fuera de pantalla: se usa el botón real con foco + Enter, como en e2e-t1
        hero = page.locator('.hero-chain-track > figure:not([aria-hidden="true"]) button[data-hero-unit]').first
        if hero.count():
            hero.focus(); page.keyboard.press('Enter'); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
            check('hero abre ficha y queda limpia', clean_state(page)['ok'], str(clean_state(page)))
            page.locator(DLG + ' .fi-x').click(); ms = wait_closed(page)
            check('hero: cierra', ms is not None, f'{ms} ms')

        # tarjeta que ya no está disponible al cerrar (se oculta mientras la ficha está abierta)
        bring(page, 6); page.locator('button[data-ficha]').nth(6).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
        page.evaluate("document.querySelectorAll('li.car')[6].style.transform='translateY(6000px)'")
        page.locator(DLG + ' .fi-x').click(); ms = wait_closed(page)
        check('origen oculto: cierre alternativo seguro', ms is not None and clean_state(page)['ok'], f'{ms} ms')
        page.evaluate("document.querySelectorAll('li.car')[6].style.transform=''")
        check('sin errores de consola (escritorio)', not errors, str(errors))
        ctx.close()

        # ---------- móvil ----------
        ctx, page, errors = load(browser, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        bring(page, 2); page.locator('button[data-ficha]').nth(2).tap(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1700)
        check('móvil: abre y queda limpia', clean_state(page)['ok'], str(clean_state(page)))
        check('móvil: sin desbordes horizontales', page.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"))
        page.locator(DLG + ' .fi-x').tap(); ms = wait_closed(page)
        check('móvil: cierra', ms is not None, f'{ms} ms')
        check('sin errores de consola (móvil)', not errors, str(errors))
        ctx.close()

        # ---------- reduced motion ----------
        ctx, page, errors = load(browser, viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
        bring(page, 2)
        page.evaluate("()=>{window.__n=0;var o=Element.prototype.animate;Element.prototype.animate=function(){window.__n++;return o.apply(this,arguments)}}")
        page.locator('button[data-ficha]').nth(2).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(300)
        check('reduced-motion: el módulo no crea animaciones', page.evaluate('window.__n') == 0, str(page.evaluate('window.__n')))
        page.keyboard.press('Escape'); ms = wait_closed(page, 600)
        check('reduced-motion: Escape cierra al instante', ms is not None and ms < 300, f'{ms} ms')
        ctx.close()

        # ---------- gama baja declarada: ascenso breve, sin fantasma ----------
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}); page = ctx.new_page()
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script("Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2})")
        for _ in range(40):
            try: page.goto(URL, wait_until='load', timeout=3000); break
            except Exception: time.sleep(.25)
        page.wait_for_timeout(700); bring(page, 2)
        page.locator('button[data-ficha]').nth(2).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(1200)
        check('gama baja: abre limpia y sin fantasma', clean_state(page)['ok'] and page.evaluate('()=>!document.querySelector("[popover]")'), str(clean_state(page)))
        page.locator(DLG + ' .fi-x').click(); ms = wait_closed(page)
        check('gama baja: cierra', ms is not None and not errors, f'{ms} ms {errors}')
        ctx.close()

        # ---------- degradación: el módulo no carga ----------
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}); page = ctx.new_page()
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/js/ficha-flip.js*', lambda r: r.abort())
        for _ in range(40):
            try: page.goto(URL, wait_until='load', timeout=3000); break
            except Exception: time.sleep(.25)
        page.wait_for_timeout(700); bring(page, 2)
        page.locator('button[data-ficha]').nth(2).click(); page.wait_for_selector(DLG + '[open]'); page.wait_for_timeout(500)
        page.locator(DLG + ' .fi-x').click(); ms = wait_closed(page, 800)
        check('sin ficha-flip.js la ficha abre y cierra como antes', ms is not None and not errors, f'{ms} ms {errors}')
        ctx.close()
        browser.close()
finally:
    proc.terminate()

bad = [r for r in results if not r[1]]
print(f'\n{len(results) - len(bad)}/{len(results)} comprobaciones OK')
raise SystemExit(1 if bad else 0)
