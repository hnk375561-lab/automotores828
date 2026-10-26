# Estado del sitio

Sitio estático generado desde `data/` (ver `README.md`): `index.html`, `reserva.html`, `privacidad.html` y `404.html`. Es una **demo no indexable** de Automotores 828 (Monte Grande, Esteban Echeverría, Buenos Aires), armada con información pública (`noindex`, ver `CLAUDE.md` regla 7).

Secciones de `index.html`: Hero · Horarios y ubicación · Unidades · Financiación y servicios · Tu usado · Tu búsqueda · Guía · Preguntas · Visita · Nosotros · Contacto.

## Transformaciones T1–T10 (estado al 2026-10-25)

| T | Transformación | Estado | Prueba |
|---|---|---|---|
| T1 | Enlace propio por unidad y «Atrás» | Hecha; táctil emulado 20/20; falta teléfono real | `e2e-t1-enlaces.py`, `e2e-t1-tactil.py` |
| T2 | Presupuesto bimoneda sin conversión | Hecha | `e2e-t2-bimoneda.py` |
| T3 | Ficha con transparencia de datos | Hecha; capturas 390/768/1280 revisadas en Chromium headless (25/10) | `e2e-t3-transparencia.py` |
| T4 | Selección unificada y visita multi-unidad | Hecha; falta prueba en móvil real | `e2e-t4-seleccion.py`, `e2e-movil-acciones.py` |
| T5 | «Comparalo con» en la ficha | Hecha | `e2e-t5-comparalo.py` |
| T6 | Calendario con horarios publicados | Hecha; depende de P11 | `e2e-t6-visitas.py` |
| T7 | Foto vertical sin recorte | Hecha; capturas 390/768/1280 revisadas (25/10); defectos de texto partido en tarjetas corregidos | `e2e-t7-foto.py` |
| T8 | Medición de eventos | Construida y apagada (nunca corre en la demo); para activarla: autorización del dueño, endpoint https y producción | `e2e-t8-t9.py` |
| T9 | Movimiento selectivo | Hecha en versión liviana: odómetro de cifras reales (sin GSAP) y hero con prioridad baja; LCP 3,28→2,95 s en headless; falta INP y móvil real | `e2e-t8-t9.py` |
| T10 | «Tu búsqueda» conectada al catálogo | Hecha | `e2e-t10-busqueda.py` |

Suite completa sin cortarse en el primer fallo: `npm run test:todo` (incluye `test-ficha-flip.py`). `npm test` corta en el primer fallo.

## Abierto

- Pruebas en dispositivo real: T1 y T4 (criterio de aceptación del informe).
- Capturas en dispositivo real: T3 y T7 (en headless ya revisadas).
- T8 y T9 (ver tabla).
- Pendientes de datos: `data/pendientes.json`. Bloquean producción P3, P4, P6 y P16. P1 (WhatsApp) está resuelto.

## Vista previa al compartir el enlace (og:image)

- Hasta el 25/10 el HTML salía con `og:image` relativa (`images/og-dr.jpg`) y WhatsApp/Facebook/Instagram mostraban el enlace sin imagen. Corregido: el generador usa `publicacion.siteUrl` > `previewUrl` > entorno de build > remoto git (GitHub Pages) y `validate-dealership.mjs` falla si alguna página no tiene `og:image` absoluta https.
- Si el sitio vive en otra dirección que `https://hnk375561-lab.github.io/automotores828/`, cargarla en `data/dealership.json` → `publicacion.previewUrl` y correr `npm run build`.
- Las redes guardan en caché la vista previa: después de publicar, pedir que la actualicen (Facebook Sharing Debugger; en WhatsApp suele bastar con compartir una URL con otro parámetro, p. ej. `?v=2`).

## Efectos de entrada más lentos (2026-10-25)

- Variables únicas `--rv-*` en `scripts/estilos.css`. A (títulos, `p.ey`, financiación, hero, odómetro): 2×; B (tarjeta 1,3 s, foto 1,5 s, fondos 1,6 s): 1,6×–1,7×; C (hover, botones, ficha-flip, galería): sin cambios.
- La regla `.reveal` de `estilos.css` (≈línea 2366) NO es código muerto: fija la duración de la recuperación (`rv-recover`). No borrar.
- Prueba: `npm run test:reveal` (`scripts/e2e-reveal.py`), incluida en `npm test` y `npm run test:todo`.
- Pendiente: medición en móvil real e INP. El LCP en headless quedó dentro del ruido (base 3,05–3,32 s, nuevo 3,36–3,38 s); si empeora, bajar `--rv-dur-hero` a 500ms.

## Vista previa por unidad al compartir (2026-10-26)

- El botón «Compartir» / «Copiar enlace» de la ficha ahora entrega `…/u/<id>/` (antes `…/#unidad=<id>`). Los crawlers de WhatsApp/Facebook/Instagram no leen el `#`, por eso antes toda ficha mostraba el logo.
- `u/<id>/index.html` lo genera `npm run build` (una por unidad): lleva título, descripción (año, km, caja, combustible, color; **sin precio**) y `og:image` propia, y redirige con JS a `../../#unidad=<id>`. Abrir `…/#unidad=<id>` a mano sigue funcionando igual.
- Las imágenes `images/og/u-<id>.jpg` (1200×630) las genera `npm run og:units` con la primera foto de cada ficha. **Al cargar unidades nuevas: `npm run og:units && npm run build && npm test`.**
- Prueba: `npm run test:share` (incluida en `npm test` y `npm run test:todo`). `npm run site` copia `u/` a `_site/`.
- Las redes guardan la vista previa en caché: si no se actualiza, compartir con `?v=2` o usar el depurador de Facebook.
- Móvil: las 4 acciones de cada tarjeta pasan a 2×2 (≥ 44 px) y «KILÓMETROS» ya no toca el borde (`scripts/estilos.css`, final del archivo).
- `e2e-reveal.py` lee las duraciones de las variables `--rv-*` (ya no hay números fijos) y el temporizador de `js/site.js` pasó a 5000 ms. Si se alargan los `--rv-*`, subirlo.
