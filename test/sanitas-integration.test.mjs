import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'bin', 'archify-unslop.mjs');
const ARCHIFY_EXAMPLE = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\examples\\web-app.architecture.json';
const TMP_HTML = path.join(__dirname, '..', 'tmp-sanitas-diagram.html');

test('render con --brand sanitas.es genera HTML on-brand', { timeout: 90000 }, () => {
  const r = spawnSync('node', [
    CLI, 'render', 'architecture',
    ARCHIFY_EXAMPLE, TMP_HTML,
    '--brand', 'https://www.sanitas.es'
  ], { encoding: 'utf8', timeout: 90000 });

  assert.equal(r.status, 0, `CLI falló:\n${r.stderr}`);
  assert(fs.existsSync(TMP_HTML), 'debe generar el archivo HTML');
  const html = fs.readFileSync(TMP_HTML, 'utf8');
  assert(html.includes('archify-unslop-brand'), 'debe tener bloque de brand');
  assert(html.includes('--color-accent'), 'debe tener accent inyectado');
  // Limpiar
  fs.unlinkSync(TMP_HTML);
});
