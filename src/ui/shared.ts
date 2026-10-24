// Shared view helpers. Views are pure functions: (ctx) => HTML string.
// Interaction is wired in main.ts via data-act / data-* attributes.
// Feature folders may import these helpers.
import type { DayPlan, SimState } from '../engine';
import { fmt, hrs, status } from '../engine';
export type { ViewCtx } from '../app/feature';

export const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Short store label for tight spaces: "ValuMart #1042" → "#1042". */
export const shortName = (n: string) => n.replace(/^.* (#\d+)$/, '$1').replace('Hometown Grocer', 'Hometown');
export const firstName = (n: string) => n.split(' ')[0];
export const initials = (n: string) => n.split(' ').map(w => w[0]).join('');

const ROLE_WORD = { merchandiser: 'Merchandiser', relief: 'Vacation relief', jumper: 'Route jumper' } as const;
const STATUS_WORD = { work: 'In store', drive: 'Driving', wait: 'Waiting', done: 'Done', out: 'Out', off: 'Off clock', idle: 'Off clock' } as const;

export function crewCard(state: SimState, p: DayPlan): string {
  const r = state.rules, s = status(state, p);
  const pct = Math.min(100, (p.weekProj / (r.ot + 8)) * 100), mark = (r.ot / (r.ot + 8)) * 100;
  const where = s.stop && s.k !== 'off' && s.k !== 'drive' ? ' · ' + esc(s.stop.s.name) : '';
  return `<div class="card">
    <div class="top"><h3>${esc(p.m.name)}</h3><span class="pill p-${s.k}">${STATUS_WORD[s.k]}</span></div>
    <div class="muted" style="font-size:12px;margin-top:-4px">${esc(ROLE_WORD[p.m.role])}${p.m.market ? ' · ' + esc(p.m.market) : ''} · ${esc(p.m.routeTypes.join(', '))}</div>
    <div class="muted" style="font-size:12.5px;min-height:2.6em">${esc(s.label)}${where}</div>
    <dl class="kv">
      <dt>Stops</dt><dd>${p.stops.filter(x => state.t >= x.end).length}/${p.stops.length}</dd>
      <dt>On clock</dt><dd>${fmt(p.clockIn)}–${fmt(p.clockOut)}</dd>
      <dt>Paid today</dt><dd>${hrs(p.paid)}</dd>
      <dt>Work · drive · wait</dt><dd>${Math.round(p.work)}·${Math.round(p.dB + (r.paidCommute ? p.dF : 0))}·${Math.round(p.wait)}m</dd>
      <dt>Week projected</dt><dd style="color:${p.weekProj > r.ot ? 'var(--late)' : 'inherit'}">${p.weekProj.toFixed(1)} / ${r.ot}</dd>
    </dl>
    <div class="wk" title="Weekly hours vs overtime line"><i class="${p.weekProj > r.ot ? 'ot' : ''}" style="width:${pct}%"></i><b style="left:${mark}%"></b></div>
    ${p.late.length ? `<div class="flag late">${p.late.length} stop${p.late.length > 1 ? 's' : ''} past done-by time</div>` : ''}
  </div>`;
}

const DAY0 = 300, DAY1 = 1170; // 5:00a – 7:30p
const X = (m: number) => (((Math.max(DAY0, Math.min(DAY1, m)) - DAY0) / (DAY1 - DAY0)) * 100).toFixed(2) + '%';
const W = (a: number, b: number) => (((Math.min(DAY1, b) - Math.max(DAY0, a)) / (DAY1 - DAY0)) * 100).toFixed(2) + '%';

export function gantt(state: SimState, plans: DayPlan[]): string {
  let ax = '', gl = '';
  for (let h = 5; h <= 19; h += 2) ax += `<span style="left:${X(h * 60)}">${h % 12 || 12}${h < 12 ? 'a' : 'p'}</span>`;
  for (let h = 5; h <= 19; h++) gl += `<i class="gl" style="left:${X(h * 60)}"></i>`;
  const rows = plans.map(p => {
    const segs = p.stops.map(x => {
      const late = x.end > x.s.win ? ' late' : '', done = state.t >= x.end ? ' done' : '';
      return `<i class="seg drive" style="left:${X(x.depart)};width:${W(x.depart, x.arrive)}" title="Drive ${Math.round(x.drive)} min"></i>` +
        (x.wait > 0.5 ? `<i class="seg wait" style="left:${X(x.arrive)};width:${W(x.arrive, x.start)}" title="Waiting on truck ${Math.round(x.wait)} min"></i>` : '') +
        `<i class="seg work${late}${done}" style="left:${X(x.start)};width:${W(x.start, x.end)}" title="${esc(x.s.name)} ${fmt(x.start)}–${fmt(x.end)} (done by ${fmt(x.s.win)})"><span>${esc(shortName(x.s.name))}</span></i>`;
    }).join('');
    return `<div class="grow"><div class="nm">${esc(p.m.name)}${p.m.out ? ' <span class="pill p-out">out</span>' : ''}</div><div class="track">${gl}${segs}<i class="now" style="left:${X(state.t)}"></i></div></div>`;
  }).join('');
  return `<div class="gantt"><div class="gin"><div class="gaxis"><span></span><div class="sc">${ax}</div></div>${rows}</div></div>`;
}

export const LEGEND = `<div class="legend"><span><i style="background:var(--work)"></i>In store</span><span><i style="background:var(--wait)"></i>Waiting on truck (paid)</span><span><i style="background:repeating-linear-gradient(90deg,var(--drive) 0 4px,transparent 4px 6px)"></i>Driving</span><span><i style="box-shadow:0 0 0 2px var(--late)"></i>Past done-by</span></div>`;
