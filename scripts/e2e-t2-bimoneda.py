#!/usr/bin/env python3
"""E2E de T2 · presupuesto bimoneda sin conversión. Chromium headless (Playwright) contra scripts/serve.mjs.
Verifica el estado real de la interfaz: moneda, opciones del rango, contador, lista visible, URL, orden y recarga."""
import json, os, re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8191'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
def monto(u, m):
    p = u.get('precio') or {}
    return p.get('monto') if p.get('moneda') == m else None
ARS = [u for u in UNITS if monto(u, 'ARS') is not None]
USD = [u for u in UNITS if monto(u, 'USD') is not None]
FAILS, PASSED = [], []

def check(c, m):
    if not c: raise AssertionError(m)

def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def new_page(ctx, errors, w=1280, h=900, qs=''):
    pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h})
    pg.emulate_media(reduced_motion='reduce')
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    for _ in range(40):
        try: pg.goto(BASE + qs, wait_until='load', timeout=6000); break
        except Exception: time.sleep(.25)
    pg.wait_for_selector('#f-moneda', state='attached', timeout=8000)
    if pg.evaluate("() => document.querySelector('#fx-body').hidden"): pg.click('.fx-tg')
    return pg

def rng(pg): return pg.locator('select[aria-label^="Precio"][aria-label$=": desde"]').first, pg.locator('select[aria-label^="Precio"][aria-label$=": hasta"]').first
def visibles(pg): return pg.evaluate("() => [...document.querySelectorAll('li.car')].filter(l => !l.hidden).map(l => +l.getAttribute('data-i'))")
def cuenta(pg): return pg.inner_text('#cuenta')
def total_ok(pg):
    m = re.search(r'(\d+) de (\d+)', cuenta(pg)); return int(m.group(1)) if m else int(re.search(r'(\d+)', cuenta(pg)).group(1))
def opts(sel): return [o.strip() for o in sel.locator('option').all_inner_texts()][1:]

