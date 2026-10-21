#!/usr/bin/env python3
"""Valida que el manifiesto y el HTML no anuncien dimensiones inexistentes."""
from __future__ import annotations
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "data/image-manifest.json").read_text())
errors: list[str] = []

for entry in manifest.get("hero", []):
    path = entry["src"]
    with Image.open(ROOT / path) as image:
        actual = image.size
    declared = (entry.get("width"), entry.get("height"))
    if declared != actual:
        errors.append(f"{path}: manifest declares {declared}, file is {actual}")
    for candidate in entry.get("srcset", []):
        with Image.open(ROOT / candidate["path"]) as image:
            width, height = image.size
        if candidate.get("width") != width:
            errors.append(f"{candidate['path']}: srcset declares {candidate.get('width')}w, file is {width}w")
        if candidate.get("height") != height:
            errors.append(f"{candidate['path']}: manifest declares height {candidate.get('height')}, file is {height}")

sections = manifest.get("sections", {})
for name, entry in sections.items():
    for kind in ("desktop", "mobile"):
        rel = entry.get(kind)
        if not rel:
            errors.append(f"{name}: missing {kind} image reference")
            continue
        try:
            with Image.open(ROOT / rel) as image:
                if image.width <= 0 or image.height <= 0:
                    errors.append(f"{name} {kind}: invalid image dimensions {image.size}")
        except OSError as exc:
            errors.append(f"{name} {kind}: cannot open {rel}: {exc}")
    desktop = entry.get("desktop")
    if desktop and name in ("financiacion", "tu-usado", "busqueda", "guia", "visita", "contacto", "footer"):
        with Image.open(ROOT / desktop) as image:
            if (entry.get("width"), entry.get("height")) != image.size:
                errors.append(f"{desktop}: section manifest declares {(entry.get('width'), entry.get('height'))}, file is {image.size}")

html = (ROOT / "index.html").read_text()
for match in re.finditer(r'<img[^>]+src="(images/hero/[^"?]+)(?:\?[^\"]*)?"[^>]+srcset="([^"]+)"[^>]*>', html):
    for item in match.group(2).split(","):
        parts = item.strip().split()
        if len(parts) != 2:
            errors.append(f"Malformed hero srcset entry: {item}")
            continue
        rel, descriptor = parts
        rel = rel.split("?", 1)[0]
        expected = int(descriptor.removesuffix("w")) if descriptor.endswith("w") else None
        try:
            with Image.open(ROOT / rel) as image:
                actual = image.width
            if expected != actual:
                errors.append(f"{rel}: HTML srcset declares {expected}w, file is {actual}w")
        except (OSError, ValueError) as exc:
            errors.append(f"Cannot inspect {rel}: {exc}")

if errors:
    raise SystemExit("Image metadata validation failed:\n- " + "\n- ".join(errors))
print(f"Image metadata validation passed: {len(manifest.get('hero', []))} hero slides and {len(manifest.get('sections', {}))} background sections")
