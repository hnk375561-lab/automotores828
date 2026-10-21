# Síntesis de hallazgos y decisiones editoriales — Automotores 828

**Corte de investigación:** 21 de octubre de 2026  
**Propósito:** convertir la investigación pública disponible en criterios accionables para el sitio demo, sin confundir datos observados, datos autorizados y afirmaciones todavía pendientes de validación.

> Este documento agrega valor editorial y operativo al repositorio. No reemplaza las fuentes detalladas en `docs/INFORME-COMPLEMENTARIO-2026-10-20.md`, `docs/INVESTIGACION-COMPLEMENTARIA-2026-10-21.md`, `docs/AUDITORIA-TXT-MADRE-OSINT-2026-10-21.md` ni el inventario de `data/`.

## 1. Qué queda respaldado y puede orientar el contenido

### Identidad y trayectoria societaria

- La razón social observada es **Automotores 828 S.R.L.**
- El Boletín Oficial de la Provincia de Buenos Aires documenta un contrato constitutivo del **1 de marzo de 2010**. Este es el dato institucional más sólido sobre antigüedad societaria.
- La formulación segura es: **“Sociedad constituida en 2010 según aviso del Boletín Oficial”**. No debe convertirse automáticamente en “20 años de experiencia”, porque las redes y los directorios mezclan antigüedad legal, experiencia del equipo y afirmaciones comerciales.

### Oferta observada

- La captura de Mercado Libre del 21/10/2026 reconcilió **58 publicaciones únicas**: 50 autos/camionetas y 8 motos.
- Se asociaron **771 fotografías** a las fichas relevadas.
- Los precios, kilometrajes, equipamiento, disponibilidad y moneda son una fotografía temporal de las publicaciones. No son una cotización ni una garantía de existencia actual.
- Una publicación puntual documentó anticipo de **US$ 2.500**, saldo de **US$ 2.500** y financiación de **6 a 24 cuotas fijas en pesos**. Este dato solo puede atribuirse a esa publicación; no habilita una política general de financiación.

### Canales y contacto

- Instagram y Facebook son canales públicos asociados a la marca en el relevamiento, pero las métricas sociales son variables y no deben publicarse como actuales sin fecha y confirmación.
- El fijo **+54 11 4290-7300** aparece en fuentes públicas históricas y directorios, pero todavía debe confirmarse como vigente y autorizado por el negocio.
- La línea **11 6023-9259** aparece en un fragmento indexado de Instagram, pero no está confirmado que sea institucional. Debe permanecer fuera del sitio.
- El perfil de TikTok `@828automotores` existe y presenta señales compatibles con la marca, pero su vínculo oficial aún no está confirmado. No enlazarlo como canal oficial hasta validación directa.

## 2. Contradicciones que deben permanecer visibles internamente

### Domicilio 828 vs. 831

La dirección pública operativa del proyecto permanece en **Blvd. Buenos Aires 828, Monte Grande**, respaldada por el repositorio, redes indexadas y varios directorios. En paralelo, fuentes registrales y algunos directorios muestran **Boulevard Buenos Aires 831**, que puede ser domicilio fiscal o una diferencia de numeración, pero no está demostrado que sea la entrada o salón actual.

**Decisión:** no cambiar la dirección pública ni resolver el mapa en favor de 831 sin confirmación directa del negocio. El conflicto queda documentado en `data/dealership.json`.

### Horarios

El sitio conserva L–V **09:00–13:00 y 15:00–19:00**, sábados **09:00–13:00**, domingos cerrado. Cylex muestra otra grilla, y otros directorios incluso indican cierre total o replican horarios sin trazabilidad suficiente.

**Decisión:** no reemplazar los horarios actuales con datos de directorios. Confirmar con el negocio o con la ficha oficial vigente antes de publicar una nueva grilla.

### Antigüedad comercial

La fecha societaria 2010 convive con menciones de “18”, “19” y “20 años” en distintos perfiles o publicaciones. No se sabe si esas frases refieren a experiencia del equipo, actividad previa o una afirmación desactualizada.

**Decisión:** usar únicamente la formulación institucional de 2010 hasta que el negocio autorice una definición de trayectoria comercial.

## 3. Qué no debe publicarse como hecho

