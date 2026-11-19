# Archify Unslop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork de Archify que reemplaza el template HTML con un renderer Unslop/Impeccable y añade extracción de brand desde URL via Puppeteer.

**Architecture:** Copiar el skill de Archify al directorio `archify-unslop/`, reemplazar `assets/template.html` con uno nuevo basado en CSS custom properties y tokens Unslop, y añadir `src/brand.mjs` que extrae colores/tipografía de una URL y genera `brand.json`. El CLI envuelve el flujo existente añadiendo `--brand` flag que inyecta el `brand.json` como overrides de custom properties en el HTML final.

**Tech Stack:** Node.js ESM, Puppeteer (extracción de brand), CSS custom properties, Lucide icons (inlineados como SVG), Inter + JetBrains Mono (fuentes).

**Spec:** `docs/superpowers/plans/2026-11-19-archify-unslop.md` (este documento) + design doc aprobado en conversación.

## Global Constraints

- Node.js ≥ 18 (ESM nativo, `fetch` global disponible).
- Puppeteer como dependencia de producción (no devDependency) — se usa en runtime para `--brand <url>`.
- Preservar todos los schemas JSON de Archify sin modificaciones — compatibilidad de entrada 100%.
- Preservar toda la lógica de renderers SVG (architecture, workflow, sequence, dataflow, lifecycle, erd, tree, class, timeline, waterfall) — solo se modifica el template HTML y el CLI wrapper.
- Spacing en múltiplos de 4px.
- Sin gradientes de color, sin glows, sin `box-shadow` de color en el template.
- Un único acento (`--color-accent`) usado solo en acción primaria, selección y cifra clave.
- Lucide icons para íconos de UI del viewer (no para contenido de diagramas).
- Tipografía: Inter para UI chrome, JetBrains Mono para meta/números (ya bundleado en Archify).

## Review Focus

- Brand extraction falla silenciosamente si Puppeteer no puede cargar la URL (timeout, auth, CSP) — debe lanzar error descriptivo con la URL y el motivo.
- `brand.json` generado de una URL y luego usado con `--brand brand.json` debe producir el mismo resultado que `--brand <url>` directamente.
- CSS custom properties inyectadas no deben romper el viewer JS de Archify (animaciones, theme toggle, present mode) — el viewer lee `data-theme`, no las custom properties directamente.
- Diagramas generados sin `--brand` deben usar el neutral ramp default sin requerir ningún archivo extra.
- Colores extraídos con bajo contraste (`< 4.5:1` texto sobre fondo) deben ser ajustados automáticamente antes de escribir el `brand.json`.

---

## File Structure

```
archify-unslop/
├── package.json                     # nombre: archify-unslop, deps: puppeteer
├── bin/
│   └── archify-unslop.mjs           # CLI wrapper — añade --brand, llega a archify.mjs original
├── src/
│   ├── brand.mjs                    # Puppeteer extractor → brand.json
│   ├── brand-inject.mjs             # Aplica brand.json al HTML final como <style> override
│   └── contrast.mjs                 # WCAG contrast check + auto-darken
├── assets/
│   └── template.html                # Template Unslop (reemplaza archify/assets/template.html)
└── docs/superpowers/plans/
    └── 2026-11-19-archify-unslop.md # este archivo
```

> Los renderers, schemas, ejemplos y demás de Archify se usan directamente desde la instalación de Archify (skill path). No se copian.

---

### Task 1: Scaffold del proyecto y package.json

**Files:**
- Create: `archify-unslop/package.json`
- Create: `archify-unslop/bin/archify-unslop.mjs` (stub)

**Interfaces:**
- Produce: comando `node bin/archify-unslop.mjs` que acepta los mismos args que `archify.mjs` más `--brand <url|path>`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "archify-unslop",
  "version": "0.1.0",
  "type": "module",
  "bin": { "archify-unslop": "./bin/archify-unslop.mjs" },
  "dependencies": {
    "puppeteer": "^22.0.0"
  }
}
```

- [ ] **Step 2: Crear `bin/archify-unslop.mjs` stub**

Contenido mínimo: `#!/usr/bin/env node\nconsole.log('archify-unslop ok');`

