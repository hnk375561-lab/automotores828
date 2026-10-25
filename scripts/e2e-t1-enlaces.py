#!/usr/bin/env python3
"""E2E de T1 · fichas con enlace propio (#unidad=<id>) y navegación Atrás/Adelante coherente.
Usa Chromium headless (Playwright Python) contra scripts/serve.mjs. Comprueba el estado real de la interfaz
(diálogo abierto, unidad correcta, URL, longitud del historial), no solo el texto de la URL."""
import json, os, subprocess, sys, time, traceback
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8190'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
BY_ID = {str(u['id']): u for u in UNITS}
IDS = [str(u['id']) for u in UNITS]
FAILS, PASSED = [], []

def check(cond, msg):
    if not cond:
        raise AssertionError(msg)

def new_page(ctx, errors, reduced=True, w=1280, h=900):
    page = ctx.new_page()
    page.set_viewport_size({'width': w, 'height': h})
    page.emulate_media(reduced_motion='reduce' if reduced else 'no-preference')
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)  # los recursos externos (fuentes, mapas) no cargan sin red
    return page

def go(page, path=''):
    for _ in range(40):
        try:
            page.goto(BASE + path, wait_until='load', timeout=5000); break
        except Exception:
            time.sleep(.25)
    page.wait_for_selector('button[data-ficha]', state='attached', timeout=8000)
    page.wait_for_function("() => !!document.querySelector('.tools:not([hidden]), [data-tools]:not([hidden])') || !!document.querySelector('[data-share]:not([hidden])')", timeout=8000)

def snap(page):
    return page.evaluate("""() => ({
      hash: location.hash, search: location.search, path: location.pathname, len: history.length,
      open: !!document.querySelector('dialog.ficha[open]'), nOpen: document.querySelectorAll('dialog[open]').length,
      nDlg: document.querySelectorAll('dialog.ficha').length,
      title: (document.querySelector('dialog.ficha[open] #fi-ttl') || {}).textContent || '',
      overflow: document.documentElement.scrollWidth - window.innerWidth })""")

def open_state(page, uid):
    unit = BY_ID[uid]
    page.wait_for_function("() => !!document.querySelector('dialog.ficha[open]')", timeout=6000)
    page.wait_for_function("(t) => (document.querySelector('dialog.ficha[open] #fi-ttl')||{}).textContent && document.querySelector('dialog.ficha[open] #fi-ttl').textContent.toLowerCase().includes(t)", arg=str(unit['modelo']).lower().split()[0], timeout=6000)
    s = snap(page)
    ttl = s['title'].strip().lower()
    check(ttl == str(unit['modeloTxt']).lower() or ttl in str(unit['titulo']).lower(), f"la ficha abierta no es la unidad {uid}: {s['title']!r}")
    check(s['hash'] == '#unidad=' + uid, f"hash {s['hash']!r} != unidad {uid}")
    return s

def closed_state(page, expect_hash=''):
    page.wait_for_function("() => !document.querySelector('dialog.ficha[open]')", timeout=6000)
    page.wait_for_function("(h) => location.hash === h", arg=expect_hash, timeout=4000)
    s = snap(page)
    check(s['nOpen'] == 0, 'quedó un diálogo abierto')
    return s

def settle(page, ms=450):
    page.wait_for_timeout(ms)

def card_ids(page, n=4):
    return page.evaluate("(n) => Array.from(document.querySelectorAll('li.car[data-i] button[data-ficha]')).slice(0, n).map(b => +b.getAttribute('data-ficha'))", n)

def click_card(page, k=0):
    b = page.locator('button[data-ficha]').nth(k)
    idx = int(b.get_attribute('data-ficha'))
    b.click()
    return IDS[idx]

def run(name, fn):
    t = time.time()
    try:
        fn()
        PASSED.append(name); print(f'  ✓ {name} ({time.time()-t:.1f}s)')
    except Exception as e:
        FAILS.append((name, e)); print(f'  ✗ {name}: {e}'); traceback.print_exc(limit=2)

