// Displays due today: on the phone (your route) and on the Scheduler (all stores).
import { merchById, plan } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { displayDone, displaysFor, type Display } from './engine';

const ACTION: Record<Display['action'], string> = { build: 'Build', maintain: 'Maintain', remove: 'Remove' };
const STATUS: Record<Display['status'], string> = { 'sold-in': 'Sold in', active: 'Active', expired: 'Expired' };

export const panels: Panel[] = [
  {
    slot: 'merch.after',
    order: 10,
    render({ state, selM }) {
      const m = merchById(state, selM);
      if (!m) return '';
      const items = plan(state, m).stops.flatMap(x => displaysFor(x.s).map(d => `<div class="st"><span>${displayDone(x.s, d) ? '✓' : ''}</span>
        <div><b>${esc(ACTION[d.action])}: ${esc(d.name)}</b><div class="muted" style="font-size:12.5px">${esc(x.s.name)} · ${esc(d.fixture)}, ${esc(d.location)} · ${esc(d.delivery)}</div></div><span></span></div>`)).join('');
      return items ? `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Displays on your route today</span><div class="route">${items}</div></div></div>` : '';
    },
  },
  {
    slot: 'sched.after',
    order: 5,
    render({ state, scope }) {
      const rows = state.stores.filter(scope.store).flatMap(s => displaysFor(s).map(d => `<tr>
        <td class="sname">${esc(s.name)}<small>${esc(merchById(state, s.assign ?? '')?.name ?? 'unassigned')}</small></td>
        <td>${esc(d.name)}<div class="muted" style="font-size:12px">${esc(d.products.join(', '))}</div></td>
        <td>${esc(d.fixture)}<div class="muted" style="font-size:12px">${esc(d.location)}</div></td>
        <td>${esc(STATUS[d.status])}</td><td>${esc(ACTION[d.action])}</td><td>${esc(d.delivery)}</td>
        <td>${displayDone(s, d) ? '<span class="flag ok">done</span>' : '<span class="muted">to do</span>'}</td></tr>`)).join('');
      return rows ? `<section class="panel"><div class="ph"><h2>Displays today</h2><span class="muted" style="font-size:12.5px">BR-022 · feeds each visit's display steps</span></div>
        <div class="tw"><table><thead><tr><th>Store</th><th>Display</th><th>Fixture</th><th>Status</th><th>Action</th><th>Delivery</th><th>Today</th></tr></thead><tbody>${rows}</tbody></table></div></section>` : '';
    },
  },
];