def main(br):
    ctx = br.new_context(); errors = []
    def t_defecto():
        pg = new_page(ctx, errors); d, h = rng(pg)
        check(pg.input_value('#f-moneda') == '', 'por defecto la moneda debe ser «Todos»')
        check(pg.locator('legend', has_text='Ver precios en').count() == 1, 'falta el control «Ver precios en»')
        check(d.is_disabled() and h.is_disabled(), 'sin moneda elegida el rango debe estar deshabilitado (no se mezclan monedas)')
        check('Pesos' in pg.inner_text('#fg-precio-n') and 'no se convierten' in pg.inner_text('#fg-precio-n'), 'falta el aviso de que no hay conversión')
        check('58' in cuenta(pg), 'por defecto deben mostrarse las 58 unidades: ' + cuenta(pg))
        names = [o.strip() for o in pg.locator('#f-moneda option').all_inner_texts()]
        check(names[0] == 'Todos' and any(n.startswith('Pesos') for n in names) and any(n.startswith('Dólares') for n in names), f'opciones de moneda inesperadas: {names}')
        pg.close()
    def t_usd():
        pg = new_page(ctx, errors); pg.select_option('#f-moneda', 'USD'); d, h = rng(pg)
        check(d.is_enabled() and h.is_enabled(), 'con Dólares el rango debe habilitarse')
        o = opts(d); check(o and all(x.startswith('US$') for x in o), f'el rango en dólares solo debe ofrecer US$: {o}')
        check(min(int(x.replace('US$', '').replace('.', '').strip()) for x in o) <= min(monto(u, 'USD') for u in USD), 'el rango no cubre el mínimo USD')
        check(total_ok(pg) == len(USD) == len(visibles(pg)), f'contador y lista deben coincidir con las {len(USD)} unidades USD: {cuenta(pg)} / {len(visibles(pg))}')
        lo, hi = 6000, 12000
        d.select_option(str(lo)); h.select_option(str(hi))
        esp = [u for u in USD if lo <= monto(u, 'USD') <= hi]
        check(total_ok(pg) == len(esp) == len(visibles(pg)), f'rango USD {lo}-{hi}: esperado {len(esp)}, contador {cuenta(pg)}, lista {len(visibles(pg))}')
        check(set(visibles(pg)) == {u['i'] for u in esp}, 'la lista no contiene exactamente las unidades del rango USD')
        q = pg.evaluate("() => location.search"); check('moneda=USD' in q and f'precio_d={lo}' in q and f'precio_h={hi}' in q, 'estado no guardado en la URL: ' + q)
        pg.close()
    def t_cambio_a_pesos():
        pg = new_page(ctx, errors); pg.select_option('#f-moneda', 'USD'); d, h = rng(pg); d.select_option('6000')
        pg.select_option('#f-moneda', 'ARS')
        check(pg.input_value('select[aria-label="Precio en pesos: desde"]') == '', 'el rango USD no debe sobrevivir al cambio a pesos')
        check('Precio en dólares' in pg.inner_text('.fx-ajuste') and not pg.evaluate("() => document.querySelector('.fx-ajuste').hidden"), 'falta el aviso de que se quitó el rango en dólares')
        d, h = rng(pg); o = opts(d); check(o and all(x.startswith('$ ') for x in o), f'el rango en pesos solo debe ofrecer $: {o}')
        check(total_ok(pg) == len(ARS) and len(visibles(pg)) == min(len(ARS), 20), f'pesos: esperado {len(ARS)}, contador {cuenta(pg)}')
        d.select_option('10000000'); esp = [u for u in ARS if monto(u, 'ARS') >= 10000000]
        check(total_ok(pg) == len(esp) and len(visibles(pg)) == min(len(esp), 20), f'rango ARS: esperado {len(esp)}, contador {cuenta(pg)}')
        pg.close()
    def t_orden():
        pg = new_page(ctx, errors); pg.select_option('#f-moneda', 'USD'); pg.select_option('#orden', 'p-asc')
        esp = [u['i'] for u in sorted(USD, key=lambda u: (monto(u, 'USD'), u['i']))]
        check(visibles(pg)[:len(esp)] == esp or sorted(visibles(pg)) == sorted(esp), 'el orden por precio no coincide con los montos USD')
        dom = pg.evaluate("() => [...document.querySelectorAll('li.car')].filter(l => !l.hidden).map(l => +l.getAttribute('data-i'))")
        check(dom == esp, f'orden por precio en USD incorrecto: {dom[:5]} vs {esp[:5]}')
        pg.select_option('#orden', 'p-desc'); dom = visibles(pg); desc = [u['i'] for u in sorted(USD, key=lambda u: (-monto(u, 'USD'), u['i']))]; check(dom == desc, 'orden descendente en USD incorrecto')
        pg.close()
    def t_url_y_recarga():
        pg = new_page(ctx, errors, qs='?moneda=USD&precio_d=6000&precio_h=12000'); d, h = rng(pg)
        check(pg.input_value('#f-moneda') == 'USD' and d.input_value() == '6000' and h.input_value() == '12000', 'la URL no restauró moneda y rango')
        esp = [u for u in USD if 6000 <= monto(u, 'USD') <= 12000]; check(total_ok(pg) == len(esp), 'recuento tras recarga incorrecto')
        pg.reload(wait_until='load'); pg.wait_for_selector('#f-moneda', state='attached'); check(pg.input_value('#f-moneda') == 'USD', 'recarga perdió la moneda')
        pg.close()
        pg = new_page(ctx, errors, qs='?precio_d=6000&precio_h=12000'); d, h = rng(pg)
        check(d.input_value() == '' and total_ok(pg) == len(UNITS), 'un rango sin moneda en la URL debe descartarse (no se asume ARS)')
        pg.close()
        pg = new_page(ctx, errors, qs='?moneda=USD&precio_d=1234'); d, h = rng(pg)
        check(d.input_value() == '', 'un valor de rango inexistente debe descartarse')
        pg.close()
    def t_limpiar_y_etiquetas():
        pg = new_page(ctx, errors); pg.select_option('#f-moneda', 'USD'); rng(pg)[0].select_option('6000')
        tags = [t.strip() for t in pg.locator('.fx-tags .tag').all_inner_texts()]
        check('Ver precios en: Dólares' in tags and any(t.startswith('Precio en dólares: desde US$') for t in tags), f'etiquetas activas inesperadas: {tags}')
        pg.locator('.fx-tags .tag', has_text='Ver precios en').click()
        check(pg.input_value('#f-moneda') == '' and rng(pg)[0].is_disabled() and total_ok(pg) == len(UNITS), 'quitar la moneda debe devolver a «Todos» y limpiar el rango')
        pg.select_option('#f-moneda', 'ARS'); pg.click('#limpiar'); check(pg.input_value('#f-moneda') == '' and '58' in cuenta(pg), 'Limpiar filtros no restauró todo')
        pg.close()
    def t_combinado():
        pg = new_page(ctx, errors); pg.select_option('#f-moneda', 'USD')
        marca = USD[0]['marca']; pg.locator('.chip', has_text=marca).first.click()
        esp = [u for u in USD if u['marca'] == marca]; check(total_ok(pg) == len(esp), f'moneda + marca: esperado {len(esp)}, contador {cuenta(pg)}')
        pg.close()
    def t_teclado_y_movil():
        pg = new_page(ctx, errors); pg.focus('#f-moneda'); pg.keyboard.press('ArrowDown'); pg.keyboard.press('ArrowDown')
        check(pg.input_value('#f-moneda') in ('ARS', 'USD'), 'el selector de moneda no responde al teclado')
        pg.close()
        for w in (390, 768, 1280):
            pg = new_page(ctx, errors, w=w); pg.select_option('#f-moneda', 'USD')
            ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth"); check(ov <= 0, f'desbordamiento horizontal de {ov}px a {w}px')
            pg.close()
    print('E2E T2 · presupuesto bimoneda sin conversión')
    for n, f in [('estado inicial', t_defecto), ('dólares: rango, contador y lista', t_usd), ('cambio de moneda limpia el rango', t_cambio_a_pesos),
                 ('orden por precio por moneda', t_orden), ('URL y recarga', t_url_y_recarga), ('etiquetas, quitar y limpiar', t_limpiar_y_etiquetas),
                 ('combinado con otro filtro', t_combinado), ('teclado y 390/768/1280 px', t_teclado_y_movil)]: run(n, f)
    ctx.close(); check(not errors, 'errores de consola: ' + ' | '.join(errors[:5]))

proc = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(headless=True)
        try: main(br)
        except AssertionError as e: FAILS.append(('consola', e)); print('  ✗', e)
        br.close()
finally:
    proc.terminate()
print(f'\n{len(PASSED)} OK, {len(FAILS)} con fallos'); sys.exit(1 if FAILS else 0)
