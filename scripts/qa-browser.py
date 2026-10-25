#!/usr/bin/env python3
"""Automotores 828 · QA en navegador real (Chromium vía Playwright de Python).
Uso:  python3 scripts/qa-browser.py      (levanta node scripts/serve.mjs por su cuenta)
Falla (exit 1) si hay: overflow horizontal, errores de consola, titulares partidos a mitad de palabra,
controles táctiles < 44px (en ≤980px), el FAB tapando controles, o contenido oculto con movimiento reducido."""
import shutil, subprocess, sys, time, urllib.request, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "http://127.0.0.1:8080/"
SIZES = [(1440, 900), (1280, 800), (768, 1024), (390, 844), (320, 700)]

JS_BREAK = """()=>[...document.querySelectorAll('h1,h2,h3')].filter(h=>h.getBoundingClientRect().height).filter(h=>{const o=h.style.overflowWrap;h.style.overflowWrap='normal';const x=h.scrollWidth>h.clientWidth+1;h.style.overflowWrap=o;return x}).map(h=>h.textContent.trim().slice(0,30))"""
JS_SMALL = """()=>{const out=[];document.querySelectorAll('a.btn,button,summary,select,textarea,input:not([type=checkbox]):not([type=radio]),.site-nav a,dd a,.ct-c li a').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height||e.closest('.skip,[hidden],.fab')||e.classList.contains('dr-cb-native'))return;if(r.height<43.5)out.push((e.textContent||e.tagName).trim().slice(0,22)+' '+Math.round(r.width)+'x'+Math.round(r.height))});return out}"""
JS_FAB = """()=>{const fab=document.querySelector('.fab');if(!fab)return[];const cs=getComputedStyle(fab);if(cs.display==='none'||+cs.opacity<.5)return[];const f=fab.getBoundingClientRect();const hits=[];document.querySelectorAll('a.btn,button,input,textarea,select').forEach(b=>{if(b.closest('.fab'))return;const r=b.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&!(r.right<=f.left||r.left>=f.right||r.bottom<=f.top||r.top>=f.bottom))hits.push((b.textContent||b.tagName).trim().slice(0,22))});return hits}"""

def main():
    srv = subprocess.Popen(["node", "scripts/serve.mjs"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(30):
        try: urllib.request.urlopen(BASE); break
        except Exception: time.sleep(0.3)
    problems = []
    try:
        with sync_playwright() as p:
            chromium = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
            launch = {"headless": True}
            if chromium: launch["executable_path"] = chromium
            b = p.chromium.launch(**launch)
            for w, h in SIZES:
                pg = b.new_page(viewport={"width": w, "height": h}); errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
                pg.goto(BASE); pg.wait_for_timeout(3000)
                tag = f"{w}x{h}"
                ov = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
                if ov > 0: problems.append(f"{tag}: overflow horizontal {ov}px")
                if errs: problems.append(f"{tag}: errores de consola {errs[:2]}")
                br = pg.evaluate(JS_BREAK)
                if br: problems.append(f"{tag}: titulares partidos a mitad de palabra {br}")
                if w <= 700:
                    hh = pg.evaluate("document.querySelector('header').getBoundingClientRect().height")
                    if hh > 100: problems.append(f"{tag}: el header fijo ocupa {round(hh)}px (se parte en dos filas)")
                if w <= 980:
                    sm = pg.evaluate(JS_SMALL)
                    if sm: problems.append(f"{tag}: controles <44px {sm[:4]}")
                if w == 1440:
                    cols = pg.locator("#cars").evaluate("e=>getComputedStyle(e).gridTemplateColumns.trim().split(/\\s+/).length")
                    if cols != 5: problems.append(f"{tag}: grilla de unidades con {cols} columnas; se esperaban 5")
                    pg.locator("button[data-ficha]").first.click()
                    pg.locator("dialog.ficha").wait_for(state="visible")
                    gallery = pg.locator("dialog.ficha .fi-gal")
                    if gallery.count() and gallery.locator("button").count() > 1:
                        before = gallery.locator("img").first.get_attribute("src")
                        gallery.locator("button").nth(1).click()
                        if gallery.locator("img").first.get_attribute("src") == before: problems.append(f"{tag}: la galería no avanza")
                    fav = pg.locator("dialog.ficha [data-fav]")
                    if fav.count():
                        fav.click()
                        if not fav.get_attribute("aria-pressed") == "true": problems.append(f"{tag}: el favorito no cambia estado")
                    cmp = pg.locator("dialog.ficha input[type=checkbox][data-cmp]")
                    if cmp.count(): cmp.check()
                    mini = pg.locator("dialog.ficha .fi-map[data-leaflet]")
                    if mini.count() != 1: problems.append(f"{tag}: la ficha no incluye el mini mapa del local")
                    elif not pg.locator("dialog.ficha .fi-map .dr-map-v[aria-label]").count(): problems.append(f"{tag}: el mini mapa no tiene región accesible")
                    extra = pg.locator("dialog.ficha section.fi-extra")
                    if extra.count() != 1: problems.append(f"{tag}: no se conservó el bloque de características adicionales")
                    elif extra.locator("dd").count() < 1: problems.append(f"{tag}: el bloque de características adicionales está vacío")
                    elif not extra.is_visible(): problems.append(f"{tag}: el bloque de características adicionales no es visible")
                    pg.locator("dialog.ficha").locator("button[aria-label*=Cerrar]").click()
                if w <= 700:
                    H = pg.evaluate("document.documentElement.scrollHeight"); y = 0; bad = set()
                    while y < H:
                        pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(120)
                        bad.update(pg.evaluate(JS_FAB)); y += int(h * 0.4)
                    if bad: problems.append(f"{tag}: el FAB tapa controles {sorted(bad)[:4]}")
                pg.close()
            ctx = b.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce"); pg = ctx.new_page()
            pg.goto(BASE); pg.wait_for_timeout(1500)
            if not pg.evaluate("(()=>{const r=document.querySelector('h1').getBoundingClientRect();return +getComputedStyle(document.querySelector('h1')).opacity===1&&r.height>0})()"):
                problems.append("movimiento reducido: el h1 no queda visible")
            b.close()
    finally:
        srv.terminate()
    if problems:
        print("✖ QA navegador:"); [print("  " + x) for x in problems]; sys.exit(1)
    print(f"✓ QA navegador: {len(SIZES)} tamaños sin overflow, sin errores, sin titulares partidos, áreas táctiles ≥44px, FAB sin colisiones, movimiento reducido OK")

if __name__ == "__main__": main()
