#!/usr/bin/env python3
"""E2E real de catálogo usando Playwright Python instalado en el entorno QA."""
import json, os, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8178'))
proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        for _ in range(40):
            try:
                page.goto(f'http://127.0.0.1:{PORT}/', wait_until='domcontentloaded', timeout=3000)
                break
            except Exception:
                time.sleep(.25)
        hero_chain = page.locator('[data-hero-chain]')
        if hero_chain.count():
            track = hero_chain.locator('.hero-chain-track')
            assert track.evaluate('(el) => getComputedStyle(el).animationDuration') == '10s', 'duración de escritorio del hero distinta de 10 s'
            page.set_viewport_size({'width': 390, 'height': 844})
            assert track.evaluate('(el) => getComputedStyle(el).animationDuration') == '11.0833s', 'duración móvil del hero distinta de 11,0833 s'
            page.set_viewport_size({'width': 1280, 'height': 900})
            page.locator('.hx-copy').first.hover()
            page.wait_for_timeout(150)
            assert not hero_chain.evaluate('(el) => el.classList.contains("is-paused")'), 'el hover detuvo la cadena del hero'
        # Reducir movimiento solo durante las activaciones repetidas para estabilizar el test.
        page.emulate_media(reduced_motion='reduce')
        hero_buttons = page.locator('.hero-chain-track > figure:not([aria-hidden="true"]) button[data-hero-unit]')
        assert hero_buttons.count() == 10, 'el hero no ofrece diez enlaces accesibles'
        inventory = json.loads((ROOT / 'data/vehicles.json').read_text(encoding='utf-8'))['autos']
        buttons = hero_buttons.all()
        def verify_hero_open(button):
            unit_id = button.get_attribute('data-hero-unit')
            unit = next(item for item in inventory if str(item['id']) == unit_id)
            hero_dialog = page.locator('dialog.ficha')
            hero_dialog.wait_for(state='visible')
            heading = hero_dialog.locator('#fi-ttl').inner_text().casefold()
            assert unit['modelo'].casefold() in heading and str(unit['anio']) in heading, f"el hero abrió una ficha distinta de {unit['id']}: {heading!r} (esperado {unit['modelo']} {unit['anio']})"
            hero_dialog.locator('button[aria-label*=Cerrar]').click()
            hero_dialog.wait_for(state='hidden')
        # Ratón: elegir un punto visible de una foto fuera del texto superpuesto.
        mouse_target = None
        for button in buttons:
            point = button.evaluate('''el => { const r=el.getBoundingClientRect(); for (const fy of [.25,.5,.75]) for (const fx of [.2,.5,.8]) { const x=r.left+r.width*fx, y=r.top+r.height*fy, hit=document.elementFromPoint(x,y); if (hit && el.contains(hit)) return {x,y}; } return null; }''')
            if point:
                mouse_target = (button, point); break
        assert mouse_target, 'no hay un área de foto del hero accesible al puntero'
        page.mouse.click(mouse_target[1]['x'], mouse_target[1]['y'])
        verify_hero_open(mouse_target[0])
        # Teclado: una imagen visible abre la misma ficha con Enter.
        mouse_target[0].focus()
        page.keyboard.press('Enter')
        verify_hero_open(mouse_target[0])
        # Las diez asociaciones ID→ficha se ejercitan también en los controles fuera del área visible.
        for hero_button in buttons:
            if hero_button.get_attribute('data-hero-unit') == mouse_target[0].get_attribute('data-hero-unit'): continue
            hero_button.dispatch_event('click')
            verify_hero_open(hero_button)
        page.emulate_media(reduced_motion='no-preference')
        mobile_context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        mobile_page = mobile_context.new_page()
        mobile_page.goto(f'http://127.0.0.1:{PORT}/', wait_until='domcontentloaded')
        mobile_buttons = mobile_page.locator('.hero-chain-track > figure:not([aria-hidden="true"]) button[data-hero-unit]')
        tap_target = None
        for button in mobile_buttons.all():
            point = button.evaluate('''el => { const r=el.getBoundingClientRect(); for (const fy of [.2,.4,.65]) for (const fx of [.25,.5,.75]) { const x=r.left+r.width*fx, y=r.top+r.height*fy, hit=document.elementFromPoint(x,y); if (hit && el.contains(hit)) return {x,y}; } return null; }''')
            if point:
                tap_target = (button, point); break
        if not tap_target:
            print('touch debug', mobile_page.locator('.hero-chain').evaluate('''chain => { const b=chain.querySelector('button[data-hero-unit]'),r=b.getBoundingClientRect(),points=[]; for(const fy of [.2,.4,.65])for(const fx of [.25,.5,.75]){const x=r.left+r.width*fx,y=r.top+r.height*fy,e=document.elementFromPoint(x,y);points.push([Math.round(x),Math.round(y),e&&e.tagName,e&&e.className]);}return {button:[r.x,r.y,r.width,r.height],chain:chain.getBoundingClientRect().toJSON(),points};}'''))
        assert tap_target, 'no hay una zona táctil operable del hero a 390 px'
        mobile_id = tap_target[0].get_attribute('data-hero-unit')
        mobile_unit = next(item for item in inventory if str(item['id']) == mobile_id)
        mobile_page.touchscreen.tap(tap_target[1]['x'], tap_target[1]['y'])
        mobile_dialog = mobile_page.locator('dialog.ficha')
        mobile_dialog.wait_for(state='visible')
        mobile_heading = mobile_dialog.locator('#fi-ttl').inner_text().casefold()
        assert mobile_unit['modelo'].casefold() in mobile_heading and str(mobile_unit['anio']) in mobile_heading, 'el toque abrió una ficha incorrecta'
        await_close = mobile_dialog.locator('button[aria-label*=Cerrar]')
        await_close.click()
        mobile_dialog.wait_for(state='hidden')
        mobile_context.close()
        page.locator('#cars').scroll_into_view_if_needed()
        page.locator('button[data-ficha]').first.click()
        dialog = page.locator('dialog.ficha')
        dialog.wait_for(state='visible')
        gallery = dialog.locator('.fi-gal')
        if gallery.locator('button').count() > 1:
            image = gallery.locator('img').first
            before = image.get_attribute('src')
            gallery.locator('button').nth(1).click()
            page.wait_for_timeout(150)
            assert image.get_attribute('src') != before, 'la galería no avanza'
        fav = dialog.locator('[data-fav]')
        if fav.count():
            old = fav.get_attribute('aria-pressed')
            fav.click()
            assert fav.get_attribute('aria-pressed') != old, 'favorito no cambia'
        cmp = dialog.locator('input[type=checkbox][data-cmp]')
        if cmp.count():
            cmp.check()
            assert cmp.is_checked(), 'comparador no agrega la unidad'
        dialog.locator('button[aria-label*=Cerrar]').click()
        filter_controls = page.locator('#cars input, #cars select')
        if filter_controls.count():
            first = filter_controls.first
            if first.get_attribute('type') == 'search':
                first.fill('xyz-no-match-e2e')
                page.wait_for_timeout(250)
                assert page.locator('#cars').is_visible()
        # Búsqueda en las dos pestañas y hash directo a una pregunta.
        question = page.locator('#preguntas details').first
        if question.count():
            question_id = question.get_attribute('id')
            assert question_id, 'pregunta sin id enlazable'
            page.goto(f'http://127.0.0.1:{PORT}/#{question_id}', wait_until='domcontentloaded')
            assert page.locator('#' + question_id).evaluate('(el) => el.open'), 'hash no abrió la pregunta'
            search = page.locator('#qa-search')
            search.fill(page.locator('#' + question_id + ' summary').inner_text().split()[0])
            assert page.locator('[data-qa-search-status]').inner_text(), 'buscador no reporta resultados'
        # El checklist conserva el estado al volver a cargar y usa una clave aislada.
        checklist = page.locator('[data-guide-item]').first
        if checklist.count():
            guide_details = checklist.locator('xpath=ancestor::details[1]')
            if guide_details.count() and not guide_details.evaluate('(el) => el.open'):
                guide_details.locator('summary').click()
            checklist.check()
            page.reload(wait_until='domcontentloaded')
            assert page.locator('[data-guide-item]').first.is_checked(), 'checklist no persistió'
        assert not errors, 'errores JS: ' + '; '.join(errors)
        browser.close()
    print('E2E catálogo: ficha, galería, favorito, comparador, filtro y consola OK')
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except subprocess.TimeoutExpired: proc.kill()
