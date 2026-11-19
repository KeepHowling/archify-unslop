import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'bin', 'archify-unslop.mjs');
const ARCHIFY_EXAMPLE = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\examples\\web-app.architecture.json';
const TMP_HTML = path.join(__dirname, '..', 'tmp-test-cli.html');
const ARCHIFY_TEMPLATE = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\assets\\template.html';

test('render sin brand genera HTML con custom properties', () => {
  const r = spawnSync('node', [CLI, 'render', 'architecture', ARCHIFY_EXAMPLE, TMP_HTML], {
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(r.status, 0, `CLI falló:\n${r.stderr}`);
  assert(fs.existsSync(TMP_HTML), 'debe generar el archivo HTML');
  const html = fs.readFileSync(TMP_HTML, 'utf8');
  assert(html.includes('--color-accent'), 'debe contener custom properties Unslop');
  fs.unlinkSync(TMP_HTML);
});

test('template de Archify restaurado despues del render', () => {
  // Run a render, then verify the Archify template was restored (stat must succeed)
  const r = spawnSync('node', [CLI, 'render', 'architecture', ARCHIFY_EXAMPLE, TMP_HTML], {
    encoding: 'utf8',
    timeout: 30000,
  });
  // Cleanup regardless of test outcome
  try { fs.unlinkSync(TMP_HTML); } catch { /* ignore */ }

  assert.equal(r.status, 0, `CLI falló:\n${r.stderr}`);
  // Template must exist and be non-empty
  const stat = fs.statSync(ARCHIFY_TEMPLATE);
  assert(stat.size > 0, 'Archify template debe estar restaurado y no vacío');
});
