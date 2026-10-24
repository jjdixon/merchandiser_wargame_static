// Ordered vs delivered on the Scheduler; load changes on the phone.
import { fmt, merchById, plan } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { fillRate, loads, ordered, type Change } from './engine';

const du = (c: Change) => c.to.trays + c.to.cases - c.from.trays - c.from.cases;

export const panels: Panel[] = [
  {
    slot: 'sched.after',
    order: 6,
    render({ state, scope }) {
      const ch = loads(state).changes;
      const rows = state.stores.filter(scope.store).map(s => {
        const o = ordered(state, s), fr = fillRate(state, s), last = [...ch].reverse().find(c => c.storeId === s.id);
        return `<tr><td class="sname">${esc(s.name)}</td><td class="n">${o.trays} · ${o.cases}</td><td class="n">${s.trays} · ${s.cases}</td>
          <td class="n"><span class="flag ${fr < 0.95 ? 'late' : fr > 1.05 ? 'wait' : 'ok'}">${Math.round(fr * 100)}%</span></td>
          <td>${last ? `${du(last) > 0 ? '+' : ''}${du(last)} units at ${fmt(last.at)} <span class="muted">(${last.source})</span>` : '<span class="muted">—</span>'}</td></tr>`;
      }).join('');
      return `<section class="panel"><div class="ph"><h2>Ordered vs delivered</h2><span class="muted" style="font-size:12.5px">BR-017 · cuts and adds after load validation</span></div>
        <div class="tw"><table><thead><tr><th>Store</th><th class="n">Ordered (trays · cases)</th><th class="n">Delivered</th><th class="n">Fill</th><th>Last change</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    },
  },
  {
    slot: 'merch.after',
    order: 5,
    render({ state, selM }) {
      const m = merchById(state, selM);
      if (!m) return '';
      const mine = new Set(plan(state, m).stops.map(x => x.s.id));
      const list = loads(state).changes.filter(c => mine.has(c.storeId));
      if (!list.length) return '';
      return `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Load changes on your route</span><div class="route">${list.map(c => {
        const s = state.stores.find(x => x.id === c.storeId)!, d = du(c);
        return `<div class="st"><span></span><div><b>${esc(s.name)}: ${d > 0 ? '+' : ''}${d} units</b><div class="muted" style="font-size:12.5px">${c.from.trays} trays · ${c.from.cases} cases → ${c.to.trays} · ${c.to.cases} · ${fmt(c.at)}</div></div><span></span></div>`;
      }).join('')}</div></div></div>`;
    },
  },
];
