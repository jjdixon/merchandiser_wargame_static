// Scheduler panel: reassign / move route / split, plus the week's history.
import { DAYS, fmt } from '../../engine';
import { esc } from '../../ui/shared';
import type { AppApi, Panel } from '../../app/feature';
import { ID, history, moveRoute, reassign, split, type Scope } from './engine';

const val = (id: string) => (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';

export const panels: Panel[] = [{
  slot: 'sched.after',
  order: 2,
  render({ state, scope }) {
    const stores = state.stores.filter(s => scope.store(s) && !(s.lock && state.t >= s.lock.end));
    const people = state.merch.filter(m => scope.merch(m) && !m.out);
    const opt = (v: string, l: string) => `<option value="${esc(v)}">${esc(l)}</option>`;
    const h = history(state).slice(-6).reverse();
    return `<section class="panel"><div class="ph"><h2>Reassign or split</h2><span class="muted" style="font-size:12.5px">BR-004 · today only by default; "from tomorrow" changes the master owner</span></div>
      <div class="pb fg" style="gap:10px">
        <div class="ctl" style="gap:6px">
          <select id="ra-store" aria-label="Store">${stores.map(s => opt(s.id, s.name)).join('')}</select>
          <span class="muted">to</span><select id="ra-to" aria-label="Person"><option value="">— nobody (uncover) —</option>${people.map(m => opt(m.id, m.name)).join('')}</select>
          <select id="ra-scope" aria-label="For how long"><option value="today">Today only</option><option value="permanent">From tomorrow on</option><option value="both">Today and from now on</option></select>
          <button class="btn" data-act="${ID}:reassign">Reassign</button></div>
        <div class="ctl" style="gap:6px">
          <span class="muted">Split</span><select id="sp-store" aria-label="Store to split">${stores.map(s => opt(s.id, s.name)).join('')}</select>
          <select id="sp-share" aria-label="Share"><option value="0.5">half</option><option value="0.33">a third</option><option value="0.25">a quarter</option></select>
          <span class="muted">to</span><select id="sp-to" aria-label="Helper">${people.map(m => opt(m.id, m.name)).join('')}</select>
          <button class="btn" data-act="${ID}:split">Split</button></div>
        <div class="ctl" style="gap:6px">
          <span class="muted">Move all open stops of</span><select id="mr-from" aria-label="From">${people.map(m => opt(m.id, m.name)).join('')}</select>
          <span class="muted">to</span><select id="mr-to" aria-label="To">${people.map(m => opt(m.id, m.name)).join('')}</select>
          <button class="btn" data-act="${ID}:moveRoute">Move route</button></div>
        ${h.length ? `<div class="fg" style="gap:2px;font-size:13px">${h.map(a => `<div><span class="mono muted">${DAYS[a.day]} ${fmt(a.at)}</span> ${esc(a.text)}</div>`).join('')}</div>` : ''}
      </div></section>`;
  },
}];

export const actions: Record<string, (app: AppApi, el: HTMLElement) => void> = {
  reassign(app) {
    if (!reassign(app.state, val('ra-store'), val('ra-to') || null, val('ra-scope') as Scope)) app.toast('That stop has already started — split it instead');
    app.refresh();
  },
  split(app) { if (!split(app.state, val('sp-store'), val('sp-to'), Number(val('sp-share')))) app.toast('Nothing left to split there'); app.refresh() },
  moveRoute(app) {
    if (val('mr-from') === val('mr-to')) { app.toast('Pick two different people'); return }
    app.toast(`${moveRoute(app.state, val('mr-from'), val('mr-to'))} stops moved`); app.refresh();
  },
};
