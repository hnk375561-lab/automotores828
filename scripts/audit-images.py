#!/usr/bin/env python3
"""Audita imágenes y genera el manifiesto de fondos/carrusel de Automotores 828.

No descarga activos externos: solo usa imágenes ya presentes en images/.
Uso: python3 scripts/audit-images.py
"""
from __future__ import annotations
import hashlib, json, shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
OUT_HERO = IMAGES / "hero"
OUT_BG = IMAGES / "fondos"
OUT_BG.mkdir(exist_ok=True)

hero = [
    *(f"images/hero/hero-{n:02d}.webp" for n in range(1, 9)),
    "images/stock/ml-4103009836-p16.webp",
    "images/stock/ml-4081416070-p13.webp",
]
section_sources = {
    "financiacion": "images/stock/ml-4073718400-p15.webp",
    "tu-usado": "images/stock/ml-4049171736-p12.webp",
    "busqueda": "images/stock/ml-4043971584-p13.webp",
    "guia": "images/stock/ml-3906245030-p07.webp",
    "visita": "images/stock/ml-2063173351-p02.webp",
    "contacto": "images/stock/ml-2163981297-p17.webp",
    "footer": "images/stock/ml-3783768058-p02.webp",
}

def info(rel: str) -> dict:
    p = ROOT / rel
    with Image.open(p) as im:
        return {"path": rel, "width": im.width, "height": im.height, "pixels": im.width * im.height,
                "orientation": "landscape" if im.width >= im.height else "portrait",
                "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}

def save_variant(src: Path, dst: Path, width: int, quality: int = 86) -> tuple[int, int]:
    with Image.open(src) as original:
        im = ImageOps.exif_transpose(original).convert("RGB")
        scale = min(1, width / im.width)
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        if size != im.size:
            im = im.resize(size, Image.Resampling.LANCZOS)
        im.save(dst, "WEBP", quality=quality, method=6)
        return im.size

def ensure_hero_assets() -> list[dict]:
    entries = []
    # Las ocho fotos hero existentes conservan su original; las dos adicionales salen del stock local.
    for i, source in enumerate(hero, 1):
        src = ROOT / source
        out_name = f"hero-{i:02d}.webp"
        out = OUT_HERO / out_name
        if source.startswith("images/hero/"):
            # Ya es el original local de máxima resolución.
            out = ROOT / source
        else:
            save_variant(src, out, 1920)
        with Image.open(out) as im:
            w, h = im.size
        small = OUT_HERO / f"hero-{i:02d}-828.webp"
        save_variant(out, small, 828)
        entries.append({"section": "hero", "slot": i, "source": source,
                        "src": str(out.relative_to(ROOT)), "srcset": [
                            {"path": str(small.relative_to(ROOT)), "width": 828},
                            {"path": str(out.relative_to(ROOT)), "width": w}],
                        "width": w, "height": h, "objectPosition": "50% 50%"})
    return entries

def ensure_backgrounds() -> dict:
    result = {}
    for section, source in section_sources.items():
        src = ROOT / source
        desktop = OUT_BG / f"fondo-{section}.webp"
        mobile = OUT_BG / f"fondo-{section}-800.webp"
        save_variant(src, desktop, 1920)
        save_variant(src, mobile, 800)
        with Image.open(desktop) as im:
            w, h = im.size
        result[section] = {"source": source, "desktop": str(desktop.relative_to(ROOT)),
                           "mobile": str(mobile.relative_to(ROOT)), "width": w, "height": h,
                           "objectPosition": "50% 50%"}
    return result

hero_entries = ensure_hero_assets()
backgrounds = ensure_backgrounds()
all_entries = [info(x["source"]) for x in hero_entries] + [info(x["source"]) for x in backgrounds.values()]
hashes = {}
for e in all_entries:
    hashes.setdefault(e["sha256"], []).append(e["path"])
duplicates = [paths for paths in hashes.values() if len(paths) > 1]
if duplicates:
    raise SystemExit(f"ERROR: imágenes repetidas en el manifiesto: {duplicates}")

manifest = {
    "generatedAt": "2026-10-21",
    "policy": {"source": "Activos locales del repositorio y galerías ya integradas del vendedor",
               "noExternalStock": True, "duplicateImages": 0,
               "sourceLimit": "Los originales disponibles llegan como máximo a 1440 px en hero y 1200 px en stock; no se inventan resoluciones superiores."},
    "hero": hero_entries,
    "sections": backgrounds,
    "resolutionRanking": sorted(all_entries, key=lambda x: (x["pixels"], x["width"]), reverse=True),
}
(ROOT / "data/image-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"OK: {len(hero_entries)} slides hero, {len(backgrounds)} fondos, duplicados: 0")
for e in hero_entries:
    print(f"hero {e['slot']:02d}: {e['width']}x{e['height']} {e['source']}")
for k, e in backgrounds.items():
    print(f"{k}: {e['width']}x{e['height']} {e['source']}")
