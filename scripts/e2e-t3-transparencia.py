#!/usr/bin/env python3
"""E2E de T3 · ficha con capa de transparencia. Chromium headless (Playwright) contra scripts/serve.mjs.
Comprueba, contra js/units.min.json, que la lectura rápida muestra solo datos publicados, que «No informado» lista
exactamente lo que falta (sin «No» ni «0» inventados), que la fecha del panel de fuente es la real (relevadoEl),
que el enlace apunta a la publicación original y que las características se pliegan y se operan con teclado."""
import json, os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8194'))
BASE = f'http://127.0.0.1:{PORT}/'
UNITS = json.loads((ROOT / 'js/units.min.json').read_text(encoding='utf-8'))
FAILS, PASSED = [], []
VISIBLES = 8

def check(c, m):
    if not c: raise AssertionError(m)
def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def fecha(iso): return '/'.join(reversed(iso.split('-')))
def vacio(v): return v is None or v == ''
def esperado(u):
    """Misma regla que la ficha: (valores de la lectura rápida, lista de campos no informados)."""
    nu = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    rap = [('Año', str(u['anio']) if nu(u.get('anio')) else None),
           ('Kilómetros', f"{u['km']:,}".replace(',', '.') + ' km' if nu(u.get('km')) else None),
           ('Caja', u.get('transmision') or None), ('Combustible', u.get('combustible') or None)]
    hay = [r for r in rap if r[1] is not None]
    nd = [r[0] for r in rap if r[1] is None]
    if u.get('tipoVehiculo') != 'Moto':
        nd += [n for n, k in (('Carrocería', 'carroceria'), ('Puertas', 'puertas'), ('Potencia', 'potencia'), ('Tracción', 'traccion')) if vacio(u.get(k))]
    return hay, nd

def abrir(ctx, errors, uid, w=1280, h=900):
    pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h}); pg.emulate_media(reduced_motion='reduce')
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    for _ in range(40):
        try: pg.goto(BASE + '#unidad=' + uid, wait_until='load', timeout=5000); break
        except Exception: time.sleep(.25)
    pg.wait_for_selector('dialog.ficha[open]', timeout=10000)
    return pg

LEE = """() => { const d = document.querySelector('dialog.ficha[open]'); const q = s => d.querySelector(s);
  const rap = [...d.querySelectorAll('.fi-rapido > div')].map(x => [x.querySelector('dt').textContent, x.querySelector('dd').textContent]);
  const nd = q('.fi-nd'); const ex = q('section.fi-extra'); const mas = q('.fi-mas'); const fu = q('.fi-fuente');
  const lnk = fu && fu.querySelector('a.fi-lnk');
  return { rap, nd: nd ? nd.textContent : null, texto: d.innerText,
    extraDd: ex ? ex.querySelectorAll('dd').length : 0, extraTitulo: ex && ex.querySelector('.fi-s-k') ? ex.querySelector('.fi-s-k').textContent : null,
    visibles: ex ? [...ex.querySelectorAll(':scope > dl.fi-d dd')].length : 0,
    mas: !!mas, masAbierto: mas ? mas.open : null, masSummary: mas ? mas.querySelector('summary').textContent : null,
    fuente: !!fu, fuenteAbierto: fu ? fu.open : null, fuenteTxt: fu ? fu.querySelector('.fi-fuente-c').textContent : '',
    href: lnk ? lnk.getAttribute('href') : null, target: lnk ? lnk.target : null, rel: lnk ? lnk.rel : null,
    dtRelevado: [...d.querySelectorAll('.fi-d dt')].some(t => t.textContent === 'Relevado') }; }"""

