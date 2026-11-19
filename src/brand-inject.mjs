/**
 * Injects BrandTokens into an HTML string as CSS custom properties.
 * @param {string} html - Full HTML string
 * @param {{ accent: string, accentText: string, fontFamily: string, googleFontsUrl: string|null, radiusMd: string }} tokens
 * @returns {string} HTML with <style id="archify-unslop-brand"> injected before </head>
 */
export function injectBrand(html, tokens) {
  const importLine = tokens.googleFontsUrl
    ? `@import url('${tokens.googleFontsUrl}');\n\n`
    : '';

  const block = `<style id="archify-unslop-brand">
${importLine}:root {
  --color-accent: ${tokens.accent};
  --color-accent-text: ${tokens.accentText};
  --font-ui: ${tokens.fontFamily};
  --radius-md: ${tokens.radiusMd};
  --radius-sm: calc(${tokens.radiusMd} - 4px);
  --radius-lg: calc(${tokens.radiusMd} + 4px);
}
</style>`;

  return html.replace('</head>', block + '</head>');
}
