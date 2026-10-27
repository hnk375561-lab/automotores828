# Guía de mantenimiento — Automotores 828

1. **Cero datos inventados.** Teléfono, WhatsApp, horarios, precios, kilometrajes, servicios y reseñas solo se publican con confirmación del dueño o con fuente pública citada en `data/`.
2. **Todo dato nuevo se registra** en `data/dealership.json` o `data/vehicles.json`.
3. **El sitio se genera.** Las 4 páginas, `robots.txt`, `site.webmanifest` salen de `scripts/build-index.mjs`. Se cambia `data/` o `scripts/` y se corre `npm run build && npm test`.
4. **Conflictos entre fuentes:** no se resuelven por cuenta propia. Confirmado el 2026-10-26: la dirección es Blvd. Buenos Aires 828 y el email es automotores828@gmail.com. El único canal telefónico publicado es el WhatsApp confirmado por el dueño; el fijo 4290-7300 y los números de asesores se retiraron. Los horarios provienen de directorios públicos y quedan sujetos a confirmación.
5. **Datos personales:** no cargar datos del dueño ni de su familia sin indicación expresa.
6. **Logo y fotos:** el logo está en `images/`. Fotos de unidades, personas o local: solo con autorización escrita. Paleta: negro #060607, rojo #ee1c22, plata #d9dbdd; tipografías Exo 2 e Inter (`css/dr-identidad.css`).
7. **Demo vs. producción:** mientras `publicacion.publicIndexing` sea `false`: `noindex`, `Disallow: /` y aviso de demo.
8. **Stock:** `data/vehicles.json` solo con fichas con enlace público y fecha de relevamiento.
9. **Servicios:** solo los de `services.published` (compra y venta, permutas, consignaciones, financiación a consultar). Tasación, garantía y gestoría no están confirmados.
10. **Reseñas:** solo puntaje y cantidad de Google, con fecha y enlace.
