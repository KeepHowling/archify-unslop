import { extractBrand } from '../src/brand.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';

test('extractBrand Sanitas devuelve tokens válidos', { timeout: 60000 }, async () => {
  const tokens = await extractBrand('https://www.sanitas.es', '/tmp/sanitas-brand.json');
  assert(tokens.accent, 'accent debe existir');
  assert(/^#[0-9a-f]{6}$/i.test(tokens.accent), 'accent debe ser hex #rrggbb');
  assert(tokens.fontFamily, 'fontFamily debe existir');
  assert(typeof tokens.googleFontsUrl === 'string' || tokens.googleFontsUrl === null);
  assert(/^\d+px$/.test(tokens.radiusMd) || tokens.radiusMd === '10px');
  const written = JSON.parse(await fs.readFile('/tmp/sanitas-brand.json', 'utf8'));
  assert.deepEqual(written, tokens);
});
