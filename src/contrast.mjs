/**
 * WCAG 2.1 contrast utilities.
 */

/** Parse a hex color string to [r, g, b] in 0..255. */
function hexToRgb(hex) {
  const h = hex.replace(/^#/, '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** sRGB linearization per WCAG 2.1. */
function linearize(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1. */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 2.1 contrast ratio between two hex colors.
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number}
 */
export function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Convert [r,g,b] (0..255) to [h (0..360), s (0..1), l (0..1)]. */
function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

/** HUE helper. */
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** Convert [h (0..360), s (0..1), l (0..1)] to hex string. */
function hslToHex(h, s, l) {
  const hn = h / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hn + 1 / 3);
    g = hue2rgb(p, q, hn);
    b = hue2rgb(p, q, hn - 1 / 3);
  }
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Return fgHex unchanged if contrast >= minRatio.
 * Otherwise darken fgHex in steps of 2 L* (HSL lightness) until ratio passes.
 * @param {string} fgHex
 * @param {string} bgHex
 * @param {number} minRatio
 * @returns {string}
 */
export function ensureContrast(fgHex, bgHex, minRatio = 4.5) {
  if (contrastRatio(fgHex, bgHex) >= minRatio) return fgHex;
  const [r, g, b] = hexToRgb(fgHex);
  let [h, s, l] = rgbToHsl(r, g, b);
  const step = 0.02; // 2 L* steps in 0..1 scale
  while (l > 0) {
    l = Math.max(0, l - step);
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(candidate, bgHex) >= minRatio) return candidate;
  }
  return hslToHex(h, s, 0); // black fallback
}
