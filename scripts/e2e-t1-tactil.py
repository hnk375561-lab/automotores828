#!/usr/bin/env python3
"""T1 con emulación táctil de móvil (390 px, has_touch): ficha → ancla → Atrás, 3 veces por ancla, y enlace directo #unidad. No reemplaza una prueba en dispositivo real."""
import subprocess, time, os, sys
from playwright.sync_api import sync_playwright
ROOT='/home/claude/automotores828'; B='http://127.0.0.1:8199/'
srv=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'8199'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1.5)
R=[]
def ck(n,c,d=''): R.append(c); print('  ✓' if c else '  ✗',n,d)
try:
  with sync_playwright() as p:
    br=p.chromium.launch()
    for ancla,txt in [('#tu-usado','Tasar mi usado'),('#horarios','Ver horarios y mapa')]:
      for rep in range(3):
        ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(B,wait_until='load'); pg.wait_for_selector('button[data-ficha]',state='attached')
        pg.evaluate("document.querySelector('#unidades .cars').scrollIntoView()"); pg.wait_for_timeout(600)
        L0=pg.evaluate('history.length')
        pg.locator('button[data-ficha]').first.tap(); pg.wait_for_selector('dialog.ficha[open]',timeout=8000); pg.wait_for_timeout(800)
        h1=pg.evaluate('location.hash')
        pg.locator(f'dialog.ficha a:has-text("{txt}")').first.tap(); pg.wait_for_timeout(1200)
        s=pg.evaluate("()=>({open:!!document.querySelector('dialog.ficha[open]'),hash:location.hash,len:history.length,y:Math.round(scrollY)})")
        pg.go_back(); pg.wait_for_timeout(900)
        s2=pg.evaluate("()=>({open:!!document.querySelector('dialog.ficha[open]'),hash:location.hash,len:history.length,url:location.href})")
        ck(f'{txt} #{rep+1}: ficha cerrada y ancla {ancla}', (not s['open']) and s['hash']==ancla, str(s))
        ck(f'{txt} #{rep+1}: Atrás no deja la ficha ni sale del sitio', (not s2['open']) and s2['url'].startswith(B), f"hash={s2['hash']!r} len {L0}->{s2['len']}")
        ck(f'{txt} #{rep+1}: sin errores', not errs, str(errs)); ctx.close()
    # enlace directo desde WhatsApp y volver
    ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=ctx.new_page()
    pg.goto(B,wait_until='load'); pg.wait_for_selector('button[data-ficha]',state='attached')
    uid=pg.locator('button[data-ficha]').nth(2).evaluate("b=>b.closest('li').id||''")
    import json; u=json.load(open(ROOT+'/js/units.min.json'))[2]['id']
    pg2=ctx.new_page(); pg2.goto(B+'#unidad='+str(u),wait_until='load'); pg2.wait_for_selector('dialog.ficha[open]',timeout=8000)
    ck('enlace directo #unidad abre la ficha en móvil', True)
    pg2.locator('dialog.ficha button[aria-label*=Cerrar]').tap(); pg2.wait_for_timeout(800)
    ck('cerrar con toque deja el catálogo sin hash', pg2.evaluate("!document.querySelector('dialog.ficha[open]') && location.hash===''"), pg2.evaluate('location.hash'))
    br.close()
finally: srv.terminate()
print(f'{sum(R)} OK, {len(R)-sum(R)} con fallos'); sys.exit(0 if all(R) else 1)
