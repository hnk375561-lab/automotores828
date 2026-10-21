# Comparativa de prompts de correcciones — Automotores 828

**Fecha:** 21 de octubre de 2026  
**Propósito:** registrar qué aporta el contenido pegado frente a `AUDITORIA-PROMPT-CORRECCIONES-2026-10-21.md`, sin almacenar otro prompt operativo duplicado.

## Resultado de la comparación

El contenido pegado es una reformulación más breve del mismo pedido de nueve correcciones ya auditado. Mantiene los mismos ejes: mapa único sin API key, diagnóstico de lag, teselas estándar de OpenStreetMap, damero entre secciones, hero con diez imágenes, eliminación del bloque visible de controles, ficha de unidad compacta con mapa diferido y rediseño de Nosotros sin el “2010” gigante.

No agrega fuentes externas, coordenadas nuevas, datos comerciales nuevos ni autorización de publicación. Por eso no corresponde crear otro inventario ni modificar `data/dealership.json`, `data/sources.json` o `data/pendientes.json` a partir de este contenido.

## Aportes útiles que quedan confirmados

El texto vuelve a precisar que los mapas de Nosotros y Horarios/Visita deben ser exactamente el mismo componente visual y funcional. La implementación debe retirar CARTO con API key, conservar el botón “Centrar”, usar OpenStreetMap con atribución correcta, evitar zoom accidental con rueda y cargar el mapa de forma diferida.

También confirma que el objetivo de rendimiento no se puede validar por apreciación: hay que documentar qué causaba el lag y medir antes/después. Las áreas de mayor riesgo siguen siendo `backdrop-filter` sobre fondos fotográficos, parallax, listeners de scroll, imágenes grandes y el iframe de Google Maps.

En el hero, el texto reafirma dos decisiones de producto: las imágenes deben proceder de unidades ya integradas y no de stock externo, y el bloque visible de flechas/contador/“Pausar” debe desaparecer sin eliminar swipe, teclado ni avance automático. En la ficha, confirma que el mapa debe inicializarse solo al abrir el modal y que los datos ausentes se omiten, nunca se inventan.

Para Nosotros, se mantiene como contenido publicable solamente lo trazable: sociedad constituida desde 2010 según Boletín Oficial, multimarcas, permutas/consignaciones y financiación a consultar. La propuesta visual de collage debe reutilizar imágenes locales ya presentes y conservar el fondo claro.

## Diferencias menores respecto de la auditoría anterior

La nueva versión simplifica el alcance del mapa a dos ubicaciones principales y vuelve a mencionar que el despliegue debe comprobarse en GitHub Pages. Esto es una tarea de verificación de publicación, no una fuente de datos. También expresa el intervalo del hero como “aproximadamente 5–6 segundos”, por lo que no reemplaza la necesidad de definir una única constante de duración durante la implementación.

La comparación recomienda mantener como referencia principal la auditoría técnica anterior, que ya incluye criterios de aceptación, decisiones sobre las ambigüedades 828/831, restricciones editoriales, accesibilidad y límites de lo que puede declararse realizado.

## Decisión de repositorio

No se sube `pasted_content.txt` ni se duplica su contenido como un segundo prompt. Se incorpora únicamente esta nota de control y se conserva como fuente normativa la auditoría técnica existente:

- [Auditoría técnica del prompt de correcciones](./AUDITORIA-PROMPT-CORRECCIONES-2026-10-21.md)
- [Hallazgos derivados del TXT-MADRE](./HALLAZGOS-TXT-MADRE-2026-10-21.md)
- [Síntesis de hallazgos y decisiones](./SINTESIS-HALLAZGOS-Y-DECISIONES-2026-10-21.md)

Esta comparativa no declara realizados los nueve cambios; solo asegura trazabilidad y evita mantener versiones redundantes del mismo requerimiento.
