// Scheduler panel: engineered vs actual per stop, and per-person day totals.
import { fmt, hrs, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { comparison } from './engine';

const delta = (a: number, b: number) => {
  const d = Math.round(a - b);
  if (Math.abs(d) < 1) return '<span class="muted">±0</span>';
  return `<span class="flag ${d > 0 ? 'late' : 'ok'}">${d > 0 ? '+' : '−'}${Math.abs(d)}m</span>`;
};

export const panels: Panel[] = [{
  slot: 'sched.after',
  order: 30,
  render({ state, scope }) {
    const groups = comparison(state).filter(c => scope.merch(merchById(state, c.merchId)!) && c.rows.length);
    const body = groups.map(c => {
      const m = merchById(state, c.merchId)!;
      const rows = c.rows.map(r => {
        const a = r.actual, e = r.engineered;
        return `<tr><td class="sname">${esc(r.store.name)}</td>
          <td class="n">${e ? Math.round(e.drive) : '—'}</td><td class="n">${a ? Math.round(a.drive) : '—'}</td>
          <td class="n">${e ? Math.round(e.work) : '—'}</td><td class="n">${a ? Math.round(a.work) : '—'}</td>
          <td class="n">${r.baseline ? fmt(r.baseline.start) : '—'}</td><td class="n">${a ? fmt(a.start) : '—'}</td>
          <td>${a && r.baseline ? delta(a.end, r.baseline.end) + (a.done ? '' : ' <span class="muted">so far</span>') : '<span class="muted">not started</span>'}</td></tr>`;
      }).join('');
      return `<tr><th colspan="8" style="padding-top:12px">${esc(m.name)} <span class="muted mono" style="font-weight:400;text-transform:none;letter-spacing:0">engineered ${hrs(c.engineeredMin)} · actual ${hrs(c.actualMin)} ${c.actualMin ? delta(c.actualMin, c.engineeredMin) : ''}</span></th></tr>${rows}`;
    }).join('');
    return `<section class="panel"><div class="ph"><h2>Planned vs actual</h2><span class="muted" style="font-size:12.5px">BR-012 · engineered standard vs what happened</span></div>
      <div class="tw"><table><thead><tr><th>Store</th><th class="n">Drive std</th><th class="n">Drive actual</th><th class="n">Work std</th><th class="n">Work actual</th><th class="n">Planned start</th><th class="n">Actual start</th><th>Finish vs plan</th></tr></thead><tbody>${body}</tbody></table></div>
      <div class="pb note">Minutes. "Planned start" is the plan at the start of the day. Actuals appear once the merchandiser leaves for a stop. Variation is set on Pay &amp; labor rules (0% = runs exactly to standard).</div></section>`;
  },
}];
