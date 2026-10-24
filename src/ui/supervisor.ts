import { allPlans, fmt, money, previewAssign, readyAt, status, totals } from '../engine';
import { crewCard, esc, firstName, initials, shortName, type ViewCtx } from './shared';

const SCALE = 10; // px per km on the map

export function supervisorView(ctx: ViewCtx): string {
  const { state } = ctx;
  const { scope } = ctx;
  const r = state.rules, plans = allPlans(state).filter(p => scope.merch(p.m)), t = totals(plans);
  const stores = state.stores.filter(scope.store);
  const done = plans.reduce((a, p) => a + p.stops.filter(x => state.t >= x.end).length, 0);
  const un = stores.filter(s => !s.assign);
  const otRisk = plans.filter(p => p.weekProj > r.ot).length;
  const lateN = plans.reduce((a, p) => a + p.late.length, 0);
  const avail = state.merch.filter(m => !m.out && scope.merch(m));

  const unHtml = un.length ? un.map(s => {
    const opts = avail.map(m => {
      const { plan: pp, stop: x } = previewAssign(state, s, m);
      return `<button class="btn sm" data-act="give" data-id="${s.id}" data-m="${m.id}">${esc(firstName(m.name))} · done ${fmt(x?.end)}${pp.weekProj > r.ot ? ' · OT' : ''}${x && x.end > s.win ? ' · late' : ''}</button>`;
    }).join('');
    return `<div class="u"><div><b>${esc(s.name)}</b> <span class="muted">${s.cases} cases · truck ${fmt(s.eta)} · done by ${fmt(s.win)}</span></div><div class="opts">${opts || '<span class="muted">Nobody available.</span>'}</div></div>`;
  }).join('') : '<div class="muted">Every stop has someone on it.</div>';

  const px = (v: number) => v * SCALE + 10;
  let svg = `<svg viewBox="0 0 410 320" role="img" aria-label="Map of stores and merchandisers"><rect width="410" height="320" fill="var(--soft)" rx="6"/>`;
  for (let i = 1; i < 8; i++) svg += `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="320" stroke="var(--line)" stroke-width=".6"/>`;
  for (let i = 1; i < 7; i++) svg += `<line x1="0" y1="${i * 50}" x2="410" y2="${i * 50}" stroke="var(--line)" stroke-width=".6"/>`;
  for (const s of stores) {
    const lk = s.lock;
    const c = !s.assign ? 'var(--late)' : lk && state.t >= lk.end ? 'var(--ok)' : lk && state.t >= lk.start ? 'var(--work)' : 'var(--panel)';
    svg += `<circle cx="${px(s.xy[0])}" cy="${px(s.xy[1])}" r="6" fill="${c}" stroke="var(--ink)" stroke-width="1.2"><title>${esc(s.name)}${!s.assign && readyAt(state, s) <= state.t ? ' — product waiting' : ''}</title></circle>
      <text x="${px(s.xy[0]) + 8}" y="${px(s.xy[1]) + 4}" font-size="10" fill="var(--muted)" font-family="IBM Plex Sans Condensed,sans-serif">${esc(shortName(s.name))}</text>`;
  }
  for (const p of plans) {
    const s = status(state, p);
    if (s.k === 'out') continue;
    const pos = s.pos ?? p.m.home;
    svg += `<g><rect x="${px(pos[0]) - 9}" y="${px(pos[1]) - 9}" width="18" height="18" rx="4" fill="var(--accent)"/>
      <text x="${px(pos[0])}" y="${px(pos[1]) + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent-ink)" font-family="IBM Plex Mono,monospace">${esc(initials(p.m.name))}</text>
      <title>${esc(p.m.name)} — ${esc(s.label)}</title></g>`;
  }
  svg += '</svg>';

  const kpi = (label: string, value: string, bad = false) => `<div class="kpi${bad ? ' bad' : ''}"><span class="lbl">${label}</span><b>${value}</b></div>`;
  return `
  <section class="kpis">
    ${kpi('Stops done', `${done}/${stores.length}`)}
    ${kpi('Need coverage', String(un.length), un.length > 0)}
    ${kpi('Projected late', String(lateN), lateN > 0)}
    ${kpi('Overtime risk', String(otRisk), otRisk > 0)}
    ${kpi('Paid idle (truck)', Math.round(t.wait) + 'm')}
    ${kpi('Projected cost', money(t.cost))}
  </section>
  <section class="grid two">
    <div class="grid" style="align-content:start">
      <div class="panel"><div class="ph"><h2>Needs coverage</h2><span class="muted" style="font-size:12.5px">Buttons show when each person would finish it</span></div><div class="pb una">${unHtml}</div></div>
      <div class="grid crew">${plans.map(p => crewCard(state, p)).join('')}</div>
      ${ctx.slot('super.main')}
    </div>
    <div class="grid" style="align-content:start">
      <div class="panel map"><div class="ph"><h2>Live map</h2><span class="legend"><span><i style="background:var(--ok)"></i>done</span><span><i style="background:var(--work)"></i>in progress</span><span><i style="background:var(--late)"></i>uncovered</span></span></div><div class="pb">${svg}</div></div>
      ${ctx.slot('super.aside')}
    </div>
  </section>`;
}
