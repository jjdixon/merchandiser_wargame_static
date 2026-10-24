import { KM_TO_MI, fmt, hrs, merchById, paidSoFar, plan, readyAt, status } from '../engine';
import { ISSUES } from '../data';
import { esc, firstName, type ViewCtx } from './shared';

export function merchandiserView(ctx: ViewCtx): string {
  const { state, selM } = ctx;
  const r = state.rules, m = merchById(state, selM)!, p = plan(state, m), s = status(state, p);
  const cur = s.stop && (s.k === 'wait' || s.k === 'work' || s.k === 'drive') ? s.stop : null;
  const onClock = p.clockIn != null && state.t >= p.clockIn && state.t < p.clockOut!;
  const sofar = paidSoFar(state, p);

  const picker = ctx.scope.lockMerch ? '' : `<div class="picker">${state.merch.filter(ctx.scope.merch).map(x =>
    `<button class="chip" data-act="selm" data-id="${x.id}" aria-pressed="${x.id === selM}">${esc(firstName(x.name))}${x.out ? ' (out)' : ''}</button>`).join('')}</div>`;

  let curHtml: string;
  if (m.out && !cur) {
    curHtml = `<div class="cur"><h3>You're off today</h3><div class="muted">Your stops were released to your supervisor for coverage.</div></div>`;
  } else if (!cur) {
    const nx = p.stops.find(x => state.t < x.end);
    curHtml = `<div class="cur"><span class="lbl">${s.k === 'done' ? 'All done' : 'Next up'}</span><h3>${nx ? esc(nx.s.name) : 'Day complete'}</h3>
      <div class="muted">${nx ? 'Leave by ' + fmt(nx.depart) + ' · truck ready ' + fmt(readyAt(state, nx.s)) : 'Clocked out ' + fmt(p.clockOut) + '. Mileage logged: ' + p.miles.toFixed(1) + ' mi.'}</div></div>`;
  } else {
    const sx = cur.s;
    const sub = s.k === 'drive' ? `Arrive ${fmt(cur.arrive)} · ${(cur.km * KM_TO_MI).toFixed(1)} mi`
      : s.k === 'wait' ? `Checked in ${fmt(cur.arrive)} (geofence OK) · truck ready ${fmt(readyAt(state, sx))} · paid idle so far ${Math.round(state.t - cur.arrive)} min`
      : `${sx.cases} cases · est. done ${fmt(cur.end)} · store wants done by ${fmt(sx.win)}`;
    curHtml = `<div class="cur">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="lbl">Current stop</span><span class="pill p-${s.k}">${s.k === 'work' ? 'Working' : s.k === 'wait' ? 'Waiting on truck' : 'Driving'}</span></div>
      <h3>${esc(sx.name)}</h3>
      <div class="muted" style="font-size:13px">${sub}</div>
      ${s.k === 'work' ? `<div class="prog"><i style="width:${Math.round((s.pct ?? 0) * 100)}%"></i></div>` : ''}
      ${ctx.slot('merch.visit')}
      <div class="acts">
        <button class="btn" data-act="trucknot" data-id="${sx.id}"${state.t >= cur.start ? ' disabled' : ''}>Truck not here yet</button>
        <button class="btn" data-act="long" data-id="${sx.id}"${s.k !== 'work' ? ' disabled' : ''}>Running long +15 min</button>
        <select data-issue="${sx.id}" aria-label="Report an issue" style="grid-column:1/-1"><option value="">Report an issue…</option>${ISSUES.map(x => `<option>${esc(x)}</option>`).join('')}</select>
      </div>
    </div>`;
  }

  const route = p.stops.map((x, i) => {
    const cls = state.t >= x.end ? 'done' : cur && cur.s.id === x.s.id ? 'cur' : '';
    return `<div class="st ${cls}"><span class="dot">${state.t >= x.end ? '✓' : i + 1}</span>
      <div><div style="font-weight:600">${esc(x.s.name)}</div><div class="muted" style="font-size:12.5px">${x.s.cases} cases · truck ${fmt(x.s.eta)}${x.wait > 3 ? ` · <span class="flag wait">wait ${Math.round(x.wait)}m</span>` : ''}${x.end > x.s.win ? ' · <span class="flag late">late</span>' : ''}</div></div>
      <div class="mono" style="font-size:12.5px;text-align:right">${fmt(x.start)}<br><span class="muted">${fmt(x.end)}</span></div></div>`;
  }).join('');

  return `${picker}
  <div class="phone">
    <div class="ptop"><div class="nm">${esc(m.name)}</div>
      <div class="row"><span>${onClock ? 'On the clock' : 'Off the clock'}</span><b class="mono">${hrs(sofar)} today</b></div>
      <div class="row"><span>This week</span><b class="mono" style="color:${p.weekProj > r.ot ? 'var(--wait)' : 'inherit'}">${(m.week + sofar / 60).toFixed(1)} → ${p.weekProj.toFixed(1)} / ${r.ot}</b></div>
    </div>
    <div class="pbody">${ctx.slot('merch.top')}${curHtml}<div><span class="lbl">Today's route</span><div class="route">${route || '<div class="muted" style="padding:10px 0">No stops.</div>'}</div></div></div>
  </div>
  <p class="note" style="margin:0 auto;text-align:center">Clock-in happens automatically at store check-in. Hand this screen to an actual merchandiser and ask what's missing.</p>
  ${ctx.slot('merch.after')}`;
}