def main(browser):
    ctx = browser.new_context(permissions=['clipboard-read', 'clipboard-write'])
    errors = []

    def t_apertura_atras_adelante():
        p = new_page(ctx, errors); go(p)
        l0 = snap(p)['len']; check(snap(p)['hash'] == '', 'la página arranca con un fragmento')
        uid = click_card(p, 0); s = open_state(p, uid)
        check(s['len'] == l0 + 1, f"abrir debe crear una entrada: {l0}→{s['len']}")
        check(s['nOpen'] == 1 and s['nDlg'] == 1, 'más de un diálogo abierto o creado')
        p.go_back(); s = closed_state(p); settle(p)
        s = closed_state(p); check(s['path'] == '/' and s['hash'] == '', 'Atrás no dejó el catálogo')
        check(not snap(p)['open'], 'la ficha se reabrió sola tras Atrás')
        p.go_forward(); open_state(p, uid)
        p.go_back(); closed_state(p)
        p.close()

    def t_cerrar_manual_y_diez_ciclos():
        p = new_page(ctx, errors); go(p)
        l0 = snap(p)['len']
        for k in range(10):
            uid = click_card(p, k % 3); open_state(p, uid)
            if k % 2: p.keyboard.press('Escape')
            else: p.locator('dialog.ficha button[aria-label*=Cerrar]').click()
            closed_state(p); settle(p, 120)
        s = snap(p)
        check(s['len'] <= l0 + 1, f"el historial acumuló entradas: {l0}→{s['len']}")
        uid = click_card(p, 1); open_state(p, uid); p.go_back(); closed_state(p)
        p.close()

    def t_apertura_directa_y_recarga():
        for uid in (IDS[0], IDS[17], IDS[-1]):
            p = new_page(ctx, errors); go(p, '#unidad=' + uid)
            l0 = snap(p)['len']
            open_state(p, uid)
            p.reload(); p.wait_for_selector('button[data-ficha]', state='attached'); open_state(p, uid)
            check(snap(p)['nDlg'] == 1, 'recarga: más de un diálogo')
            check(snap(p)['len'] == l0, 'recarga: el historial cambió')
            p.locator('dialog.ficha button[aria-label*=Cerrar]').click()
            s = closed_state(p); check(s['len'] <= l0, 'cerrar un enlace directo no debe sumar entradas')
            p.close()

    def t_enlace_invalido():
        for bad in ('999', 'abc%20def', '', '%E0%A4%A'):
            p = new_page(ctx, errors); go(p, '#unidad=' + bad)
            p.wait_for_selector('.toast.on', timeout=6000)
            txt = p.locator('.toast.on').inner_text(); check('No encontramos esa unidad' in txt, f'aviso ausente: {txt!r}')
            s = closed_state(p); check(s['hash'] == '', f"el fragmento inválido no se normalizó: {s['hash']!r}")
            uid = click_card(p, 0); open_state(p, uid); p.keyboard.press('Escape'); closed_state(p)
            p.close()

    def t_filtros_conservados():
        mk = UNITS[0]['marca']
        p = new_page(ctx, errors); go(p, '?q=' + quote(mk))
        q0 = snap(p)['search']; check('q=' in q0, 'el filtro no está en la URL')
        uid = click_card(p, 0); s = open_state(p, uid)
        check(s['search'] == q0, f"abrir la ficha alteró la query: {q0!r} → {s['search']!r}")
        p.go_back(); s = closed_state(p); check(s['search'] == q0, 'Atrás alteró la query')
        uid = click_card(p, 0); open_state(p, uid); p.keyboard.press('Escape'); s = closed_state(p)
        check(s['search'] == q0, 'cerrar alteró la query')
        p.close()

    def t_galeria_anidada():
        p = new_page(ctx, errors); go(p)
        uid = click_card(p, 0); open_state(p, uid); l0 = snap(p)['len']
        p.locator('dialog.ficha .fi-zoom').click()
        p.wait_for_function("() => window.drGaleriaVisor && window.drGaleriaVisor.isOpen()")
        check(snap(p)['len'] == l0, 'el visor creó una entrada de historial')
        p.keyboard.press('Escape')
        p.wait_for_function("() => !window.drGaleriaVisor.isOpen()")
        s = open_state(p, uid); check(s['len'] == l0, 'cerrar el visor tocó el historial')
        p.locator('dialog.ficha .fi-zoom').click(); p.wait_for_function("() => window.drGaleriaVisor.isOpen()")
        p.go_back(); p.wait_for_function("() => !window.drGaleriaVisor.isOpen()"); settle(p)
        s = open_state(p, uid); check(s['len'] == l0, 'Atrás con el visor abierto cambió la longitud')
        p.go_back(); closed_state(p)
        p.close()

    def t_compartir_copiar():
        p = new_page(ctx, errors); go(p)
        uid = click_card(p, 2); open_state(p, uid)
        p.locator('dialog.ficha').get_by_role('button', name='Copiar enlace').click()
        p.wait_for_timeout(300)
        url = p.evaluate('navigator.clipboard.readText()')
        check(url == BASE.rstrip('/') + '/#unidad=' + uid, f'enlace copiado incorrecto: {url!r}')
        q = new_page(ctx, errors); q.goto(url); q.wait_for_selector('button[data-ficha]', state='attached'); open_state(q, uid)
        q.close(); p.close()

    def t_hero():
        p = new_page(ctx, errors); go(p)
        b = p.locator('.hero-chain-track > figure:not([aria-hidden="true"]) button[data-hero-unit]').first
        if b.count():
            uid = b.get_attribute('data-hero-unit'); b.focus(); p.keyboard.press('Enter'); open_state(p, uid)
            p.go_back(); closed_state(p)
        p.close()

    def t_otras_unidades():
        p = new_page(ctx, errors); go(p)
        uid = click_card(p, 0); open_state(p, uid); l0 = snap(p)['len']
        sim = p.locator('dialog.ficha .fi-sim-v')
        if sim.count():
            sim.first.click(); p.wait_for_function("(u) => location.hash !== '#unidad=' + u", arg=uid)
            s = snap(p); nid = s['hash'].split('=')[1]; check(nid in BY_ID and nid != uid, 'otra unidad con id inválido')
            check(s['len'] == l0, 'cambiar de unidad con la ficha abierta sumó una entrada'); settle(p, 500)
            open_state(p, nid); p.go_back(); closed_state(p)
        p.close()

    def t_interacciones_rapidas():
        p = new_page(ctx, errors); go(p); l0 = snap(p)['len']
        for k in range(8):
            p.evaluate("(i) => document.querySelectorAll('button[data-ficha]')[i].click()", k % 3)
            p.wait_for_timeout(40)
            p.evaluate("() => history.back()"); p.wait_for_timeout(40)
            p.evaluate("() => history.forward()"); p.wait_for_timeout(40)
            p.evaluate("() => history.back()"); p.wait_for_timeout(60)
        p.wait_for_timeout(900)
        s = snap(p); h = s['hash']
        check(s['nOpen'] <= 1 and s['nDlg'] <= 1, 'diálogos duplicados')
        check((h == '') == (not s['open']), f"URL y ficha desincronizadas: hash={h!r} abierta={s['open']}")
        if s['open']: p.keyboard.press('Escape'); settle(p, 700)
        s = snap(p); check(s['nOpen'] == 0 and s['hash'] == '', f'no quedó limpio: {s}')
        check(s['len'] <= l0 + 1, f"historial acumulado tras ráfaga: {l0}→{s['len']}")
        uid = click_card(p, 0); open_state(p, uid); p.keyboard.press('Escape'); closed_state(p)
        # doble clic sobre una tarjeta
        b = p.locator('button[data-ficha]').nth(1); b.dblclick(); settle(p, 500)
        s = snap(p); check(s['nOpen'] <= 1 and s['len'] <= l0 + 2, 'doble clic duplicó aperturas'); 
        if s['open']: p.keyboard.press('Escape'); closed_state(p)
        p.close()

    def t_animado_y_movil():
        for (w, h) in ((390, 844), (768, 1024), (1280, 900)):
            p = new_page(ctx, errors, reduced=False, w=w, h=h); go(p)
            uid = click_card(p, 0); s = open_state(p, uid); settle(p, 700)
            check(snap(p)['overflow'] <= 0, f'desbordamiento horizontal a {w}px')
            p.go_back(); closed_state(p); settle(p, 400)
            check(snap(p)['overflow'] <= 0, f'desbordamiento tras cerrar a {w}px')
            uid = click_card(p, 1); open_state(p, uid); p.locator('dialog.ficha button[aria-label*=Cerrar]').click(); closed_state(p)
            p.go_forward(); settle(p, 300)
            p.close()

    def t_foco():
        p = new_page(ctx, errors); go(p)
        b = p.locator('button[data-ficha]').first; b.focus(); p.keyboard.press('Enter')
        p.wait_for_function("() => !!document.querySelector('dialog.ficha[open]')")
        check(p.evaluate("() => !!document.activeElement.closest('dialog.ficha')"), 'el foco no entró en la ficha')
        p.go_back(); closed_state(p); settle(p)
        check(p.evaluate("() => document.activeElement.hasAttribute('data-ficha')"), 'el foco no volvió a la tarjeta tras Atrás')
        p.close()
        q = new_page(ctx, errors); go(q, '#unidad=' + IDS[0]); open_state(q, IDS[0])
        q.keyboard.press('Escape'); closed_state(q); settle(q)
        check(q.evaluate("() => document.activeElement.hasAttribute('data-ficha') || document.activeElement === document.body"), 'foco incoherente tras cerrar enlace directo')
        q.close()

    def t_sin_listeners_duplicados():
        p = new_page(ctx, errors); go(p)
        n = p.evaluate("""() => { let c = 0; const f = window.addEventListener; return 0; }""")
        uid = click_card(p, 0); open_state(p, uid); p.keyboard.press('Escape'); closed_state(p)
        for _ in range(3):
            uid = click_card(p, 0); open_state(p, uid); p.go_back(); closed_state(p)
        check(snap(p)['nDlg'] == 1, 'se creó más de un diálogo de ficha')
        p.close()

    def t_ancla_desde_ficha():
        # Con movimiento reducido el cierre es inmediato: la ficha deshace su entrada y el ancla queda sobre el catálogo.
        p = new_page(ctx, errors); go(p)
        uid = click_card(p, 0); open_state(p, uid); l0 = snap(p)['len']
        p.locator('dialog.ficha').get_by_role('link', name='Tasar mi usado').click()
        p.wait_for_function("() => !document.querySelector('dialog.ficha[open]') && location.hash === '#tu-usado'", timeout=6000); settle(p, 700)
        s = snap(p); check(s['len'] == l0, f"el ancla dejó una entrada de ficha huérfana: {l0}→{s['len']}")
        p.go_back(); s = closed_state(p); check(s['path'] == '/', 'Atrás desde el ancla abandonó el sitio')
        p.close()
        # Con animación el ancla llega antes del cierre: Atrás vuelve a la ficha o al catálogo, siempre dentro del sitio y coherente.
        q = new_page(ctx, errors, reduced=False); go(q)
        uid = click_card(q, 0); open_state(q, uid)
        q.locator('dialog.ficha').get_by_role('link', name='Tasar mi usado').click()
        q.wait_for_function("() => !document.querySelector('dialog.ficha[open]') && location.hash === '#tu-usado'", timeout=6000); settle(q, 700)
        q.go_back(); settle(q, 700)
        s = snap(q); check(s['path'] == '/' and s['hash'] in ('', '#unidad=' + uid), f"estado inesperado tras Atrás: {s['hash']!r}")
        check((s['hash'] == '') == (not s['open']), 'URL y ficha desincronizadas tras Atrás')
        q.close()

    def t_ancla_horarios_y_enlace_directo():
        # «Ver horarios y mapa» se comporta igual que «Tasar mi usado»: el ancla reemplaza a la ficha, sin entrada huérfana.
        p = new_page(ctx, errors); go(p)
        uid = click_card(p, 0); open_state(p, uid); l0 = snap(p)['len']
        lk = p.locator('dialog.ficha').get_by_role('link', name='Ver horarios y mapa')
        check(lk.count() == 1, 'no está el enlace «Ver horarios y mapa» en la ficha')
        lk.click()
        p.wait_for_function("() => !document.querySelector('dialog.ficha[open]') && location.hash === '#horarios'", timeout=6000); settle(p, 700)
        s = snap(p); check(s['len'] == l0, f"«Ver horarios y mapa» dejó una entrada huérfana: {l0}→{s['len']}")
        check(s['nOpen'] == 0 and s['nDlg'] == 1, 'quedó un diálogo abierto o duplicado')
        p.go_back(); s = closed_state(p); check(s['path'] == '/', 'Atrás desde #horarios abandonó el sitio')
        p.close()
        # Ficha abierta por enlace directo (la entrada no la creó la ficha): el ancla navega de forma nativa y Atrás no abandona el sitio.
        q = new_page(ctx, errors); go(q, '#unidad=' + IDS[0]); open_state(q, IDS[0])
        q.locator('dialog.ficha').get_by_role('link', name='Tasar mi usado').click()
        q.wait_for_function("() => !document.querySelector('dialog.ficha[open]') && location.hash === '#tu-usado'", timeout=6000); settle(q, 700)
        s = snap(q); check(s['nOpen'] == 0 and s['nDlg'] == 1, 'quedó un diálogo abierto o duplicado tras el ancla (enlace directo)')
        q.go_back(); settle(q, 700)
        s = snap(q); check(s['path'] == '/', 'Atrás tras ancla (enlace directo) abandonó el sitio')
        check((s['hash'] == '') == (not s['open']), 'URL y ficha desincronizadas tras Atrás (enlace directo)')
        q.close()

    print('E2E T1 · enlaces propios y navegación Atrás')
    for name, fn in [('apertura, Atrás y Adelante', t_apertura_atras_adelante), ('cierre manual + 10 ciclos sin acumular', t_cerrar_manual_y_diez_ciclos),
                     ('apertura directa y recarga', t_apertura_directa_y_recarga), ('identificador inválido', t_enlace_invalido),
                     ('filtros conservados', t_filtros_conservados), ('galería anidada', t_galeria_anidada), ('compartir / copiar enlace', t_compartir_copiar),
                     ('hero abre la misma ficha con URL', t_hero), ('cambio de unidad con la ficha abierta', t_otras_unidades),
                     ('interacciones rápidas', t_interacciones_rapidas), ('con animación, 390/768/1280 px', t_animado_y_movil),
                     ('ancla de la ficha y Atrás', t_ancla_desde_ficha), ('ancla a horarios y enlace directo', t_ancla_horarios_y_enlace_directo), ('foco', t_foco), ('un solo diálogo', t_sin_listeners_duplicados)]:
        run(name, fn)
    ctx.close()
    check(not errors, 'errores de consola: ' + ' | '.join(errors[:5]))

proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(headless=True)
        try: main(br)
        except AssertionError as e: FAILS.append(('consola', e)); print('  ✗', e)
        br.close()
finally:
    proc.terminate()
print(f'\n{len(PASSED)} OK, {len(FAILS)} con fallos')
sys.exit(1 if FAILS else 0)
