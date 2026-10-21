# Investigación técnica de calidad de imágenes — 21/10/2026

## Alcance y método

Esta nota aporta hallazgos verificables al conjunto de auditorías existentes. Se inspeccionaron el HTML compilado, `css/hero-carousel.css`, `js/hero-carousel.js`, `data/image-manifest.json`, `scripts/audit-images.py` y las dimensiones reales de los recursos visuales del hero y de los fondos. Las dimensiones se leyeron de los archivos con Pillow; se contrastaron los anchos declarados en cada `srcset` con el ancho físico del recurso correspondiente.

No se adjunta el prompt de trabajo ni se modifican ni regeneran imágenes. Tampoco se cambian referencias, datos de vehículos o archivos de la galería. La inspección es estática sobre el checkout de `main`: no demuestra qué versión está publicada en producción ni reemplaza una verificación de red/renderizado en un navegador conectado al sitio desplegado.

## Hallazgo principal: el manifiesto describe versiones que no están en disco

`data/image-manifest.json` tiene declaraciones que contradicen tanto los archivos locales como el HTML de `index.html`. En concreto, anota los slots 1–8 como 1440 × 1440; las fuentes originales medidas son de 900 × 1200, 902 × 902, 900 × 1200, 900 × 1200, 1195 × 1195, 900 × 900, 900 × 1200 y 1141 × 1141, respectivamente. Para los slots 9 y 10 declara 1200 × 900, mientras que los archivos miden 1131 × 1131 y 900 × 1200.

La divergencia alcanza también a `srcset`: en los diez slides, la declaración de ancho del recurso grande del manifiesto no coincide con el ancho real del archivo. En los slots 1, 3, 4 y 10 ocurre además con la variante de 828 declarada: el recurso físico mide 621 px de ancho porque mantiene la relación de aspecto de su fuente vertical. El HTML compilado, en cambio, contiene dimensiones intrínsecas y descriptores que sí reflejan los archivos actuales (por ejemplo, slide 1: 900 × 1200 y `900w`). Esto significa que consumidores del manifiesto —incluida una regeneración/auditoría— pueden informar una geometría incorrecta aunque el HTML actual sea más preciso.

| Slide | Fuente local (px) | Ancho anotado en manifiesto para la fuente | Ancho físico declarado en el HTML compilado |
|---:|---:|---:|---:|
| 1 | 900 × 1200 | 1440w | 900w |
| 2 | 902 × 902 | 1440w | 902w |
| 3 | 900 × 1200 | 1440w | 900w |
| 4 | 900 × 1200 | 1440w | 900w |
| 5 | 1195 × 1195 | 1440w | 1195w |
| 6 | 900 × 900 | 1440w | 900w |
| 7 | 900 × 1200 | 1440w | 900w |
| 8 | 1141 × 1141 | 1440w | 1141w |
| 9 | 1131 × 1131 | 1200w | 1131w |
| 10 | 900 × 1200 | 1200w | 900w |

**Impacto:** un descriptor `w` de `srcset` debe corresponder al ancho intrínseco real del archivo. Aunque el navegador recibe `index.html` con descriptores correctos en el checkout inspeccionado, el manifiesto no es una fuente confiable para afirmar qué resolución existe. Se recomienda reconciliarlo con los archivos físicos y agregar una validación que falle ante diferencias; no basta con cambiar números manualmente sin medir los archivos.

## Causa probable de la percepción de baja nitidez en escritorio

El selector de CSS establece `width:100%; height:100%; object-fit:cover`, aplica `scale(1.04)` al inicio y anima hasta `scale(1.15)`. El carrusel declara `sizes="100vw"`. Por tanto, el navegador puede elegir el mayor candidato disponible, pero ninguno de los diez archivos locales excede 1195 píxeles de ancho; cinco fuentes miden 900 px o menos. En viewports de escritorio más anchos, la imagen necesariamente se interpola hacia arriba. `object-fit:cover` descarta parte del encuadre para llenar el contenedor y el zoom de hasta 15 % reduce adicionalmente el detalle efectivo. Este mecanismo es compatible con una apariencia blanda o recortada sin que la causa sea una variante miniatura servida por error.

