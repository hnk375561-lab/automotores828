# Inventario visual y mapa — 21/10/2026

## Decisiones aplicadas

- El hero usa **10 fotografías únicas**: las ocho imágenes hero ya integradas y dos tomas adicionales del inventario local de galerías. Cada slide tiene `srcset`, carga diferida desde el segundo slide, crossfade, Ken Burns de 2 segundos, contador accesible, anterior/siguiente y pausa/reanudación.
- Las tarjetas de unidades conservan la foto autorizada disponible y agregan el emblema circular de Automotores 828 en una capa separada. El asset `images/logo-circle.png` se generó con máscara circular, de modo que no depende de un `border-radius` aplicado a una imagen cuadrada con esquinas visibles.
- El inventario se muestra en tres columnas en escritorio, dos en tablet y una en móvil. La regla está en la capa final de `scripts/estilos.css`, después de las capas históricas, para evitar que una regla anterior vuelva a imponer cuatro columnas.
- Se agregaron fondos fotográficos propios, sin stock web externo, para financiación, tu usado, búsqueda, guía, visita y contacto. Cada sección tiene overlay oscuro para sostener contraste y una variante de 800 px para móvil.

## Trazabilidad y límites de fuente

`data/image-manifest.json` es la fuente estructurada del inventario visual y registra origen local, slot, dimensiones, orientación, `srcset` y política de duplicados. `scripts/audit-images.py` lo regenera y falla si encuentra hashes repetidos entre hero y fondos.

Las galerías originales disponibles llegan como máximo a 1440 × 1440 px en las imágenes hero y a 1200 px de ancho en el stock de unidades. El script **no inventa resoluciones superiores** ni hace upscale destructivo: genera variantes menores sin ampliar el original y conserva la foto fuente. Si el negocio entrega originales de 1920/2560 px, el mismo script puede aprovecharlos sin cambiar la plantilla.

## Mapa real

Se incorporaron coordenadas en `data/dealership.json` para **Blvd. Buenos Aires 828, Monte Grande**:

- Latitud: `-34.8138439`
- Longitud: `-58.4555980`
- Objeto OSM: `way 677528363`
- Fuentes consultadas el 21/10/2026: Nominatim y Photon. Ambas devuelven el mismo punto para el número 828.

El número 831 aparece como otro objeto próximo (aproximadamente 8 metros), por lo que se mantiene la dirección pública 828 y se conserva la contradicción documental en el bloque `location.conflicto`; no se presenta 831 como hecho. El mapa de horarios usa Leaflet con tiles oscuros de Carto, pin branded, etiqueta de Automotores 828, popup con dirección, control para centrar y enlaces a Google Maps/Waze. Si la red no entrega tiles, se muestra un estado honesto y se mantienen activas las indicaciones; no se sustituyó por un embed genérico ni por un mapa ilustrativo.

## Verificación

```bash
python3 scripts/audit-images.py
npm run build
npm test
```

Resultado esperado al 21/10/2026: 10 slides, 7 fondos, 0 duplicados; `npm test` correcto. Los avisos de datos pendientes que ya existían (teléfono no confirmado, horarios y otros) siguen siendo avisos, no se convierten en información publicada.
