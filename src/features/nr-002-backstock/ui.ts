// Backstock at arrival and leaving, per store, with this week's trend (Supervisor).
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import type { Units } from '../../engine';
import { trend } from './engine';

const u = (x?: Units) => (x ? `${x.trays} · ${x.cases}` : '<span class="muted">—</span>');

export const panels: Panel[] = [
  {
    slot: 'super.main',
    order: 40,
    render({ state, scope }) {
      const stores = state.stores.filter(scope.store);
      if (!stores.length) return '';
      const rows = stores.map(s => {
        const b = s.backstock, tr = trend(state, s.id);
        const d = b?.start && b.end ? b.end.trays + b.end.cases - b.start.trays - b.start.cases : null;
        const earlier = tr.length ? `<div class="muted" style="font-size:12px">Earlier: ${tr.map(x => `${esc(x.day)} ${x.end.trays}·${x.end.cases}`).join(' → ')}</div>` : '';
        return `<tr><td class="sname" style="white-space:normal">${esc(s.name)}${s.pullUp ? ' <span class="muted" style="font-size:12px">pull-up</span>' : ''}${earlier}</td>
          <td class="n">${u(b?.start)}</td><td class="n">${u(b?.end)}</td>
          <td class="n">${d == null ? '<span class="muted">—</span>' : `<span class="flag ${d > 0 ? 'late' : 'ok'}">${d > 0 ? '+' : ''}${d}</span>`}</td></tr>`;
      }).join('');
      return `<section class="panel"><div class="ph"><h2>Backstock</h2><span class="muted" style="font-size:12.5px">NR-002 · trays · cases</span></div>
        <div class="tw"><table style="min-width:0"><thead><tr><th>Store</th><th class="n">Arrival</th><th class="n">Leaving</th><th class="n">Δ</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="note" style="margin:8px 12px">Growing backstock usually means the order is heavy; none left with out-of-stocks means it's light (see order feedback).</p></section>`;
    },
  },
];
