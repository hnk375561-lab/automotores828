# Hallazgos accionables derivados del TXT-MADRE — Automotores 828

**Fecha de corte:** 21 de octubre de 2026  
**Propósito:** conservar en el repositorio las investigaciones y decisiones que aportan valor operativo, editorial y técnico, sin subir el TXT-MADRE original ni sus instrucciones completas.

## 1. Estado de la investigación incorporada

El repositorio ya contiene una base investigada y trazable sobre Automotores 828: identidad comercial y societaria, inventario público relevado, fuentes OSINT, discrepancias de domicilio, horarios en conflicto, canales pendientes de confirmar, límites de publicación y criterios de uso de imágenes. La fuente de verdad operativa se distribuye entre `data/`, los informes de `docs/` y los pendientes de validación; no se debe reconstruir información desde capturas o textos sueltos.

La captura de Mercado Libre reconciliada al 21/10/2026 contiene **58 publicaciones únicas**: 50 autos/camionetas y 8 motos, con **771 fotografías asociadas**. Los precios, atributos, disponibilidad y financiación de publicaciones individuales son observaciones temporales, no promesas comerciales ni sincronización en tiempo real.

## 2. Hallazgos que sí aportan valor

### Identidad y trayectoria

- La razón social observada es **Automotores 828 S.R.L.**
- El Boletín Oficial de la Provincia de Buenos Aires documenta un contrato constitutivo del **1/03/2010**. Es el dato institucional más sólido sobre antigüedad societaria.
- La redacción segura es «Sociedad constituida en 2010 según aviso del Boletín Oficial». No equivale automáticamente a «20 años de experiencia»: esa afirmación aparece en perfiles comerciales y mide un concepto distinto o no documentado.

### Oferta y financiación

- La presencia pública relevada respalda como líneas de actividad observadas: vehículos usados, posibles vehículos 0 km, financiación/cuotas fijas, permutas y consignaciones.
- La publicación MLA-4069574430 menciona, para esa unidad concreta, anticipo de US$ 2.500, saldo de US$ 2.500 y 6 a 24 cuotas fijas en pesos. No debe convertirse en una condición general del negocio sin confirmar tasa, CFT, gastos, requisitos, moneda, entidad y vigencia.
- El sitio debe mantener una explicación general de financiación hasta que el negocio entregue condiciones autorizadas y completas.

### Domicilio y mapa

- La dirección pública del proyecto permanece en **Blvd. Buenos Aires 828, Monte Grande**.
- Fuentes registrales y algunos directorios muestran **Boulevard Buenos Aires 831**. La discrepancia puede corresponder a domicilio fiscal, numeración o entrada, pero no está resuelta.
- La coordenada guardada para 828 fue contrastada con Nominatim y Photon; el número 831 devuelve un objeto cercano distinto. Esto mejora el mapa, pero no resuelve la decisión comercial: el pendiente P4 sigue abierto.
- No se debe reemplazar 828 por 831, publicar ambas como si fueran equivalentes ni fijar SEO local definitivo sin confirmación directa del negocio.

### Canales, horarios y movilidad

- El fijo **+54 11 4290-7300** aparece en fuentes públicas históricas y directorios, pero queda pendiente de confirmación y autorización.
- La línea móvil indexada no se publica: podría ser personal o de un vendedor.
- El perfil de TikTok `@828automotores` existe y parece compatible con la marca, pero su titularidad comercial debe confirmarse antes de enlazarlo como canal oficial.
- Los horarios actuales del sitio se conservan como contenido pendiente de validación: los directorios muestran grillas incompatibles.
- Moovit ofrece puntos y líneas de transporte útiles como pista, no como indicación oficial: sus rutas, tiempos y dirección de destino deben verificarse antes de publicarse.

## 3. Decisiones editoriales y de seguridad

No publicar como hechos, sin aprobación del negocio: ratings o reseñas de directorios; métricas de seguidores; contactos de posible carácter personal; entrega a domicilio; políticas generales de 0 km, financiación, garantía o posventa; datos fiscales como contenido destacado; ni la variante de nombre «828 Automotores» para SEO.

La demo continúa **no indexable**. Se mantienen `publicIndexing: false`, el aviso de demo y `Disallow: /`. Las fotos descargadas de publicaciones públicas no se consideran automáticamente autorizadas para uso institucional: el pendiente P2 registra la necesidad de recibir originales y autorización escrita antes de una publicación real.

## 4. Hallazgos técnicos de mayor impacto

1. Las fotos disponibles no llegan de forma general a 1600 px: el hero alcanza 1440 px y el stock llega como máximo a 1200 px; no corresponde inventar resolución ni aplicar upscaling agresivo.
2. El manifiesto de imágenes asigna fondos y slides sin repetir tomas entre secciones; debe validarse mediante script antes de cambiar asignaciones.
3. El carrusel del hero requiere diez slides homogéneos, precarga de la primera imagen, fallback para `prefers-reduced-motion` y ausencia de CLS.
4. El mapa real depende de coordenadas verificadas, Leaflet vendorizado y teselas oscuras con atribución correcta; el respaldo de mapa debe permanecer disponible.
5. La grilla de unidades debe preservar buscador, filtros, orden y comparador al pasar a cinco columnas en escritorio.
6. Las verificaciones de imágenes deben cubrir existencia de assets, duplicados, resolución, transparencia del logo y duración uniforme del hero; estas comprobaciones son complementarias a los tests de datos y copy.

## 5. Validaciones prioritarias antes de salir de demo

- Confirmar si el salón opera en 828, 831 o ambos puntos.
- Confirmar horarios, teléfono fijo, canales sociales y eventual WhatsApp institucional.
- Recibir originales de alta resolución y autorización de uso de fotos/logos.
- Definir condiciones completas de financiación, garantía, posventa, permuta, consignación y gestoría.
- Obtener el enlace de la ficha oficial de Google antes de mostrar reputación.
- Confirmar titularidad de TikTok, variante de nombre y datos de movilidad si se desean publicar.

## 6. Trazabilidad

- [Auditoría OSINT del TXT-MADRE](./AUDITORIA-TXT-MADRE-OSINT-2026-10-21.md)
- [Síntesis de hallazgos y decisiones](./SINTESIS-HALLAZGOS-Y-DECISIONES-2026-10-21.md)
- [Investigación complementaria](./INVESTIGACION-COMPLEMENTARIA-2026-10-21.md)
- [Inventario visual y mapa](./INVENTARIO-VISUAL-Y-MAPA-2026-10-21.md)
- [Fuentes estructuradas](../data/sources.json)
- [Pendientes de validación](../data/pendientes.json)

Este documento es una síntesis editorial y técnica. No reemplaza la verificación directa con el titular del negocio ni autoriza por sí mismo la publicación de datos comerciales.
