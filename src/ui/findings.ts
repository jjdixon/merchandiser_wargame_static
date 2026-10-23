import { esc, type ViewCtx } from './shared';

export function findingsView({ findings, confirmClear }: ViewCtx): string {
  if (!findings.length) return `<section class="panel"><div class="empty"><strong>No findings yet</strong>Every time someone says “that's not how it works,” tap <b>This won't work because…</b> at the bottom right. The screen, merchandiser and clock time get attached automatically.</div></section>`;
  const byArea: Record<string, number> = {};
  findings.forEach(f => (byArea[f.area] = (byArea[f.area] ?? 0) + 1));
  const actions = confirmClear
    ? '<span class="flag late">Delete all findings on this device?</span><button class="btn sm" data-act="clrno">Keep</button><button class="btn sm pri" data-act="clryes">Delete all</button>'
    : '<button class="btn sm" data-act="copy">Copy as text</button><button class="btn sm" data-act="copymd">Copy for backlog.md</button><button class="btn sm" data-act="clr">Clear…</button>';
  return `<section class="panel"><div class="ph"><h2>${findings.length} finding${findings.length > 1 ? 's' : ''}</h2><div class="ctl">${actions}</div></div>
    <div class="pb legend">${Object.entries(byArea).map(([k, v]) => `<span>${esc(k)} <b class="mono">${v}</b></span>`).join('')}</div>
    <div class="fl">${findings.slice().reverse().map(f => `<div class="f"><div class="meta"><span class="pill">${esc(f.area)}</span><span class="mono">${esc(f.context)}</span></div><p>${esc(f.text)}</p><div><button class="btn sm" data-act="fdel" data-id="${esc(f.id)}">Remove</button></div></div>`).join('')}</div>
    <div class="pb note">Saved in this browser only. After each session, use “Copy for backlog.md” and paste into docs/backlog.md in the repo.</div></section>`;
}
