import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import { ensureContrast, contrastRatio } from './contrast.mjs';

/**
 * @typedef {Object} BrandTokens
 * @property {string} accent          - Most prominent non-neutral hex color
 * @property {string} accentText      - Hex color for text on accent (auto-contrast)
 * @property {string} fontFamily      - Body font-family or "Inter" fallback
 * @property {string|null} googleFontsUrl - Google Fonts @import URL if present
 * @property {string} radiusMd        - Border-radius of a button/card in px or "10px"
 */

/**
 * Extract brand tokens from a URL using Puppeteer.
 * @param {string} url
 * @param {string} outputPath
 * @returns {Promise<BrandTokens>}
 */
export async function extractBrand(url, outputPath) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
  } catch (err) {
    throw new Error(`Failed to launch browser for ${url}: ${err.message}`);
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const raw = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.documentElement);

      // Font family from body
      const bodyCs = window.getComputedStyle(document.body);
      const fontFamily = bodyCs.fontFamily || null;

      // Google Fonts URL from <link> tags
      let googleFontsUrl = null;
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      for (const link of links) {
        if (link.href && link.href.includes('fonts.googleapis.com')) {
          googleFontsUrl = link.href;
          break;
        }
      }

      // Border-radius from first button or .btn
      let radiusMd = null;
      const btnEl = document.querySelector('button, .btn, [type="submit"], [role="button"]');
      if (btnEl) {
        const btnCs = window.getComputedStyle(btnEl);
        const r = btnCs.borderRadius || btnCs.borderTopLeftRadius;
        if (r && r !== '0px' && r !== '0') {
          radiusMd = r;
        }
      }

      // Accent color: priority order
      let accent = null;

      // 1. --color-primary CSS custom property on :root
      const primary = cs.getPropertyValue('--color-primary').trim();
      if (primary && primary !== '' && primary !== 'transparent') {
        accent = primary;
      }

      // 2. background-color of first prominent button (not transparent)
      if (!accent) {
        const buttons = Array.from(document.querySelectorAll('button, [type="submit"], [role="button"], .btn'));
        for (const btn of buttons) {
          const btnCs = window.getComputedStyle(btn);
          const bg = btnCs.backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) {
            accent = bg;
            break;
          }
        }
      }

      // 3. color of first <a> with non-transparent background-color
      if (!accent) {
        const anchors = Array.from(document.querySelectorAll('a'));
        for (const a of anchors) {
          const aCs = window.getComputedStyle(a);
          const bg = aCs.backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            accent = bg;
            break;
          }
        }
      }

      // 4. color of first <a> (text color)
      if (!accent) {
        const firstA = document.querySelector('a');
        if (firstA) {
          const aCs = window.getComputedStyle(firstA);
          accent = aCs.color || null;
        }
      }

      return { fontFamily, googleFontsUrl, radiusMd, accent };
    });

    // Parse CSS color to hex
    const accent = parseCssColorToHex(raw.accent) || '#4f8ef7';

    // Determine accentText: whichever background requires less modification
    const textOnWhite = ensureContrast(accent, '#ffffff');
    const textOnDark = ensureContrast(accent, '#0f0f10');

    // "Lesser modification" = higher original contrast ratio with the respective bg
    const ratioWithWhite = contrastRatio(accent, '#ffffff');
    const ratioWithDark = contrastRatio(accent, '#0f0f10');
    // Choose the background where the accent color is closer to meeting the threshold
    // (fewer adjustments needed = naturally higher contrast with that bg)
    const accentText = ratioWithDark >= ratioWithWhite ? '#0f0f10' : '#ffffff';

    const fontFamily = cleanFontFamily(raw.fontFamily) || 'Inter';
    const radiusMd = parseRadius(raw.radiusMd) || '10px';

    const tokens = {
      accent,
      accentText,
      fontFamily,
      googleFontsUrl: raw.googleFontsUrl || null,
      radiusMd,
    };

    const { dirname } = await import('node:path');
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(tokens, null, 2), 'utf8');

    return tokens;
  } finally {
    await browser.close();
  }
}

/**
 * Convert a CSS color value (rgb/rgba/hex) to 6-digit hex.
 * Returns null if parsing fails.
 * @param {string|null} cssColor
 * @returns {string|null}
 */
function parseCssColorToHex(cssColor) {
  if (!cssColor) return null;

  // Already a hex color
  const hexMatch = cssColor.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 3) {
      return '#' + h.split('').map(c => c + c).join('');
    }
    if (h.length === 6) return '#' + h;
    if (h.length === 8) return '#' + h.slice(0, 6); // drop alpha
    return null;
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    // Skip near-black, near-white, and near-gray (neutral colors)
    if (isNeutral(r, g, b)) return null;
    const toHex = x => x.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return null;
}

/**
 * Check if an RGB color is neutral (gray/black/white).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isNeutral(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  // Near-white
  if (r > 230 && g > 230 && b > 230) return true;
  // Near-black
  if (r < 25 && g < 25 && b < 25) return true;
  // Low saturation (gray)
  if (saturation < 0.15) return true;
  return false;
}

/**
 * Clean a CSS font-family string to a usable name.
 * @param {string|null} fontFamily
 * @returns {string|null}
 */
function cleanFontFamily(fontFamily) {
  if (!fontFamily) return null;
  // Take the first font in the stack, unquoted
  const first = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  if (!first || first.toLowerCase() === 'sans-serif' || first.toLowerCase() === 'serif' || first.toLowerCase() === 'monospace') {
    return null;
  }
  return first;
}

/**
 * Normalize a border-radius value to Npx format.
 * @param {string|null} radius
 * @returns {string|null}
 */
function parseRadius(radius) {
  if (!radius) return null;
  // Take first value if shorthand (e.g. "4px 4px 4px 4px" → "4px")
  const first = radius.split(' ')[0].trim();
  if (/^\d+(\.\d+)?px$/.test(first)) {
    // Round to integer px
    const val = Math.round(parseFloat(first));
    return `${val}px`;
  }
  if (/^\d+(\.\d+)?%$/.test(first)) {
    // Convert common % values to reasonable px equivalents
    const pct = parseFloat(first);
    if (pct >= 50) return '9999px'; // pill
    return `${Math.round(pct * 0.4)}px`; // rough approximation
  }
  if (first === '0' || first === '0px') return '0px';
  return null;
}
