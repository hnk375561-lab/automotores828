# Auditoría del prompt de correcciones — Automotores 828

**Fecha:** 21 de octubre de 2026  
**Alcance:** convertir el prompt maestro recibido en hallazgos técnicos verificables, criterios de aceptación y decisiones de implementación. El prompt original no se copia al repositorio.

## Resumen ejecutivo

El nuevo prompt no agrega datos comerciales primarios; agrega una especificación de corrección visual, interacción, rendimiento y accesibilidad. El principal riesgo técnico identificado es la coexistencia de implementaciones distintas de mapas y controles de carrusel: el sitio debe converger en un componente Leaflet único, sin dependencia de API keys, con carga diferida y comportamiento consistente.

También se identifican cuatro áreas de impacto: el lag producido por efectos costosos y listeners activos, la ausencia visual o fallo de carga del carrusel del hero, la falta de un separador de identidad uniforme entre secciones y los espacios vacíos de la ficha modal de unidad. La sección “Nosotros” debe conservar su fondo claro, pero dejar de presentar el año 2010 como elemento protagonista.

## Hallazgos técnicos confirmados contra el código actual

### 1. Mapas duplicados y dependencia inconsistente

El documento describe un iframe de Google Maps en una ubicación y un mapa Leaflet con teselas CARTO en otra. La solución profesional es una sola función reutilizable —por ejemplo, `crearMapa(contenedor, opciones)`— usada en ubicación, horarios/visita y ficha de unidad. Debe usar las coordenadas ya documentadas para 828, una constante única de zoom y teselas estándar de OpenStreetMap con atribución enlazada.

El componente debe evitar zoom accidental con la rueda, admitir Ctrl/Cmd + rueda, dar una indicación breve en español rioplatense y permitir interacción táctil con dos dedos. Cada instancia debe inicializarse mediante `IntersectionObserver`; la ficha debe crear el mapa únicamente al abrirse y llamar `invalidateSize()` después de hacerse visible. No debe quedar ninguna referencia a CARTO que exija API key ni mensajes “API KEY REQUIRED”.

### 2. Riesgos de rendimiento

El CSS actual contiene capas de fondos y tarjetas de secciones que utilizan `backdrop-filter: blur(8px)`. El prompt señala correctamente que el desenfoque sobre imágenes puede elevar el coste de pintura y composición, especialmente en Contacto y formularios. La corrección preferida es un fondo semitransparente sólido, manteniendo contraste y legibilidad.

La estrategia de rendimiento debe eliminar parallax o `background-attachment: fixed`, reducir sombras y filtros masivos, cargar fondos fuera de pantalla de forma diferida y limitar animaciones a `transform` y `opacity`. Los relojes y contadores deben compartir un único intervalo de un segundo, actualizar solamente `textContent` y pausarse cuando la sección no esté visible o la pestaña esté oculta. Para validar el diagnóstico se requiere una medición antes/después; no se deben inventar valores de Lighthouse o FPS.

### 3. Hero: diez slides, pero controles visibles que contradicen el nuevo requisito

El HTML generado ya contiene diez slides y el manifiesto ya asigna diez imágenes. Sin embargo, el hero conserva un bloque visible `.hero-carousel-controls` con flechas, contador y botón “Pausar”. El nuevo criterio pide retirarlo del HTML, CSS y JavaScript, dejando el avance, la pausa contextual, el swipe y el teclado como comportamientos invisibles.

Además, el código contiene varias reglas posteriores para `.hero-slide` y `.hero-slide img`. Antes de ajustar la experiencia conviene consolidar esas reglas para evitar que una animación pise a otra. Deben mantenerse `fetchpriority="high"` y preload solo para la primera imagen, `srcset` real, fallback si una imagen falla, soporte de `prefers-reduced-motion` y una transición sin parpadeos. La duración exacta debe quedar definida en una sola constante; el prompt recibido solicita 5,5 segundos por slide.

### 4. Separador de identidad entre secciones

