// Truck status on the phone (your stops + heads-ups) and for supervisors.
import { fmt, merchById, plan } from '../../engine';
import { esc } from '../../ui/shared';
import type { Panel } from '../../app/feature';
import { scheduledEta, truckStatus, trucks, type TruckStatus } from './engine';

const TONE: Record<TruckStatus, string> = { scheduled: 'muted', 'en route': '', late: 'late', delivered: 'ok', 'no truck': 'muted' };
const pill = (st: TruckStatus, lateBy: number) =>
  `<span class="flag ${TONE[st]}"${st === 'en route' ? ' style="color:var(--work)"' : ''}>${st}${st === 'late' || (st === 'delivered' && lateBy > 5) ? ` +${lateBy}m` : ''}</span>`;

export const panels: Panel[] = [
  {
    slot: 'merch.top',
    order: 150,   // below the guided visit's Next card
    render({ state, selM }) {
      const m = merchById(state, selM);
      if (!m) return '';
      const notes = trucks(state).notices.filter(n => n.merchId === m.id).slice(-2).reverse();
      const rows = plan(state, m).stops.filter(x => state.t < x.end).map(x => {
        const ts = truckStatus(state, x.s);
        return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span>${esc(x.s.name)}</span><span class="mono">${fmt(x.s.eta)} ${pill(ts.status, ts.lateBy)}</span></div>`;
      }).join('');
      if (!rows && !notes.length) return '';
      return `<div class="cur" style="gap:6px"><span class="lbl">Trucks</span>
        ${notes.map(n => `<div style="font-size:13px;border-left:3px solid var(--wait);padding-left:8px"><span class="mono muted">${fmt(n.at)}</span> ${esc(n.text)}</div>`).join('')}
        ${rows}</div>`;
    },
  },
  {
    slot: 'super.main',
    order: 20,
    render({ state, scope }) {
      const rows = state.stores.filter(scope.store).map(s => {
        const ts = truckStatus(state, s);
        return `<tr><td class="sname">${esc(s.name)}</td><td class="n">${fmt(scheduledEta(state, s))}</td><td class="n">${fmt(s.eta)}</td><td>${pill(ts.status, ts.lateBy)}</td></tr>`;
      }).join('');
      return `<div class="panel"><div class="ph"><h2>Trucks today</h2><span class="muted" style="font-size:12.5px">BR-014 · carrier delays show up ~45 min ahead</span></div>
        <div class="tw"><table style="min-width:0"><thead><tr><th>Store</th><th class="n">Scheduled</th><th class="n">Expected</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    },
  },
];
