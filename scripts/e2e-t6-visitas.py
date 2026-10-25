#!/usr/bin/env python3
"""E2E de T6 · calendario de visitas alineado con los horarios publicados (reserva.html y reserva inline de index.html).
Chromium headless (Playwright) contra scripts/serve.mjs. Comprueba el estado real: días habilitados, franjas y rangos,
mensaje de WhatsApp y que el comportamiento salga del dato (data-semana) y no de constantes en el JS."""
import datetime as dt, json, os, re, subprocess, sys, time
from pathlib import Path
from urllib.parse import unquote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get('PORT', '8192'))
BASE = f'http://127.0.0.1:{PORT}/'
FAILS, PASSED = [], []
HOY = dt.date.today()

PAGES = {
  'reserva': dict(path='reserva.html', day='#calendar button.day-cell[data-day]', nxt='#next-month', slot='#slots button[data-slot]',
                  to_time='#to-time', to_confirm='#to-confirm', wa='#whatsapp', home=None),
  'inline':  dict(path='', day='.rz-d[data-day]', nxt='[data-next]', slot='.rz-slot[data-slot]',
                  to_time=None, to_confirm='[data-confirm]', wa='#reserva-inline [data-wa]', home='a[href^="reserva.html"]'),
}

def check(c, m):
    if not c: raise AssertionError(m)
def run(name, fn):
    try: fn(); PASSED.append(name); print('  ✓', name)
    except Exception as e: FAILS.append((name, e)); print('  ✗', name, '→', e)

def abrir(ctx, errors, key, w=1280, h=900, semana=None):
    cfg = PAGES[key]; pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': h}); pg.emulate_media(reduced_motion='reduce')
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    if semana is not None:
        val = json.dumps(semana, ensure_ascii=False).replace('"', '&quot;')
        def h_(route):
            r = route.fetch()
            if 'text/html' in (r.headers.get('content-type') or ''):
                route.fulfill(response=r, body=re.sub(r'data-semana="[^"]*"', 'data-semana="' + val + '"', r.text()))
            else: route.fulfill(response=r)
        pg.route('**/*', h_)
    for _ in range(40):
        try: pg.goto(BASE + cfg['path'], wait_until='load', timeout=5000); break
        except Exception: time.sleep(.25)
    if cfg['home']:
        pg.wait_for_selector(cfg['home'], state='attached', timeout=8000)
        pg.evaluate("(s) => document.querySelector(s).click()", cfg['home'])
        pg.wait_for_selector('#reserva-inline.is-open', timeout=6000)
    pg.wait_for_selector(cfg['day'], state='attached', timeout=8000)
    return pg, cfg

def dias_mes(pg, cfg):
    return pg.evaluate("""(s) => [...document.querySelectorAll(s)].map(b => ({ d: +b.dataset.day, off: b.disabled, label: b.getAttribute('aria-label') || '' }))""", cfg['day'])

