// Supervisor: scheduled vs actual for everyone, with planned and actual bars together.
import { fmt, plan, storeById } from '../../engine';
import { esc, shortName } from '../../ui/shared';
import type { Panel, ViewCtx } from '../../app/feature';
import { ROLE_ORDER, dropped, rows, type Row } from './engine';

const T0 = 4 * 60, T1 = 21 * 60;
const x = (m: number) => `${(((Math.max(T0, Math.min(T1, m)) - T0) / (T1 - T0)) * 100).toFixed(2)}%`;
const w = (a: number, b: number) => `${Math.max(0.4, ((Math.min(T1, b) - Math.max(T0, a)) / (T1 - T0)) * 100).toFixed(2)}%`;
const h = (min: number) => (min / 60).toFixed(1);
const ROLE: Record<string, string> = { merchandiser: 'Merchandisers', relief: 'Vacation relief', jumper: 'Route jumpers' };

function bars(ctx: ViewCtx, r: Row): string {
  const planned = r.scheduled.filter(p => p.end > p.start).map(p => `<i title="Scheduled ${esc(storeById(ctx.state, p.storeId)?.name ?? p.storeId)} ${fmt(p.start)}–${fmt(p.end)}" style="position:absolute;top:2px;height:7px;left:${x(p.start)};width:${w(p.start, p.end)};border:1.5px dashed var(--muted);border-radius:3px;box-sizing:border-box"></i>`).join('');
  const actual = plan(ctx.state, r.m).stops.map(s => {
    const done = s.s.lock && ctx.state.t >= s.end;
    return `<i title="${done ? 'Done' : 'Now planned'}: ${esc(s.s.name)} ${fmt(s.start)}–${fmt(s.end)}" style="position:absolute;top:12px;height:9px;left:${x(s.start)};width:${w(s.start, s.end)};background:${s.end > s.s.win ? 'var(--late)' : 'var(--work)'};opacity:${done ? 1 : 0.45};border-radius:3px"></i>`;
  }).join('');
  return `<div style="position:relative;height:24px;background:var(--soft);border-radius:4px;min-width:160px">${planned}${actual}<i style="position:absolute;top:0;bottom:0;width:2px;left:${x(ctx.state.t)};background:var(--ink)"></i></div>`;
}

function row(ctx: ViewCtx, r: Row): string {
  const name = (id: string) => esc(shortName(storeById(ctx.state, id)?.name ?? id));
  const changes = [r.added.length ? `+${r.added.map(name).join(', ')}` : '', r.removed.length ? `−${r.removed.map(name).join(', ')}` : ''].filter(Boolean).join(' ');
  const start = r.firstActual != null && r.firstPlanned != null ? `${fmt(r.firstActual)}${Math.abs(r.firstActual - r.firstPlanned) >= 10 ? ` <span class="muted">(sched ${fmt(r.firstPlanned)})</span>` : ''}` : r.firstPlanned != null ? `<span class="muted">sched ${fmt(r.firstPlanned)}</span>` : '—';
  return `<tr><td>${esc(r.m.name)}<small>${esc(r.m.routeTypes.join(' · '))} · ${esc(r.m.market)}</small></td>
    <td>${esc(r.where)}</td>
    <td class="n">${r.done}/${r.total}${r.scheduled.length !== r.total ? `<small>sched ${r.scheduled.length}</small>` : ''}</td>
    <td>${changes || '<span class="muted">as scheduled</span>'}</td>
    <td class="n">${start}</td>
    <td class="n" title="work · wait · drive so far, of planned">${h(r.workSoFar)} · ${h(r.waitSoFar)} · ${h(r.driveSoFar)}<small>of ${h(r.workPlan)} · ${h(r.waitPlan)} · ${h(r.drivePlan)}</small></td>
    <td class="n">${r.pullUps || ''}${r.extraVisits ? ` <span class="muted">+${r.extraVisits} extra</span>` : ''}</td>
    <td style="min-width:180px">${bars(ctx, r)}</td></tr>`;
}

export const panels: Panel[] = [{
  slot: 'super.main',
  order: 5,
  render(ctx) {
    const list = rows(ctx.state, ctx.scope.merch);
    if (!list.length) return '';
    const groups = ROLE_ORDER.map(role => [role, list.filter(r => r.m.role === role)] as const).filter(([, l]) => l.length);
    const lost = dropped(ctx.state).filter(r => { const s = storeById(ctx.state, r.storeId); return s && ctx.scope.store(s) });
    return `<section class="panel" style="min-width:0"><div class="ph"><h2>Scheduled vs actual</h2><span class="muted" style="font-size:12.5px">BR-027 · dashed = scheduled at day start · solid = done · faded = still to do</span></div>
      <div class="tw"><table><thead><tr><th>Person</th><th>Now</th><th class="n">Stops</th><th>Changes vs schedule</th><th class="n">First start</th><th class="n">Work · wait · drive (h)</th><th class="n">Pull-ups</th><th>Day</th></tr></thead>
      <tbody>${groups.map(([role, l]) => `<tr><td colspan="8" class="lbl" style="padding-top:10px">${esc(ROLE[role] ?? role)}</td></tr>${l.map(r => row(ctx, r)).join('')}`).join('')}</tbody></table></div>
      ${lost.length ? `<div class="pb"><span class="flag late">Scheduled but nobody has it now:</span> ${lost.map(r => ctx.storeLink(storeById(ctx.state, r.storeId)!)).join(', ')}</div>` : ''}</section>`;
  },
}];