- [ ] **Step 3: Instalar dependencias**

```bash
cd archify-unslop && npm install
```

- [ ] **Step 4: Verificar que el stub corre**

```bash
node bin/archify-unslop.mjs
```
Esperado: `archify-unslop ok`

- [ ] **Step 5: Commit**

```bash
git init
git add package.json package-lock.json bin/archify-unslop.mjs
git commit -m "feat: scaffold archify-unslop project"
```

---

### Task 2: Template HTML Unslop

**Files:**
- Create: `archify-unslop/assets/template.html`

**Interfaces:**
- Produce: `assets/template.html` con CSS custom properties completas en `:root` para tema dark y light. Compatible con el viewer JS de Archify (mismos `data-theme`, `data-preset`, `data-embed`, `data-present` attributes).
- Consumes: estructura exacta del `archify/assets/template.html` original — el viewer JS espera ciertos IDs y clases.

**Token map (CSS custom properties a definir):**

```css
/* Neutrals — tinted graphite */
--color-bg: #0f0f10;
--color-surface: #1a1a1c;
--color-surface-raised: #222225;
--color-border: rgba(255,255,255,0.08);
--color-text-primary: #f0f0f1;
--color-text-secondary: #9898a0;
--color-text-muted: #58585f;
/* Accent — un único color */
--color-accent: #4f8ef7;
--color-accent-text: #0f0f10;  /* texto sobre accent */
/* Semantic */
--color-success: #3d9970;
--color-warning: #c8862a;
--color-error: #c84040;
/* Spacing base */
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px;
/* Type */
--font-ui: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
/* Motion */
--duration-fast: 100ms; --duration-base: 180ms;
--easing: cubic-bezier(0.4, 0, 0.2, 1);
```

Light theme override en `[data-theme="light"]`.

- [ ] **Step 1: Leer el template original completo**

```bash
cat "C:\Users\Seguridad\.claude\skills\archify\assets\template.html" | wc -l
```
Leer el archivo completo para identificar todos los IDs, clases y atributos que el viewer JS usa.

- [ ] **Step 2: Escribir `assets/template.html`**

Estructura idéntica al original en cuanto a marcado (mismos `id`, `data-*`, script de theme). Reemplazar todo el CSS de colores, fuentes y radios con las custom properties del token map de arriba. Eliminar cualquier `box-shadow` de color, `background: linear-gradient(...)` que no sea tono-a-tono-neutro, y `text-shadow` decorativo.

Inter se carga desde `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap`. JetBrains Mono viene del bundle existente de Archify (`archify-fonts` style tag — copiarlo tal cual).

- [ ] **Step 3: Verificar que el template produce un diagrama válido**

```bash
node "C:\Users\Seguridad\.claude\skills\archify\bin\archify.mjs" render architecture \
  "C:\Users\Seguridad\.claude\skills\archify\examples\web-app.architecture.json" \
  /tmp/test-unslop.html
```

Luego editar `cli.mjs` localmente (o probar con un script temporal) que use `archify-unslop/assets/template.html` en lugar del original. Abrir en browser y verificar visualmente: sin glows, neutral ramp, Inter visible.

- [ ] **Step 4: Commit**

```bash
git add assets/template.html
git commit -m "feat: add Unslop template with CSS custom properties"
```

---

### Task 3: `src/contrast.mjs` — WCAG contrast check

**Files:**
- Create: `archify-unslop/src/contrast.mjs`

**Interfaces:**
- Produce: `contrastRatio(hex1, hex2) → number`, `ensureContrast(fgHex, bgHex, minRatio = 4.5) → string` (devuelve fgHex ajustado si no pasa, o el mismo si pasa).

- [ ] **Step 1: Escribir test**

```js
// test/contrast.test.mjs
import { contrastRatio, ensureContrast } from '../src/contrast.mjs';
import assert from 'node:assert/strict';

// WCAG: white sobre negro = 21:1
assert(contrastRatio('#ffffff', '#000000') > 20);
// Negro sobre blanco también
assert(contrastRatio('#000000', '#ffffff') > 20);
// Rojo medio sobre blanco falla 4.5:1
const adjusted = ensureContrast('#ff6b6b', '#ffffff', 4.5);
assert(contrastRatio(adjusted, '#ffffff') >= 4.5);
// Si ya pasa, devuelve el mismo valor
assert.equal(ensureContrast('#000000', '#ffffff', 4.5), '#000000');
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
node --test test/contrast.test.mjs
```
Esperado: `ERR_MODULE_NOT_FOUND` o similar.

