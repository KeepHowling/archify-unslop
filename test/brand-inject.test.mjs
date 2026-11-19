import { injectBrand } from '../src/brand-inject.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('inyecta accent en HTML', () => {
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
  assert(!result.includes('@import'), 'sin googleFontsUrl no debe haber @import');
});

test('inyecta Google Fonts cuando googleFontsUrl no es null', () => {
  const html = '<html><head></head><body></body></html>';
  const tokens = {
    accent: '#e2001a',
    accentText: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter',
    radiusMd: '8px',
  };
  const result = injectBrand(html, tokens);
  assert(result.includes("@import url('https://fonts.googleapis.com/css2?family=Inter')"));
});

test('radius-sm y radius-lg calculados correctamente', () => {
  const html = '<html><head></head><body></body></html>';
  const tokens = { accent: '#000', accentText: '#fff', fontFamily: 'Inter', googleFontsUrl: null, radiusMd: '10px' };
  const result = injectBrand(html, tokens);
  assert(result.includes('--radius-sm: calc(10px - 4px)'));
  assert(result.includes('--radius-lg: calc(10px + 4px)'));
});
