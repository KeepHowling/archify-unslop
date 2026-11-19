# archify-unslop

Genera diagramas técnicos como HTML standalone con diseño Unslop/Impeccable. Wrapper de [Archify](https://claude.ai) con brand adaptation vía Puppeteer.

## Prerequisito

Archify skill instalado en `C:\Users\Seguridad\.claude\skills\archify`.

## Instalación

npm install

## Uso

### Render básico

node bin/archify-unslop.mjs render architecture diagram.json out.html

### Con brand desde URL

node bin/archify-unslop.mjs render architecture diagram.json out.html --brand https://www.sanitas.es

### Extraer brand a JSON (reutilizable)

node bin/archify-unslop.mjs brand https://www.sanitas.es --out brand.json

### Render con brand JSON

node bin/archify-unslop.mjs render architecture diagram.json out.html --brand brand.json

## Tipos de diagrama

Los mismos 10 tipos que Archify: `architecture`, `workflow`, `sequence`, `dataflow`, `lifecycle`, `erd`, `tree`, `class`, `timeline`, `waterfall`.

Schemas JSON idénticos a Archify — ver `C:\Users\Seguridad\.claude\skills\archify\SKILL.md`.
