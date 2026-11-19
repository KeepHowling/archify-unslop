import { contrastRatio, ensureContrast } from '../src/contrast.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('white sobre negro > 20:1', () => {
  assert(contrastRatio('#ffffff', '#000000') > 20);
});
test('negro sobre blanco > 20:1', () => {
  assert(contrastRatio('#000000', '#ffffff') > 20);
});
test('ensureContrast ajusta rojo claro sobre blanco', () => {
  const adjusted = ensureContrast('#ff6b6b', '#ffffff', 4.5);
  assert(contrastRatio(adjusted, '#ffffff') >= 4.5);
});
test('ensureContrast no cambia negro sobre blanco', () => {
  assert.equal(ensureContrast('#000000', '#ffffff', 4.5), '#000000');
});
