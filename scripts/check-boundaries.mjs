#!/usr/bin/env node
// Enforces the architecture rules in docs/architecture.md. Part of `npm run check`.
//
//  1. src/engine/** is pure: imports only from src/engine, and never touches
//     document / window / localStorage / navigator.
//  2. A feature folder never imports another feature folder (talk through the core).
//  3. Engine-side feature code (src/features/*/engine.ts) imports only src/engine
//     and src/data — so it stays testable without a browser.
//  4. Only src/main.ts and the registry (src/features/index.ts) import feature folders.
//
// Exit code 1 with a list of violations if any rule is broken.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const SRC = join(ROOT, 'src');
const rel = p => relative(SRC, p).split(sep).join('/');

function walk(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(n) ? [p] : [];
  });
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const BROWSER_RE = /\b(document|window|localStorage|sessionStorage|navigator)\s*[.[]/;

const featureOf = r => (r.startsWith('features/') && r.split('/').length > 2 ? r.split('/')[1] : null);
const errors = [];

for (const file of walk(SRC)) {
  const r = rel(file);
  const code = readFileSync(file, 'utf8');
  const isTest = r.endsWith('.test.ts');

  if (r.startsWith('engine/') || (featureOf(r) && /\/engine\.ts$/.test(r))) {
    const stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    if (BROWSER_RE.test(stripped)) errors.push(`${r}: engine code must not use browser APIs (document/window/storage/navigator) — put screen code in the feature's ui.ts`);
  }

  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec.startsWith('.')) continue;
    const target = rel(resolve(dirname(file), spec));
    const from = featureOf(r), to = featureOf(target);

    if (r.startsWith('engine/') && !target.startsWith('engine/'))
      errors.push(`${r}: engine imports "${spec}" — the engine may only import from src/engine`);

    if (from && to && from !== to)
      errors.push(`${r}: feature "${from}" imports feature "${to}" ("${spec}") — features must not import each other`);

    if (to && !from && r !== 'main.ts' && r !== 'features/index.ts' && !isTest)
      errors.push(`${r}: imports feature "${to}" — only src/main.ts and src/features/index.ts may import feature folders`);

    if (from && /\/engine(\.test)?\.ts$/.test(r) && !(target.startsWith('engine') || target.startsWith('data') || featureOf(target) === from))
      errors.push(`${r}: engine-side feature code imports "${spec}" — use only src/engine and src/data here`);
  }
}

if (errors.length) {
  console.error(`Architecture check failed (${errors.length}):\n  - ` + errors.join('\n  - '));
  console.error('\nSee docs/architecture.md for the rules and how to work within them.');
  process.exit(1);
}
console.log('Architecture check passed.');
