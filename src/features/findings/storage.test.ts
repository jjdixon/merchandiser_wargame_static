import { describe, expect, it } from 'vitest';
import { findingsAsMarkdown, findingsAsText, type Finding } from './storage';

const f: Finding = { id: 'f1', area: 'Delivery handoff', context: 'Supervisor · 6:30a · Late trucks', text: 'Receiving opens at 7', at: '' };

describe('findings export [war-game tool]', () => {
  it('exports plain text with area and context', () => {
    expect(findingsAsText([f])).toBe('[Delivery handoff] (Supervisor · 6:30a · Late trucks) Receiving opens at 7');
  });
  it('exports a Markdown checklist for docs/backlog.md', () => {
    expect(findingsAsMarkdown([f])).toContain('- [ ] **Delivery handoff** — Receiving opens at 7');
  });
});