def main(br):
    ctx = br.new_context(); errors = []
    auto = next(u for u in UNITS if u['tipoVehiculo'] == 'Auto' and not esperado(u)[1])
    sin_caja = next(u for u in UNITS if 'Caja' in esperado(u)[1])
    sin_algo = next(u for u in UNITS if u['tipoVehiculo'] == 'Auto' and esperado(u)[1])

    def t_rapido():
        pg = abrir(ctx, errors, str(auto['id'])); r = pg.evaluate(LEE); hay, nd = esperado(auto)
        check(r['rap'] == [list(x) for x in hay], f"lectura rápida {r['rap']} ≠ {hay}")
        check(r['nd'] is None, 'unidad con todos los datos: no debe haber línea «No informado»')
        check(not r['dtRelevado'], 'la fecha de relevamiento debe estar solo en el panel de fuente')
        pg.close()
    def t_no_informado():
        for u in (sin_caja, sin_algo):
            pg = abrir(ctx, errors, str(u['id'])); r = pg.evaluate(LEE); hay, nd = esperado(u)
            check(r['nd'] == 'No informado en la publicación: ' + ', '.join(nd) + '.', f"«No informado» {r['nd']!r} ≠ {nd}")
            check(all(n not in [x[0] for x in r['rap']] for n in nd), 'un campo no informado no puede aparecer en la lectura rápida')
            check(not any(x[1] in ('No', '0', 'null', 'undefined') for x in r['rap']), f"valor inventado en {r['rap']}")
            check('No informado' in r['texto'] and r['texto'].count('No informado en la publicación') == 1, 'debe haber un solo lugar con «No informado»')
            pg.close()
    def t_toda_la_base():
        pg = abrir(ctx, errors, str(UNITS[0]['id'])); mal = []
        for u in UNITS:
            pg.evaluate("h => { location.hash = h }", '#unidad=' + str(u['id']))
            pg.wait_for_function("id => document.querySelector('dialog.ficha[open]') && location.hash === '#unidad=' + id", arg=str(u['id']), timeout=5000)
            pg.wait_for_timeout(120)
            r = pg.evaluate(LEE); hay, nd = esperado(u)
            ok = r['rap'] == [list(x) for x in hay] and (r['nd'] == ('No informado en la publicación: ' + ', '.join(nd) + '.' if hay and nd else None))
            ok = ok and r['fuente'] and r['fuenteAbierto'] is False and (fecha(u['relevadoEl']) in r['fuenteTxt'])
            if not ok: mal.append((u['id'], r['rap'], r['nd']))
        check(not mal, f'{len(mal)} unidades con la ficha distinta de los datos: {mal[:3]}')
        pg.close()
    def t_fuente():
        pg = abrir(ctx, errors, str(auto['id'])); r = pg.evaluate(LEE)
        check(r['fuente'] and r['fuenteAbierto'] is False, 'el panel de fuente debe existir y empezar cerrado')
        check(pg.locator('dialog.ficha[open] .fi-fuente > summary').inner_text().strip() == 'De dónde salen estos datos', 'título del panel')
        check(f"Relevado el {fecha(auto['relevadoEl'])}." in r['fuenteTxt'], f"fecha del relevamiento no coincide con {auto['relevadoEl']}: {r['fuenteTxt']!r}")
        check('inspección' in r['fuenteTxt'] and 'confirmalos con Automotores 828' in r['fuenteTxt'], 'faltan los avisos de datos declarados y de confirmar con la agencia')
        check(r['href'] == auto['url'] and r['target'] == '_blank' and 'noopener' in (r['rel'] or ''), f"enlace a la publicación original incorrecto: {r['href']} {r['target']} {r['rel']}")
        s = pg.locator('dialog.ficha[open] .fi-fuente > summary'); s.focus(); pg.keyboard.press('Enter')
        check(pg.evaluate("() => document.querySelector('dialog.ficha[open] .fi-fuente').open"), 'Enter debe abrir el panel')
        pg.keyboard.press('Space'); check(not pg.evaluate("() => document.querySelector('dialog.ficha[open] .fi-fuente').open"), 'Espacio debe cerrarlo')
        pg.close()
    def t_plegado():
        pg = abrir(ctx, errors, str(auto['id'])); r = pg.evaluate(LEE)
        total = int(r['extraTitulo'].split('(')[1].rstrip(')'))
        check(total > VISIBLES and r['mas'] and r['masAbierto'] is False, f'con {total} características debe haber un bloque plegado')
        check(r['visibles'] == VISIBLES, f"a la vista deben quedar {VISIBLES}, hay {r['visibles']}")
        check(r['masSummary'] == f'Ver todas las características ({total})', r['masSummary'])
        check(r['extraDd'] == total, f"el título dice {total} y hay {r['extraDd']} filas")
        check(pg.locator('dialog.ficha[open] section.fi-extra').is_visible(), 'el bloque de características debe verse')
        dts = pg.evaluate("() => [...document.querySelectorAll('dialog.ficha[open] section.fi-extra dt')].map(t => t.textContent.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim())")
        rep = [d for d in dts if d in ('ano', 'kilometros', 'transmision', 'version', 'marca', 'modelo')]
        check(not rep, f'datos ya mostrados arriba y repetidos en las características: {rep}')
        s = pg.locator('dialog.ficha[open] .fi-mas > summary'); s.focus(); pg.keyboard.press('Enter')
        check(pg.evaluate("() => document.querySelector('dialog.ficha[open] .fi-mas').open"), 'Enter debe desplegar el resto')
        check(pg.locator('dialog.ficha[open] .fi-mas dd').first.is_visible(), 'el resto desplegado debe verse')
        check(pg.evaluate("() => !!document.querySelector('dialog.ficha[open]')") and pg.evaluate("() => location.hash") == '#unidad=' + str(auto['id']), 'la ficha y la URL deben seguir intactas')
        pg.close()
    def t_viewports():
        for w in (390, 768, 1280):
            pg = abrir(ctx, errors, str(sin_algo['id']), w=w, h=900 if w > 700 else 844)
            ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth"); check(ov <= 0, f'desbordamiento de {ov}px a {w}px')
            fov = pg.evaluate("() => { const d = document.querySelector('dialog.ficha[open]'); return d.scrollWidth - d.clientWidth; }"); check(fov <= 1, f'desbordamiento dentro de la ficha a {w}px: {fov}')
            check(pg.locator('dialog.ficha[open] .fi-rapido').is_visible(), f'la lectura rápida debe verse a {w}px')
            for sel in ('.fi-mas > summary', '.fi-fuente > summary', 'a.fi-lnk'):
                loc = pg.locator('dialog.ficha[open] ' + sel); loc.first.scroll_into_view_if_needed(); hh = loc.first.bounding_box()['height']
                check(hh >= 43.5, f'{sel} mide {hh}px a {w}px (mínimo 44)') if sel != 'a.fi-lnk' else None
            pg.close()
    print('E2E T3 · ficha con transparencia de datos')
    run('lectura rápida con los datos publicados', t_rapido); run('«No informado» lista exactamente lo que falta', t_no_informado)
    run('panel «De dónde salen estos datos»: fecha real, enlace y teclado', t_fuente); run('características plegadas, «Ver todas» y teclado', t_plegado)
    run('las 58 fichas coinciden con los datos', t_toda_la_base); run('390/768/1280 px', t_viewports)
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
