// Displays due today: on the phone (your route) and on the Scheduler (all stores).
import { DAYS, merchById, plan } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { displaysFor, type Phase, type StoreDisplay } from './engine';

const DUE: Record<string, string> = { setup: 'Build', check: 'Check', remove: 'Remove' };
const PHASE: Record<Phase, string> = { 'sold-in': 'Sold in', active: 'Active', expired: 'Expired', removed: 'Removed', 'not applicable': 'Not applicable' };
const day = (d: number) => (d >= 0 && d <= 6 ? DAYS[d] : d < 0 ? 'last week' : 'next week');
const todo = (d: StoreDisplay) => (d.doneToday ? '<span class="flag ok">done</span>' : d.due ? `<span class="flag wait">${DUE[d.due]}</span>` : '<span class="muted">—</span>');

export const panels: Panel[] = [
  {
    slot: 'merch.after',
    order: 10,
    render({ state, selM }) {
      const m = merchById(state, selM);
      if (!m) return '';
      const items = plan(state, m).stops.flatMap(x => displaysFor(state, x.s).filter(d => d.due).map(d => `<div class="st"><span>${d.doneToday ? '✓' : ''}</span>
        <div><b>${esc(DUE[d.due!])}: ${esc(d.task.name)}</b><div class="muted" style="font-size:12.5px">${esc(x.s.name)} · ${esc(d.task.fixture)}, ${esc(d.task.location)}${d.task.delivery ? ` · ${esc(d.task.delivery)}` : ''}</div></div><span></span></div>`)).join('');
      return items ? `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Displays on your route today</span><div class="route">${items}</div></div></div>` : '';
    },
  },
  {
    slot: 'sched.after',
    order: 5,
    render({ state, scope }) {
      const rows = state.stores.filter(scope.store).flatMap(s => displaysFor(state, s).map(d => `<tr>
        <td class="sname">${esc(s.name)}<small>${esc(merchById(state, s.assign ?? '')?.name ?? 'unassigned')}</small></td>
        <td>${esc(d.task.name)}<div class="muted" style="font-size:12px">${esc(d.task.products.join(', '))}</div></td>
        <td>${esc(d.task.fixture)}<div class="muted" style="font-size:12px">${esc(d.task.location)}</div></td>
        <td>${esc(PHASE[d.phase])}<div class="muted" style="font-size:12px">${esc(day(d.task.start))} → ${esc(day(d.task.end))}</div></td>
        <td>${todo(d)}</td></tr>`)).join('');
      return rows ? `<section class="panel"><div class="ph"><h2>Displays today</h2><span class="muted" style="font-size:12.5px">BR-022 · from the promotion feed; due ones are visit steps</span></div>
        <div class="tw"><table><thead><tr><th>Store</th><th>Display</th><th>Fixture</th><th>Status</th><th>Today</th></tr></thead><tbody>${rows}</tbody></table></div></section>` : '';
    },
  },
];
