#!/usr/bin/env node
// Scaffold a new feature folder and register it.
//
//   npm run new-feature -- br-009-store-hours "Store hours" BR-009
//   npm run new-feature -- br-002-guided-visit "Guided store visit" BR-002 BR-015 BR-021
//
// Creates src/features/<id>/ with engine.ts, engine.test.ts, ui.ts, index.ts and
// README.md, then adds it to src/features/index.ts. Starts switched OFF so it
// can't change anything until you turn it on (set defaultOn when it's ready).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const [id, title, ...reqs] = process.argv.slice(2);

if (!id || !title || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: npm run new-feature -- <id> "<Title>" [BR-0xx ...]\n  id: lowercase-with-dashes, e.g. br-009-store-hours');
  process.exit(1);
}
const bad = reqs.filter(r => !/^BR-\d{3}$/.test(r));
if (bad.length) { console.error(`Not a BR id: ${bad.join(', ')} (expected BR-0xx)`); process.exit(1) }

const dir = join(ROOT, 'src', 'features', id);
if (existsSync(dir)) { console.error(`src/features/${id} already exists`); process.exit(1) }

const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(\d)/, '_$1');
const reqList = reqs.map(r => `'${r}'`).join(', ');
const tag = reqs.length ? ` [${reqs.join(' ')}]` : '';

const files = {
  'engine.ts': `// ${title}${reqs.length ? ' — ' + reqs.join(', ') : ''}
// Pure logic for this feature: no DOM, no storage. Imports only src/engine and src/data.
// Plug-in points you can use (see docs/architecture.md):
//   readyAt, workMinutes, onTick, curveballs, settings, ruleDefaults
import type { EngineFeature } from '../../engine';

export const ${camel}Engine: EngineFeature = {
  id: '${id}',
  title: '${title.replace(/'/g, "\\'")}',
  description: 'TODO: one sentence shown next to the on/off switch.',
  requirements: [${reqList}],
  defaultOn: false, // turn on once it works
};
`,
  'engine.test.ts': `import { describe, expect, it } from 'vitest';
import { newDay } from '../../engine';
import { seed } from '../../data';
import { ${camel}Engine } from './engine';

describe('${id}${tag}', () => {
  it('can be enabled without breaking the day', () => {
    const s = newDay(seed, 'normal', { features: [${camel}Engine] });
    expect(s.enabled).toContain('${id}');
  });
});
`,
  'ui.ts': `// Screen parts for ${title}: panels, tabs, actions. Optional — delete if unused.
// Import helpers from ../../ui/shared and types from ../../app/feature only.
import type { Panel } from '../../app/feature';

export const panels: Panel[] = [];
`,
  'index.ts': `import type { Feature } from '../../app/feature';
import { ${camel}Engine } from './engine';
import { panels } from './ui';

export const ${camel}: Feature = { ...${camel}Engine, panels };
`,
  'README.md': `# ${id}

**Requirements:** ${reqs.join(', ') || '—'} (see docs/requirements.md)
**Status:** scaffolded, off by default.

## What it does
TODO

## War-game check
TODO — copy from docs/requirements.md and refine.

## Where things live
- \`engine.ts\` — logic and plug-ins (pure, tested in \`engine.test.ts\`).
- \`ui.ts\` — panels/tabs/actions.

## Decisions
-
`,
};

mkdirSync(dir, { recursive: true });
for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);

const reg = join(ROOT, 'src', 'features', 'index.ts');
let src = readFileSync(reg, 'utf8');
src = src.replace('// <feature-imports>', `import { ${camel} } from './${id}';\n// <feature-imports>`);
src = src.replace('  // <feature-list>', `  ${camel},\n  // <feature-list>`);
writeFileSync(reg, src);

console.log(`Created src/features/${id}/ and registered it in src/features/index.ts.
Next:
  1. Write the behavior in engine.ts and tests in engine.test.ts
  2. Run: npm run test:one -- ${id}
  3. Set defaultOn: true when ready, then: npm run check`);
