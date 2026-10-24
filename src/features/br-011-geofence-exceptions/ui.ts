// Review queue for supervisors; check-in record on the phone.
import { fmt, merchById, plan } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, decide, describe_, geo } from './engine';

export const panels: Panel[] = [
  {
    slot: 'super.main',
    order: 30,
    render({ state, scope }) {
      const list = geo(state).exceptions.filter(e => { const s = state.stores.find(x => x.id === e.storeId); return !s || scope.store(s) });
      const open = list.filter(e => e.status === 'open').length;
      const rows = list.slice().reverse().map(e => {
        const s = state.stores.find(x => x.id === e.storeId)!, m = merchById(state, e.merchId);
        const act = e.status === 'open'
          ? `<button class="btn sm" data-act="${ID}:accept" data-id="${e.id}">Accept planned</button><button class="btn sm" data-act="${ID}:reject" data-id="${e.id}">Reject</button>`
          : `<span class="flag ${e.status === 'accepted' ? 'ok' : 'late'}">${e.status} ${fmt(e.decidedAt)}</span>`;
        return `<div style="padding:8px 14px;border-bottom:1px solid var(--soft);font-size:13px;display:flex;flex-direction:column;gap:4px">
          <div><b>${esc(m?.name ?? '')}</b> at ${esc(s.name)} · <span class="mono">${e.minutes} paid min</span></div>
          <div class="muted">${esc(describe_(e))}</div><div class="ctl">${act}</div></div>`;
      }).join('');
      return `<div class="panel"><div class="ph"><h2>Geofence exceptions</h2><span class="muted" style="font-size:12.5px">BR-011 · ${open} to review</span></div>
        ${rows || '<div class="pb muted">No exceptions. Entry and exit are being recorded automatically.</div>'}</div>`;
    },
  },
  {
    slot: 'merch.after',
    order: 20,
    render({ state, selM }) {
      const m = merchById(state, selM);
      if (!m) return '';
      const g = geo(state);
      const items = plan(state, m).stops.filter(x => g.presence[x.s.id]).map(x => {
        const p = g.presence[x.s.id], ex = g.exceptions.find(e => e.storeId === x.s.id);
        const exit = p.exit == null ? 'still in store' : p.exit < 0 ? 'not recorded' : fmt(p.exit);
        return `<div class="st"><span>${ex ? '!' : '✓'}</span><div><b>${esc(x.s.name)}</b><div class="muted" style="font-size:12.5px">In ${p.entry == null ? 'not recorded' : fmt(p.entry)} · out ${exit}${ex ? ` · <span class="flag ${ex.status === 'rejected' ? 'late' : 'wait'}">${ex.status === 'open' ? 'supervisor reviewing' : ex.status}</span>` : ''}</div></div><span></span></div>`;
      }).join('');
      return items ? `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Check-in record (automatic)</span><div class="route">${items}</div></div></div>` : '';
    },
  },
];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  accept(app, el) { decide(app.state, Number(el.dataset.id), 'accepted'); app.refresh() },
  reject(app, el) { decide(app.state, Number(el.dataset.id), 'rejected'); app.toast('Rejected — those minutes would be unpaid pending correction'); app.refresh() },
};
