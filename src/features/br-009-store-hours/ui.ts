// Store hours: editable table on the Scheduler, compact list on the phone.
import { fmt, plan, merchById, setRule } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { FIELDS, FIELD_LABEL, ID, conflicts, hoursKey, hoursOf, type Field } from './engine';

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const panels: Panel[] = [
  {
    slot: 'sched.after',
    order: 20,
    render({ state, scope }) {
      const bad = new Map<string, string[]>();
      for (const c of conflicts(state)) bad.set(c.storeId, [...(bad.get(c.storeId) ?? []), c.kind === 'receivingClosed' ? 'truck after receiving closes' : 'runs past merch hours']);
      const rows = state.stores.filter(scope.store).map(s => {
        const h = hoursOf(state, s);
        if (!h) return `<tr><td class="sname">${esc(s.name)}</td><td colspan="4" class="muted">No hours on file</td><td></td></tr>`;
        const cells = FIELDS.map(f => `<td><input type="time" step="900" value="${hhmm(h[f])}" data-fchange="${ID}:setTime" data-id="${esc(s.id)}" data-field="${f}" aria-label="${esc(FIELD_LABEL[f])} at ${esc(s.name)}" style="width:7.2em"></td>`).join('');
        const flags = (bad.get(s.id) ?? []).map(t => `<span class="flag late">${t}</span>`).join(' · ');
        return `<tr><td class="sname">${esc(s.name)}<small>truck ${fmt(s.eta)}</small></td>${cells}<td>${flags}</td></tr>`;
      }).join('');
      return `<section class="panel"><div class="ph"><h2>Store hours</h2><span class="muted" style="font-size:12.5px">BR-009 · work can't start until receiving is open</span></div>
        <div class="tw"><table><thead><tr><th>Store</th>${FIELDS.map(f => `<th>${FIELD_LABEL[f]}</th>`).join('')}<th>Flags</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    },
  },
  {
    slot: 'merch.after',
    render({ state, selM }) {
      const m = merchById(state, selM);
      if (!m) return '';
      const items = plan(state, m).stops.map(x => {
        const h = hoursOf(state, x.s);
        return h ? `<div class="st"><span></span><div><b>${esc(x.s.name)}</b><div class="muted" style="font-size:12.5px">Receiving ${fmt(h.receivingOpen)}–${fmt(h.receivingClose)} · merch ${fmt(h.merchOpen)}–${fmt(h.merchClose)}</div></div><span></span></div>` : '';
      }).join('');
      return items ? `<div class="phone" style="border-radius:16px"><div class="pbody"><span class="lbl">Store hours on your route</span><div class="route">${items}</div></div></div>` : '';
    },
  },
];

export const changes: Record<string, (app: AppApi, el: HTMLInputElement) => void> = {
  setTime(app, el) {
    const m = /^(\d{2}):(\d{2})$/.exec(el.value);
    if (!m) return;
    setRule(app.state.rules, hoursKey(el.dataset.field as Field, el.dataset.id!), Number(m[1]) * 60 + Number(m[2]));
    el.blur();
    app.refresh();
  },
};
