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

# Después de los cambios (mismo método, 25/10/2026)

| Página | LCP | Tareas largas | TBT aprox. | JS transferido |
|---|---|---|---|---|
| `index.html` antes | 3,28 s | 8 | ≈755 ms | 79 KB |
| `index.html` después | 2,95 s | 6 | ≈663 ms | 82 KB |

Cambios: (1) `js/hero-motion.js` ya no deja las 20 fotos del hero compitiendo por el ancho de banda; solo la primera conserva prioridad alta y el resto baja con `fetchPriority = 'low'` (siguen cargándose de antemano, sin saltos al reiniciar la cinta). (2) T9: `js/odometro.js` (≈1 KB, sin GSAP) cuenta hasta las cifras publicadas del resumen del catálogo (58 unidades · 50 autos · 8 motos); con movimiento reducido o ahorro de datos no anima y el HTML ya trae el valor final. Una sola corrida de 3 en headless: es orientativa, no un móvil real.

# T8 · Medición de eventos

Construida y **apagada**: `js/medir.js` no hace nada ni emite peticiones si `<meta name="dr-medicion">` vale `off` (siempre en la demo). Se enciende solo con `publicacion.medicion.activo = true`, un endpoint https y `publicIndexing = true`. Eventos de lista cerrada (`ficha_abierta`, `whatsapp_clic`, `comparador_abierto`, `favorito_agregado`, `filtro_usado`), sin teléfono ni textos de formularios, respeta «No rastrear» y GPC. El texto de `privacidad.html` cambia solo cuando está encendida. Prueba: `scripts/e2e-t8-t9.py`.
