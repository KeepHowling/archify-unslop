# archify-unslop

Genera diagramas técnicos como HTML standalone con diseño Unslop/Impeccable. Wrapper de [Archify](https://claude.ai) con brand adaptation vía Puppeteer.

## Prerequisito

Archify skill instalado. Por defecto se busca en `C:\Users\Seguridad\.claude\skills\archify`.

## Configuración

Para usar en otra máquina o ruta, establece la variable de entorno `ARCHIFY_SKILL_PATH`:

```
ARCHIFY_SKILL_PATH=/ruta/al/skill node bin/archify-unslop.mjs render architecture diagram.json out.html
```

En Windows PowerShell:

```powershell
$env:ARCHIFY_SKILL_PATH = "C:\otras\rutas\archify"
node bin/archify-unslop.mjs render architecture diagram.json out.html
```

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
