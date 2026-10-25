# Estado del sitio

Sitio estático generado desde `data/` (ver `README.md`): `index.html`, `reserva.html`, `privacidad.html` y `404.html`. Es una **demo no indexable** de Automotores 828 (Monte Grande, Esteban Echeverría, Buenos Aires), armada con información pública (`noindex`, ver `CLAUDE.md` regla 7).

Secciones de `index.html`: Hero · Horarios y ubicación · Unidades · Financiación y servicios · Tu usado · Tu búsqueda · Guía · Preguntas · Visita · Nosotros · Contacto.

## Transformaciones T1–T10 (estado al 2026-10-25)

| T | Transformación | Estado | Prueba |
|---|---|---|---|
| T1 | Enlace propio por unidad y «Atrás» | Hecha; falta prueba en móvil real | `e2e-t1-enlaces.py` |
| T2 | Presupuesto bimoneda sin conversión | Hecha | `e2e-t2-bimoneda.py` |
| T3 | Ficha con transparencia de datos | Hecha; capturas 390/768/1280 revisadas en Chromium headless (25/10) | `e2e-t3-transparencia.py` |
| T4 | Selección unificada y visita multi-unidad | Hecha; falta prueba en móvil real | `e2e-t4-seleccion.py`, `e2e-movil-acciones.py` |
| T5 | «Comparalo con» en la ficha | Hecha | `e2e-t5-comparalo.py` |
| T6 | Calendario con horarios publicados | Hecha; depende de P11 | `e2e-t6-visitas.py` |
| T7 | Foto vertical sin recorte | Hecha; capturas 390/768/1280 revisadas (25/10); defectos de texto partido en tarjetas corregidos | `e2e-t7-foto.py` |
| T8 | Medición de eventos | **Abierta**: requiere autorización escrita del dueño, actualizar `privacidad.html` y definir dónde se guardan los conteos (P3) | — |
| T9 | Movimiento selectivo | **Abierta**: medir primero peso, LCP e INP en móvil de gama media; probar 2–3 firmas en una rama | — |
| T10 | «Tu búsqueda» conectada al catálogo | Hecha | `e2e-t10-busqueda.py` |

Suite completa sin cortarse en el primer fallo: `npm run test:todo` (incluye `test-ficha-flip.py`). `npm test` corta en el primer fallo.

## Abierto

- Pruebas en dispositivo real: T1 y T4 (criterio de aceptación del informe).
- Capturas en dispositivo real: T3 y T7 (en headless ya revisadas).
- T8 y T9 (ver tabla).
- Pendientes de datos: `data/pendientes.json`. Bloquean producción P3, P4, P6 y P16. P1 (WhatsApp) está resuelto.
