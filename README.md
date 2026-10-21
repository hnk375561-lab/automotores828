# Automotores 828 — sitio web

Sitio estático de Automotores 828 (Blvd. Buenos Aires 828, Monte Grande, Esteban Echeverría, Buenos Aires). Estado: **demo no indexable** construida con información pública.

Las páginas se generan desde `data/dealership.json` y `data/vehicles.json` con `npm run build` (`scripts/build-index.mjs`, estilos en `scripts/estilos.css`). No se editan a mano.

| Comando | Qué hace |
|---|---|
| `npm run build` | Regenera index, reserva, privacidad y 404 |
| `npm test` | Valida datos y que no haya afirmaciones sin fuente |
| `npm run test:prod` | Puerta de salida a producción |
| `npm run dev` | Servidor local en http://localhost:8080 |
| `npm run site` | Arma `_site/` con solo los archivos públicos |

Stock: cargar unidades en `data/vehicles.json` con enlace a su publicación original, fecha de relevamiento y fotos autorizadas; luego `npm run build && npm test`. La captura del 21/10/2026 reconcilió 58 publicaciones individuales del perfil público de Mercado Libre (50 autos y camionetas, 8 motos), con 771 imágenes de sus galerías descargadas y asociadas por anuncio. Cada ficha conserva URL, precio y moneda observados, atributos publicados y fecha; no es una sincronización en tiempo real ni garantiza precio o disponibilidad posteriores. Ver `docs/INVENTARIO-MERCADOLIBRE-2026-10-21.md` y `data/sources.json`.

La investigación comercial y OSINT está documentada en `docs/INFORME-COMPLEMENTARIO-2026-10-20.md`, `docs/INVESTIGACION-COMPLEMENTARIA-2026-10-21.md` y `docs/AUDITORIA-TXT-MADRE-OSINT-2026-10-21.md`. La síntesis ejecutiva `docs/SINTESIS-HALLAZGOS-Y-DECISIONES-2026-10-21.md` reúne qué datos están respaldados, qué contradicciones siguen abiertas (en especial 828/831, horarios y antigüedad), qué no debe publicarse como hecho y las validaciones prioritarias antes de convertir la demo en un sitio oficial. El resumen curado `docs/HALLAZGOS-TXT-MADRE-2026-10-21.md` conserva los aportes accionables del TXT-MADRE sin subir el archivo fuente. La auditoría técnica del nuevo prompt de correcciones está en `docs/AUDITORIA-PROMPT-CORRECCIONES-2026-10-21.md`, y `docs/COMPARATIVA-PROMPTS-2026-10-21.md` documenta la deduplicación del contenido pegado.

La trazabilidad de las decisiones visuales, el manifiesto de imágenes, los límites de resolución y la verificación de coordenadas del mapa están en `docs/INVENTARIO-VISUAL-Y-MAPA-2026-10-21.md`, `data/image-manifest.json` y `scripts/audit-images.py`.