def elegir(pg, cfg, pyweekday):
    """Va al primer día futuro de ese día de la semana (mes actual o siguiente) y lo elige. Devuelve la fecha."""
    for off in range(3):
        y, m = (HOY.year + (HOY.month - 1 + off) // 12, (HOY.month - 1 + off) % 12 + 1)
        for b in dias_mes(pg, cfg):
            f = dt.date(y, m, b['d'])
            if f >= HOY and f.weekday() == pyweekday and not b['off']:
                pg.click(f"{cfg['day']}[data-day='{b['d']}']")
                if cfg['to_time']: pg.click(cfg['to_time'])
                pg.wait_for_selector(cfg['slot'], timeout=4000)
                return f
        pg.click(cfg['nxt'])
    raise AssertionError('no se encontró un día elegible de ese tipo')

def franjas(pg, cfg): return [t.replace('\n', ' ').strip().lower() for t in pg.locator(cfg['slot']).all_inner_texts()]   # el CSS muestra las franjas en mayúsculas

def mensaje(pg, cfg, slot_idx):
    pg.locator(cfg['slot']).nth(slot_idx).click(); pg.click(cfg['to_confirm'])
    pg.wait_for_selector(cfg['wa'], state='visible', timeout=4000)
    return pg.evaluate("""(s) => { const a = document.querySelector(s); const h = a.getAttribute('href') || ''; const t = h.includes('text=') ? h.split('text=')[1] : (a.dataset.msg || ''); try { return decodeURIComponent(t); } catch (e) { return t; } }""", cfg['wa'])

def main(br):
    ctx = br.new_context(); errors = []
    for key in ('reserva', 'inline'):
        def t_dias(key=key):
            pg, cfg = abrir(ctx, errors, key)
            for off in range(2):
                y, m = (HOY.year + (HOY.month - 1 + off) // 12, (HOY.month - 1 + off) % 12 + 1)
                for b in dias_mes(pg, cfg):
                    f = dt.date(y, m, b['d']); esp_ok = f >= HOY and f.weekday() != 6
                    check(b['off'] == (not esp_ok), f'{f} ({["lu","ma","mi","ju","vi","sá","do"][f.weekday()]}): habilitado={not b["off"]}, esperado={esp_ok}')
                    if f >= HOY and f.weekday() == 6: check('cerrado' in b['label'], f'domingo {f} sin motivo accesible: {b["label"]!r}')
                pg.click(cfg['nxt'])
            pg.close()
        def t_sabado(key=key):
            pg, cfg = abrir(ctx, errors, key); elegir(pg, cfg, 5); fr = franjas(pg, cfg)
            check(len(fr) == 1 and 'mañana' in fr[0] and '9 a 13' in fr[0] and 'tarde' not in fr[0], f'el sábado debe ofrecer solo «Mañana · 9 a 13»: {fr}')
            msg = mensaje(pg, cfg, 0); check('mañana' in msg.lower() and 'tarde' not in msg.lower(), f'el mensaje no nombra la franja elegida: {msg!r}')
            pg.close()
        def t_semana(key=key):
            pg, cfg = abrir(ctx, errors, key); elegir(pg, cfg, 2); fr = franjas(pg, cfg)
            check(len(fr) == 2 and 'mañana' in fr[0] and '9 a 13' in fr[0] and 'tarde' in fr[1] and '15 a 19' in fr[1], f'de lunes a viernes: Mañana 9 a 13 y Tarde 15 a 19: {fr}')
            msg = mensaje(pg, cfg, 1); check('tarde' in msg.lower(), f'el mensaje no nombra la tarde: {msg!r}')
            pg.close()
        def t_dato(key=key):   # el calendario sale del dato, no del JS: se reescribe data-semana en la respuesta HTML
            nuevo = [{'dias': [1, 2, 3, 4, 5], 'etiqueta': 'Lunes a viernes', 'rangos': [['16:00', '20:00']]}]
            pg, cfg = abrir(ctx, errors, key, semana=nuevo)
            for off in range(2):
                y, m = (HOY.year + (HOY.month - 1 + off) // 12, (HOY.month - 1 + off) % 12 + 1)
                for b in dias_mes(pg, cfg):
                    f = dt.date(y, m, b['d'])
                    if f >= HOY and f.weekday() == 5: check(b['off'], f'con el sábado fuera del dato, {f} debe estar cerrado')
                pg.click(cfg['nxt'])
            pg.close(); pg, cfg = abrir(ctx, errors, key, semana=nuevo); elegir(pg, cfg, 1); fr = franjas(pg, cfg)
            check(len(fr) == 1 and 'tarde' in fr[0] and '16 a 20' in fr[0], f'una sola franja «Tarde · 16 a 20» según el dato: {fr}')
            pg.close()
        run(f'{key}: días habilitados y domingo cerrado con motivo', t_dias); run(f'{key}: sábado solo mañana', t_sabado)
        run(f'{key}: lunes a viernes dos franjas con su rango', t_semana); run(f'{key}: se alimenta del dato publicado', t_dato)
    def t_nota_y_movil():
        pg, cfg = abrir(ctx, errors, 'reserva'); check('feriados' in pg.inner_text('#month-status').lower(), 'falta la aclaración de feriados')
        pg.close()
        for w in (390, 768, 1280):
            pg, cfg = abrir(ctx, errors, 'reserva', w=w); elegir(pg, cfg, 2)
            ov = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth"); check(ov <= 0, f'desbordamiento de {ov}px a {w}px'); pg.close()
    run('aclaración de feriados y 390/768/1280 px', t_nota_y_movil)
    ctx.close(); check(not errors, 'errores de consola: ' + ' | '.join(errors[:5]))

print('E2E T6 · calendario de visitas y horarios publicados')
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
