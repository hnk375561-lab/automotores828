#!/usr/bin/env python3
"""E2E de T4 · «Mi selección»: favoritos como única fuente, comparar con 2, visita con 1 a 3 unidades por WhatsApp,
vaciar, volver al catálogo, unidad inexistente descartada y sin desbordamiento a 390/768/1280 px."""
import json, os, subprocess, time, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8194'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
FAILS, PASSED = [], []
FAV = 'automotores828:favoritos'

def check(c, m):
    if not c: raise AssertionError(m)
def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def abrir(ctx, errors, favs=None, w=1280, h=900):
    pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    if favs is not None:
        pg.add_init_script(f"try{{localStorage.setItem('{FAV}', JSON.stringify({json.dumps(favs)}))}}catch(e){{}}")
    pg.goto(BASE, wait_until='load')
    pg.wait_for_selector('#cars .car-ph, #cars li', timeout=10000)
    return pg
def ids(n): return [str(u['id']) for u in UNITS if not u.get('vendida')][:n]
def wa_texto(pg):
    href = pg.get_attribute('.mi-sel-a a', 'href')
    return urllib.parse.unquote(href.split('?text=')[1])

def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context()
        def t_oculto_sin_favoritos():
            pg = abrir(ctx, errors, []); check(pg.evaluate("() => document.querySelector('.mi-sel').hidden"), 'sin favoritos el panel no debe verse'); pg.close()
        def t_una_unidad_mismo_texto():
            f = ids(1); pg = abrir(ctx, errors, f)
            pg.wait_for_selector('.mi-sel:not([hidden]) .mi-sel-a a', timeout=5000)
            esperado = pg.evaluate("(id) => { const a = window.drWaMensajes; const u = JSON.parse(document.querySelector('#cat-data').textContent); return null; }", f[0]) if False else None
            txt = wa_texto(pg)
            u = UNITS[0] if str(UNITS[0]['id']) == f[0] else next(x for x in UNITS if str(x['id']) == f[0])
            ref = pg.evaluate("(u) => window.drWaMensajes.mensaje(u, 'visita')", u)
            check(txt == ref, f'con 1 unidad el texto debe ser el de siempre: {txt!r} vs {ref!r}')
            check(pg.is_disabled('.mi-sel-a button:has-text("Comparar")'), 'comparar necesita exactamente 2'); pg.close()
        def t_dos_comparar():
            f = ids(2); pg = abrir(ctx, errors, f); pg.wait_for_selector('.mi-sel:not([hidden])')
            check(not pg.is_disabled('.mi-sel-a button:has-text("Comparar")'), 'con 2 se puede comparar')
            pg.click('.mi-sel-a button:has-text("Comparar")'); pg.wait_for_selector('dialog.cmp[open]', timeout=5000)
            check('2 de 2' in pg.inner_text('.tray-count'), 'el comparador debe tener las 2'); pg.close()
        def t_tres_visita():
            f = ids(3); pg = abrir(ctx, errors, f); pg.wait_for_selector('.mi-sel-a a', timeout=5000)
            txt = wa_texto(pg)
            check(txt.count('\n- ') == 3, f'el mensaje debe listar exactamente 3 unidades: {txt!r}')
            for i in f:
                u = next(x for x in UNITS if str(x['id']) == i)
                d = pg.evaluate("(u) => window.drWaMensajes.desc(u)", u); check(d in txt, f'falta {d!r}')
            pg.close()
        def t_cuatro_bloquea_visita():
            f = ids(4); pg = abrir(ctx, errors, f); pg.wait_for_selector('.mi-sel:not([hidden])')
            check(pg.locator('.mi-sel-a a').count() == 0 and pg.is_disabled('.mi-sel-a button:has-text("Coordinar")'), 'con 4 la visita queda bloqueada')
            check('hasta 3' in pg.inner_text('.mi-sel-h'), 'debe explicar el máximo'); pg.close()
        def t_sobrevive_filtro_y_orden():
            f = ids(2); pg = abrir(ctx, errors, f); pg.wait_for_selector('.mi-sel:not([hidden])')
            pg.select_option('#orden', index=1); pg.fill('#q', 'zzzz'); time.sleep(.4)
            check(pg.locator('.mi-sel-i').count() == 2, 'la selección debe sobrevivir a filtrar y ordenar'); pg.close()
        def t_quitar_vaciar_volver():
            f = ids(3); pg = abrir(ctx, errors, f); pg.wait_for_selector('.mi-sel:not([hidden])')
            pg.click('.mi-sel-q >> nth=0')
            check(pg.locator('.mi-sel-i').count() == 2, 'quitar una'); check('2 unidades' in pg.inner_text('.mi-sel-n'), 'anuncio actualizado')
            check(pg.evaluate("() => document.activeElement && document.activeElement.id") == 'mi-sel-t', 'el foco va al título del panel')
            pg.click('button:has-text("Volver al catálogo")'); check(pg.evaluate("() => !document.querySelector('.fx-fav').classList.contains('is-on')"), 'sale del modo favoritos')
            pg.click('button:has-text("Vaciar selección")')
            check(pg.evaluate("() => document.querySelector('.mi-sel').hidden"), 'vaciar oculta el panel')
            check(pg.evaluate("(k) => localStorage.getItem(k)", FAV) == '[]', 'vaciar limpia el almacenamiento'); pg.close()
        def t_inexistente():
            f = ids(1) + ['id-que-no-existe']; pg = abrir(ctx, errors, f); pg.wait_for_selector('.mi-sel:not([hidden])')
            check(pg.locator('.mi-sel-i').count() == 1, 'la unidad inexistente se descarta')
            check(json.loads(pg.evaluate("(k) => localStorage.getItem(k)", FAV)) == f[:1], 'queda guardada solo la válida')
            pg.wait_for_function("() => (document.querySelector('.toast')||{}).textContent && document.querySelector('.toast').textContent.includes('descartó')", timeout=4000); pg.close()
        def t_viewports():
            for w in (390, 768, 1280):
                pg = abrir(ctx, errors, ids(3), w=w, h=900 if w > 700 else 844); pg.wait_for_selector('.mi-sel:not([hidden])')
                ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth"); check(ov <= 0, f'desbordamiento {ov}px a {w}px')
                peq = pg.evaluate("() => [...document.querySelectorAll('.mi-sel button, .mi-sel a')].filter(e => e.getBoundingClientRect().height < 43.5).length")
                check(peq == 0, f'controles menores a 44 px a {w}px: {peq}'); pg.close()
        for n, fn in [('sin favoritos el panel no aparece', t_oculto_sin_favoritos), ('1 unidad: mismo texto de siempre', t_una_unidad_mismo_texto),
                      ('2 unidades: comparar', t_dos_comparar), ('3 unidades: mensaje con exactamente las 3', t_tres_visita),
                      ('4 unidades: visita bloqueada con aviso', t_cuatro_bloquea_visita), ('sobrevive a filtrar y ordenar', t_sobrevive_filtro_y_orden),
                      ('quitar, volver al catálogo y vaciar', t_quitar_vaciar_volver), ('unidad inexistente descartada con aviso', t_inexistente),
                      ('390/768/1280 px', t_viewports)]: run(n, fn)
        run('sin errores de consola', lambda: check(not errors, f'errores: {errors[:3]}'))
        b.close()
    print(f'\n{len(PASSED)} OK, {len(FAILS)} con fallos'); raise SystemExit(1 if FAILS else 0)

proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(1.5); main()
finally:
    proc.terminate()
