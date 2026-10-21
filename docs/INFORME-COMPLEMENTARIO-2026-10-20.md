# Informe complementario de investigación — Automotores 828

**Fecha de consulta:** 20 de octubre de 2026.  
**Repositorio auditado:** [github.com/hnk375561-lab/automotores828](https://github.com/hnk375561-lab/automotores828).  
**Criterio:** se excluyeron las 48 unidades, sus fichas, precios y especificaciones ya presentes. También se excluyeron como “hallazgos nuevos” la dirección 828, redes, correo, horarios de directorio, vehículos usados/0 km, financiación genérica, permutas y consignaciones cuando ya estaban documentados en `data/`.

## Hallazgos nuevos y relevantes

### 1. Historia societaria documentada — **CONFIRMADO**

El Boletín Oficial de la Provincia de Buenos Aires publica un ampliatorio del contrato social de **Automotores 828 S.R.L.**. El aviso indica que el contrato constitutivo es del **1 de marzo de 2010**, instrumentado el 3 de marzo de 2010, y que el trámite se relaciona con la sociedad constituida en Monte Grande, partido de Esteban Echeverría. También informa una duración social de 99 años a partir de la inscripción. Es evidencia institucional más sólida que la mención comercial de “18/19/20 años” que ya aparece en el sitio o en redes.

**Ubicación sugerida:** sección “Nosotros” o “Trayectoria”, como “Sociedad constituida en 2010 según aviso del Boletín Oficial”. No convertir automáticamente esa fecha en “años de experiencia” actuales sin distinguir antigüedad societaria de experiencia del equipo.

[1]

### 2. Identificación fiscal y actividad — **CONFIRMADO COMO DATO PÚBLICO; PENDIENTE DE AUTORIZACIÓN PARA PUBLICAR**

El listado de concesionarias adheridas a FACCARA publicado por Banco Nación, fechado el **11/09/2019**, registra: **AUTOMOTORES 828 S.R.L. — CUIT 30-71145457-4 — Multimarcas — Monte Grande — Buenos Aires**. El mismo registro publica el teléfono **4290-7300**. La Guía Online repite la razón social y el CUIT, pero es un directorio de terceros, no un registro oficial.

El repositorio auditado tiene `legalName`, pero conserva el CUIT como `null`; por lo tanto, el CUIT es un faltante real. Conviene validar con el negocio si ese CUIT sigue vigente y si desea exhibirlo en el pie institucional, términos comerciales o facturación.

**Ubicación sugerida:** pie institucional, “Datos de la empresa” o página de términos comerciales, solo después de validación del responsable.

[2] [3]

### 3. Teléfono fijo público corroborado — **CONFIRMADO COMO PUBLICADO POR TERCEROS; PENDIENTE DE CONFIRMACIÓN DEL NEGOCIO**

El teléfono **+54 11 4290-7300** aparece en el listado FACCARA/Banco Nación de 2019 y vuelve a aparecer en Near Place para el local de Boulevard Buenos Aires 828. El repositorio mantiene teléfono y WhatsApp en `null` por una regla interna de no publicar contactos no confirmados por el dueño. La evidencia permite registrar el número como contacto público histórico y de directorio, pero no prueba que siga operativo en octubre de 2026.

**Ubicación sugerida:** contacto y encabezado de conversión, únicamente si el negocio confirma vigencia y autorización. No presentar como WhatsApp.

[2] [4]

### 4. Condiciones concretas de financiación en una publicación reciente — **CONFIRMADO PARA ESA PUBLICACIÓN; NO CONFIRMADO COMO POLÍTICA GENERAL**

Una publicación de Mercado Libre consultada el 20/10/2026 declara, para esa unidad específica: **anticipo de US$ 2.500, saldo de US$ 2.500, financiación de 6 a 24 cuotas fijas en pesos y precio contado de US$ 5.000**. La misma descripción afirma “vehículos 100% al día y transferidos”, “entrega inmediata” y que toman el usado en parte de pago.

Esto amplía la información comercial ausente, pero no debe transformarse en una regla general del negocio: el anticipo, saldo, moneda, cantidad de cuotas y precio corresponden a una publicación puntual y pueden cambiar. Tampoco constituye por sí solo una garantía contractual ni explica tasas, gastos, requisitos, entidad financiera, prenda o aprobación crediticia.

**Ubicación sugerida:** FAQ/financiación, como ejemplo histórico o como campos dinámicos por unidad. Antes de publicar una política general, pedir confirmación sobre tasas, gastos, requisitos, moneda, entidad, documentación y vigencia.

[5]

### 5. Reputación y volumen de presencia en Facebook — **DATO PÚBLICO DE TERCEROS; VIGENCIA A CONFIRMAR**

El resultado público indexado de Facebook muestra aproximadamente **6.779 seguidores**, **25 personas hablando de la página** y **186 registros de visitas**. No se pudo abrir el muro sin autenticación; por eso estos números deben tratarse como una captura de buscador, no como métrica auditada en la página.

**Ubicación sugerida:** no publicar cifras en la web sin consulta directa y fecha de actualización. Como máximo, usar internamente para priorizar una integración o enlace a la página oficial.

[6]

### 6. Reputación en directorios — **DUDOSO / NO APTO PARA PUBLICAR COMO RESEÑA OFICIAL**

Argentino muestra una puntuación de **4,01** y resume opiniones positivas y negativas: algunos clientes destacan trato, permutas y asesoramiento; otros mencionan problemas de trato y falta de respuesta ante fallas posteriores a la venta. Concesionaria Online muestra **4,1 estrellas** y afirma basarse en **232 opiniones**, pero no entrega en la página consultada un enlace verificable a la ficha original de Google ni un método de auditoría.

Los números y resúmenes no son consistentes entre directorios y no deben incorporarse como “reseñas de Google” en el sitio. Además, los comentarios sobre fallas posteriores a la venta son alegaciones de terceros, no hechos comprobados. La auditoría del repositorio confirma que las reseñas ya estaban correctamente dejadas como no publicadas.

**Ubicación sugerida:** ninguna hasta obtener el enlace directo a la ficha oficial de Google, fecha, cantidad y puntuación actuales; si se incorporan, mostrar también el enlace a la fuente y no seleccionar solo testimonios favorables.

[7] [8]

### 7. Presencia en directorios comerciales y geolocalización — **CONFIRMADO COMO PRESENCIA DE TERCEROS; INFORMACIÓN PARCIAL**

Near Place publica el local en Boulevard Buenos Aires 828, el teléfono 4290-7300 y coordenadas aproximadas **-34.8140275, -58.4554839**, pero su ficha muestra todos los días como “cerrado”, en conflicto con los horarios ya incorporados desde otros directorios. La Guía Online identifica la razón social y el CUIT, pero no lista servicios específicos ni reseñas. Cylex no aporta opiniones verificadas y su enlace de “sitio web” remite al perfil de Mercado Libre.

**Ubicación sugerida:** no sumar directorios como si fueran canales oficiales. Las coordenadas pueden servir para revisar el mapa, pero requieren validación de domicilio y exactitud del local.

[4] [3] [9]

## Contradicciones que requieren resolución

- **Domicilio 828 vs. 831:** el repositorio, Facebook indexado, directorios y Near Place usan Boulevard/Bv. Buenos Aires 828. Una publicación de Mercado Libre consultada el 20/10/2026 dice Boulevard Buenos Aires 831; EMIS también muestra 831, pero es una ficha de terceros y sus fechas de fundación son inconsistentes. No debe cambiarse la dirección del sitio sin confirmación directa.
- **Antigüedad:** el Boletín Oficial documenta una sociedad constituida en 2010; Instagram indexado habla de “más de 19 años”, una publicación de Mercado Libre habla de “20 años” y el sitio auditado muestra “18 años”. Pueden referirse a conceptos distintos o contener desactualizaciones. No unificar esas cifras sin que el negocio defina qué período está afirmando.
- **Horarios:** el repositorio usa L–V 9–13 y 15–19, sábado 9–13 y domingo cerrado. Near Place muestra todos los días cerrados; Concesionaria Online repite horarios de directorio. La divergencia confirma que siguen siendo datos a validar.
- **Teléfonos móviles de Instagram:** el resultado indexado del perfil muestra contactos asociados a “Adriano” y “Ruben”, además del fijo. No se incorporan números móviles ni nombres de personas: no está probado que sean líneas institucionales actuales y podrían ser datos personales o vendedores individuales.

## No encontrado tras la investigación

- **Garantía escrita, cobertura, plazo, exclusiones y procedimiento de reclamo:** **NO ENCONTRADO**.
- **Requisitos documentales y crediticios de financiación; entidad financiera, tasa, CFT, gastos, prenda y aprobación:** **NO ENCONTRADO**. Solo aparece el rango de 6–24 cuotas fijas en una publicación puntual.
- **Medios de pago aceptados:** **NO ENCONTRADO** como política general. No debe deducirse de que algunas publicaciones usen pesos o dólares.
- **Política formal de permutas y consignaciones:** **NO ENCONTRADO**. La existencia del servicio está documentada, pero faltan criterios de valuación, documentación, comisión, plazos, guarda, responsabilidad y forma de liquidación.
- **Gestoría, transferencia, verificación policial, informes de dominio, deudas, multas y entrega:** **NO ENCONTRADO** como servicio institucional verificable.
- **Sucursal adicional o depósito independiente:** **NO ENCONTRADO**. Las menciones a 828/831 parecen referir al mismo entorno comercial, pero la diferencia de numeración queda abierta.
- **Sitio web oficial, dominio propio y autorización de uso de fotografías/logo:** **NO ENCONTRADO**. El repositorio se declara expresamente demo no oficial.
- **Política de atención posventa y canal formal de reclamos:** **NO ENCONTRADO**.

## Faltantes prioritarios para confirmar con Automotores 828

1. Domicilio operativo exacto: **828 o 831**, y si existe más de una entrada o sede.
2. Vigencia y autorización de publicación del **CUIT 30-71145457-4** y del fijo **+54 11 4290-7300**.
3. Definición única y vigente de antigüedad: sociedad desde 2010, experiencia del equipo o trayectoria comercial, con la cifra que el negocio autorice.
4. Política completa de financiación: anticipo mínimo, cuotas, tasa/CFT, moneda, gastos, prenda, requisitos, entidad y aprobación.
5. Garantía legal/comercial y procedimiento de reclamos, incluyendo qué documentación se entrega con cada unidad.
6. Condiciones de permuta y consignación, medios de pago y servicios de gestoría/transferencia.
7. Horarios actuales, canales institucionales autorizados y eventual ficha oficial de Google para citar reputación sin depender de directorios.

## Referencias

[1]: https://boletinoficial.gba.gob.ar/secciones/449/ver "Boletín Oficial de la Provincia de Buenos Aires — aviso de Automotores 828 S.R.L."
[2]: https://www.bna.com.ar/Downloads/Autos-Listado-de-Concesionarias-Adheridas-a-FACCARA-11092019.pdf "Banco Nación — listado de concesionarias adheridas a FACCARA, 11/09/2019"
[3]: https://laguiaonline.com.ar/businesses/automotores-828-srl "La Guía Online — Automotores 828 SRL"
[4]: https://ar.near-place.com/automotores-828-srl-boulevard-buenos-aires-828-monte-grande "Near Place — Automotores 828 SRL"
[5]: https://auto.mercadolibre.com.ar/MLA-4069574430-honda-fit-15-ex-at-_JM "Mercado Libre — publicación de Honda Fit 1.5 EX AT"
[6]: https://www.facebook.com/automotoressrl828/ "Facebook — Automotores 828"
[7]: https://www.argentino.com.ar/automotores-828-srl-F110DC20212D546 "Argentino — Automotores 828 SRL"
[8]: https://concesionariaonline.com.ar/concesionarios-de-coches/automotores-828-srl/ "Concesionaria Online — Automotores 828 SRL"
[9]: https://www.cylex.com.ar/monte-grande/automotores-828-srl-11668018.html "Cylex — Automotores 828 SRL"
