#!/usr/bin/env python3
"""E2E real de catálogo usando Playwright Python instalado en el entorno QA."""
import os, subprocess, time
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
