# Demo en Cloudflare Pages (repo privado)

Estado: **demo no publicable** (`noindex` en HTML, `robots.txt` y cabecera `X-Robots-Tag`).

## Una sola vez
1. GitHub → repo → Settings → General → **Change visibility → Make private**.
2. Cloudflare → Workers & Pages → Create → **Pages → Connect to Git** → autorizar GitHub y elegir `automotores828`.
3. Configuración del build:
   - Framework preset: **None**
   - Build command: `node scripts/build-site.mjs`
   - Build output directory: `_site`
   - Variable de entorno (opcional): `NODE_VERSION` = `20` (ya está `.node-version`)
4. Save and Deploy. La URL queda `https://<proyecto>.pages.dev`.

## Qué resuelve solo
- `og:image` / `og:url`: `scripts/build-site.mjs` los reescribe con `CF_PAGES_URL`, que Cloudflare define en cada build. No hace falta cargar `previewUrl`.
- Cabeceras de caché y `noindex`: se generan en `_site/_headers`.
- Solo se publica la lista blanca de `build-site.mjs` (sin `data/`, `scripts/`, `docs/`).

## Cada cambio
Subir archivos al repo → Cloudflare redepliega solo. Si cambia `data/` o `scripts/`: `npm run build && npm test` antes de subir.

## Si algún día se quiere hacer oficial
Ver `npm run test:prod` y `data/pendientes.json` (P3: dominio y aprobación del dueño).