En móvil hay una composición distinta: la foto ocupa una franja superior y usa otra regla de encuadre. Por eso la verificación por viewport sigue siendo relevante; la medición estática no permite determinar qué sujeto queda dentro del recorte en cada tamaño.

## Fondos institucionales y otras imágenes fuera del inventario

Los siete fondos listados en el manifiesto existen: las seis secciones —financiación, tu usado, búsqueda, guía, visita y contacto— tienen variantes de escritorio de 1200 × 900 y móvil de 800 × 600; el footer tiene 1200 × 675 y 800 × 450. El código del generador limita el redimensionado a no ampliar (`scale = min(1, width / im.width)`) y exporta WebP, lo cual evita upscale al crear variantes. No se detectó divergencia dimensional en esas siete entradas durante esta inspección.

La afirmación de “mejor versión auténtica disponible” no se puede elevar a conclusión universal solo a partir del repositorio: para probar que no existe un original superior hacen falta los archivos fuente entregados por el concesionario o una fuente original pública cuya identidad y permiso de reutilización puedan confirmarse. Las fotos de catálogo de vehículos se excluyen de toda recomendación de modificación en esta nota.

## Estado de evidencia y siguientes pasos recomendados

### Implementado en esta revisión

- `scripts/audit-images.py` ya mide las dimensiones físicas de la fuente y de cada derivado al generar el manifiesto, registra ancho y alto reales para cada candidato y falla si un `srcset` anuncia un ancho diferente del archivo.
- El generador ahora preserva los derivados visuales existentes en vez de volver a recomprimirlos en cada auditoría; esto evita cambios binarios y pérdidas acumuladas al regenerar solo metadatos.
- `scripts/build-index.mjs` declara en el `srcset` del hero los anchos efectivos de las variantes pequeñas (621 px para las imágenes verticales que miden 621 × 828; 828 px para las restantes) y conserva el ancho físico correcto de cada original.
- Se añadió `scripts/validate-image-manifest.py` al comando `npm test`. La prueba compara manifiesto y `srcset` del HTML compilado con los archivos reales.
- Se regeneró `data/image-manifest.json` desde archivos medidos. No se cambió ningún archivo en `images/`; las imágenes originales de inventario y sus referencias permanecen intactas.

### Pendiente por insumos externos

1. Para una mejora real de resolución, solicitar al negocio originales de cámara o exportaciones de alta calidad de cada fotografía del hero. Sustituir únicamente tras verificar que la foto es auténtica, corresponde al concesionario y puede reutilizarse; no aplicar upscale como sustituto de una fuente mejor.
2. Comparar escritorio y móvil en el sitio publicado, capturando la URL/dimensión del recurso elegido y el encuadre de las diez diapositivas. El checkout por sí solo no ofrece evidencia de red del despliegue.
3. Si no aparecen originales mayores, valorar por separado una reducción del zoom/crop en escritorio. Es una modificación de presentación y requiere aprobación visual, no una restauración de resolución; no se alteró la dirección visual en esta corrección técnica.

## Validación realizada

- `npm test`: correcto; validación de concesionario y auditoría de texto sin coincidencias prohibidas. El validador mantiene avisos existentes sobre pendientes de producción.
- `npm run build`: correcto; genera el sitio en modo demo con descriptores de `srcset` acordes a los archivos actuales.
- `python3 scripts/audit-images.py`: correcto; 10 slides, 7 fondos y 0 duplicados. El generador preservó los derivados ya existentes.
- La prueba nueva cubre las dimensiones locales de las 10 fuentes hero, los candidatos del manifiesto, los descriptores `srcset` del HTML y la presencia/dimensiones de las siete parejas de fondos.
- Dimensiones y archivos del manifiesto: inspección local de las diez fuentes hero, sus `srcset` y las siete parejas de fondos.
- No se ejecutó `scripts/audit-images.py`: ese script regenera derivados del hero/fondos y el manifiesto, lo que habría modificado archivos fuera del alcance de una nota de investigación.
- No se realizó validación visual en escritorio/móvil contra un despliegue en vivo ni se inspeccionaron solicitudes de red del hosting; la autenticación/publicación en GitHub tampoco forma parte de esta validación local.
- No se modificó ni regeneró ningún archivo de imagen del inventario. El cambio de esta investigación está limitado a documentación.
