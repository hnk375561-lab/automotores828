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

Stock: cargar unidades en `data/vehicles.json` con enlace a su publicación original, fecha de relevamiento y fotos autorizadas; luego `npm run build && npm test`. La consulta actual incorporó 48 tarjetas cargadas del listado público de Mercado Libre en `data/vehicles.json`. El listado informó 58 resultados, por lo que el catálogo no se presenta como una sincronización completa ni como garantía de disponibilidad.
