# Rendimiento y QA — Horizonte Automotores v2

## Cambios aplicados

- Fuentes reducidas a Cormorant Garamond e Inter, autoalojadas y con `font-display: swap`.
- Licencias reducidas a las dos familias realmente utilizadas.
- Pipeline de imágenes preparado para `images/autos/<id>/`, variantes WebP 480/800/1280 y AVIF opcional, sin generar multimedia sin autorización.
- Pipeline de hero preparado para `hero-800` y `hero-1280`.
- `srcset`, dimensiones fijas y carga diferida preparados para las futuras fotografías.
- Parallax limitado al hero, escritorio y puntero fino.
- `prefers-reduced-motion` y `navigator.connection.saveData` desactivan reveal, parallax, brillo y animaciones no esenciales.
- FAB eliminado del JS y CSS; la barra inferior móvil queda como único sistema de acciones.
- Sin video ni carrusel automático.
- Drawer de filtros con controles rápidos, bottom sheet, foco atrapado, `Esc`, `inert` y contador vivo.

## Verificaciones ejecutadas

- `node --check scripts/build-index.mjs`: correcto.
- `node --check scripts/make-images.mjs`: correcto.
- `node --check js/site.js`: correcto.
- `npm run build`: correcto; genera cinco unidades.
- `npm test`: correcto; solo quedan avisos de pendientes de producción P4, P5, P11, P12 y P15.
- Criterio de fuentes antiguas: sin coincidencias en código, CSS, JS ni licencias.
- Criterio `.fab`: sin coincidencias en CSS ni JS.
- Criterio `saveData`: implementado en JS y CSS.
- Criterio de sombras duras: sin coincidencias en `scripts/` ni `css/`.
- `npm run check:links`: 0 problemas automáticos; mapas y enlaces externos requieren revisión manual.
- `npm run check:mobile`: script pendiente/no-op en el repositorio actual.

## Limitaciones no afirmadas como verificadas

- `python3 scripts/qa-browser.py` no puede ejecutarse en este sandbox porque falta el binario Chromium de Playwright.
- No se afirma medición de LCP, overflow horizontal, contraste efectivo, consola limpia ni comportamiento táctil en navegador real.
- Fotos de unidades, foto de hero y frames 360° quedan pendientes de entrega y autorización del responsable.