El nuevo requisito solicita una tira de damero rojo/negro de dos filas, a ancho completo de viewport, entre cada par de secciones consecutivas. Debe ser decorativa (`aria-hidden="true"`), no duplicarse con bordes existentes y no producir scroll horizontal. La comprobación debe hacerse contra el DOM real, incluyendo secciones como Preguntas, Nosotros, Contacto, Tu usado, Tu búsqueda y Visita.

La implementación debe funcionar sobre la sección clara de Nosotros y en los anchos 1920, 1366, 768 y 390 px. La tira no debe modificar el flujo de foco ni introducir contenido accesible redundante.

### 5. Ficha modal de unidad

El prompt detecta huecos verticales generados por alturas fijas, `margin-top:auto`, `space-between` o `min-height`. La prioridad es compactar el modal sin eliminar funciones existentes: galería, datos reales de la publicación, acciones de contacto, compartir, comparar, copiar enlace, publicación original y cómo llegar.

El mapa debe reutilizar el componente único y crearse después de abrir el panel. En escritorio el modal debe apuntar a `max-height: 92vh` y un solo scroll interno fino; en móvil debe pasar a una columna, mantener el botón Cerrar visible y ordenar galería, datos, acciones, mapa, horarios, financiación, recomendaciones y visita. Los campos ausentes deben omitirse en lugar de rellenarse con valores inventados. El foco debe volver al botón que abrió la ficha y Escape/clic exterior deben seguir funcionando.

### 6. Sección Nosotros

La sección conserva deliberadamente su fondo claro. El dato “2010” puede permanecer como dato pequeño y trazable, pero no como tarjeta gigante. El reemplazo editorialmente seguro es una fila de cuatro datos: sociedad constituida desde 2010 según Boletín Oficial; multimarcas de autos y motos; permutas y consignaciones; y financiación a consultar.

La composición visual puede usar dos o tres fotos de unidades ya integradas, con `loading="lazy"`, `alt` descriptivo y recortes coherentes con la identidad. No deben agregarse cifras de clientes, ventas, reseñas ni años de experiencia no documentados.

## Criterios de aceptación

La aceptación requiere verificar que no haya errores de consola ni 404 de mapas, tiles, imágenes o fuentes; que no aparezca “API KEY REQUIRED”; que los tres usos del mapa compartan coordenadas, marcador, botón Centrar y atribución; que el hero tenga diez imágenes cargables y ningún control visible; que exista un damero entre cada par de secciones; y que el modal tenga un solo scroll interno, mapa diferido y datos reales.

También debe comprobarse la continuidad del menú y anclas, formularios, contador “Abierto ahora”, reloj de Argentina, comparador, compartir, copiar enlace y enlaces sociales. Las pruebas mínimas son 1920×1080, 1366×768, 768 px y 390×844, con teclado, `prefers-reduced-motion` y una prueba táctil. Las métricas de rendimiento deben reportarse solo después de medirlas en una herramienta reproducible.

## Decisiones ante ambigüedades

Se conserva Blvd. Buenos Aires 828 como dirección pública hasta resolver P4; el dato 831 continúa documentado como discrepancia, no como sustitución. Se mantienen los horarios del sitio como pendientes de validación. No se publica un número nuevo ni se convierte una línea indexada en WhatsApp. Se usan únicamente imágenes ya integradas mientras no exista autorización escrita para nuevos originales.

El prompt menciona GitHub Pages como URL publicada, pero la configuración de publicación debe verificarse antes de afirmar que el despliegue refleja un commit. Un commit en `main` no sustituye la comprobación del workflow ni una revisión con caché limpia.

## Relación con la documentación existente

- [Hallazgos derivados del TXT-MADRE](./HALLAZGOS-TXT-MADRE-2026-10-21.md)
- [Auditoría OSINT](./AUDITORIA-TXT-MADRE-OSINT-2026-10-21.md)
- [Síntesis de hallazgos y decisiones](./SINTESIS-HALLAZGOS-Y-DECISIONES-2026-10-21.md)
- [Inventario visual y mapa](./INVENTARIO-VISUAL-Y-MAPA-2026-10-21.md)
- [Pendientes de validación](../data/pendientes.json)

Este informe preserva los aportes técnicos del prompt para orientar futuras implementaciones. No constituye por sí mismo una afirmación de que los nueve cambios estén realizados.
