// Timesheets tab: approve, return or adjust each day's sheet; export preview.
import { DAYS, fmt } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, ViewCtx, ViewDef } from '../../app/feature';
import { ID, adjust, book, decide, exportCsv, hours, key, sheets, statusOf, type Sheet, type SheetStatus } from './engine';

const TONE: Record<SheetStatus, string> = { open: '', pending: 'wait', approved: 'ok', returned: 'late' };
const LABEL: Record<SheetStatus, string> = { open: 'still working', pending: 'to approve', approved: 'approved', returned: 'returned' };
let dayFilter: number | 'all' = 'all';
let visible: Sheet[] = [];
const by = (app: AppApi) => app.viewer?.split(' · ').slice(0, 2).join(' ') || 'Facilitator';
const field = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';

function row(ctx: ViewCtx, s: Sheet, i: number): string {
  const st = statusOf(ctx.state, s), h = hours(ctx.state, s), k = esc(key(s.merchId, s.day)).replace('@', '-');
  const d = book(ctx.state).decisions[key(s.merchId, s.day)];
  const flags = s.flags.length ? `<details><summary class="flag wait" style="cursor:pointer">${s.flags.length} to check</summary><div class="muted" style="font-size:12px;max-width:28em;white-space:normal">${s.flags.map(esc).join('<br>')}</div></details>` : '<span class="muted">none</span>';
  const acts = st === 'open' ? '<span class="muted" style="font-size:12px">after clock-out</span>'
    : `<div class="ctl" style="gap:4px;flex-wrap:wrap">${st !== 'approved' ? `<button class="btn sm pri" data-act="${ID}:approve" data-i="${i}">Approve</button>` : ''}
        <input type="text" id="ts-r-${k}" placeholder="Reason" style="width:9em" aria-label="Reason">
        <input type="number" id="ts-m-${k}" placeholder="± min" style="width:5em" aria-label="Adjust minutes">
        <button class="btn sm" data-act="${ID}:adjust" data-i="${i}" data-k="${k}">Adjust</button>
        ${st !== 'returned' ? `<button class="btn sm" data-act="${ID}:return" data-i="${i}" data-k="${k}">Return</button>` : ''}</div>`;
  return `<tr><td class="mono">${esc(s.empId)}</td><td>${esc(s.name)}</td><td>${esc(DAYS[s.day])}</td>
    <td class="n">${fmt(s.clockIn)}–${fmt(s.clockOut)}</td>
    <td class="n">${(h.paidMin / 60).toFixed(2)}${h.adjust ? `<small>${h.adjust.minutes > 0 ? '+' : ''}${h.adjust.minutes} min: ${esc(h.adjust.reason)}</small>` : ''}</td>
    <td class="n">${h.reg.toFixed(2)}</td><td class="n">${h.oth ? h.oth.toFixed(2) : ''}</td>
    <td class="n">${s.miles.toFixed(1)}<small>$${(s.miles * s.mileageRate).toFixed(2)}</small></td>
    <td>${flags}</td>
    <td><span class="flag ${TONE[st]}">${LABEL[st]}</span>${d ? `<small class="muted" style="display:block">${esc(d.by)}${d.reason ? `: ${esc(d.reason)}` : ''}</small>` : ''}</td>
    <td>${acts}</td></tr>`;
}

export const timesheetsView: ViewDef = {
  id: 'timesheets',
  label: 'Timesheets',
  render(ctx: ViewCtx) {
    const all = sheets(ctx.state, ctx.scope.merch);
    visible = dayFilter === 'all' ? all : all.filter(s => s.day === dayFilter);
    const days = [...new Set(all.map(s => s.day))].sort();
    const pending = visible.filter(s => statusOf(ctx.state, s) === 'pending');
    const clean = pending.filter(s => !s.flags.length);
    const out = exportCsv(ctx.state, visible), lines = out.split('\n').length - 1;
    return `<section class="panel"><div class="ph"><h2>Timesheets</h2>
        <div class="ctl" style="gap:6px"><select data-fchange="${ID}:day" aria-label="Day"><option value="all">All days this week</option>${days.map(d => `<option value="${d}"${d === dayFilter ? ' selected' : ''}>${DAYS[d]}</option>`).join('')}</select>
        ${clean.length ? `<button class="btn sm" data-act="${ID}:approveClean">Approve ${clean.length} with nothing to check</button>` : ''}</div></div>
      <div class="pb note" style="padding-bottom:0">${pending.length} to approve. Regular / overtime is split on the week (overtime after ${ctx.state.rules.ot} h). Adjust with a reason, e.g. a geofence gap you rejected. Pay rules are placeholders pending legal review.</div>
      <div class="tw"><table><thead><tr><th>Emp id</th><th>Name</th><th>Day</th><th class="n">In–out</th><th class="n">Paid h</th><th class="n">Regular</th><th class="n">OT</th><th class="n">Miles</th><th>Exceptions</th><th>Status</th><th></th></tr></thead>
        <tbody>${visible.map((s, i) => row(ctx, s, i)).join('') || '<tr><td colspan="11" class="muted">No timesheets yet.</td></tr>'}</tbody></table></div></section>
    <section class="panel"><div class="ph"><h2>Payroll and mileage export (preview)</h2><button class="btn sm" data-act="${ID}:copy"${lines ? '' : ' disabled'}>Copy CSV</button></div>
      <div class="pb">${lines ? `<pre class="math" style="white-space:pre;overflow:auto;max-height:260px">${esc(out)}</pre>` : '<p class="muted" style="margin:0">Approved timesheets appear here. Nothing is sent anywhere.</p>'}</div></section>`;
  },
};

const pick = (el: HTMLElement) => visible[Number(el.dataset.i)];
export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  approve(app, el) { const s = pick(el); if (s && decide(app.state, s, 'approved', by(app))) app.toast(`Approved ${s.name} · ${DAYS[s.day]}`); app.refresh() },
  approveClean(app) {
    let n = 0;
    for (const s of visible) if (statusOf(app.state, s) === 'pending' && !s.flags.length && decide(app.state, s, 'approved', by(app))) n++;
    app.toast(`Approved ${n}`); app.refresh();
  },
  return(app, el) {
    const s = pick(el), reason = field(`ts-r-${el.dataset.k}`);
    if (!s) return;
    app.toast(decide(app.state, s, 'returned', by(app), reason) ? `Returned to ${s.name}` : 'Add a reason to return it');
    app.refresh();
  },
  adjust(app, el) {
    const s = pick(el), reason = field(`ts-r-${el.dataset.k}`), min = Number(field(`ts-m-${el.dataset.k}`));
    if (!s) return;
    app.toast(adjust(app.state, s, min, reason, by(app)) ? 'Adjusted — approve it again' : 'Enter minutes (+ or −) and a reason');
    app.refresh();
  },
  copy(app) { void app.copy(exportCsv(app.state, visible), 'Export copied') },
};
export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  day(app, el) { dayFilter = el.value === 'all' ? 'all' : Number(el.value); app.refresh() },
};
