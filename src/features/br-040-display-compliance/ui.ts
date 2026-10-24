// Displays tab: every display's lifecycle and compliance, with manager override.
import { DAYS, DISPLAY_RESULTS, fmt, storeById, type DisplayResult } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, ViewCtx, ViewDef } from '../../app/feature';
import { ID, override, records, summarize, type DisplayRecord, type Phase } from './engine';

export const TONE: Record<DisplayResult, string> = {
  compliant: 'ok', 'partially compliant': 'wait', 'non-compliant': 'late', absent: 'late', 'not applicable': '', 'unable to verify': 'wait',
};
const PHASE: Record<Phase, string> = { planned: 'Planned', due: 'Due today', overdue: 'Overdue', up: 'Up', expired: 'Expired — take down', removed: 'Removed', 'not applicable': 'Not applicable' };
const d = (n: number | null) => (n == null ? '—' : n >= 0 && n <= 6 ? DAYS[n] : n < 0 ? 'before' : 'next wk');
let filter = '';

const flag = (r: DisplayResult | null) => (r ? `<span class="flag ${TONE[r]}">${esc(r)}</span>` : '<span class="muted">not yet</span>');

function row(ctx: ViewCtx, r: DisplayRecord): string {
  const s = storeById(ctx.state, r.task.storeId);
  const hist = r.history.map(e => `<div>${esc(DAYS[e.day] ?? '')} ${fmt(e.t)} · ${esc(e.action)} · ${esc(e.result)}${e.reason ? ` (${esc(e.reason)})` : ''} · ${esc(e.by)}${e.auto ? ' (simulated)' : ''}${e.photo ? ' · 📷' : ''}${e.note ? ` — ${esc(e.note)}` : ''}</div>`).join('');
  const opts = DISPLAY_RESULTS.map(x => `<option${x === r.result ? ' selected' : ''}>${esc(x)}</option>`).join('');
  return `<tr><td class="sname">${esc(s?.name ?? r.task.storeId)}<small>${esc(r.task.location)}</small></td>
    <td>${esc(r.task.name)}<div class="muted" style="font-size:12px">${esc(r.task.brand)} · ${esc(r.task.displayType)}</div>
      ${hist ? `<details><summary class="muted" style="font-size:12px;cursor:pointer">History (${r.history.length})</summary><div class="muted" style="font-size:12px">${hist}</div></details>` : ''}</td>
    <td>${esc(PHASE[r.phase])}${r.carriedIn ? '<div class="muted" style="font-size:12px">up before this week</div>' : ''}</td>
    <td class="n">${d(r.expectedSetup)} / ${d(r.actualSetup)}</td>
    <td class="n">${d(r.expectedRemoval)} / ${d(r.actualRemoval)}</td>
    <td class="n">${r.daysUp}</td>
    <td class="n">${r.photos.length || '—'}</td>
    <td>${flag(r.result)}${r.reviewed ? ' <span class="muted" style="font-size:12px">reviewed</span>' : ''}</td>
    <td><select data-fchange="${ID}:override" data-task="${esc(r.task.id)}" aria-label="Override result" style="max-width:11em"><option value="">Override…</option>${opts}</select></td></tr>`;
}

export const displaysView: ViewDef = {
  id: 'displays',
  label: 'Displays',
  render(ctx: ViewCtx) {
    const { state, scope } = ctx;
    const ok = (id: string) => { const s = storeById(state, id); return s ? scope.store(s) : !scope.label };
    const all = records(state, ok), sum = summarize(all);
    const list = filter ? all.filter(r => (filter === 'open' ? !r.result : r.result === filter)) : all;
    const kpi = (label: string, v: string, tone = '') => `<div class="kpi${tone ? ' ' + tone : ''}"><span class="lbl">${label}</span><b>${v}</b></div>`;
    const sel = ['', 'open', ...DISPLAY_RESULTS].map(x => `<option value="${esc(x)}"${x === filter ? ' selected' : ''}>${x ? esc(x === 'open' ? 'not checked yet' : x) : 'All results'}</option>`).join('');
    return `<section class="panel"><div class="ph"><h2>Display compliance</h2><span class="muted" style="font-size:12.5px">BR-040 · ${DAYS[state.day]} · live and finished displays</span></div>
      <div class="pb"><div class="kpis">
        ${kpi('Compliance', sum.rate == null ? '—' : `${Math.round(sum.rate * 100)}%`, sum.rate != null && sum.rate < 0.8 ? 'bad' : '')}
        ${kpi('Compliant', String(sum.counts.compliant))}${kpi('Partial', String(sum.counts['partially compliant']))}
        ${kpi('Non-compliant', String(sum.counts['non-compliant']))}${kpi('Absent', String(sum.counts.absent))}
        ${kpi('Unable to verify', String(sum.counts['unable to verify']))}${kpi('Not checked yet', String(sum.open))}
      </div><p class="note" style="margin:8px 0 0">Compliance = compliant ÷ (compliant + partial + non-compliant + absent). Override a result after reviewing the photo; the override is logged with your role.</p></div>
      <div class="pb ctl" style="padding-top:0"><label class="muted" style="font-size:13px">Show <select data-fchange="${ID}:filter">${sel}</select></label></div>
      <div class="tw"><table><thead><tr><th>Store</th><th>Display</th><th>Phase</th><th class="n">Setup exp / act</th><th class="n">Removal exp / act</th><th class="n">Days up</th><th class="n">Photos</th><th>Result</th><th>Review</th></tr></thead>
      <tbody>${list.map(r => row(ctx, r)).join('') || '<tr><td colspan="9" class="muted">No displays match.</td></tr>'}</tbody></table></div></section>`;
  },
};

export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  filter(app, el) { filter = el.value; app.refresh() },
  override(app, el) {
    if (!el.value) return;
    override(app.state, el.dataset.task!, el.value as DisplayResult, app.viewer?.split(' · ').slice(0, 2).join(' ') || 'Facilitator');
    app.toast(`Result set to ${el.value}`);
    app.refresh();
  },
};
