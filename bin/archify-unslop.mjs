#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARCHIFY_CLI      = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\bin\\archify.mjs';
const ARCHIFY_TEMPLATE = 'C:\\Users\\Seguridad\\.claude\\skills\\archify\\assets\\template.html';
const OUR_TEMPLATE     = path.join(__dirname, '..', 'assets', 'template.html');

const args = process.argv.slice(2);

// ── subcommand: brand <url> [--out <path>] ────────────────────────────────────
if (args[0] === 'brand') {
  const url = args[1];
  if (!url) {
    console.error('Usage: archify-unslop brand <url> [--out <path>]');
    process.exit(1);
  }

  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 ? args[outIdx + 1] : 'brand.json';

  const { extractBrand } = await import('../src/brand.mjs');
  const tokens = await extractBrand(url, outPath);
  console.log(JSON.stringify(tokens, null, 2));
  process.exit(0);
}

// ── render / finalize / preview / … ──────────────────────────────────────────
// Extract --brand <value> from args before forwarding to Archify
let brandValue = null;
const forwardArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--brand') {
    brandValue = args[i + 1];
    i++; // skip the value
  } else {
    forwardArgs.push(args[i]);
  }
}

// Determine output HTML path: for 'render architecture <input> <output>', it is forwardArgs[3]
const outputHtml = forwardArgs[3] ?? null;

// Backup Archify template in memory
const archifyTemplateBackup = fs.readFileSync(ARCHIFY_TEMPLATE);

let result;
try {
  // Inject our template
  fs.writeFileSync(ARCHIFY_TEMPLATE, fs.readFileSync(OUR_TEMPLATE));

  // Invoke Archify
  result = spawnSync('node', [ARCHIFY_CLI, ...forwardArgs], { stdio: 'inherit' });
} finally {
  // Always restore original template
  fs.writeFileSync(ARCHIFY_TEMPLATE, archifyTemplateBackup);
}

// Post-process: inject brand tokens if requested
if (brandValue && outputHtml && result.status === 0) {
  const { injectBrand } = await import('../src/brand-inject.mjs');

  let tokens;
  if (brandValue.endsWith('.json')) {
    tokens = JSON.parse(fs.readFileSync(brandValue, 'utf8'));
  } else {
    // Treat as URL — extract brand (write to a temp path, then clean up)
    const tmpPath = path.join(__dirname, '..', `.brand-tmp-${Date.now()}.json`);
    try {
      const { extractBrand } = await import('../src/brand.mjs');
      tokens = await extractBrand(brandValue, tmpPath);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }

  const html = fs.readFileSync(outputHtml, 'utf8');
  const injected = injectBrand(html, tokens);
  fs.writeFileSync(outputHtml, injected, 'utf8');
}

process.exit(result.status ?? 0);
