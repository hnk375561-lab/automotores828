# T9 · Medición base (headless) — 2026-10-25

**Método.** Chromium headless con Playwright, viewport 390×844 táctil, red limitada a 1,6 Mbps / 150 ms y CPU 4× más lenta, servidor con gzip (`scripts/serve-gzip.mjs`). 3 corridas por página, se informa la mediana por LCP. **Es una aproximación**: no es un móvil real de gama media y no se midió INP.

| Página | Transferido | JS | Imágenes | CSS | Pedidos | LCP | CLS | Tareas largas | TBT aprox. |
|---|---|---|---|---|---|---|---|---|---|
| `index.html` | 2,33 MB | 79 KB | 2,00 MB | 20 KB | 46 | 3,28 s | 0 | 8 | ≈755 ms |
| `reserva.html` | 256 KB | 81 KB | 73 KB | 8 KB | 13 | 0,54 s | 0 | 1 | ≈42 ms |

**Lectura.**
- `reserva.html` ya carga `motion.js` + el stack GSAP (≈81 KB de JS con gzip) y su costo de hilo principal es bajo, pero la página es chica.
- `index.html` ya tiene ≈755 ms de bloqueo aproximado con CPU 4× y LCP de 3,3 s. Sumarle el stack completo agregaría ≈80 KB de JS y trabajo en el hilo principal sobre una portada que ya está al límite.
- El peso dominante de la portada son las imágenes (2,0 MB), no el JS.

**Recomendación (a confirmar con medición en móvil real).** No cargar `gsap-stack.js` en `index.html`. Si se activan firmas, reescribir 2 o 3 con WAAPI/CSS (como `ficha-flip.js`) y repetir esta medición: una firma que suba el LCP o el TBT de la portada no se activa.

# T1 · Prueba táctil emulada

`scripts/e2e-t1-tactil.py`: 20/20. Toque en tarjeta → «Tasar mi usado» / «Ver horarios y mapa» → Atrás, 3 repeticiones cada uno: la ficha cierra, el ancla navega, Atrás no deja la ficha ni sale del sitio, sin errores. Enlace directo `#unidad=ID` abre la ficha y cerrar con toque limpia el hash. **Sigue pendiente la prueba en un teléfono real.**