- [ ] **Step 3: Implementar `src/contrast.mjs`**

Firmas:
```js
export function contrastRatio(hex1, hex2): number
export function ensureContrast(fgHex, bgHex, minRatio = 4.5): string
```

Algoritmo WCAG 2.1: luminancia relativa via sRGB linearización (`c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`). `ensureContrast` oscurece `fgHex` iterativamente (pasos de L* -2 en HSL) hasta alcanzar `minRatio`.

- [ ] **Step 4: Correr test — debe pasar**

```bash
node --test test/contrast.test.mjs
```
Esperado: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/contrast.mjs test/contrast.test.mjs
git commit -m "feat: add WCAG contrast checker"
```

---

### Task 4: `src/brand.mjs` — Puppeteer brand extractor

**Files:**
- Create: `archify-unslop/src/brand.mjs`

**Interfaces:**
- Consumes: `ensureContrast` de `src/contrast.mjs`.
- Produce: `extractBrand(url: string, outputPath: string) → Promise<BrandTokens>` donde `BrandTokens` es:

```ts
{
  accent: string,          // hex color más prominente (no neutro)
  accentText: string,      // hex para texto sobre accent (auto-contrast)
  fontFamily: string,      // font-family del body, o "Inter" como fallback
  googleFontsUrl: string | null,  // URL completa del @import de Google Fonts si existe
  radiusMd: string,        // border-radius de un botón/card en px, o "10px" fallback
}
```

- [ ] **Step 1: Escribir test de integración (requiere red)**

```js
// test/brand.test.mjs
import { extractBrand } from '../src/brand.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Sanitas — colores públicos conocidos
const tokens = await extractBrand('https://www.sanitas.es', '/tmp/sanitas-brand.json');
assert(tokens.accent, 'accent debe existir');
assert(/^#[0-9a-f]{6}$/i.test(tokens.accent), 'accent debe ser hex');
assert(tokens.fontFamily, 'fontFamily debe existir');
// Verificar que se escribió el JSON
const written = JSON.parse(await fs.readFile('/tmp/sanitas-brand.json', 'utf8'));
assert.deepEqual(written, tokens);
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
node --test test/brand.test.mjs
```

- [ ] **Step 3: Implementar `src/brand.mjs`**

Firma: `export async function extractBrand(url, outputPath) → Promise<BrandTokens>`

Algoritmo:
1. `puppeteer.launch({ headless: true })` — timeout 30s, lanzar error descriptivo con URL si falla.
2. `page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })`.
3. `page.evaluate()` para extraer:
   - `document.body` computed `font-family`.
   - Todos los `<link rel="stylesheet">` con `fonts.googleapis.com`.
   - `border-radius` del primer `<button>` o elemento con clase `btn`.
   - Color primario: buscar en este orden: `--color-primary` en `:root` computed style → color de fondo del primer `<button>` prominente → color de primer `<a>` con `background-color` no transparente.
4. Llamar `ensureContrast(accent, '#ffffff')` y `ensureContrast(accent, '#0f0f10')` y elegir el que pasa con menor modificación.
5. Escribir `outputPath` con `JSON.stringify(tokens, null, 2)`.
6. `browser.close()`.

- [ ] **Step 4: Correr test — debe pasar**

```bash
node --test test/brand.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add src/brand.mjs test/brand.test.mjs
git commit -m "feat: add Puppeteer brand extractor"
```

---

### Task 5: `src/brand-inject.mjs` — inyectar brand.json en HTML

**Files:**
- Create: `archify-unslop/src/brand-inject.mjs`

**Interfaces:**
- Consumes: `BrandTokens` de Task 4.
- Produce: `injectBrand(html: string, tokens: BrandTokens) → string` — devuelve el HTML con un `<style id="archify-unslop-brand">` inyectado antes de `</head>` que override las custom properties del template.

- [ ] **Step 1: Escribir test**

```js
// test/brand-inject.test.mjs
import { injectBrand } from '../src/brand-inject.mjs';
import assert from 'node:assert/strict';

