// Week view (core): hours per person per day — worked (past), live (today),
// planned (future) — against the weekly overtime line, plus what each day holds.
import { DAYS, allPlans, hrs, type SimState } from '../engine';
import { esc, type ViewCtx } from './shared';

interface Cell { paid: number; stops: number; kind: 'past' | 'today' | 'future' | 'none' }

export function weekView(ctx: ViewCtx): string {
  const { state, scope } = ctx, week = state.week, r = state.rules;
  const people = state.merch.filter(scope.merch);
  const byDay: Array<Record<string, Cell>> = [];
  const dayInfo: Array<{ stores: number; pullUps: number; kind: Cell['kind']; scenario?: string }> = [];
  for (let d = 0; d < 7; d++) {
    const rec = week.history.find(h => h.day === d);
    const row: Record<string, Cell> = {};
    if (rec) {
      for (const m of people) row[m.id] = { paid: rec.merch[m.id]?.paid ?? 0, stops: rec.merch[m.id]?.stops ?? 0, kind: 'past' };
      dayInfo.push({ stores: Object.values(rec.merch).reduce((a, x) => a + x.stops, 0), pullUps: 0, kind: 'past', scenario: rec.scenario });
    } else if (d >= week.day) {
      const s: SimState = d === state.day ? state : ctx.projectDay(d);
      const kind = d === state.day ? 'today' : 'future';
      for (const p of allPlans(s)) if (scope.merch(p.m)) row[p.m.id] = { paid: p.paid, stops: p.stops.length, kind };
      dayInfo.push({ stores: s.stores.filter(scope.store).length, pullUps: s.stores.filter(x => x.pullUp && scope.store(x)).length, kind });
    } else {
      dayInfo.push({ stores: 0, pullUps: 0, kind: 'none' });
    }
    byDay.push(row);
  }
  const head = DAYS.map((d, i) => `<th class="n" style="${i === state.day ? 'color:var(--accent)' : ''}">${d}${i === state.day ? ' ●' : ''}</th>`).join('');
  const rows = people.map(m => {
    const start = week.startHours[m.id] ?? 0;
    let total = start * 60;
    const cells = byDay.map(row => {
      const c = row[m.id];
      if (!c || c.kind === 'none') return '<td class="n muted">—</td>';
      total += c.paid;
      const style = c.kind === 'past' ? 'font-weight:600' : c.kind === 'today' ? 'color:var(--work);font-weight:600' : 'color:var(--muted)';
      return `<td class="n"><span style="${style}">${c.paid ? hrs(c.paid) : '—'}</span>${c.stops ? `<div class="muted" style="font-size:11px">${c.stops} stop${c.stops > 1 ? 's' : ''}</div>` : ''}</td>`;
    }).join('');
    const totalH = total / 60, over = totalH > r.ot;
    return `<tr><td class="sname">${esc(m.name)}<small>${esc(m.role)}${start ? ` · ${start}h before this week` : ''}</small></td>${cells}
      <td class="n"><b style="color:${over ? 'var(--late)' : 'inherit'}">${totalH.toFixed(1)}</b><span class="muted"> / ${r.ot}</span></td></tr>`;
  }).join('');
  const info = dayInfo.map(d => `<td class="n" style="font-size:12px">${d.kind === 'none' ? '<span class="muted">not simulated</span>'
    : `${d.stores} stop${d.stores === 1 ? '' : 's'}${d.pullUps ? `<div class="muted">${d.pullUps} pull-up${d.pullUps > 1 ? 's' : ''}</div>` : ''}`}</td>`).join('');
  return `
  <section class="panel">
    <div class="ph"><h2>Week</h2><span class="muted" style="font-size:12.5px"><b>Bold</b> = worked · <span style="color:var(--work)">blue</span> = today, live · grey = planned. <b>End day →</b> in the header rolls today into the week.</span></div>
    <div class="tw"><table><thead><tr><th>Person</th>${head}<th class="n">Week</th></tr></thead>
      <tbody>${rows}<tr><td class="sname muted">Stores</td>${info}<td></td></tr></tbody></table></div>
    <div class="pb note">Thursday is the seed day (every store). Down-days (Wed, Sun) are pull-up runs: LF stores only, no truck, about 30% of normal cases. Patterns are in src/data/week.json. Start a Monday-to-Sunday run with <b>New week</b>.</div>
  </section>
  ${ctx.slot('week.after')}`;
}
