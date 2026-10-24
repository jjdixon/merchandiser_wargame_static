import { DAYS, merchById } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, book, cancel, idleRelief, reliefPool, vacations } from './engine';

const val = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';

export const panels: Panel[] = [
  {
    slot: 'week.after',
    order: 20,
    render({ state, scope }) {
      const v = vacations(state).filter(x => { const m = merchById(state, x.merch); return !m || scope.merch(m) }).sort((a, b) => a.day - b.day);
      const people = state.merch.filter(m => scope.merch(m) && m.role !== 'relief');
      const days = DAYS.map((d, i) => i >= state.day ? `<option value="${i}">${d}</option>` : '').join('');
      return `<section class="panel"><div class="ph"><h2>Vacations & relief</h2><span class="muted" style="font-size:12.5px">BR-005 · relief pool: ${esc(reliefPool(state).map(m => `${m.name} (${m.routeTypes.join('/')})`).join(', ') || 'none')}</span></div>
        <div class="pb fg" style="gap:8px">
          ${v.length ? `<div class="fg" style="gap:4px;font-size:13px">${v.map(x => `<div><b>${DAYS[x.day]}</b> · ${esc(merchById(state, x.merch)?.name ?? x.merch)} off ${x.day > state.day ? `<button class="btn sm" data-act="${ID}:cancel" data-m="${esc(x.merch)}" data-d="${x.day}">Cancel</button>` : ''}</div>`).join('')}</div>` : '<div class="muted">No vacations booked.</div>'}
          <div class="ctl" style="gap:6px"><span class="muted">Book</span><select id="vac-m" aria-label="Who">${people.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select>
            <span class="muted">off on</span><select id="vac-d" aria-label="Day">${days}</select><button class="btn" data-act="${ID}:book">Book vacation</button></div>
          <div class="note">Relief covers the stops it's qualified for, same market first. Bookings apply when that day starts; the Week view projects them now.</div>
        </div></section>`;
    },
  },
  {
    slot: 'super.aside',
    order: 5,
    render({ state, scope }) {
      const idle = idleRelief(state).filter(scope.merch);
      return idle.length ? `<div class="panel"><div class="ph"><h2>Relief available</h2><span class="muted" style="font-size:12.5px">BR-005</span></div>
        <div class="pb" style="font-size:13px">${idle.map(m => `<div><b>${esc(m.name)}</b> has no stops today. Send them to help (see <i>Send help</i>) or give them pull-ups.</div>`).join('')}</div></div>` : '';
    },
  },
];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  book(app) { app.toast(book(app.state, val('vac-m'), Number(val('vac-d'))) ? 'Vacation booked' : 'Already booked or in the past'); app.refresh() },
  cancel(app, el) { cancel(app.state, el.dataset.m!, Number(el.dataset.d)); app.refresh() },
};