const html = '<html><head></head><body></body></html>';
const tokens = {
  accent: '#e2001a',
  accentText: '#ffffff',
  fontFamily: '"Avenir Next", sans-serif',
  googleFontsUrl: null,
  radiusMd: '4px',
};
const result = injectBrand(html, tokens);
assert(result.includes('--color-accent: #e2001a'), 'debe inyectar accent');
assert(result.includes('id="archify-unslop-brand"'), 'debe tener el id correcto');
assert(result.includes('</head>'), 'debe preservar </head>');
// Google Fonts null — no debe añadir @import
assert(!result.includes('@import'), 'sin Google Fonts URL no debe haber @import');
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
node --test test/brand-inject.test.mjs
```

- [ ] **Step 3: Implementar `src/brand-inject.mjs`**

```js
export function injectBrand(html, tokens): string
```

Genera un bloque `<style id="archify-unslop-brand">` con:
```css
@import url('${tokens.googleFontsUrl}');  /* solo si googleFontsUrl no es null */
:root {
  --color-accent: ${tokens.accent};
  --color-accent-text: ${tokens.accentText};
  --font-ui: ${tokens.fontFamily};
  --radius-md: ${tokens.radiusMd};
  --radius-sm: calc(${tokens.radiusMd} - 4px);
  --radius-lg: calc(${tokens.radiusMd} + 4px);
}
```

Insertar antes de `</head>` usando `html.replace('</head>', block + '</head>')`.

- [ ] **Step 4: Correr test — debe pasar**

```bash
node --test test/brand-inject.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add src/brand-inject.mjs test/brand-inject.test.mjs
git commit -m "feat: add brand injection into HTML"
```

---

### Task 6: CLI wrapper `bin/archify-unslop.mjs`

**Files:**
- Modify: `archify-unslop/bin/archify-unslop.mjs` (reemplazar stub de Task 1)

**Interfaces:**
- Consumes: `extractBrand` de `src/brand.mjs`, `injectBrand` de `src/brand-inject.mjs`.
- Produce: CLI con la misma interfaz que `archify.mjs` más flag `--brand <url|path>`. El output HTML final tiene el brand inyectado.

**Comportamiento:**

```
node bin/archify-unslop.mjs render architecture diagram.json out.html
node bin/archify-unslop.mjs render architecture diagram.json out.html --brand https://sanitas.es
node bin/archify-unslop.mjs render architecture diagram.json out.html --brand sanitas-brand.json
node bin/archify-unslop.mjs brand https://sanitas.es --out sanitas-brand.json
```

- [ ] **Step 1: Escribir test de integración**

```js
// test/cli.test.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const ARCHIFY_EXAMPLE = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\examples\\web-app.architecture.json';

// Sin brand — debe generar HTML válido
const r1 = spawnSync('node', ['bin/archify-unslop.mjs', 'render', 'architecture', ARCHIFY_EXAMPLE, '/tmp/test-cli.html'], { encoding: 'utf8' });
assert.equal(r1.status, 0, r1.stderr);
assert(fs.existsSync('/tmp/test-cli.html'));
const html1 = fs.readFileSync('/tmp/test-cli.html', 'utf8');
assert(html1.includes('--color-accent'), 'debe contener custom properties Unslop');

