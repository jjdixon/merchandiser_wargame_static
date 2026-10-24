// Photo review tab: the review queue and the display compliance dashboard.
import { DAYS, DISPLAY_RESULTS, fmt, storeById, type DisplayResult } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, ViewCtx, ViewDef } from '../../app/feature';
import { DIMENSIONS, ID, dashboard, goal, queue, review, total, type Dimension, type QueueItem, type Row } from './engine';

const TONE: Record<DisplayResult, string> = { compliant: 'ok', 'partially compliant': 'wait', 'non-compliant': 'late', absent: 'late', 'not applicable': '', 'unable to verify': 'wait' };
let dim: Dimension = 'merchandiser';
let shown: QueueItem[] = [];
const who = (app: AppApi) => app.viewer?.split(' · ').slice(0, 2).join(' ') || 'Facilitator';
const pct = (r: number | null) => (r == null ? '—' : `${Math.round(r * 100)}%`);

function item(ctx: ViewCtx, q: QueueItem, i: number): string {
  const e = q.ev, s = storeById(ctx.state, e.storeId), t = ctx.state.displays.tasks.find(x => x.id === e.taskId), rec = e.photo!.recognition;
  const thumb = e.photo!.url ? `<img src="${esc(e.photo!.url)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:6px">` : '<div class="muted" style="width:64px;height:64px;border-radius:6px;background:var(--soft);display:grid;place-items:center;font-size:11px">sim</div>';
  return `<div style="display:grid;grid-template-columns:64px 1fr;gap:10px;padding:10px 14px;border-bottom:1px solid var(--soft);font-size:13px">${thumb}
    <div style="min-width:0"><b>${esc(t?.name ?? e.taskId)}</b> · ${s ? ctx.storeLink(s) : esc(e.storeId)}
      <div class="muted">${esc(e.action)} · ${esc(DAYS[e.day] ?? '')} ${fmt(e.t)} · ${esc(e.by)}${e.auto ? ' (simulated)' : ''}${e.reason ? ` · ${esc(e.reason)}` : ''}</div>
      <div>Reported <span class="flag ${TONE[e.result]}">${esc(e.result)}</span>${rec ? ` · recognition <span class="flag ${TONE[rec.compliance]}">${esc(rec.compliance)}</span> <span class="mono muted">${rec.confidence}%</span>` : ''}</div>
      ${q.why.length ? `<div class="muted" style="font-size:12px">Why it's here: ${esc(q.why.join('; '))}</div>` : ''}
      <div class="ctl" style="margin-top:4px;gap:6px"><button class="btn sm" data-act="${ID}:confirm" data-i="${i}">Confirm ${esc(e.result)}</button>
        <select data-fchange="${ID}:set" data-i="${i}" aria-label="Change result"><option value="">Change to…</option>${DISPLAY_RESULTS.filter(x => x !== e.result).map(x => `<option>${esc(x)}</option>`).join('')}</select></div></div></div>`;
}

function bar(r: Row, g: number): string {
  if (r.rate == null) return '<span class="muted">—</span>';
  const w = Math.round(r.rate * 100);
  return `<div style="display:flex;align-items:center;gap:8px"><div style="position:relative;flex:1;min-width:60px;height:8px;background:var(--soft);border-radius:4px">
    <div style="width:${w}%;height:100%;border-radius:4px;background:${r.rate >= g ? 'var(--ok)' : 'var(--late)'}"></div>
    <div title="goal" style="position:absolute;top:-3px;left:${Math.round(g * 100)}%;width:2px;height:14px;background:var(--ink)"></div></div><span class="mono">${w}%</span></div>`;
}

export const photoReviewView: ViewDef = {
  id: 'photos',
  label: 'Photo review',
  render(ctx: ViewCtx) {
    const { state, scope } = ctx;
    const ok = (id: string) => { const s = storeById(state, id); return s ? scope.store(s) : !scope.label };
    shown = queue(state, ok);
    const rows = dashboard(state, dim, ok), all = total(rows), g = goal(state);
    const dims = DIMENSIONS.map(([k, l]) => `<option value="${k}"${k === dim ? ' selected' : ''}>${l}</option>`).join('');
    const head = dim === 'day' ? '<th class="n">Results</th>' : '<th class="n">Planned</th><th class="n">Due today</th><th class="n">Done today</th><th class="n">Overdue</th>';
    const cells = (r: Row) => (dim === 'day' ? `<td class="n">${r.completed}</td>` : `<td class="n">${r.planned}</td><td class="n">${r.due}</td><td class="n">${r.completed}</td><td class="n">${r.overdue || ''}</td>`);
    const tr = (r: Row, b = false) => `<tr${b ? ' style="font-weight:600"' : ''}><td>${esc(r.key)}</td>${cells(r)}<td class="n">${r.absent || ''}</td><td class="n">${r.nonCompliant || ''}</td><td class="n">${r.compliant}</td><td style="min-width:140px">${bar(r, g)}</td></tr>`;
    const dash = `<section class="panel"><div class="ph"><h2>Display compliance</h2><label class="muted" style="font-size:13px">by <select data-fchange="${ID}:dim">${dims}</select></label></div>
        <div class="pb"><div class="kpis">
          <div class="kpi${all.rate != null && all.rate < g ? ' bad' : ''}"><span class="lbl">Compliance</span><b>${pct(all.rate)}</b></div>
          <div class="kpi"><span class="lbl">Goal</span><b>${Math.round(g * 100)}%</b></div>
          <div class="kpi"><span class="lbl">Overdue</span><b>${all.overdue}</b></div>
          <div class="kpi"><span class="lbl">Absent</span><b>${all.absent}</b></div>
          <div class="kpi"><span class="lbl">To review</span><b>${shown.length}</b></div></div></div>
        <div class="tw"><table><thead><tr><th>${esc(DIMENSIONS.find(d => d[0] === dim)![1])}</th>${head}<th class="n">Absent</th><th class="n">Non / partial</th><th class="n">Compliant</th><th>Rate vs goal</th></tr></thead>
          <tbody>${rows.map(r => tr(r)).join('')}${rows.length > 1 ? tr(all, true) : ''}</tbody></table></div>
        <div class="pb note">Rate = compliant ÷ (compliant + partial + non-compliant + absent). Worst first. The goal is a setting under Displays.</div></section>`;
    return `${dash}
      <section class="panel"><div class="ph"><h2>Photo review queue</h2><span class="muted" style="font-size:12.5px">BR-043 · ${shown.length} to review · suspected non-compliance first</span></div>
        <div class="alerts" style="max-height:none">${shown.slice(0, 40).map((q, i) => item(ctx, q, i)).join('') || '<div class="empty"><strong>Nothing to review</strong>Display photos land here as visits happen. Run the day.</div>'}</div>
        <div class="pb note">Recognition is simulated. Your decision becomes the display's result (BR-040) and is logged with your role.</div></section>`;
  },
};

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  confirm(app, el) {
    const q = shown[Number(el.dataset.i)];
    if (q) { review(app.state, q.ev, q.ev.result, who(app), 'confirmed from photo'); app.toast('Confirmed') }
    app.refresh();
  },
};
export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  dim(app, el) { dim = el.value as Dimension; app.refresh() },
  set(app, el) {
    const q = shown[Number(el.dataset.i)];
    if (q && el.value) { review(app.state, q.ev, el.value as DisplayResult, who(app), 'changed from photo'); app.toast(`Changed to ${el.value}`) }
    app.refresh();
  },
};
