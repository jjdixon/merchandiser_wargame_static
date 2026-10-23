// Findings ("This won't work because…") persisted in the browser.
// Browser-only on purpose for now; see docs/decisions.md (D-004) for the
// planned move to a shared store.
export interface Finding { id: string; area: string; context: string; text: string; at: string }

const KEY = 'mwg.findings';

export function loadFindings(): Finding[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    // Migrate v0 prototype shape {cat, ctx} → {area, context}
    return (JSON.parse(raw) as Array<Record<string, string>>).map(f => ({
      id: f.id, area: f.area ?? f.cat ?? 'Other', context: f.context ?? f.ctx ?? '', text: f.text, at: f.at ?? '',
    }));
  } catch { return [] }
}

export function saveFindings(list: Finding[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage blocked — keep in memory */ }
}

export const findingsAsText = (list: Finding[]) =>
  list.map(f => `[${f.area}] (${f.context}) ${f.text}`).join('\n');

/** Markdown checklist suitable for pasting into docs/backlog.md. */
export const findingsAsMarkdown = (list: Finding[]) =>
  list.map(f => `- [ ] **${f.area}** — ${f.text}  \n  _${f.context}_`).join('\n');