// Subcomando brand — debe escribir brand.json
const r2 = spawnSync('node', ['bin/archify-unslop.mjs', 'brand', 'https://www.sanitas.es', '--out', '/tmp/sanitas-brand-cli.json'], { encoding: 'utf8', timeout: 60000 });
assert.equal(r2.status, 0, r2.stderr);
const brand = JSON.parse(fs.readFileSync('/tmp/sanitas-brand-cli.json', 'utf8'));
assert(brand.accent, 'brand.json debe tener accent');
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
node --test test/cli.test.mjs
```

- [ ] **Step 3: Implementar `bin/archify-unslop.mjs`**

Lógica:
1. Parsear args: detectar `--brand <valor>` y subcomando `brand <url> --out <path>`.
2. Para subcomando `brand`: llamar `extractBrand(url, outPath)` y salir.
3. Para `render` (y demás): 
   a. Localizar el template de Archify en `archify.mjs` — monkey-patch temporal: setear `ARCHIFY_TEMPLATE_OVERRIDE` env var **antes** de invocar el renderer, o bien copiar `assets/template.html` al directorio de Archify en un temp path y restaurar. Estrategia recomendada: usar un directorio temp con symlinks a todos los assets de Archify excepto `template.html`, apuntando al nuestro.
   b. Invocar `archify.mjs render ...` via `spawnSync` con el env/paths correctos.
   c. Leer el HTML generado.
   d. Si `--brand`: si el valor termina en `.json`, leer como `BrandTokens`; si es URL, llamar `extractBrand`.
   e. Llamar `injectBrand(html, tokens)`.
   f. Reescribir el archivo HTML.
4. Propagar exit code de Archify.

**Nota sobre monkey-patching del template:** Revisar si `cli.mjs` de Archify expone alguna env var o arg para override del template path. Si no, la estrategia del temp dir con symlink es la más segura sin modificar el skill de Archify.

- [ ] **Step 4: Correr test — debe pasar**

```bash
node --test test/cli.test.mjs
```

- [ ] **Step 5: Verificación visual**

Abrir `/tmp/test-cli.html` en browser. Verificar:
- [ ] Fuente Inter visible en toolbar/labels.
- [ ] Fondo `#0f0f10` (dark mode por defecto).
- [ ] Sin glow, sin gradient en superficies.
- [ ] Theme toggle funciona (dark/light).

- [ ] **Step 6: Commit**

```bash
git add bin/archify-unslop.mjs test/cli.test.mjs
git commit -m "feat: add CLI wrapper with --brand flag and brand subcommand"
```

---

### Task 7: Test de integración con brand real (Sanitas)

**Files:**
- Create: `archify-unslop/test/sanitas-integration.test.mjs`

**Interfaces:**
- Consumes: todo el sistema completo (Tasks 1–6).

- [ ] **Step 1: Escribir test**

```js
// test/sanitas-integration.test.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const ARCHIFY_EXAMPLE = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\examples\\web-app.architecture.json';

const r = spawnSync('node', [
  'bin/archify-unslop.mjs', 'render', 'architecture',
  ARCHIFY_EXAMPLE, '/tmp/sanitas-diagram.html',
  '--brand', 'https://www.sanitas.es'
], { encoding: 'utf8', timeout: 90000 });

assert.equal(r.status, 0, `CLI falló:\n${r.stderr}`);
const html = fs.readFileSync('/tmp/sanitas-diagram.html', 'utf8');
// El rojo de Sanitas es E2001A — el accent debe estar cerca
assert(html.includes('archify-unslop-brand'), 'debe tener bloque de brand');
assert(html.includes('--color-accent'), 'debe tener accent inyectado');
```

- [ ] **Step 2: Correr test**

```bash
node --test test/sanitas-integration.test.mjs
```
Esperado: PASS. Si falla por timeout, aumentar a 120000ms.

- [ ] **Step 3: Verificación visual**

Abrir `/tmp/sanitas-diagram.html`. Verificar que el acento refleja la identidad de Sanitas (rojo corporativo o derivado con suficiente contraste).

- [ ] **Step 4: Commit**

```bash
git add test/sanitas-integration.test.mjs
git commit -m "test: add Sanitas brand integration test"
```

---

### Task 8: README y documentación mínima

**Files:**
- Create: `archify-unslop/README.md`

**Interfaces:** ninguna técnica.

- [ ] **Step 1: Escribir README.md**

Cubrir:
- Prerequisito: Archify skill instalado en `C:\Users\Seguridad\.claude\skills\archify`.
- Instalación: `npm install`.
- Uso básico: `node bin/archify-unslop.mjs render architecture diagram.json out.html`.
- Con brand URL: `... --brand https://www.sanitas.es`.
- Extraer brand a JSON: `node bin/archify-unslop.mjs brand https://www.sanitas.es --out brand.json`.
- Reusar brand JSON: `... --brand brand.json`.
- Schemas JSON: idénticos a Archify — referir a su documentación.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage examples"
```