- Ratings o reseñas de directorios como si fueran la ficha oficial de Google. Se observaron cifras incompatibles entre fuentes y no existe un enlace primario verificable común.
- Datos de entrega a domicilio, venta de 0 km, cuotas, aprobación crediticia o “vehículos al día y transferidos” como políticas generales cuando solo aparecen en directorios o en una publicación individual.
- La línea móvil indexada, nombres de vendedores o contactos que podrían ser personales.
- Métricas de seguidores, cantidad de publicaciones o “me gusta” sin fecha de consulta y sin confirmación de vigencia.
- Rutas de transporte y tiempos de caminata de Moovit como instrucciones oficiales: son útiles como orientación exploratoria, pero la ficha tiene una dirección malformada y datos sujetos a cambios.
- CUIT, domicilio fiscal o actividad registral como contenido destacado del salón sin autorización expresa del responsable.
- Fotografías, logos o imágenes de terceros fuera de los activos ya integrados y de las publicaciones cuya reutilización esté permitida.

## 4. Priorización de validaciones con mayor retorno

| Prioridad | Validación | Por qué cambia el sitio |
|---|---|---|
| P0 | Dirección operativa exacta: 828, 831 o ambas | Define mapa, indicaciones, SEO local y confianza del visitante |
| P0 | Horarios actuales | Evita que el contador “Abierto ahora” y la visita programada sean incorrectos |
| P0 | Vigencia del fijo y canales oficiales | Habilita llamadas y conversiones sin publicar contactos obsoletos |
| P1 | Política real de financiación | Permite reemplazar el mensaje genérico por condiciones responsables y comprensibles |
| P1 | Garantía, documentación y reclamos | Reduce ambigüedad en una compra de alto valor y fortalece la guía de compra |
| P1 | Permutas y consignaciones | Permite explicar documentación, valuación, comisiones, plazos y responsabilidades |
| P2 | Ficha oficial de Google y reputación | Habilita reputación trazable con URL, fecha, escala y cantidad de reseñas |
| P2 | Autorización de TikTok y variante de nombre | Mejora descubrimiento y metadatos sin enlazar cuentas no verificadas |
| P2 | Transporte público vigente | Permite enriquecer “Cómo llegar” sin presentar rutas desactualizadas |

## 5. Traducción de la especificación visual a criterios de investigación

La solicitud de mejoras visuales no debe ejecutarse a costa de inventar información. Antes de implementar fondos, carruseles o un mapa real, deben resolverse estos insumos:

1. **Mapa:** verificar las coordenadas de la entrada que corresponda a la dirección confirmada; documentar la fuente y la discrepancia 828/831 antes de fijar `LAT` y `LNG`.
2. **Imágenes:** inventariar dimensiones, orientación, calidad, marcas de agua y autorización de uso. Las 771 fotos de Mercado Libre están ligadas a fichas públicas, pero el hecho de poder descargarlas no equivale por sí solo a autorización de reutilización institucional.
3. **Manifiesto:** asignar imágenes por sección sin duplicarlas y conservar una trazabilidad hacia el anuncio de origen. Si faltan fotos propias de fachada/showroom, declararlo en vez de usar stock externo.
4. **Financiación:** mantener el copy general hasta confirmar condiciones; una publicación individual no alcanza para poblar una tabla de tasas, cuotas o requisitos.
5. **Contacto y visita:** no convertir teléfonos de terceros en WhatsApp ni prometer horarios hasta validación.
6. **SEO y schema:** conservar la condición de demo no oficial y no agregar `sameAs`, `telephone`, `aggregateRating` o dirección alternativa como datos oficiales sin autorización.

## 6. Estado de cobertura y limitaciones

- La investigación es parcial y representa el estado observado al 21/10/2026.
- Algunas fuentes se consultaron mediante fragmentos indexados o con acceso automatizado limitado.
- No se verificaron en forma concluyente Google Business Profile, reputación primaria, Wayback, WHOIS/RDAP, todos los mapas ni canales de prensa.
- Las fuentes de directorio sirven para detectar pistas y contradicciones, no para sustituir la confirmación del negocio.
- El repositorio es una **demo no indexable**; ningún dato de esta síntesis debe interpretarse como promesa comercial, inspección mecánica, garantía, cotización o disponibilidad en tiempo real.

## 7. Referencias de trabajo

- [Inventario Mercado Libre](./INVENTARIO-MERCADOLIBRE-2026-10-21.md)
- [Informe complementario](./INFORME-COMPLEMENTARIO-2026-10-20.md)
- [Investigación complementaria](./INVESTIGACION-COMPLEMENTARIA-2026-10-21.md)
- [Auditoría del TXT madre](./AUDITORIA-TXT-MADRE-OSINT-2026-10-21.md)
- [Fuentes estructuradas](../data/sources.json)
- [Modelo de datos del negocio](../data/dealership.json)
